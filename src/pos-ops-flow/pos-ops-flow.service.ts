import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Conversation } from '../conversation/conversation.entity';
import { parseKenyanPhone } from '../enquiry-flow/parse-kenyan-phone';
import {
  formatNumberedOptions,
  matchNumberedOption,
  type NumberedOption,
} from '../enquiry-flow/match-numbered-option';
import { InsightfulPosClient } from '../insightful-pos/insightful-pos.client';
import { InsightfulPosError } from '../insightful-pos/insightful-pos.types';
import { matchHandoverCommand } from '../state-machine/match-handover-command';
import { matchResetCommand } from '../state-machine/match-reset-command';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import * as copy from './pos-ops-copy';
import {
  cartTotal,
  type PosCartLine,
  type PosListedCustomer,
  type PosListedProduct,
  type PosOpsPayload,
} from './pos-ops-payload';
import { PosOpsSession } from './pos-ops-session.entity';
import { PosOpsSessionService } from './pos-ops-session.service';
import { POS_OPS_STEPS } from './pos-ops-steps';

export type PosOpsReply = {
  replyText: string;
  silent?: boolean;
};

const MAIN_MENU: NumberedOption[] = [
  { id: 'sale', label: 'Record a sale', aliases: ['sale', 'sell'] },
  {
    id: 'credit',
    label: 'Customer credit balance',
    aliases: ['credit', 'balance'],
  },
  {
    id: 'pay',
    label: 'Pay on account',
    aliases: ['pay', 'payment', 'account'],
  },
];

const SALE_MORE: NumberedOption[] = [
  { id: 'add', label: 'Add another item', aliases: ['add', 'more'] },
  { id: 'checkout', label: 'Checkout', aliases: ['checkout', 'done'] },
];

const PAYMENT_TYPE: NumberedOption[] = [
  { id: 'cash', label: 'Cash', aliases: ['cash'] },
  { id: 'credit', label: 'Credit (on account)', aliases: ['credit', 'account'] },
];

const PAY_METHOD: NumberedOption[] = [
  { id: 'cash', label: 'Cash', aliases: ['cash'] },
  { id: 'mpesa', label: 'M-Pesa', aliases: ['mpesa', 'm pesa'] },
];

const CONFIRM: NumberedOption[] = [
  { id: 'yes', label: 'Yes, confirm', aliases: ['yes', 'confirm', 'ok'] },
  { id: 'no', label: 'No, cancel', aliases: ['no', 'cancel'] },
];

@Injectable()
export class PosOpsFlowService {
  private readonly logger = new Logger(PosOpsFlowService.name);

  constructor(
    private readonly sessions: PosOpsSessionService,
    private readonly pos: InsightfulPosClient,
    private readonly stateMachine: ConversationStateMachineService,
  ) {}

  async handleInbound(
    conversation: Conversation,
    userText: string | null,
  ): Promise<PosOpsReply> {
    const text = userText?.trim() ?? '';

    if (matchHandoverCommand(text)) {
      await this.stateMachine.enterHumanHandoff(conversation.id);
      return {
        replyText:
          'Okay — a team member can take over here on WhatsApp. Type *reset* when you want the shop bot again.',
      };
    }

    if (matchResetCommand(text)) {
      await this.sessions.closeOpen(conversation.id);
      return this.openMenu(conversation);
    }

    if (!this.pos.isConfigured()) {
      return { replyText: copy.POS_NOT_CONFIGURED };
    }

    const phone = this.staffPhone(conversation);
    if (!phone) {
      return {
        replyText:
          'Could not read your WhatsApp number. Try again or contact support.',
      };
    }

    try {
      let session = await this.sessions.findActive(conversation.id);
      if (!session) {
        return await this.openMenu(conversation);
      }
      return await this.routeStep(session, conversation, phone, text);
    } catch (error) {
      if (error instanceof InsightfulPosError) {
        this.logger.error(`POS API error: ${error.describeForLog()}`);
        return { replyText: error.message };
      }
      this.logger.error(
        `POS flow error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        replyText: 'Something went wrong talking to the shop. Try *reset*.',
      };
    }
  }

  private staffPhone(conversation: Conversation): string | null {
    return parseKenyanPhone(conversation.prospectPhone);
  }

  private async openMenu(conversation: Conversation): Promise<PosOpsReply> {
    const phone = this.staffPhone(conversation);
    if (!phone) {
      return { replyText: copy.UNAUTHORISED };
    }

    const identity = await this.pos.identify(phone);
    if (!identity) {
      return { replyText: copy.UNAUTHORISED };
    }

    await this.sessions.closeOpen(conversation.id);
    await this.sessions.start(conversation.id, POS_OPS_STEPS.MENU, {
      staffName: identity.staffName,
      storeName: identity.storeName,
      cart: [],
    });

    return {
      replyText: copy.mainMenu(identity.staffName, identity.storeName),
    };
  }

  private async routeStep(
    session: PosOpsSession,
    conversation: Conversation,
    phone: string,
    text: string,
  ): Promise<PosOpsReply> {
    switch (session.currentStep) {
      case POS_OPS_STEPS.MENU:
        return this.handleMenu(session, conversation, phone, text);
      case POS_OPS_STEPS.SALE_SEARCH:
        return this.handleSaleSearch(session, phone, text);
      case POS_OPS_STEPS.SALE_PICK:
        return this.handleSalePick(session, text);
      case POS_OPS_STEPS.SALE_QTY:
        return this.handleSaleQty(session, text);
      case POS_OPS_STEPS.SALE_MORE:
        return this.handleSaleMore(session, text);
      case POS_OPS_STEPS.SALE_PAYMENT:
        return this.handleSalePayment(session, text);
      case POS_OPS_STEPS.SALE_CREDIT_SEARCH:
        return this.handleCustomerSearch(session, phone, text, 'sale');
      case POS_OPS_STEPS.SALE_CREDIT_PICK:
        return this.handleSaleCreditPick(session, text);
      case POS_OPS_STEPS.SALE_CONFIRM:
        return this.handleSaleConfirm(session, phone, text);
      case POS_OPS_STEPS.CREDIT_SEARCH:
        return this.handleCustomerSearch(session, phone, text, 'credit');
      case POS_OPS_STEPS.CREDIT_PICK:
        return this.handleCreditPick(session, text);
      case POS_OPS_STEPS.PAY_SEARCH:
        return this.handleCustomerSearch(session, phone, text, 'pay');
      case POS_OPS_STEPS.PAY_PICK:
        return this.handlePayPick(session, text);
      case POS_OPS_STEPS.PAY_AMOUNT:
        return this.handlePayAmount(session, text);
      case POS_OPS_STEPS.PAY_METHOD:
        return this.handlePayMethod(session, text);
      case POS_OPS_STEPS.PAY_CONFIRM:
        return this.handlePayConfirm(session, phone, text);
      default:
        return this.openMenu(conversation);
    }
  }

  private async handleMenu(
    session: PosOpsSession,
    conversation: Conversation,
    phone: string,
    text: string,
  ): Promise<PosOpsReply> {
    const choice = matchNumberedOption(text, MAIN_MENU);
    if (!choice) {
      const name = session.payload.staffName ?? 'Staff';
      const store = session.payload.storeName ?? 'Store';
      return { replyText: copy.mainMenu(name, store) };
    }

    if (choice.id === 'sale') {
      await this.sessions.save(session, {
        step: POS_OPS_STEPS.SALE_SEARCH,
        payload: { ...session.payload, cart: [], flowKind: 'sale' },
      });
      return {
        replyText: 'Type part of a product name to search (at least 2 letters).',
      };
    }

    if (choice.id === 'credit') {
      await this.sessions.save(session, {
        step: POS_OPS_STEPS.CREDIT_SEARCH,
        payload: { ...session.payload, flowKind: 'credit' },
      });
      return {
        replyText: 'Customer credit — type a name or phone to search.',
      };
    }

    await this.sessions.save(session, {
      step: POS_OPS_STEPS.PAY_SEARCH,
      payload: { ...session.payload, flowKind: 'pay' },
    });
    return {
      replyText: 'Pay on account — type a customer name or phone to search.',
    };
  }

  private async handleSaleSearch(
    session: PosOpsSession,
    phone: string,
    text: string,
  ): Promise<PosOpsReply> {
    if (text.length < 2) {
      return { replyText: 'Type at least 2 letters of the product name.' };
    }

    const hits = await this.pos.searchProducts(phone, text);
    if (!hits.length) {
      return { replyText: 'No products found. Try another name.' };
    }

    const pendingProducts: PosListedProduct[] = hits.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
    }));

    await this.sessions.save(session, {
      step: POS_OPS_STEPS.SALE_PICK,
      payload: { ...session.payload, pendingProducts },
    });

    const lines = pendingProducts.map(
      (p, i) => `${i + 1}  ${p.name} — KES ${p.price}`,
    );
    return {
      replyText: `Pick a product:\n${lines.join('\n')}`,
    };
  }

  private async handleSalePick(
    session: PosOpsSession,
    text: string,
  ): Promise<PosOpsReply> {
    const options = (session.payload.pendingProducts ?? []).map((p) => ({
      id: p.id,
      label: p.name,
      aliases: [p.name.toLowerCase()],
    }));
    const picked = matchNumberedOption(text, options);
    if (!picked) {
      return { replyText: 'Reply with the number of the product you want.' };
    }

    await this.sessions.save(session, {
      step: POS_OPS_STEPS.SALE_QTY,
      payload: {
        ...session.payload,
        pendingProducts: session.payload.pendingProducts?.filter(
          (p) => p.id === picked.id,
        ),
      },
    });
    return { replyText: 'How many? (whole number)' };
  }

  private async handleSaleQty(
    session: PosOpsSession,
    text: string,
  ): Promise<PosOpsReply> {
    const qty = Number(text.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return { replyText: 'Enter a whole number greater than zero.' };
    }

    const product = session.payload.pendingProducts?.[0];
    if (!product) {
      return { replyText: 'Session expired. Type *reset*.' };
    }

    const cart: PosCartLine[] = [
      ...(session.payload.cart ?? []),
      {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: qty,
      },
    ];

    await this.sessions.save(session, {
      step: POS_OPS_STEPS.SALE_MORE,
      payload: { ...session.payload, cart, pendingProducts: undefined },
    });

    return {
      replyText:
        `Added ${product.name} x${qty}.\n\n` +
        `${formatNumberedOptions(SALE_MORE)}\n\n` +
        `Cart total: KES ${cartTotal(cart)}`,
    };
  }

  private async handleSaleMore(
    session: PosOpsSession,
    text: string,
  ): Promise<PosOpsReply> {
    const choice = matchNumberedOption(text, SALE_MORE);
    if (!choice) {
      return {
        replyText: `${formatNumberedOptions(SALE_MORE)}\n\nCart total: KES ${cartTotal(session.payload.cart)}`,
      };
    }

    if (choice.id === 'add') {
      await this.sessions.save(session, {
        step: POS_OPS_STEPS.SALE_SEARCH,
        payload: session.payload,
      });
      return { replyText: 'Search for the next product (2+ letters).' };
    }

    await this.sessions.save(session, {
      step: POS_OPS_STEPS.SALE_PAYMENT,
      payload: session.payload,
    });
    return {
      replyText: `${formatNumberedOptions(PAYMENT_TYPE)}\n\nTotal: KES ${cartTotal(session.payload.cart)}`,
    };
  }

  private async handleSalePayment(
    session: PosOpsSession,
    text: string,
  ): Promise<PosOpsReply> {
    const choice = matchNumberedOption(text, PAYMENT_TYPE);
    if (!choice) {
      return { replyText: formatNumberedOptions(PAYMENT_TYPE) };
    }

    if (choice.id === 'cash') {
      const total = cartTotal(session.payload.cart);
      await this.sessions.save(session, {
        step: POS_OPS_STEPS.SALE_CONFIRM,
        payload: {
          ...session.payload,
          saleType: 'cash',
          idempotencyKey: randomUUID(),
        },
      });
      return {
        replyText: this.saleConfirmText(
          session.payload.cart ?? [],
          'cash',
          total,
        ),
      };
    }

    await this.sessions.save(session, {
      step: POS_OPS_STEPS.SALE_CREDIT_SEARCH,
      payload: { ...session.payload, saleType: 'credit' },
    });
    return { replyText: 'Credit sale — type customer name or phone to search.' };
  }

  private async handleCustomerSearch(
    session: PosOpsSession,
    phone: string,
    text: string,
    kind: 'sale' | 'credit' | 'pay',
  ): Promise<PosOpsReply> {
    if (text.length < 2) {
      return { replyText: 'Type at least 2 characters to search.' };
    }

    const hits = await this.pos.searchCustomers(phone, text);
    if (!hits.length) {
      return { replyText: 'No customers found. Try another search.' };
    }

    const pendingCustomers: PosListedCustomer[] = hits.map((c) => ({
      id: c.id,
      label: `${c.first_name} ${c.last_name}`.trim(),
      creditBalance: Number(c.credit_balance),
      creditLimit: Number(c.credit_limit),
    }));

    const nextStep =
      kind === 'sale'
        ? POS_OPS_STEPS.SALE_CREDIT_PICK
        : kind === 'credit'
          ? POS_OPS_STEPS.CREDIT_PICK
          : POS_OPS_STEPS.PAY_PICK;

    await this.sessions.save(session, {
      step: nextStep,
      payload: { ...session.payload, pendingCustomers },
    });

    const lines = pendingCustomers.map(
      (c, i) =>
        `${i + 1}  ${c.label} — balance KES ${c.creditBalance}`,
    );
    return { replyText: `Pick a customer:\n${lines.join('\n')}` };
  }

  private async handleSaleCreditPick(
    session: PosOpsSession,
    text: string,
  ): Promise<PosOpsReply> {
    const customer = this.pickCustomer(session, text);
    if (!customer) {
      return { replyText: 'Reply with the customer number from the list.' };
    }

    const total = cartTotal(session.payload.cart);
    await this.sessions.save(session, {
      step: POS_OPS_STEPS.SALE_CONFIRM,
      payload: {
        ...session.payload,
        customerId: customer.id,
        customerLabel: customer.label,
        saleType: 'credit',
        idempotencyKey: randomUUID(),
      },
    });
    return {
      replyText: this.saleConfirmText(
        session.payload.cart ?? [],
        'credit',
        total,
        customer.label,
      ),
    };
  }

  private saleConfirmText(
    cart: PosCartLine[],
    saleType: string,
    total: number,
    customerLabel?: string,
  ): string {
    const lines = cart.map(
      (l) => `• ${l.productName} x${l.quantity} @ ${l.unitPrice}`,
    );
    const cust =
      saleType === 'credit' && customerLabel
        ? `\nCustomer: ${customerLabel}`
        : '';
    return (
      `Confirm this sale?\n${lines.join('\n')}\n` +
      `Type: ${saleType}${cust}\nTotal: KES ${total}\n\n` +
      formatNumberedOptions(CONFIRM)
    );
  }

  private async handleSaleConfirm(
    session: PosOpsSession,
    phone: string,
    text: string,
  ): Promise<PosOpsReply> {
    const choice = matchNumberedOption(text, CONFIRM);
    if (!choice) {
      return { replyText: formatNumberedOptions(CONFIRM) };
    }
    if (choice.id === 'no') {
      await this.sessions.closeOpen(session.conversationId);
      return {
        replyText: 'Sale cancelled. Type anything to open the menu again.',
      };
    }

    const cart = session.payload.cart ?? [];
    const total = cartTotal(cart);
    const saleType = session.payload.saleType ?? 'cash';
    const key = session.payload.idempotencyKey ?? randomUUID();

    const payments =
      saleType === 'cash'
        ? [{ method: 'cash', amount: total }]
        : [{ method: 'credit', amount: 0 }];

    const sale = await this.pos.createSale({
      phone,
      idempotencyKey: key,
      saleType: saleType as 'cash' | 'credit',
      customerId: session.payload.customerId,
      items: cart.map((l) => ({
        product_id: l.productId,
        product_name: l.productName,
        unit_price: l.unitPrice,
        quantity: l.quantity,
      })),
      payments,
      notes: 'WhatsApp POS',
    });

    await this.sessions.close(session, sale.invoice_number);

    return {
      replyText:
        `Sale recorded.\nInvoice: ${sale.invoice_number}\nOrder: ${sale.order_number}\nTotal: KES ${total}\n\nType *reset* for the menu.`,
    };
  }

  private async handleCreditPick(
    session: PosOpsSession,
    text: string,
  ): Promise<PosOpsReply> {
    const customer = this.pickCustomer(session, text);
    if (!customer) {
      return { replyText: 'Reply with the customer number from the list.' };
    }

    await this.sessions.close(session);
    return {
      replyText:
        `${customer.label}\nCredit balance: KES ${customer.creditBalance}\nCredit limit: KES ${customer.creditLimit}\n\nType *reset* for the menu.`,
    };
  }

  private async handlePayPick(
    session: PosOpsSession,
    text: string,
  ): Promise<PosOpsReply> {
    const customer = this.pickCustomer(session, text);
    if (!customer) {
      return { replyText: 'Reply with the customer number from the list.' };
    }

    if (customer.creditBalance <= 0) {
      await this.sessions.close(session);
      return {
        replyText: `${customer.label} has no outstanding balance.\n\nType *reset* for the menu.`,
      };
    }

    await this.sessions.save(session, {
      step: POS_OPS_STEPS.PAY_AMOUNT,
      payload: {
        ...session.payload,
        customerId: customer.id,
        customerLabel: customer.label,
      },
    });
    return {
      replyText: `Balance owing: KES ${customer.creditBalance}\nHow much are they paying?`,
    };
  }

  private async handlePayAmount(
    session: PosOpsSession,
    text: string,
  ): Promise<PosOpsReply> {
    const amount = Number(text.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { replyText: 'Enter an amount greater than zero.' };
    }

    await this.sessions.save(session, {
      step: POS_OPS_STEPS.PAY_METHOD,
      payload: { ...session.payload, amount },
    });
    return { replyText: formatNumberedOptions(PAY_METHOD) };
  }

  private async handlePayMethod(
    session: PosOpsSession,
    text: string,
  ): Promise<PosOpsReply> {
    const choice = matchNumberedOption(text, PAY_METHOD);
    if (!choice) {
      return { replyText: formatNumberedOptions(PAY_METHOD) };
    }

    await this.sessions.save(session, {
      step: POS_OPS_STEPS.PAY_CONFIRM,
      payload: {
        ...session.payload,
        payMethod: choice.id as 'cash' | 'mpesa',
        idempotencyKey: randomUUID(),
      },
    });

    return {
      replyText:
        `Confirm payment?\nCustomer: ${session.payload.customerLabel}\n` +
        `Amount: KES ${session.payload.amount}\nMethod: ${choice.label}\n\n` +
        formatNumberedOptions(CONFIRM),
    };
  }

  private async handlePayConfirm(
    session: PosOpsSession,
    phone: string,
    text: string,
  ): Promise<PosOpsReply> {
    const choice = matchNumberedOption(text, CONFIRM);
    if (!choice) {
      return { replyText: formatNumberedOptions(CONFIRM) };
    }
    if (choice.id === 'no') {
      await this.sessions.closeOpen(session.conversationId);
      return { replyText: 'Payment cancelled. Type anything for the menu.' };
    }

    const customerId = session.payload.customerId;
    const amount = session.payload.amount;
    if (!customerId || !amount) {
      return { replyText: 'Session expired. Type *reset*.' };
    }

    const result = await this.pos.payAccount({
      phone,
      customerId,
      amount,
      method: session.payload.payMethod ?? 'cash',
      idempotencyKey: session.payload.idempotencyKey ?? randomUUID(),
      notes: 'WhatsApp POS',
    });

    await this.sessions.close(session, result.payment_id);

    return {
      replyText:
        `Payment recorded.\nApplied: KES ${result.applied_amount}\n` +
        `New balance: KES ${result.balance_after}\n\nType *reset* for the menu.`,
    };
  }

  private pickCustomer(
    session: PosOpsSession,
    text: string,
  ): PosListedCustomer | null {
    const options = (session.payload.pendingCustomers ?? []).map((c) => ({
      id: c.id,
      label: c.label,
      aliases: [c.label.toLowerCase()],
    }));
    const picked = matchNumberedOption(text, options);
    if (!picked) return null;
    return (
      session.payload.pendingCustomers?.find((c) => c.id === picked.id) ?? null
    );
  }
}

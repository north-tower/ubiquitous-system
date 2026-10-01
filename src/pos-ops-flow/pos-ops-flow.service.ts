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
import { parseQuickSale } from './parse-quick-sale';
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
  { id: 'mpesa', label: 'M-Pesa', aliases: ['mpesa', 'm pesa', 'm-pesa'] },
  { id: 'card', label: 'Direct Bank / Card', aliases: ['card', 'bank', 'direct bank'] },
  { id: 'credit', label: 'Credit (on account)', aliases: ['credit', 'account'] },
];

const PAY_METHOD: NumberedOption[] = [
  { id: 'cash', label: 'Cash', aliases: ['cash'] },
  { id: 'mpesa', label: 'M-Pesa', aliases: ['mpesa', 'm pesa', 'm-pesa'] },
  { id: 'card', label: 'Direct Bank / Card', aliases: ['card', 'bank', 'direct bank'] },
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

      // Fast path: if the user sends a quick-sale line (e.g. "bread 50" or
      // "3 sugar 120 credit john") handle it whether or not a session is open.
      // We only intercept at MENU step (or when there's no active session).
      const quick = parseQuickSale(text);
      if (quick && (!session || session.currentStep === POS_OPS_STEPS.MENU)) {
        return await this.handleQuickSale(conversation, phone, quick, session);
      }

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
      case POS_OPS_STEPS.QUICK_PRODUCT_PICK:
        return this.handleQuickProductPick(session, phone, text);
      case POS_OPS_STEPS.QUICK_CUSTOMER_PICK:
        return this.handleQuickCustomerPick(session, phone, text);
      case POS_OPS_STEPS.QUICK_PAYMENT:
        return this.handleQuickPayment(session, text);
      case POS_OPS_STEPS.QUICK_CONFIRM:
        return this.handleQuickConfirm(session, phone, text);
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
      stock: p.stock,
      sku: p.sku,
    }));

    await this.sessions.save(session, {
      step: POS_OPS_STEPS.SALE_PICK,
      payload: { ...session.payload, pendingProducts },
    });

    const lines = pendingProducts.map((p, i) => {
      const stockHint = p.stock != null ? ` · ${p.stock} in stock` : '';
      const skuHint = p.sku ? ` [${p.sku}]` : '';
      return `${i + 1}  ${p.name}${skuHint} — KES ${p.price}${stockHint}`;
    });
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

    if (choice.id === 'credit') {
      // Credit sale — need a customer
      await this.sessions.save(session, {
        step: POS_OPS_STEPS.SALE_CREDIT_SEARCH,
        payload: { ...session.payload, saleType: 'credit', cashMethod: undefined },
      });
      return { replyText: 'Credit sale — type customer name or phone to search.' };
    }

    // Cash / M-Pesa / Card — payment method is settled, go to confirm
    const cashMethod = choice.id as 'cash' | 'mpesa' | 'card';
    const total = cartTotal(session.payload.cart);
    await this.sessions.save(session, {
      step: POS_OPS_STEPS.SALE_CONFIRM,
      payload: {
        ...session.payload,
        saleType: 'cash',
        cashMethod,
        idempotencyKey: randomUUID(),
      },
    });
    return {
      replyText: this.saleConfirmText(
        session.payload.cart ?? [],
        'cash',
        total,
        undefined,
        cashMethod,
      ),
    };
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
        cashMethod: undefined,
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
    cashMethod?: string,
  ): string {
    const lines = cart.map(
      (l) => `• ${l.productName} x${l.quantity} @ ${l.unitPrice}`,
    );
    const cust =
      saleType === 'credit' && customerLabel
        ? `\nCustomer: ${customerLabel}`
        : '';
    const methodLabel =
      saleType === 'credit'
        ? 'Credit (on account)'
        : cashMethod === 'mpesa'
          ? 'M-Pesa'
          : cashMethod === 'card'
            ? 'Direct Bank / Card'
            : 'Cash';
    return (
      `Confirm this sale?\n${lines.join('\n')}\n` +
      `Payment: ${methodLabel}${cust}\nTotal: KES ${total}\n\n` +
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

    // Credit sales: payments array is empty — the invoice goes on the customer's account.
    // Cash/M-Pesa/Card sales: single payment entry with the actual method.
    const payments =
      saleType === 'credit'
        ? []
        : [{ method: session.payload.cashMethod ?? 'cash', amount: total }];

    const sale = await this.pos.createSale({
      phone,
      idempotencyKey: key,
      saleType,
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

  // ---------------------------------------------------------------------------
  // Quick-sale fast path
  // ---------------------------------------------------------------------------

  private async handleQuickSale(
    conversation: Conversation,
    phone: string,
    quick: ReturnType<typeof parseQuickSale> & {},
    existingSession: PosOpsSession | null,
  ): Promise<PosOpsReply> {
    // Close any stale open session so we start clean
    if (existingSession) {
      await this.sessions.closeOpen(conversation.id);
    }

    // Ensure staff identity (re-open menu implicitly validates auth)
    const identity = await this.pos.identify(phone);
    if (!identity) {
      return { replyText: copy.UNAUTHORISED };
    }

    // Search products
    const hits = await this.pos.searchProducts(phone, quick.productQuery);
    if (!hits.length) {
      return {
        replyText: `No products found for "${quick.productQuery}". Type a menu number or try again.`,
      };
    }

    const basePayload: PosOpsPayload = {
      staffName: identity.staffName,
      storeName: identity.storeName,
      cart: [],
      saleType: quick.saleType,
      flowKind: 'sale',
      quickUnitPrice: quick.unitPrice,
      quickQuantity: quick.quantity,
      quickCustomerQuery: quick.customerQuery ?? undefined,
    };

    if (hits.length === 1) {
      // Exact single hit — use catalog price, not the typed approximation
      return this.quickAfterProduct(conversation, phone, basePayload, {
        id: hits[0].id,
        name: hits[0].name,
        price: hits[0].price,
        stock: hits[0].stock,
        sku: hits[0].sku,
      });
    }

    // Multiple hits — show a rich pick list with catalog price + stock
    const pendingProducts: PosListedProduct[] = hits.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      sku: p.sku,
    }));

    const session = await this.sessions.start(
      conversation.id,
      POS_OPS_STEPS.QUICK_PRODUCT_PICK,
      { ...basePayload, pendingProducts },
    );
    void session;

    const lines = pendingProducts.map((p, i) => {
      const stockHint =
        p.stock != null ? ` · ${p.stock} in stock` : '';
      const skuHint = p.sku ? ` [${p.sku}]` : '';
      return `${i + 1}  ${p.name}${skuHint} — KES ${p.price}${stockHint}`;
    });
    return {
      replyText: `Found ${pendingProducts.length} products. Pick one:\n\n${lines.join('\n')}`,
    };
  }

  private async quickAfterProduct(
    conversation: Conversation,
    phone: string,
    payload: PosOpsPayload,
    product: PosListedProduct,
  ): Promise<PosOpsReply> {
    const qty = payload.quickQuantity ?? 1;
    // Always use the catalog price from the POS system.
    // The staff-typed price was just a parser hint to identify a quick sale,
    // not a price override — variants like Bread 400g vs 600g each have their own price.
    const unitPrice = product.price;

    const cart: PosCartLine[] = [
      {
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: qty,
      },
    ];

    const updatedPayload: PosOpsPayload = {
      ...payload,
      cart,
      pendingProducts: undefined,
    };

    if (payload.saleType === 'credit' && payload.quickCustomerQuery) {
      const customerHits = await this.pos.searchCustomers(
        phone,
        payload.quickCustomerQuery,
      );

      if (!customerHits.length) {
        return {
          replyText: `No customers found for "${payload.quickCustomerQuery}". Type a menu number or try again.`,
        };
      }

      if (customerHits.length === 1) {
        const customer: PosListedCustomer = {
          id: customerHits[0].id,
          label:
            `${customerHits[0].first_name} ${customerHits[0].last_name}`.trim(),
          creditBalance: Number(customerHits[0].credit_balance),
          creditLimit: Number(customerHits[0].credit_limit),
        };
        const finalPayload: PosOpsPayload = {
          ...updatedPayload,
          customerId: customer.id,
          customerLabel: customer.label,
          idempotencyKey: randomUUID(),
        };
        await this.sessions.start(
          conversation.id,
          POS_OPS_STEPS.QUICK_CONFIRM,
          finalPayload,
        );
        return {
          replyText: copy.quickConfirmText(
            product.name,
            unitPrice,
            qty,
            'credit',
            customer.label,
            undefined,
          ),
        };
      }

      // Multiple customers
      const pendingCustomers: PosListedCustomer[] = customerHits.map((c) => ({
        id: c.id,
        label: `${c.first_name} ${c.last_name}`.trim(),
        creditBalance: Number(c.credit_balance),
        creditLimit: Number(c.credit_limit),
      }));

      await this.sessions.start(conversation.id, POS_OPS_STEPS.QUICK_CUSTOMER_PICK, {
        ...updatedPayload,
        pendingCustomers,
      });

      const lines = pendingCustomers.map(
        (c, i) => `${i + 1}  ${c.label} — balance KES ${c.creditBalance}`,
      );
      return {
        replyText: `Multiple customers found. Pick one:\n${lines.join('\n')}`,
      };
    }

    // Cash / M-Pesa / Card sale — ask for payment method first
    await this.sessions.start(
      conversation.id,
      POS_OPS_STEPS.QUICK_PAYMENT,
      { ...updatedPayload, idempotencyKey: randomUUID() },
    );
    return {
      replyText:
        `${product.name} x${qty} — KES ${unitPrice * qty}\n\n` +
        `How is this being paid?\n` +
        formatNumberedOptions(PAY_METHOD),
    };
  }

  private async handleQuickPayment(
    session: PosOpsSession,
    text: string,
  ): Promise<PosOpsReply> {
    const choice = matchNumberedOption(text, PAY_METHOD);
    if (!choice) {
      return {
        replyText:
          `How is this being paid?\n` + formatNumberedOptions(PAY_METHOD),
      };
    }

    const cashMethod = choice.id as 'cash' | 'mpesa' | 'card';
    const cart = session.payload.cart ?? [];
    const first = cart[0];
    const unitPrice = first?.unitPrice ?? 0;
    const qty = first?.quantity ?? 1;

    await this.sessions.save(session, {
      step: POS_OPS_STEPS.QUICK_CONFIRM,
      payload: { ...session.payload, cashMethod },
    });

    return {
      replyText: copy.quickConfirmText(
        first?.productName ?? 'item',
        unitPrice,
        qty,
        'cash',
        undefined,
        cashMethod,
      ),
    };
  }

  private async handleQuickProductPick(
    session: PosOpsSession,
    phone: string,
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

    const product = session.payload.pendingProducts?.find(
      (p) => p.id === picked.id,
    );
    if (!product) {
      return { replyText: 'Session expired. Type *reset*.' };
    }

    await this.sessions.closeOpen(session.conversationId);

    const identity = await this.pos.identify(phone);
    return this.quickAfterProduct(
      { id: session.conversationId } as Conversation,
      phone,
      {
        ...session.payload,
        staffName: identity?.staffName ?? session.payload.staffName,
        storeName: identity?.storeName ?? session.payload.storeName,
      },
      {
        id: product.id,
        name: product.name,
        // Use the catalog price stored in pendingProducts — this is the correct
        // variant price, not the approximate price the staff typed to trigger the parser
        price: product.price,
        stock: product.stock,
        sku: product.sku,
      },
    );
  }

  private async handleQuickCustomerPick(
    session: PosOpsSession,
    phone: string,
    text: string,
  ): Promise<PosOpsReply> {
    const customer = this.pickCustomer(session, text);
    if (!customer) {
      return { replyText: 'Reply with the customer number from the list.' };
    }

    const cart = session.payload.cart ?? [];
    const firstItem = cart[0];
    const unitPrice = firstItem?.unitPrice ?? session.payload.quickUnitPrice ?? 0;
    const qty = firstItem?.quantity ?? session.payload.quickQuantity ?? 1;

    const finalPayload: PosOpsPayload = {
      ...session.payload,
      customerId: customer.id,
      customerLabel: customer.label,
      pendingCustomers: undefined,
      idempotencyKey: randomUUID(),
    };
    await this.sessions.save(session, {
      step: POS_OPS_STEPS.QUICK_CONFIRM,
      payload: finalPayload,
    });

    return {
      replyText: copy.quickConfirmText(
        firstItem?.productName ?? 'item',
        unitPrice,
        qty,
        'credit',
        customer.label,
        undefined,
      ),
    };
  }

  private async handleQuickConfirm(
    session: PosOpsSession,
    phone: string,
    text: string,
  ): Promise<PosOpsReply> {
    const choice = matchNumberedOption(text, CONFIRM);
    if (!choice) {
      const cart = session.payload.cart ?? [];
      const first = cart[0];
      return {
        replyText: copy.quickConfirmText(
          first?.productName ?? 'item',
          first?.unitPrice ?? 0,
          first?.quantity ?? 1,
          session.payload.saleType ?? 'cash',
          session.payload.customerLabel,
          session.payload.cashMethod,
        ),
      };
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

    // Credit sales: payments array is empty — invoice goes on account.
    // Cash/M-Pesa/Card: single payment with the actual method.
    const payments =
      saleType === 'credit'
        ? []
        : [{ method: session.payload.cashMethod ?? 'cash', amount: total }];

    const sale = await this.pos.createSale({
      phone,
      idempotencyKey: key,
      saleType,
      customerId: session.payload.customerId,
      items: cart.map((l) => ({
        product_id: l.productId,
        product_name: l.productName,
        unit_price: l.unitPrice,
        quantity: l.quantity,
      })),
      payments,
      notes: 'WhatsApp POS (quick)',
    });

    await this.sessions.close(session, sale.invoice_number);

    return {
      replyText:
        `✓ Sale recorded.\nInvoice: ${sale.invoice_number}\nOrder: ${sale.order_number}\nTotal: KES ${total}\n\nSend another quick sale or type *reset* for the menu.`,
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

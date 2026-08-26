import { Injectable, Logger, Optional } from '@nestjs/common';
import { EntityExtractionService } from '../../ai-orchestrator/entity-extraction.service';
import {
  formatKes,
  renderValueRevealMessage,
  withDisclaimer,
} from '../demo-copy';
import {
  DemoEngine,
  DemoInputMeta,
  DemoParsePath,
  DemoStepResult,
} from '../demo-engine.types';
import { DemoSimulation } from '../demo-simulation.entity';
import {
  SALON_SERVICES,
  SALON_SLOTS,
  SALON_STEPS,
  type SalonService,
  type SalonSlot,
} from './salon.fixture';
import { matchSalonService, matchSalonSlot } from './salon.parsers';

@Injectable()
export class SalonDemoEngine implements DemoEngine {
  readonly mode = 'salon';
  private readonly logger = new Logger(SalonDemoEngine.name);

  constructor(
    @Optional() private readonly extractor?: EntityExtractionService,
  ) {}

  start(simulation: DemoSimulation): DemoStepResult {
    void simulation;
    return {
      replyText: withDisclaimer(
        [
          'Perfect 😊',
          "For the next couple of minutes, pretend this is your salon's WhatsApp — I'm your receptionist.",
          'Ask me something a customer would normally ask — booking a service, checking a price, whatever comes to mind.',
        ].join('\n'),
        { trailing: true },
      ),
      updatedPayload: {},
      nextStep: SALON_STEPS.AWAITING_SERVICE,
      isComplete: false,
    };
  }

  async handleInput(
    simulation: DemoSimulation,
    userText: string,
    meta?: DemoInputMeta,
  ): Promise<DemoStepResult> {
    const payload = { ...simulation.payload };
    const step = simulation.currentStep;

    if (step === SALON_STEPS.AWAITING_SERVICE) {
      return this.handleService(simulation, payload, userText, meta);
    }
    if (step === SALON_STEPS.AWAITING_SLOT) {
      return this.handleSlot(simulation, payload, userText, meta);
    }
    if (step === SALON_STEPS.COMPLETE) {
      return {
        replyText: withDisclaimer(
          'This simulated salon demo has already finished. Type "reset" to try another example.',
          { trailing: true },
        ),
        updatedPayload: payload,
        nextStep: SALON_STEPS.COMPLETE,
        isComplete: true,
      };
    }

    return this.start(simulation);
  }

  private async handleService(
    simulation: DemoSimulation,
    payload: Record<string, any>,
    userText: string,
    meta?: DemoInputMeta,
  ): Promise<DemoStepResult> {
    const { value: service, parsePath } = await this.resolveService(
      simulation,
      userText,
      meta,
    );
    this.logParsePath(simulation, SALON_STEPS.AWAITING_SERVICE, parsePath);
    if (!service) {
      return {
        replyText: withDisclaimer(
          "I didn't catch which service you meant. Ask the way a customer would — booking, a price check, whatever's on their mind.",
          { trailing: true },
        ),
        updatedPayload: payload,
        nextStep: SALON_STEPS.AWAITING_SERVICE,
        isComplete: false,
        parsePath,
      };
    }

    const nextPayload = {
      ...payload,
      serviceId: service.id,
      serviceName: service.name,
      priceKes: service.priceKes,
    };

    return {
      replyText: withDisclaimer(
        [
          `${service.name} is ${formatKes(service.priceKes)} in this demo.`,
          'When tomorrow would you like to come in?',
        ].join('\n'),
        { trailing: true },
      ),
      updatedPayload: nextPayload,
      nextStep: SALON_STEPS.AWAITING_SLOT,
      isComplete: false,
      parsePath,
    };
  }

  private async handleSlot(
    simulation: DemoSimulation,
    payload: Record<string, any>,
    userText: string,
    meta?: DemoInputMeta,
  ): Promise<DemoStepResult> {
    const { value: slot, parsePath } = await this.resolveSlot(
      simulation,
      userText,
      meta,
    );
    this.logParsePath(simulation, SALON_STEPS.AWAITING_SLOT, parsePath);
    if (!slot) {
      return {
        replyText: withDisclaimer(
          "I didn't catch a time. When tomorrow works for you?",
          { trailing: true },
        ),
        updatedPayload: payload,
        nextStep: SALON_STEPS.AWAITING_SLOT,
        isComplete: false,
        parsePath,
      };
    }

    const nextPayload: Record<string, any> = {
      ...payload,
      slotId: slot.id,
      slotLabel: slot.label,
    };
    const serviceName = String(
      nextPayload.serviceName ?? 'the selected service',
    );
    const priceKes = Number(nextPayload.priceKes ?? 0);

    const confirmation = [
      `Simulated booking created: ${serviceName} tomorrow at ${slot.label} for ${formatKes(priceKes)}.`,
      'Nothing was reserved at a real salon.',
    ].join('\n');

    const valueReveal = renderValueRevealMessage({
      demoKind: 'salon booking demo',
      bullets: [
        `Matched the message to a fixture service (${serviceName}).`,
        `Looked up a fixed demo price (${formatKes(priceKes)}).`,
        `Offered a canned "tomorrow" slot list and stored ${slot.label}.`,
        "Wrote a simulated booking into this conversation's demo payload only — isolated from other prospects.",
      ],
    });

    return {
      replyText: `${confirmation}\n\n${valueReveal}`,
      updatedPayload: nextPayload,
      nextStep: SALON_STEPS.COMPLETE,
      isComplete: true,
      parsePath,
    };
  }

  private async resolveService(
    simulation: DemoSimulation,
    userText: string,
    meta?: DemoInputMeta,
  ): Promise<{ value: SalonService | null; parsePath: DemoParsePath }> {
    const matched = matchSalonService(userText);
    if (matched) {
      return { value: matched, parsePath: 'deterministic' };
    }
    const extracted = await this.fallbackExtract(
      simulation,
      SALON_STEPS.AWAITING_SERVICE,
      userText,
      meta,
    );
    const serviceId =
      extracted.matched === true && typeof extracted.serviceId === 'string'
        ? extracted.serviceId
        : null;
    const service = serviceId
      ? (SALON_SERVICES.find((item) => item.id === serviceId) ?? null)
      : null;
    return {
      value: service,
      parsePath: service ? 'ai-fallback' : 'unparsed',
    };
  }

  private async resolveSlot(
    simulation: DemoSimulation,
    userText: string,
    meta?: DemoInputMeta,
  ): Promise<{ value: SalonSlot | null; parsePath: DemoParsePath }> {
    const matched = matchSalonSlot(userText);
    if (matched) {
      return { value: matched, parsePath: 'deterministic' };
    }
    const extracted = await this.fallbackExtract(
      simulation,
      SALON_STEPS.AWAITING_SLOT,
      userText,
      meta,
    );
    const slotId =
      extracted.matched === true && typeof extracted.slotId === 'string'
        ? extracted.slotId
        : null;
    const slot = slotId
      ? (SALON_SLOTS.find((item) => item.id === slotId) ?? null)
      : null;
    return { value: slot, parsePath: slot ? 'ai-fallback' : 'unparsed' };
  }

  private async fallbackExtract(
    simulation: DemoSimulation,
    step: string,
    userText: string,
    meta?: DemoInputMeta,
  ): Promise<Record<string, any>> {
    if (!this.extractor || !meta?.tenantId || !userText.trim()) {
      return {};
    }
    return this.extractor.extract(this.mode, step, userText, {
      conversationId: simulation.conversationId,
      tenantId: meta.tenantId,
    });
  }

  private logParsePath(
    simulation: DemoSimulation,
    step: string,
    parsePath: DemoParsePath,
  ): void {
    this.logger.log(
      `demo parse path=${parsePath} mode=${this.mode} step=${step} conversation=${simulation.conversationId}`,
    );
  }
}

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
  recommendSolarTier,
  SOLAR_PROPERTY_TYPES,
  SOLAR_STEPS,
  type SolarPropertyType,
} from './solar.fixture';
import { matchSolarPropertyType, parseKesAmount } from './solar.parsers';

@Injectable()
export class SolarDemoEngine implements DemoEngine {
  readonly mode = 'solar';
  private readonly logger = new Logger(SolarDemoEngine.name);

  constructor(
    @Optional() private readonly extractor?: EntityExtractionService,
  ) {}

  start(simulation: DemoSimulation): DemoStepResult {
    void simulation;
    return {
      replyText: withDisclaimer(
        [
          'Perfect 😊',
          "For the next couple of minutes, pretend this is your solar company's WhatsApp — I'm helping a homeowner.",
          'Ask me something a customer would normally ask — the kind of property, monthly electricity spend, whatever comes to mind.',
        ].join('\n'),
        { trailing: true },
      ),
      updatedPayload: {},
      nextStep: SOLAR_STEPS.AWAITING_PROPERTY_TYPE,
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

    if (step === SOLAR_STEPS.AWAITING_PROPERTY_TYPE) {
      return this.handlePropertyType(simulation, payload, userText, meta);
    }
    if (step === SOLAR_STEPS.AWAITING_SPEND) {
      return this.handleSpend(simulation, payload, userText, meta);
    }
    if (step === SOLAR_STEPS.COMPLETE) {
      return {
        replyText: withDisclaimer(
          'This simulated solar demo has already finished. Type "reset" to try another example.',
          { trailing: true },
        ),
        updatedPayload: payload,
        nextStep: SOLAR_STEPS.COMPLETE,
        isComplete: true,
      };
    }

    return this.start(simulation);
  }

  private async handlePropertyType(
    simulation: DemoSimulation,
    payload: Record<string, any>,
    userText: string,
    meta?: DemoInputMeta,
  ): Promise<DemoStepResult> {
    const { value: propertyType, parsePath } = await this.resolvePropertyType(
      simulation,
      userText,
      meta,
    );
    this.logParsePath(
      simulation,
      SOLAR_STEPS.AWAITING_PROPERTY_TYPE,
      parsePath,
    );
    if (!propertyType) {
      return {
        replyText: withDisclaimer(
          "I didn't catch the kind of property. Say it however you would to a real installer.",
          { trailing: true },
        ),
        updatedPayload: payload,
        nextStep: SOLAR_STEPS.AWAITING_PROPERTY_TYPE,
        isComplete: false,
        parsePath,
      };
    }

    return {
      replyText: withDisclaimer(
        [
          `Noted: ${propertyType.label}.`,
          'Roughly how much do you spend on electricity each month?',
        ].join('\n'),
        { trailing: true },
      ),
      updatedPayload: {
        ...payload,
        propertyTypeId: propertyType.id,
        propertyTypeLabel: propertyType.label,
      },
      nextStep: SOLAR_STEPS.AWAITING_SPEND,
      isComplete: false,
      parsePath,
    };
  }

  private async handleSpend(
    simulation: DemoSimulation,
    payload: Record<string, any>,
    userText: string,
    meta?: DemoInputMeta,
  ): Promise<DemoStepResult> {
    const { value: spendKes, parsePath } = await this.resolveSpend(
      simulation,
      userText,
      meta,
    );
    this.logParsePath(simulation, SOLAR_STEPS.AWAITING_SPEND, parsePath);
    if (spendKes === null) {
      return {
        replyText: withDisclaimer(
          "I couldn't read a monthly amount. A figure in KES is enough — even a rough one.",
          { trailing: true },
        ),
        updatedPayload: payload,
        nextStep: SOLAR_STEPS.AWAITING_SPEND,
        isComplete: false,
        parsePath,
      };
    }

    const tier = recommendSolarTier(spendKes);
    const propertyLabel = String(payload.propertyTypeLabel ?? 'the property');
    const nextPayload = {
      ...payload,
      monthlySpendKes: spendKes,
      tierId: tier.id,
      tierLabel: tier.label,
    };

    const summary = [
      'Simulated qualification summary:',
      `• Property: ${propertyLabel}`,
      `• Monthly spend (parsed): ${formatKes(spendKes)}`,
      `• Preliminary tier: ${tier.label}`,
      `• ${tier.summary}`,
      '',
      'This is not a binding solar quote and not a Techfind sale.',
    ].join('\n');

    const valueReveal = renderValueRevealMessage({
      demoKind: 'solar qualification demo',
      bullets: [
        `Matched property type to a fixture option (${propertyLabel}).`,
        `Parsed a monthly spend figure (${formatKes(spendKes)}) with deterministic rules — no AI.`,
        `Mapped that spend onto a fixed recommendation tier (${tier.label}).`,
        "Stored the result only on this conversation's demo payload — not shared with other prospects.",
      ],
    });

    return {
      replyText: `${summary}\n\n${valueReveal}`,
      updatedPayload: nextPayload,
      nextStep: SOLAR_STEPS.COMPLETE,
      isComplete: true,
      parsePath,
    };
  }

  private async resolvePropertyType(
    simulation: DemoSimulation,
    userText: string,
    meta?: DemoInputMeta,
  ): Promise<{ value: SolarPropertyType | null; parsePath: DemoParsePath }> {
    const matched = matchSolarPropertyType(userText);
    if (matched) {
      return { value: matched, parsePath: 'deterministic' };
    }
    const extracted = await this.fallbackExtract(
      simulation,
      SOLAR_STEPS.AWAITING_PROPERTY_TYPE,
      userText,
      meta,
    );
    const propertyTypeId =
      extracted.matched === true && typeof extracted.propertyTypeId === 'string'
        ? extracted.propertyTypeId
        : null;
    const propertyType = propertyTypeId
      ? (SOLAR_PROPERTY_TYPES.find((item) => item.id === propertyTypeId) ??
        null)
      : null;
    return {
      value: propertyType,
      parsePath: propertyType ? 'ai-fallback' : 'unparsed',
    };
  }

  private async resolveSpend(
    simulation: DemoSimulation,
    userText: string,
    meta?: DemoInputMeta,
  ): Promise<{ value: number | null; parsePath: DemoParsePath }> {
    const matched = parseKesAmount(userText);
    if (matched !== null) {
      return { value: matched, parsePath: 'deterministic' };
    }
    const extracted = await this.fallbackExtract(
      simulation,
      SOLAR_STEPS.AWAITING_SPEND,
      userText,
      meta,
    );
    const spend =
      extracted.matched === true &&
      typeof extracted.monthlySpendKes === 'number' &&
      Number.isFinite(extracted.monthlySpendKes)
        ? extracted.monthlySpendKes
        : null;
    return {
      value: spend,
      parsePath: spend !== null ? 'ai-fallback' : 'unparsed',
    };
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

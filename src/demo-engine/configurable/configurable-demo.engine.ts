import { withDisclaimer } from '../demo-copy';
import {
  DemoEngine,
  DemoInputMeta,
  DemoStepResult,
} from '../demo-engine.types';
import { DemoSimulation } from '../demo-simulation.entity';
import type { IndustryFlowDefinitionBody } from '../../industry-flow/industry-flow.types';

const STEP_PREFIX = 'cfg_';

export class ConfigurableDemoEngine implements DemoEngine {
  readonly mode: string;

  constructor(
    demoMode: string,
    private readonly definition: IndustryFlowDefinitionBody,
  ) {
    this.mode = demoMode;
  }

  start(simulation: DemoSimulation): DemoStepResult {
    void simulation;
    const steps = this.definition.steps ?? [];
    const intro =
      this.definition.intro?.trim() ||
      'Pretend you are a customer on WhatsApp. Send your first message.';
    if (steps.length === 0) {
      return {
        replyText: withDisclaimer(intro, { trailing: true }),
        updatedPayload: {},
        nextStep: `${STEP_PREFIX}complete`,
        isComplete: true,
      };
    }
    return {
      replyText: withDisclaimer(intro, { trailing: true }),
      updatedPayload: { scriptStepIndex: 0 },
      nextStep: stepKey(steps[0].id),
      isComplete: false,
    };
  }

  async handleInput(
    simulation: DemoSimulation,
    userText: string,
    _meta?: DemoInputMeta,
  ): Promise<DemoStepResult> {
    void _meta;
    const steps = this.definition.steps ?? [];
    const payload = { ...simulation.payload };
    const index = Number(payload.scriptStepIndex ?? 0);
    const step = steps[index];
    if (!step) {
      return this.complete(payload);
    }

    const answer = userText.trim();
    const minLength = step.minLength ?? 3;
    const valid =
      answer.toLowerCase() === 'none' && step.id === 'extra'
        ? true
        : answer.length >= minLength;
    if (!valid) {
      return {
        replyText: withDisclaimer(step.reask, { trailing: true }),
        updatedPayload: payload,
        nextStep: stepKey(step.id),
        isComplete: false,
      };
    }

    payload[step.id] = answer;
    const nextIndex = index + 1;
    if (nextIndex >= steps.length) {
      return this.complete(payload);
    }

    payload.scriptStepIndex = nextIndex;
    const nextStep = steps[nextIndex];
    return {
      replyText: withDisclaimer(nextStep.prompt, { trailing: true }),
      updatedPayload: payload,
      nextStep: stepKey(nextStep.id),
      isComplete: false,
    };
  }

  private complete(payload: Record<string, unknown>): DemoStepResult {
    const lines = this.definition.customerSummaryTemplate ?? [
      'Simulated journey complete.',
    ];
    const summary = lines
      .map((line) => interpolate(line, payload))
      .join('\n');
    return {
      replyText: withDisclaimer(summary, { trailing: true }),
      updatedPayload: payload,
      nextStep: `${STEP_PREFIX}complete`,
      isComplete: true,
    };
  }
}

function stepKey(id: string): string {
  return `${STEP_PREFIX}${id}`;
}

function interpolate(template: string, payload: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = payload[key];
    return value === undefined || value === null ? '—' : String(value);
  });
}

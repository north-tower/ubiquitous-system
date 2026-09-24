import { withDisclaimer } from '../demo-copy';
import {
  DemoEngine,
  DemoInputMeta,
  DemoStepResult,
} from '../demo-engine.types';
import { DemoSimulation } from '../demo-simulation.entity';
import {
  SCRIPT_DEMO_DEFINITIONS,
  type ScriptDemoDefinition,
} from './script-demo.definitions';

const STEP_PREFIX = 'script_';

export class ScriptDemoEngine implements DemoEngine {
  readonly mode: string;
  private readonly definition: ScriptDemoDefinition;

  constructor(definition: ScriptDemoDefinition) {
    this.mode = definition.mode;
    this.definition = definition;
  }

  static forMode(mode: string): ScriptDemoEngine | null {
    const definition = SCRIPT_DEMO_DEFINITIONS.find((item) => item.mode === mode);
    return definition ? new ScriptDemoEngine(definition) : null;
  }

  start(simulation: DemoSimulation): DemoStepResult {
    void simulation;
    const first = this.definition.steps[0];
    return {
      replyText: withDisclaimer(this.definition.intro, { trailing: true }),
      updatedPayload: { scriptStepIndex: 0 },
      nextStep: stepKey(first.id),
      isComplete: false,
    };
  }

  async handleInput(
    simulation: DemoSimulation,
    userText: string,
    _meta?: DemoInputMeta,
  ): Promise<DemoStepResult> {
    void _meta;
    const payload = { ...simulation.payload };
    const index = Number(payload.scriptStepIndex ?? 0);
    const step = this.definition.steps[index];
    if (!step) {
      return this.complete(simulation, payload);
    }

    const answer = userText.trim();
    const valid =
      answer.toLowerCase() === 'none' && step.id === 'extra'
        ? true
        : answer.length >= step.minLength;
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
    if (nextIndex >= this.definition.steps.length) {
      return this.complete(simulation, payload);
    }

    payload.scriptStepIndex = nextIndex;
    const nextStep = this.definition.steps[nextIndex];
    return {
      replyText: withDisclaimer(nextStep.prompt, { trailing: true }),
      updatedPayload: payload,
      nextStep: stepKey(nextStep.id),
      isComplete: false,
    };
  }

  private complete(
    simulation: DemoSimulation,
    payload: Record<string, unknown>,
  ): DemoStepResult {
    void simulation;
    const summary = this.definition.customerSummary(payload);
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

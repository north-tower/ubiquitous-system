import { DemoSimulation } from './demo-simulation.entity';

export type DemoInputMeta = {
  tenantId: string;
};

export type DemoParsePath = 'deterministic' | 'ai-fallback' | 'unparsed';

export interface DemoEngine {
  readonly mode: string;
  start(simulation: DemoSimulation): DemoStepResult;
  handleInput(
    simulation: DemoSimulation,
    userText: string,
    meta?: DemoInputMeta,
  ): Promise<DemoStepResult>;
}

export interface DemoStepResult {
  replyText: string;
  updatedPayload: Record<string, any>;
  nextStep: string;
  isComplete: boolean;
  parsePath?: DemoParsePath;
}

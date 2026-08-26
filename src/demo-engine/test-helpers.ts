import { DemoSimulation } from './demo-simulation.entity';

export function makeSimulation(
  overrides: Partial<DemoSimulation> = {},
): DemoSimulation {
  return {
    id: 'sim-1',
    conversationId: 'conv-1',
    demoMode: 'salon',
    currentStep: 'start',
    payload: {},
    createdAt: new Date(),
    completedAt: null,
    ...overrides,
  };
}

export function applyStep(
  simulation: DemoSimulation,
  nextStep: string,
  payload: Record<string, any>,
): DemoSimulation {
  return {
    ...simulation,
    currentStep: nextStep,
    payload,
  };
}

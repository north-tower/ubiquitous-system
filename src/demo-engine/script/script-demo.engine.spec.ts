import { ScriptDemoEngine } from './script-demo.engine';
import { SCRIPT_DEMO_DEFINITIONS } from './script-demo.definitions';

describe('ScriptDemoEngine', () => {
  const engine = ScriptDemoEngine.forMode('dental')!;
  const simulation = {
    id: 'sim-1',
    conversationId: 'conv-1',
    demoMode: 'dental',
    currentStep: 'start',
    payload: {},
    completedAt: null,
    createdAt: new Date(),
  };

  it('completes a two-step scripted journey', async () => {
    const start = engine.start(simulation);
    expect(start.isComplete).toBe(false);

    const step1 = await engine.handleInput(simulation, 'Teeth cleaning price?', {
      tenantId: 'tenant-1',
    });
    expect(step1.isComplete).toBe(false);
    simulation.payload = step1.updatedPayload;
    simulation.currentStep = step1.nextStep;

    const done = await engine.handleInput(simulation, 'Weekend please', {
      tenantId: 'tenant-1',
    });
    expect(done.isComplete).toBe(true);
    expect(done.replyText).toMatch(/Simulated dental enquiry/);
  });

  it('registers all script definitions', () => {
    expect(SCRIPT_DEMO_DEFINITIONS.map((def) => def.mode)).toEqual(
      expect.arrayContaining(['dental', 'wines_spirits', 'events', 'generic']),
    );
  });
});

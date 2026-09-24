import { ConfigurableDemoEngine } from './configurable-demo.engine';

describe('ConfigurableDemoEngine', () => {
  const engine = new ConfigurableDemoEngine('retail', {
    intro: 'Welcome customer',
    steps: [
      {
        id: 'ask',
        prompt: 'When do you need it?',
        reask: 'Ask a product question.',
        minLength: 3,
      },
    ],
    customerSummaryTemplate: ['Done: {{ask}}'],
    plaaggInsights: {
      pipelineStage: 'Lead',
      followUp: 'Reply',
      assignee: 'Bot',
      dashboardInsight: 'Demo',
    },
    recommendedPlan: {
      name: 'Starter',
      summary: 'Basic',
      modules: ['Inbox'],
    },
  });

  const simulation = {
    id: 'sim-1',
    conversationId: 'conv-1',
    demoMode: 'retail',
    currentStep: 'start',
    payload: {},
    completedAt: null,
    createdAt: new Date(),
  };

  it('runs a single configured step', async () => {
    const start = engine.start(simulation);
    expect(start.isComplete).toBe(false);
    simulation.payload = start.updatedPayload;
    simulation.currentStep = start.nextStep;

    const done = await engine.handleInput(simulation, 'Price for tiles?', {
      tenantId: 'tenant-1',
    });
    expect(done.isComplete).toBe(true);
    expect(done.replyText).toMatch(/Done: Price for tiles/);
  });
});

import { DEMO_DISCLAIMER } from '../demo-copy';
import { applyStep, makeSimulation } from '../test-helpers';
import { listSolarPropertyTypes, SOLAR_STEPS } from './solar.fixture';
import { SolarDemoEngine } from './solar-demo.engine';

describe('SolarDemoEngine', () => {
  const engine = new SolarDemoEngine();

  it('parses "around 35k" and returns a recommendation plus value reveal', async () => {
    let simulation = makeSimulation({
      conversationId: 'conv-solar-1',
      demoMode: engine.mode,
    });

    const started = engine.start(simulation);
    expect(started.replyText).toContain(DEMO_DISCLAIMER);
    expect(started.replyText.indexOf(DEMO_DISCLAIMER)).toBeGreaterThan(0);
    expect(started.replyText).not.toContain(listSolarPropertyTypes());
    expect(started.replyText.toLowerCase()).not.toContain(
      "what's the property type in this demo",
    );
    simulation = applyStep(
      simulation,
      started.nextStep,
      started.updatedPayload,
    );

    const afterType = await engine.handleInput(simulation, 'bungalow');
    expect(afterType.nextStep).toBe(SOLAR_STEPS.AWAITING_SPEND);
    expect(afterType.replyText).toContain(DEMO_DISCLAIMER);
    expect(afterType.replyText.indexOf(DEMO_DISCLAIMER)).toBeGreaterThan(0);
    expect(afterType.replyText).not.toContain(listSolarPropertyTypes());
    simulation = applyStep(
      simulation,
      afterType.nextStep,
      afterType.updatedPayload,
    );

    const result = await engine.handleInput(simulation, 'around 35k');
    expect(result.isComplete).toBe(true);
    expect(result.updatedPayload.monthlySpendKes).toBe(35000);
    expect(result.updatedPayload.tierId).toBe('standard');
    expect(result.replyText).toContain('Standard home system');
    expect(result.replyText).toContain('behind the scenes');
    expect(result.replyText.toLowerCase()).toContain('not a binding');
  });

  it('parses "KES 40,000" into 40000 and produces a recommendation', async () => {
    const simulation = makeSimulation({
      conversationId: 'conv-solar-2',
      demoMode: engine.mode,
      currentStep: SOLAR_STEPS.AWAITING_SPEND,
      payload: {
        propertyTypeId: 'apartment',
        propertyTypeLabel: 'Apartment',
      },
    });

    const result = await engine.handleInput(simulation, 'KES 40,000');
    expect(result.updatedPayload.monthlySpendKes).toBe(40000);
    expect(result.updatedPayload.tierId).toBe('high_usage');
    expect(result.isComplete).toBe(true);
    expect(result.replyText).toContain('High-usage');
  });

  it('does not leak payload between two conversationIds', async () => {
    const first = applyStep(
      makeSimulation({ conversationId: 'conv-A', demoMode: engine.mode }),
      SOLAR_STEPS.AWAITING_SPEND,
      { propertyTypeId: 'bungalow', propertyTypeLabel: 'Bungalow' },
    );
    const second = applyStep(
      makeSimulation({ conversationId: 'conv-B', demoMode: engine.mode }),
      SOLAR_STEPS.AWAITING_SPEND,
      { propertyTypeId: 'apartment', propertyTypeLabel: 'Apartment' },
    );

    const firstResult = await engine.handleInput(first, 'around 35k');
    const secondResult = await engine.handleInput(second, 'KES 40,000');

    expect(firstResult.updatedPayload.monthlySpendKes).toBe(35000);
    expect(secondResult.updatedPayload.monthlySpendKes).toBe(40000);
    expect(first.payload.monthlySpendKes).toBeUndefined();
    expect(second.payload.monthlySpendKes).toBeUndefined();
  });
});

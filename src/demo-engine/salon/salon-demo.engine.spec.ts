import { DEMO_DISCLAIMER } from '../demo-copy';
import { applyStep, makeSimulation } from '../test-helpers';
import {
  listSalonServices,
  listSalonSlots,
  SALON_STEPS,
} from './salon.fixture';
import { SalonDemoEngine } from './salon-demo.engine';

describe('SalonDemoEngine', () => {
  const engine = new SalonDemoEngine();

  it('starts with roleplay copy, no service menu, and a trailing disclaimer', () => {
    const started = engine.start(
      makeSimulation({
        conversationId: 'conv-salon-1',
        demoMode: engine.mode,
      }),
    );

    expect(started.nextStep).toBe(SALON_STEPS.AWAITING_SERVICE);
    expect(started.isComplete).toBe(false);
    expect(started.replyText).toContain(DEMO_DISCLAIMER);
    expect(started.replyText.indexOf(DEMO_DISCLAIMER)).toBeGreaterThan(0);
    expect(started.replyText).not.toContain(listSalonServices());
    expect(started.replyText.toLowerCase()).not.toContain(
      'reply with a sample service',
    );
    expect(started.replyText).not.toMatch(/cornrows|locs retwist|blow-dry/i);
  });

  it('matches a service from free text without showing the list first', async () => {
    let simulation = makeSimulation({
      conversationId: 'conv-salon-1',
      demoMode: engine.mode,
    });

    const started = engine.start(simulation);
    expect(started.replyText).not.toContain(listSalonServices());

    simulation = applyStep(
      simulation,
      started.nextStep,
      started.updatedPayload,
    );
    const afterService = await engine.handleInput(
      simulation,
      'can I book braids tomorrow?',
    );
    expect(afterService.nextStep).toBe(SALON_STEPS.AWAITING_SLOT);
    expect(afterService.updatedPayload.serviceName).toBe('Braids');
    expect(afterService.updatedPayload.priceKes).toBe(3500);
    expect(afterService.parsePath).toBe('deterministic');
  });

  it('runs enquiry -> slot selection -> booking -> value reveal', async () => {
    let simulation = makeSimulation({
      conversationId: 'conv-salon-1',
      demoMode: engine.mode,
    });

    const started = engine.start(simulation);
    expect(started.nextStep).toBe(SALON_STEPS.AWAITING_SERVICE);
    expect(started.isComplete).toBe(false);
    expect(started.replyText).toContain(DEMO_DISCLAIMER);

    simulation = applyStep(
      simulation,
      started.nextStep,
      started.updatedPayload,
    );
    const afterService = await engine.handleInput(simulation, 'braids please');
    expect(afterService.nextStep).toBe(SALON_STEPS.AWAITING_SLOT);
    expect(afterService.updatedPayload.serviceName).toBe('Braids');
    expect(afterService.updatedPayload.priceKes).toBe(3500);
    expect(afterService.replyText).toContain(DEMO_DISCLAIMER);
    expect(afterService.replyText.indexOf(DEMO_DISCLAIMER)).toBeGreaterThan(0);
    expect(afterService.replyText).not.toContain(listSalonSlots());
    expect(afterService.replyText).not.toMatch(/Reply with 1, 2, or 3/i);

    simulation = applyStep(
      simulation,
      afterService.nextStep,
      afterService.updatedPayload,
    );
    const booked = await engine.handleInput(simulation, '2');
    expect(booked.isComplete).toBe(true);
    expect(booked.nextStep).toBe(SALON_STEPS.COMPLETE);
    expect(booked.updatedPayload.slotLabel).toBe('1:00 PM');
    expect(booked.replyText).toContain('Simulated booking created');
    expect(booked.replyText).toContain('behind the scenes');
    expect(booked.replyText).not.toMatch(/Techfind (is booking|will bill)/i);
  });

  it('handles invalid slot "5" without crashing and stays on slot selection', async () => {
    const simulation = makeSimulation({
      currentStep: SALON_STEPS.AWAITING_SLOT,
      payload: {
        serviceId: 'braids',
        serviceName: 'Braids',
        priceKes: 3500,
      },
    });

    const result = await engine.handleInput(simulation, '5');
    expect(result.isComplete).toBe(false);
    expect(result.nextStep).toBe(SALON_STEPS.AWAITING_SLOT);
    expect(result.updatedPayload.slotId).toBeUndefined();
    expect(result.replyText).toContain(DEMO_DISCLAIMER);
    expect(result.replyText).not.toContain(listSalonSlots());
    expect(result.replyText).not.toMatch(/1\)|2\)|3\)/);
  });

  it('does not leak payload between two conversationIds', async () => {
    const first = makeSimulation({ conversationId: 'conv-A', payload: {} });
    const second = makeSimulation({ conversationId: 'conv-B', payload: {} });

    const firstStart = engine.start(first);
    const secondStart = engine.start(second);

    const firstPicked = await engine.handleInput(
      applyStep(first, firstStart.nextStep, firstStart.updatedPayload),
      'braids',
    );
    const secondPicked = await engine.handleInput(
      applyStep(second, secondStart.nextStep, secondStart.updatedPayload),
      'cornrows',
    );

    expect(firstPicked.updatedPayload.serviceName).toBe('Braids');
    expect(secondPicked.updatedPayload.serviceName).toBe('Cornrows');
    expect(firstPicked.updatedPayload).not.toBe(secondPicked.updatedPayload);
    expect(first.payload).toEqual({});
    expect(second.payload).toEqual({});
  });
});

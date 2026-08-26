import { EntityExtractionService } from '../../ai-orchestrator/entity-extraction.service';
import { OpenAiClientService } from '../../ai-orchestrator/openai-client.service';
import { applyStep, makeSimulation } from '../test-helpers';
import { SALON_STEPS } from './salon.fixture';
import { SalonDemoEngine } from './salon-demo.engine';

describe('SalonDemoEngine AI fallback cost control', () => {
  const completeJson = jest.fn();
  const extractor = new EntityExtractionService({
    completeJson,
  } as unknown as OpenAiClientService);
  const engine = new SalonDemoEngine(extractor);
  const meta = { tenantId: 'tenant-1' };

  beforeEach(() => {
    completeJson.mockReset();
  });

  it('does not call OpenAI when the deterministic parser succeeds', async () => {
    const simulation = applyStep(
      makeSimulation({ currentStep: SALON_STEPS.AWAITING_SERVICE }),
      SALON_STEPS.AWAITING_SERVICE,
      {},
    );

    const result = await engine.handleInput(simulation, 'braids', meta);

    expect(completeJson).not.toHaveBeenCalled();
    expect(result.parsePath).toBe('deterministic');
    expect(result.updatedPayload.serviceId).toBe('braids');
  });

  it('calls OpenAI only after a deterministic miss', async () => {
    completeJson.mockResolvedValue({
      data: { matched: true, serviceId: 'cornrows' },
      usage: { inputTokens: 8, outputTokens: 4, model: 'gpt-4o-mini' },
    });
    const simulation = applyStep(
      makeSimulation({ currentStep: SALON_STEPS.AWAITING_SERVICE }),
      SALON_STEPS.AWAITING_SERVICE,
      {},
    );

    const result = await engine.handleInput(
      simulation,
      'the cane-row style please',
      meta,
    );

    expect(completeJson).toHaveBeenCalledTimes(1);
    expect(result.parsePath).toBe('ai-fallback');
    expect(result.updatedPayload.serviceId).toBe('cornrows');
  });
});

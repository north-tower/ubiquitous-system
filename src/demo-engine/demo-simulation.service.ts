import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DemoEngineResolver } from './demo-engine.resolver';
import { DemoInputMeta, DemoStepResult } from './demo-engine.types';
import { DemoSimulation } from './demo-simulation.entity';

@Injectable()
export class DemoSimulationService {
  constructor(
    @InjectRepository(DemoSimulation)
    private readonly simulations: Repository<DemoSimulation>,
    private readonly engines: DemoEngineResolver,
  ) {}

  async start(
    conversationId: string,
    demoMode: string,
    options?: {
      initialPayload?: Record<string, unknown>;
      tenantId?: string;
    },
  ): Promise<{ simulation: DemoSimulation; result: DemoStepResult }> {
    const engine = await this.engines.resolve(demoMode, options?.tenantId);
    const created = await this.simulations.save(
      this.simulations.create({
        conversationId,
        demoMode,
        currentStep: 'start',
        payload: options?.initialPayload ?? {},
        completedAt: null,
      }),
    );
    const result = engine.start(created);
    return {
      simulation: await this.applyResult(created, result),
      result,
    };
  }

  async handleInput(
    simulation: DemoSimulation,
    userText: string,
    meta?: DemoInputMeta,
  ): Promise<{ simulation: DemoSimulation; result: DemoStepResult }> {
    const engine = await this.engines.resolve(
      simulation.demoMode,
      meta?.tenantId,
    );
    const result = await engine.handleInput(simulation, userText, meta);
    return {
      simulation: await this.applyResult(simulation, result),
      result,
    };
  }

  private async applyResult(
    simulation: DemoSimulation,
    result: DemoStepResult,
  ): Promise<DemoSimulation> {
    simulation.payload = result.updatedPayload;
    simulation.currentStep = result.nextStep;
    simulation.completedAt = result.isComplete ? new Date() : null;
    return this.simulations.save(simulation);
  }

  async findActive(conversationId: string): Promise<DemoSimulation | null> {
    return this.simulations.findOne({
      where: { conversationId, completedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async closeOpen(conversationId: string): Promise<void> {
    await this.simulations
      .createQueryBuilder()
      .update(DemoSimulation)
      .set({ completedAt: new Date() })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('completed_at IS NULL')
      .execute();
  }
}

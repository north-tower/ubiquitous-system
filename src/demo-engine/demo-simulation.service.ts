import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DemoEngineRegistry } from './demo-engine.registry';
import { DemoInputMeta, DemoStepResult } from './demo-engine.types';
import { DemoSimulation } from './demo-simulation.entity';

@Injectable()
export class DemoSimulationService {
  constructor(
    @InjectRepository(DemoSimulation)
    private readonly simulations: Repository<DemoSimulation>,
    private readonly registry: DemoEngineRegistry,
  ) {}

  async start(
    conversationId: string,
    demoMode: string,
  ): Promise<{ simulation: DemoSimulation; result: DemoStepResult }> {
    const engine = this.registry.get(demoMode);
    const created = await this.simulations.save(
      this.simulations.create({
        conversationId,
        demoMode,
        currentStep: 'start',
        payload: {},
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
    const engine = this.registry.get(simulation.demoMode);
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

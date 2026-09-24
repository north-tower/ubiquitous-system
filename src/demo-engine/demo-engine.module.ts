import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiClientModule } from '../ai-orchestrator/ai-client.module';
import { IndustryFlowModule } from '../industry-flow/industry-flow.module';
import { DemoEngineRegistry } from './demo-engine.registry';
import { DemoEngineResolver } from './demo-engine.resolver';
import { DemoSimulation } from './demo-simulation.entity';
import { DemoSimulationService } from './demo-simulation.service';
import { SalonDemoEngine } from './salon/salon-demo.engine';
import { SolarDemoEngine } from './solar/solar-demo.engine';

@Module({
  imports: [
    TypeOrmModule.forFeature([DemoSimulation]),
    AiClientModule,
    IndustryFlowModule,
  ],
  providers: [
    SalonDemoEngine,
    SolarDemoEngine,
    DemoEngineRegistry,
    DemoEngineResolver,
    DemoSimulationService,
  ],
  exports: [DemoEngineRegistry, DemoEngineResolver, DemoSimulationService],
})
export class DemoEngineModule {}

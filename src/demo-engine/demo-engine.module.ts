import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiClientModule } from '../ai-orchestrator/ai-client.module';
import { DemoEngineRegistry } from './demo-engine.registry';
import { DemoSimulation } from './demo-simulation.entity';
import { DemoSimulationService } from './demo-simulation.service';
import { SalonDemoEngine } from './salon/salon-demo.engine';
import { SolarDemoEngine } from './solar/solar-demo.engine';

@Module({
  imports: [TypeOrmModule.forFeature([DemoSimulation]), AiClientModule],
  providers: [
    SalonDemoEngine,
    SolarDemoEngine,
    DemoEngineRegistry,
    DemoSimulationService,
  ],
  exports: [DemoEngineRegistry, DemoSimulationService],
})
export class DemoEngineModule {}

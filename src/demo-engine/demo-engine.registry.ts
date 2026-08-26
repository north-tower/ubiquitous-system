import { Injectable } from '@nestjs/common';
import { DemoEngine } from './demo-engine.types';
import { SalonDemoEngine } from './salon/salon-demo.engine';
import { SolarDemoEngine } from './solar/solar-demo.engine';
import { UnknownDemoModeError } from './unknown-demo-mode.error';

@Injectable()
export class DemoEngineRegistry {
  private readonly engines = new Map<string, DemoEngine>();

  constructor(salon: SalonDemoEngine, solar: SolarDemoEngine) {
    this.engines.set(salon.mode, salon);
    this.engines.set(solar.mode, solar);
  }

  get(demoMode: string): DemoEngine {
    const engine = this.engines.get(demoMode);
    if (!engine) {
      throw new UnknownDemoModeError(demoMode);
    }
    return engine;
  }
}

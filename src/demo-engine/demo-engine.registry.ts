import { Injectable } from '@nestjs/common';
import { DemoEngine } from './demo-engine.types';
import { ScriptDemoEngine } from './script/script-demo.engine';
import { SCRIPT_DEMO_DEFINITIONS } from './script/script-demo.definitions';
import { SalonDemoEngine } from './salon/salon-demo.engine';
import { SolarDemoEngine } from './solar/solar-demo.engine';
import { UnknownDemoModeError } from './unknown-demo-mode.error';

@Injectable()
export class DemoEngineRegistry {
  private readonly engines = new Map<string, DemoEngine>();

  constructor(salon: SalonDemoEngine, solar: SolarDemoEngine) {
    this.engines.set(salon.mode, salon);
    this.engines.set(solar.mode, solar);
    for (const definition of SCRIPT_DEMO_DEFINITIONS) {
      this.engines.set(definition.mode, new ScriptDemoEngine(definition));
    }
  }

  /** Built-in TypeScript engines (salon, solar, legacy script modes). */
  getBuiltin(demoMode: string): DemoEngine {
    const engine = this.engines.get(demoMode);
    if (!engine) {
      throw new UnknownDemoModeError(demoMode);
    }
    return engine;
  }

  /** @deprecated Prefer DemoEngineResolver.resolve for tenant-aware flows. */
  get(demoMode: string): DemoEngine {
    return this.getBuiltin(demoMode);
  }
}

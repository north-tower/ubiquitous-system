import { Injectable } from '@nestjs/common';
import { ConfigurableDemoEngine } from './configurable/configurable-demo.engine';
import { DemoEngineRegistry } from './demo-engine.registry';
import { DemoEngine } from './demo-engine.types';
import { IndustryFlowService } from '../industry-flow/industry-flow.service';
import { UnknownDemoModeError } from './unknown-demo-mode.error';

@Injectable()
export class DemoEngineResolver {
  constructor(
    private readonly registry: DemoEngineRegistry,
    private readonly industryFlows: IndustryFlowService,
  ) {}

  async resolve(demoMode: string, tenantId?: string): Promise<DemoEngine> {
    if (tenantId) {
      const configured = await this.industryFlows.findByDemoMode(
        tenantId,
        demoMode,
      );
      if (configured?.engineKind === 'script') {
        return new ConfigurableDemoEngine(
          configured.demoMode,
          configured.definition,
        );
      }
    }

    try {
      return this.registry.getBuiltin(demoMode);
    } catch (error) {
      if (error instanceof UnknownDemoModeError && tenantId) {
        const configured = await this.industryFlows.findByDemoMode(
          tenantId,
          demoMode,
        );
        if (configured) {
          return new ConfigurableDemoEngine(
            configured.demoMode,
            configured.definition,
          );
        }
      }
      throw error;
    }
  }
}

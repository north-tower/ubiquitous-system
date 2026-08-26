import { DemoEngineRegistry } from './demo-engine.registry';
import { SalonDemoEngine } from './salon/salon-demo.engine';
import { SolarDemoEngine } from './solar/solar-demo.engine';
import { UnknownDemoModeError } from './unknown-demo-mode.error';

describe('DemoEngineRegistry', () => {
  const registry = new DemoEngineRegistry(
    new SalonDemoEngine(),
    new SolarDemoEngine(),
  );

  it('returns the salon and solar engines by mode', () => {
    expect(registry.get('salon').mode).toBe('salon');
    expect(registry.get('solar').mode).toBe('solar');
  });

  it('throws a clear error for an unregistered mode like furniture', () => {
    expect(() => registry.get('furniture')).toThrow(UnknownDemoModeError);
    expect(() => registry.get('furniture')).toThrow(
      'Unknown demo mode: furniture',
    );
  });
});

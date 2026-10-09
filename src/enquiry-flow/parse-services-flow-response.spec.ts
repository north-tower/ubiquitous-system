import {
  normalizeFlowOptionId,
  parseServicesFlowInbound,
} from './parse-services-flow-response';

describe('parseServicesFlowInbound', () => {
  it('reads MULTI_SELECT ids from InteractiveData flowResponse', () => {
    const raw = JSON.stringify({
      flowResponse: {
        flow_token: 'tok-1',
        screen_0_services_0: ['0_sound_pa', '1_lighting'],
      },
    });
    expect(parseServicesFlowInbound(raw)).toBe('sound_pa, lighting');
  });

  it('reads flat FlowData payloads', () => {
    const raw = JSON.stringify({
      flow_token: 'tok-2',
      screen_0_services_0: ['sound_pa', 'dj'],
    });
    expect(parseServicesFlowInbound(raw)).toBe('sound_pa, dj');
  });

  it('returns null for non-flow JSON', () => {
    expect(parseServicesFlowInbound('{"hello":"world"}')).toBeNull();
  });
});

describe('normalizeFlowOptionId', () => {
  it('strips numeric index prefixes', () => {
    expect(normalizeFlowOptionId('2_full')).toBe('full');
    expect(normalizeFlowOptionId('other')).toBe('other');
  });
});

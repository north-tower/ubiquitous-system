import { ConfigService } from '@nestjs/config';
import {
  baileysSendCompanionTextBeforeList,
  isBaileysDebug,
  previewBaileysText,
} from './baileys-debug';

describe('baileys-debug', () => {
  it('detects BAILEYS_DEBUG', () => {
    const config = {
      get: (key: string) => (key === 'BAILEYS_DEBUG' ? 'true' : undefined),
    } as ConfigService;
    expect(isBaileysDebug(config)).toBe(true);
  });

  it('defaults companion text before list to on', () => {
    const config = { get: () => undefined } as ConfigService;
    expect(baileysSendCompanionTextBeforeList(config)).toBe(true);
  });

  it('truncates previews', () => {
    expect(previewBaileysText('a'.repeat(200), 20).endsWith('…')).toBe(true);
  });
});

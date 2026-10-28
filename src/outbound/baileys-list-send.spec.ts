import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import {
  buildBaileysListProtoMessage,
  buildBaileysNativeFlowListMessage,
  buildBaileysPollSendContent,
  resolveBaileysListWireFormat,
} from './baileys-list-send';

const sampleList = {
  kind: 'list' as const,
  text: 'What are you planning?',
  title: 'Event type',
  buttonText: 'Choose event type',
  sections: [
    {
      title: 'Event type',
      rows: [{ title: 'Wedding', rowId: 'wedding' }],
    },
  ],
};

describe('buildBaileysListProtoMessage', () => {
  it('builds listMessage proto without a top-level text field', () => {
    const proto = buildBaileysListProtoMessage(sampleList);
    expect(proto.listMessage.buttonText).toBe('Choose event type');
    expect(proto).not.toHaveProperty('text');
  });
});

describe('buildBaileysNativeFlowListMessage', () => {
  it('includes messageSecret for reporting tokens', () => {
    const secret = randomBytes(32);
    const proto = buildBaileysNativeFlowListMessage(sampleList, secret);
    expect(proto.messageContextInfo.messageSecret).toBe(secret);
    const button = proto.interactiveMessage.nativeFlowMessage.buttons[0];
    expect(button.name).toBe('single_select');
    const params = JSON.parse(button.buttonParamsJson) as {
      sections: { rows: { id: string }[] }[];
    };
    expect(params.sections[0].rows[0].id).toBe('wedding');
  });
});

describe('buildBaileysPollSendContent', () => {
  it('builds a single-select poll from list rows', () => {
    const poll = buildBaileysPollSendContent(sampleList);
    expect(poll.poll.selectableCount).toBe(1);
    expect(poll.poll.values).toEqual(['Wedding']);
  });

  it('honours pollSelectableCount for multi-select menus', () => {
    const poll = buildBaileysPollSendContent({
      ...sampleList,
      pollSelectableCount: 3,
      sections: [
        {
          title: 'Services',
          rows: [
            { title: 'Sound & PA', rowId: 'sound_pa' },
            { title: 'Lighting', rowId: 'lighting' },
            { title: 'DJ', rowId: 'dj' },
          ],
        },
      ],
    });
    expect(poll.poll.selectableCount).toBe(3);
  });
});

describe('resolveBaileysListWireFormat', () => {
  it('defaults to poll', () => {
    const config = { get: () => undefined } as ConfigService;
    expect(resolveBaileysListWireFormat(config)).toBe('poll');
  });

  it('allows native_flow override', () => {
    const config = {
      get: (key: string) =>
        key === 'BAILEYS_LIST_FORMAT' ? 'native_flow' : undefined,
    } as ConfigService;
    expect(resolveBaileysListWireFormat(config)).toBe('native_flow');
  });

  it('allows text menu override', () => {
    const config = {
      get: (key: string) =>
        key === 'BAILEYS_LIST_FORMAT' ? 'text' : undefined,
    } as ConfigService;
    expect(resolveBaileysListWireFormat(config)).toBe('text');
  });
});

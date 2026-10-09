import { ConfigService } from '@nestjs/config';
import { resolveEnquiryTwilioContentForSend } from './resolve-enquiry-twilio-content-send';

describe('resolveEnquiryTwilioContentForSend', () => {
  it('prefers the services Flow SID when configured', () => {
    const config = {
      get: (key: string) => {
        if (key === 'TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID') {
          return 'HXflow';
        }
        if (key === 'TWILIO_ENQUIRY_SERVICES_CONTENT_SID') {
          return 'HXlist';
        }
        return undefined;
      },
    } as unknown as ConfigService;

    const resolved = resolveEnquiryTwilioContentForSend(config, 'services', {
      text: 'Pick services',
    });
    expect(resolved?.contentSid).toBe('HXflow');
    expect(resolved?.contentVariables?.['1']).toMatch(
      /^[0-9a-f-]{36}$/i,
    );
  });

  it('falls back to the services list SID when Flow is unset', () => {
    const config = {
      get: (key: string) => {
        if (key === 'TWILIO_ENQUIRY_SERVICES_CONTENT_SID') {
          return 'HXlist';
        }
        return undefined;
      },
    } as unknown as ConfigService;

    const resolved = resolveEnquiryTwilioContentForSend(config, 'services', {
      text: 'Pick services',
      twilioContentVariables: { '1': 'Question line' },
    });
    expect(resolved).toEqual({
      contentSid: 'HXlist',
      contentVariables: { '1': 'Question line' },
    });
  });
});

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
    expect(resolved?.contentVariables).toBeUndefined();
  });

  it('sends flow_token {{1}} when TWILIO_ENQUIRY_SERVICES_FLOW_SEND_FLOW_TOKEN is set', () => {
    const config = {
      get: (key: string) => {
        if (key === 'TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID') {
          return 'HXflow';
        }
        if (key === 'TWILIO_ENQUIRY_SERVICES_FLOW_SEND_FLOW_TOKEN') {
          return 'true';
        }
        return undefined;
      },
    } as unknown as ConfigService;

    const resolved = resolveEnquiryTwilioContentForSend(config, 'services', {
      text: 'Pick services',
      twilioContentVariables: { '1': 'Should not use list-picker line' },
    });
    expect(resolved?.contentSid).toBe('HXflow');
    expect(resolved?.contentVariables?.['1']).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('omits list body {{1}} when TWILIO_ENQUIRY_SERVICES_LIST_SEND_BODY_VARIABLE is false', () => {
    const config = {
      get: (key: string) => {
        if (key === 'TWILIO_ENQUIRY_SERVICES_CONTENT_SID') {
          return 'HXlist';
        }
        if (key === 'TWILIO_ENQUIRY_SERVICES_LIST_SEND_BODY_VARIABLE') {
          return 'false';
        }
        return undefined;
      },
    } as unknown as ConfigService;

    const resolved = resolveEnquiryTwilioContentForSend(config, 'services', {
      text: 'Pick services',
      twilioContentVariables: { '1': 'Question line' },
    });
    expect(resolved?.contentVariables).toBeUndefined();
    expect(resolved?.trace.outboundVariableKeys).toEqual([]);
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
    expect(resolved).toMatchObject({
      contentSid: 'HXlist',
      contentVariables: { '1': 'Question line' },
      trace: {
        sidSource: 'services_list',
        servicesFlowSidConfigured: false,
      },
    });
  });
});

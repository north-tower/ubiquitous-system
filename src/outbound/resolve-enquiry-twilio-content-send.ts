import { randomUUID } from 'crypto';
import type { ConfigService } from '@nestjs/config';
import {
  type EnquiryTwilioContentKey,
  enquiryTwilioContentEnvVar,
} from '../enquiry-flow/enquiry-twilio-reply';

export function resolveEnquiryTwilioContentForSend(
  config: ConfigService,
  key: EnquiryTwilioContentKey,
  input: {
    twilioContentVariables?: Record<string, string>;
    text: string;
  },
): { contentSid: string; contentVariables?: Record<string, string> } | null {
  if (key === 'services') {
    const flowSid = config
      .get<string>('TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID')
      ?.trim();
    if (flowSid) {
      // twilio/flows templates in Content Template Builder are usually static (no {{1}}).
      // Sending ContentVariables then triggers Twilio 21656. Opt in for whatsapp/flows with flow_token.
      if (servicesFlowSendFlowToken(config)) {
        return {
          contentSid: flowSid,
          contentVariables: flowContentVariables(undefined),
        };
      }
      return { contentSid: flowSid };
    }
  }

  const envKey = enquiryTwilioContentEnvVar(key);
  const contentSid = config.get<string>(envKey)?.trim();
  if (!contentSid) {
    return null;
  }
  return {
    contentSid,
    contentVariables: input.twilioContentVariables,
  };
}

function servicesFlowSendFlowToken(config: ConfigService): boolean {
  const raw = config
    .get<string>('TWILIO_ENQUIRY_SERVICES_FLOW_SEND_FLOW_TOKEN')
    ?.trim()
    .toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

/** whatsapp/flows templates often bind flow_token to {{1}}. */
function flowContentVariables(
  existing: Record<string, string> | undefined,
): Record<string, string> {
  if (existing?.['1']?.trim()) {
    return { ...existing };
  }
  return { ...existing, '1': randomUUID() };
}

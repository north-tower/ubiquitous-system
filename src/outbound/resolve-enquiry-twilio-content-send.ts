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
      return {
        contentSid: flowSid,
        contentVariables: flowContentVariables(input.twilioContentVariables),
      };
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

/** whatsapp/flows templates often bind flow_token to {{1}}. */
function flowContentVariables(
  existing: Record<string, string> | undefined,
): Record<string, string> {
  if (existing?.['1']?.trim()) {
    return { ...existing };
  }
  return { ...existing, '1': randomUUID() };
}

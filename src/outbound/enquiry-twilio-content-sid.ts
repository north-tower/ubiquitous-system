import type { ConfigService } from '@nestjs/config';
import {
  type EnquiryTwilioContentKey,
  enquiryTwilioContentEnvVar,
} from '../enquiry-flow/enquiry-twilio-reply';

export function resolveEnquiryTwilioContentSid(
  config: ConfigService,
  key: EnquiryTwilioContentKey,
): string | null {
  const sid = config.get<string>(enquiryTwilioContentEnvVar(key))?.trim();
  return sid ? sid : null;
}

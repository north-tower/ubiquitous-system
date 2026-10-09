import { randomUUID } from 'crypto';
import type { ConfigService } from '@nestjs/config';
import {
  type EnquiryTwilioContentKey,
  enquiryTwilioContentEnvVar,
} from '../enquiry-flow/enquiry-twilio-reply';
import { TWILIO_ENQUIRY_CONTENT_ENV } from '../enquiry-flow/enquiry-twilio-content';

export type EnquiryTwilioContentSidSource =
  | 'services_flow'
  | 'services_list'
  | 'env';

export type EnquiryTwilioContentSendTrace = {
  contentKey: EnquiryTwilioContentKey;
  sidSource: EnquiryTwilioContentSidSource;
  sidEnvVar: string;
  servicesFlowSidConfigured: boolean;
  servicesListSidConfigured: boolean;
  sendFlowTokenEnabled: boolean;
  /** Variables on the outbound job before resolution (e.g. list-picker {{1}}). */
  inboundVariableKeys: string[];
  /** Variables actually sent to Twilio after resolution. */
  outboundVariableKeys: string[];
  /** True when Flow template is used without flow_token (inbound vars stripped). */
  droppedInboundVariablesForFlow: boolean;
};

export type EnquiryTwilioContentSendPlan = {
  contentSid: string;
  contentVariables?: Record<string, string>;
  trace: EnquiryTwilioContentSendTrace;
};

export function resolveEnquiryTwilioContentForSend(
  config: ConfigService,
  key: EnquiryTwilioContentKey,
  input: {
    twilioContentVariables?: Record<string, string>;
    text: string;
  },
): EnquiryTwilioContentSendPlan | null {
  const inboundVariableKeys = Object.keys(input.twilioContentVariables ?? {});
  const flowSid = config
    .get<string>('TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID')
    ?.trim();
  const listSid = config
    .get<string>(TWILIO_ENQUIRY_CONTENT_ENV.services)
    ?.trim();
  const sendFlowToken = servicesFlowSendFlowToken(config);

  if (key === 'services') {
    if (flowSid) {
      const droppedInboundVariablesForFlow = inboundVariableKeys.length > 0 && !sendFlowToken;
      if (sendFlowToken) {
        const contentVariables = flowContentVariables(undefined);
        return {
          contentSid: flowSid,
          contentVariables,
          trace: {
            contentKey: key,
            sidSource: 'services_flow',
            sidEnvVar: TWILIO_ENQUIRY_CONTENT_ENV.servicesFlow,
            servicesFlowSidConfigured: true,
            servicesListSidConfigured: Boolean(listSid),
            sendFlowTokenEnabled: true,
            inboundVariableKeys,
            outboundVariableKeys: Object.keys(contentVariables),
            droppedInboundVariablesForFlow: false,
          },
        };
      }
      return {
        contentSid: flowSid,
        trace: {
          contentKey: key,
          sidSource: 'services_flow',
          sidEnvVar: TWILIO_ENQUIRY_CONTENT_ENV.servicesFlow,
          servicesFlowSidConfigured: true,
          servicesListSidConfigured: Boolean(listSid),
          sendFlowTokenEnabled: false,
          inboundVariableKeys,
          outboundVariableKeys: [],
          droppedInboundVariablesForFlow,
        },
      };
    }
  }

  const envKey = enquiryTwilioContentEnvVar(key);
  const contentSid = config.get<string>(envKey)?.trim();
  if (!contentSid) {
    return null;
  }
  const sidSource: EnquiryTwilioContentSidSource =
    key === 'services' ? 'services_list' : 'env';
  const outboundVariableKeys = Object.keys(input.twilioContentVariables ?? {});
  return {
    contentSid,
    contentVariables: input.twilioContentVariables,
    trace: {
      contentKey: key,
      sidSource,
      sidEnvVar: envKey,
      servicesFlowSidConfigured: Boolean(flowSid),
      servicesListSidConfigured: Boolean(listSid),
      sendFlowTokenEnabled: sendFlowToken,
      inboundVariableKeys,
      outboundVariableKeys,
      droppedInboundVariablesForFlow: false,
    },
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

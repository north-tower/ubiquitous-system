import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TWILIO_ENQUIRY_CONTENT_ENV } from '../enquiry-flow/enquiry-twilio-content';
import { maskContentSid } from './twilio-content-send-debug';

@Injectable()
export class TwilioEnquiryContentConfigService implements OnModuleInit {
  private readonly logger = new Logger(TwilioEnquiryContentConfigService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (!this.config.get<string>('TWILIO_ACCOUNT_SID')?.trim()) {
      return;
    }
    const flowSid = this.config
      .get<string>(TWILIO_ENQUIRY_CONTENT_ENV.servicesFlow)
      ?.trim();
    const listSid = this.config
      .get<string>(TWILIO_ENQUIRY_CONTENT_ENV.services)
      ?.trim();

    if (flowSid) {
      this.logger.log(
        `Enquiry services: Flow template ${maskContentSid(flowSid)} (${TWILIO_ENQUIRY_CONTENT_ENV.servicesFlow})`,
      );
      return;
    }

    if (listSid) {
      this.logger.warn(
        `Enquiry services: ${TWILIO_ENQUIRY_CONTENT_ENV.servicesFlow} is unset — using list template ${maskContentSid(listSid)} only. Multi-select Flow will not be sent until you set the Flow Content SID and restart the API.`,
      );
      return;
    }

    this.logger.warn(
      `Enquiry services: neither ${TWILIO_ENQUIRY_CONTENT_ENV.servicesFlow} nor ${TWILIO_ENQUIRY_CONTENT_ENV.services} is set — services step will send plain text only.`,
    );
  }
}

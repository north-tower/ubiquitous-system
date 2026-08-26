import { Body, Controller, Logger, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Controller('webhooks/twilio')
export class TwilioWebhookController {
  private readonly logger = new Logger(TwilioWebhookController.name);

  constructor(private readonly webhook: WhatsappWebhookService) {}

  @Post()
  async receive(@Body() body: unknown, @Res() res: Response): Promise<void> {
    // Twilio times out the webhook (~15s) and shows 502 if we wait for
    // orchestrator + OpenAI + outbound. ACK empty TwiML first, then reply via REST.
    res.status(200).contentType('text/xml').send('<Response></Response>');
    try {
      await this.webhook.handleTwilioInbound(body);
    } catch (error) {
      this.logger.error(
        `Twilio inbound failed after ACK: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

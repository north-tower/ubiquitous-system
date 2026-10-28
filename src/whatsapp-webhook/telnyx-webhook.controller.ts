import { Body, Controller, Logger, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { readTelnyxWebhookEventType } from './parse-telnyx';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Controller('webhooks/telnyx')
export class TelnyxWebhookController {
  private readonly logger = new Logger(TelnyxWebhookController.name);

  constructor(private readonly webhook: WhatsappWebhookService) {}

  @Post()
  async receive(@Body() body: unknown, @Res() res: Response): Promise<void> {
    res.status(200).json({ received: true });
    this.logger.log(
      `Telnyx webhook POST event_type=${readTelnyxWebhookEventType(body) ?? 'unknown'}`,
    );
    try {
      await this.webhook.handleTelnyxInbound(body);
    } catch (error) {
      this.logger.error(
        `Telnyx inbound failed after ACK: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

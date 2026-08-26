import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Controller('webhooks/whatsapp')
export class WhatsappWebhookController {
  constructor(private readonly webhook: WhatsappWebhookService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
  ): string {
    return this.webhook.verifySubscription(mode, token, challenge);
  }

  @Post()
  @HttpCode(200)
  async receive(@Body() body: unknown): Promise<{ received: true }> {
    await this.webhook.handleInbound(body);
    return { received: true };
  }
}

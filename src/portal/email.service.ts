import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';

export type SendEmailResult =
  | { status: 'sent'; providerId: string }
  | { status: 'failed'; error: string }
  | { status: 'unavailable'; reason: 'EMAIL_NOT_CONFIGURED' };

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type EmailConfig = {
  provider: string;
  apiKey: string;
  from: string;
  mailgunDomain?: string;
  mailgunUrl?: string;
};

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return this.readConfig() !== null;
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const emailConfig = this.readConfig();
    if (!emailConfig) {
      return { status: 'unavailable', reason: 'EMAIL_NOT_CONFIGURED' };
    }

    if (emailConfig.provider === 'mailgun') {
      return this.sendViaMailgun(emailConfig, input);
    }

    if (emailConfig.provider === 'resend') {
      return this.sendViaResend(emailConfig, input);
    }

    return {
      status: 'failed',
      error: `Unknown EMAIL_PROVIDER: ${emailConfig.provider}`,
    };
  }

  private readConfig(): EmailConfig | null {
    const provider = this.config.get<string>('EMAIL_PROVIDER');
    const apiKey = this.config.get<string>('EMAIL_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM_ADDRESS');
    if (!provider || !apiKey || !from) {
      return null;
    }

    if (provider === 'mailgun') {
      const mailgunDomain = this.config.get<string>('MAILGUN_DOMAIN');
      if (!mailgunDomain) {
        return null;
      }
      return {
        provider,
        apiKey,
        from,
        mailgunDomain,
        mailgunUrl: this.config.get<string>('MAILGUN_URL'),
      };
    }

    return { provider, apiKey, from };
  }

  private async sendViaMailgun(
    emailConfig: EmailConfig,
    input: SendEmailInput,
  ): Promise<SendEmailResult> {
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: 'api',
      key: emailConfig.apiKey,
      ...(emailConfig.mailgunUrl ? { url: emailConfig.mailgunUrl } : {}),
    });

    try {
      const data = await mg.messages.create(emailConfig.mailgunDomain!, {
        from: emailConfig.from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      const providerId =
        typeof data.id === 'string' && data.id.length > 0 ? data.id : 'mailgun';
      return { status: 'sent', providerId };
    } catch (err) {
      return {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown Mailgun error',
      };
    }
  }

  private async sendViaResend(
    emailConfig: EmailConfig,
    input: SendEmailInput,
  ): Promise<SendEmailResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${emailConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailConfig.from,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        return { status: 'failed', error: `Resend ${res.status}: ${body}` };
      }

      const data = (await res.json()) as { id: string };
      return { status: 'sent', providerId: data.id };
    } catch (err) {
      return {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}

export type WhatsappChannel = 'meta' | 'twilio';

export type WhatsappSendResult = {
  channel: WhatsappChannel;
  messageId: string | null;
  raw: unknown;
};

export interface WhatsappSender {
  readonly channel: WhatsappChannel;
  isConfigured(): boolean;
  sendText(
    to: string,
    body: string,
  ): Promise<Omit<WhatsappSendResult, 'channel'>>;
}

export function toDigits(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export function toWhatsappAddress(phone: string): string {
  if (phone.startsWith('whatsapp:')) {
    return phone;
  }
  const digits = toDigits(phone);
  return `whatsapp:+${digits}`;
}

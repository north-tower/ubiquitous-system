export const TENANT_PRIMARY_CHANNELS = ['baileys', 'twilio', 'telnyx'] as const;
export type TenantPrimaryChannel = (typeof TENANT_PRIMARY_CHANNELS)[number];

export const DEFAULT_TENANT_PRIMARY_CHANNEL: TenantPrimaryChannel = 'baileys';

export function isTenantPrimaryChannel(
  value: string,
): value is TenantPrimaryChannel {
  return (TENANT_PRIMARY_CHANNELS as readonly string[]).includes(value);
}

/** Hosted BSP channels — no Baileys QR pairing. */
export function isHostedWhatsappPrimaryChannel(
  channel: TenantPrimaryChannel | null | undefined,
): boolean {
  return channel === 'twilio' || channel === 'telnyx';
}

export const TENANT_PRIMARY_CHANNELS = ['baileys', 'twilio'] as const;
export type TenantPrimaryChannel = (typeof TENANT_PRIMARY_CHANNELS)[number];

export const DEFAULT_TENANT_PRIMARY_CHANNEL: TenantPrimaryChannel = 'baileys';

export function isTenantPrimaryChannel(
  value: string,
): value is TenantPrimaryChannel {
  return (TENANT_PRIMARY_CHANNELS as readonly string[]).includes(value);
}

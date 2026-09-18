export const TENANT_FLOWS = ['techfind_demo', 'enquiry_intake'] as const;
export type TenantFlow = (typeof TENANT_FLOWS)[number];

export const DEFAULT_TENANT_FLOW: TenantFlow = 'techfind_demo';

export function isTenantFlow(value: string): value is TenantFlow {
  return (TENANT_FLOWS as readonly string[]).includes(value);
}

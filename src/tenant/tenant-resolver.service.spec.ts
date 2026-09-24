import { Tenant } from './tenant.entity';
import { TenantResolverService } from './tenant-resolver.service';
import { TenantService } from './tenant.service';

describe('TenantResolverService', () => {
  const tenantService = {
    findByWhatsappPhoneNumberId: jest.fn(),
    findDefault: jest.fn(),
    findById: jest.fn(),
  };

  const resolver = new TenantResolverService(
    tenantService as unknown as TenantService,
  );

  beforeEach(() => {
    tenantService.findByWhatsappPhoneNumberId.mockReset();
    tenantService.findDefault.mockReset();
    tenantService.findById.mockReset();
  });

  it('maps a Meta phone_number_id to a Tenant', async () => {
    const tenant = { id: 'tenant-1', name: 'Techfind Consulting' } as Tenant;
    tenantService.findByWhatsappPhoneNumberId.mockResolvedValue(tenant);

    await expect(resolver.resolveByWhatsappPhoneNumberId('123')).resolves.toBe(
      tenant,
    );
    expect(tenantService.findByWhatsappPhoneNumberId).toHaveBeenCalledWith(
      '123',
    );
  });

  it('returns null when no tenant matches', async () => {
    tenantService.findByWhatsappPhoneNumberId.mockResolvedValue(null);
    await expect(
      resolver.resolveByWhatsappPhoneNumberId('unknown'),
    ).resolves.toBeNull();
  });

  it('returns null for an empty phone_number_id', async () => {
    await expect(
      resolver.resolveByWhatsappPhoneNumberId(''),
    ).resolves.toBeNull();
    expect(tenantService.findByWhatsappPhoneNumberId).not.toHaveBeenCalled();
  });

  it('resolves the default tenant for Twilio inbound', async () => {
    const tenant = { id: 'tenant-1', name: 'Techfind Consulting' } as Tenant;
    tenantService.findDefault.mockResolvedValue(tenant);

    await expect(resolver.resolveDefault()).resolves.toBe(tenant);
    expect(tenantService.findDefault).toHaveBeenCalled();
  });

  it('resolves a Baileys session by tenant id', async () => {
    const tenant = { id: 'tenant-9', name: 'Divine Budget' } as Tenant;
    tenantService.findById.mockResolvedValue(tenant);

    await expect(resolver.resolveById('tenant-9')).resolves.toBe(tenant);
    expect(tenantService.findById).toHaveBeenCalledWith('tenant-9');
  });

  it('returns null for an empty tenant id', async () => {
    await expect(resolver.resolveById('')).resolves.toBeNull();
    expect(tenantService.findById).not.toHaveBeenCalled();
  });
});

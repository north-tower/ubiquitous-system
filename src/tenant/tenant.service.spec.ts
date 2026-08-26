import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { TenantService } from './tenant.service';

describe('TenantService.findDefault', () => {
  const tenants = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const config = { get: jest.fn() };
  const service = new TenantService(
    tenants as unknown as Repository<Tenant>,
    config as unknown as ConfigService,
  );

  beforeEach(() => {
    tenants.find.mockReset();
  });

  it('returns the oldest tenant without calling findOne with no where', async () => {
    const tenant = { id: 'tenant-1', name: 'Techfind Consulting' } as Tenant;
    tenants.find.mockResolvedValue([tenant]);

    await expect(service.findDefault()).resolves.toBe(tenant);
    expect(tenants.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC' },
      take: 1,
    });
  });

  it('returns null when no tenants exist', async () => {
    tenants.find.mockResolvedValue([]);
    await expect(service.findDefault()).resolves.toBeNull();
  });
});

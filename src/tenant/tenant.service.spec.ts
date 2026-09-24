import { BadRequestException } from '@nestjs/common';
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

describe('TenantService.createStaffTenant', () => {
  const tenants = {
    create: jest.fn((row: Partial<Tenant>) => row),
    save: jest.fn(async (row: Partial<Tenant>) => ({ ...row, id: 'new-id' })),
  };
  const config = { get: jest.fn() };
  const service = new TenantService(
    tenants as unknown as Repository<Tenant>,
    config as unknown as ConfigService,
  );

  beforeEach(() => {
    tenants.create.mockClear();
    tenants.save.mockClear();
  });

  it('stores the chosen flow and a baileys placeholder phone id', async () => {
    const saved = await service.createStaffTenant({
      name: '  Divine Budget  ',
      flow: 'enquiry_intake',
    });

    expect(saved.name).toBe('Divine Budget');
    expect(saved.flow).toBe('enquiry_intake');
    expect(saved.linkedPhone).toBeNull();
    expect(saved.connectToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(saved.whatsappPhoneNumberId).toMatch(/^baileys:[0-9a-f-]{36}$/i);
  });

  it('rejects a blank name or an unknown flow', async () => {
    await expect(
      service.createStaffTenant({ name: '   ', flow: 'enquiry_intake' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createStaffTenant({ name: 'Divine', flow: 'other' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tenants.save).not.toHaveBeenCalled();
  });
});

describe('TenantService.ensureConnectTokens', () => {
  const tenants = {
    find: jest.fn(),
    save: jest.fn(async (row: Tenant) => row),
  };
  const config = { get: jest.fn() };
  const service = new TenantService(
    tenants as unknown as Repository<Tenant>,
    config as unknown as ConfigService,
  );

  beforeEach(() => {
    tenants.find.mockReset();
    tenants.save.mockClear();
  });

  it('fills tenants that have no connect token', async () => {
    const row = { id: 'tenant-1', connectToken: null } as Tenant;
    tenants.find.mockResolvedValue([row]);

    await service.ensureConnectTokens();

    expect(row.connectToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tenants.save).toHaveBeenCalledWith(row);
  });
});

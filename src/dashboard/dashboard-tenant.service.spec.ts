import { NotFoundException } from '@nestjs/common';
import { BaileysWhatsappClient } from '../outbound/baileys-whatsapp.client';
import { Tenant } from '../tenant/tenant.entity';
import { TenantService } from '../tenant/tenant.service';
import { DashboardTenantService } from './dashboard-tenant.service';

describe('DashboardTenantService', () => {
  const tenants = {
    createStaffTenant: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
  };
  const baileys = {
    beginPairing: jest.fn(),
    endPairing: jest.fn(),
    connectionStatus: jest.fn(),
    whatsappLink: jest.fn(),
  };
  const service = new DashboardTenantService(
    tenants as unknown as TenantService,
    baileys as unknown as BaileysWhatsappClient,
  );

  beforeEach(() => {
    tenants.createStaffTenant.mockReset();
    tenants.list.mockReset();
    tenants.findById.mockReset();
    baileys.beginPairing.mockReset();
    baileys.endPairing.mockReset();
    baileys.connectionStatus.mockReset();
    baileys.whatsappLink.mockReset();
  });

  it('creates a tenant without opening a WhatsApp session', async () => {
    tenants.createStaffTenant.mockResolvedValue({ id: 'tenant-9' });

    await expect(
      service.create({ name: 'Divine Budget', flow: 'enquiry_intake' }),
    ).resolves.toEqual({ id: 'tenant-9' });
    expect(tenants.createStaffTenant).toHaveBeenCalledWith({
      name: 'Divine Budget',
      flow: 'enquiry_intake',
    });
    expect(baileys.beginPairing).not.toHaveBeenCalled();
  });

  it('starts a QR session only when pairing is requested', async () => {
    tenants.findById.mockResolvedValue({
      id: 'tenant-9',
      linkedPhone: null,
    } as Tenant);
    baileys.beginPairing.mockResolvedValue(undefined);
    baileys.whatsappLink.mockReturnValue({
      status: 'waiting_for_scan',
      qrDataUrl: null,
    });

    await expect(service.pair('tenant-9')).resolves.toEqual({
      status: 'waiting_for_scan',
      linkedPhone: null,
      qrDataUrl: null,
    });
    expect(baileys.beginPairing).toHaveBeenCalledWith('tenant-9');
  });

  it('lists flow, linked phone, and connection status', async () => {
    tenants.list.mockResolvedValue([
      {
        id: 'tenant-1',
        name: 'Techfind Consulting',
        flow: 'techfind_demo',
        linkedPhone: '254700000001',
        connectToken: 'secret-token',
      },
    ]);
    baileys.connectionStatus.mockReturnValue('connected');

    await expect(service.list()).resolves.toEqual([
      {
        id: 'tenant-1',
        name: 'Techfind Consulting',
        flow: 'techfind_demo',
        linkedPhone: '254700000001',
        status: 'connected',
        connectToken: 'secret-token',
      },
    ]);
  });

  it('returns the QR only through the session view', async () => {
    tenants.findById.mockResolvedValue({
      id: 'tenant-9',
      linkedPhone: null,
    } as Tenant);
    baileys.whatsappLink.mockReturnValue({
      status: 'waiting_for_scan',
      qrDataUrl: 'data:image/png;base64,abc',
    });

    await expect(service.whatsapp('tenant-9')).resolves.toEqual({
      status: 'waiting_for_scan',
      linkedPhone: null,
      qrDataUrl: 'data:image/png;base64,abc',
    });
  });

  it('returns 404 for an unknown tenant', async () => {
    tenants.findById.mockResolvedValue(null);
    await expect(service.whatsapp('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

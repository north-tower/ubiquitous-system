import { NotFoundException } from '@nestjs/common';
import { DashboardService } from '../dashboard/dashboard.service';
import { BaileysWhatsappClient } from '../outbound/baileys-whatsapp.client';
import { TenantService } from '../tenant/tenant.service';
import { ConnectService } from './connect.service';

describe('ConnectService', () => {
  const tenants = {
    findByConnectToken: jest.fn(),
  };
  const baileys = {
    beginPairing: jest.fn(),
    endPairing: jest.fn(),
    whatsappLink: jest.fn(),
  };
  const dashboard = {
    getToday: jest.fn(),
  };
  const service = new ConnectService(
    tenants as unknown as TenantService,
    baileys as unknown as BaileysWhatsappClient,
    dashboard as unknown as DashboardService,
  );

  beforeEach(() => {
    tenants.findByConnectToken.mockReset();
    baileys.beginPairing.mockReset();
    baileys.endPairing.mockReset();
    baileys.whatsappLink.mockReset();
    dashboard.getToday.mockReset();
  });

  it('returns 404 for an unknown token', async () => {
    tenants.findByConnectToken.mockResolvedValue(null);

    await expect(service.link('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(baileys.beginPairing).not.toHaveBeenCalled();
  });

  it('returns the public link without starting a session', async () => {
    tenants.findByConnectToken.mockResolvedValue({
      id: 'tenant-9',
      name: 'Divine Budget',
      linkedPhone: null,
    });
    baileys.whatsappLink.mockReturnValue({
      status: null,
      qrDataUrl: null,
    });

    await expect(service.link('secret-token')).resolves.toEqual({
      name: 'Divine Budget',
      status: null,
      linkedPhone: null,
      qrDataUrl: null,
    });
    expect(tenants.findByConnectToken).toHaveBeenCalledWith('secret-token');
    expect(baileys.beginPairing).not.toHaveBeenCalled();
  });

  it('starts a QR session only when pairing is requested', async () => {
    tenants.findByConnectToken.mockResolvedValue({
      id: 'tenant-9',
      name: 'Divine Budget',
      linkedPhone: null,
    });
    baileys.beginPairing.mockResolvedValue(undefined);
    baileys.whatsappLink.mockReturnValue({
      status: 'waiting_for_scan',
      qrDataUrl: 'data:image/png;base64,abc',
    });

    await expect(service.pair('secret-token')).resolves.toEqual({
      name: 'Divine Budget',
      status: 'waiting_for_scan',
      linkedPhone: null,
      qrDataUrl: 'data:image/png;base64,abc',
    });
    expect(baileys.beginPairing).toHaveBeenCalledWith('tenant-9');
  });

  it('loads today only for the tenant behind the token', async () => {
    const today = { whatsappConversations: 2 };
    tenants.findByConnectToken.mockResolvedValue({ id: 'tenant-9' });
    dashboard.getToday.mockResolvedValue(today);

    await expect(service.today('secret-token')).resolves.toBe(today);
    expect(dashboard.getToday).toHaveBeenCalledWith('tenant-9');
  });

  it('does not load stats for an unknown token', async () => {
    tenants.findByConnectToken.mockResolvedValue(null);

    await expect(service.today('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(dashboard.getToday).not.toHaveBeenCalled();
  });
});

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
    startSession: jest.fn(),
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
    baileys.startSession.mockReset();
    baileys.whatsappLink.mockReset();
    dashboard.getToday.mockReset();
  });

  it('returns 404 for an unknown token', async () => {
    tenants.findByConnectToken.mockResolvedValue(null);

    await expect(service.link('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(baileys.startSession).not.toHaveBeenCalled();
  });

  it('starts the session and returns the public link shape', async () => {
    tenants.findByConnectToken.mockResolvedValue({
      id: 'tenant-9',
      name: 'Divine Budget',
      linkedPhone: null,
    });
    baileys.startSession.mockResolvedValue(undefined);
    baileys.whatsappLink.mockReturnValue({
      status: 'waiting_for_scan',
      qrDataUrl: 'data:image/png;base64,abc',
    });

    await expect(service.link('secret-token')).resolves.toEqual({
      name: 'Divine Budget',
      status: 'waiting_for_scan',
      linkedPhone: null,
      qrDataUrl: 'data:image/png;base64,abc',
    });
    expect(tenants.findByConnectToken).toHaveBeenCalledWith('secret-token');
    expect(baileys.startSession).toHaveBeenCalledWith('tenant-9');
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

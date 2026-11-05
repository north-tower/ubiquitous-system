import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import {
  DEFAULT_TENANT_PRIMARY_CHANNEL,
  isTenantPrimaryChannel,
  TENANT_PRIMARY_CHANNELS,
  type TenantPrimaryChannel,
} from './tenant-primary-channel';
import {
  DEFAULT_TENANT_FLOW,
  isTenantFlow,
  TENANT_FLOWS,
  type TenantFlow,
} from './tenant-flow';
import { normalizeTelnyxWhatsappFrom } from './normalize-telnyx-whatsapp-from';

const TWILIO_PHONE_NUMBER_PLACEHOLDER = 'twilio';
const TELNYX_PHONE_NUMBER_PLACEHOLDER = 'telnyx';
/** Dedicated Techfind demo tenant on Telnyx (not the default seeded row). */
export const TELNYX_TECHFIND_DEMO_PHONE_ID = 'telnyx:techfind';
const BAILEYS_PHONE_NUMBER_PLACEHOLDER = 'baileys';

@Injectable()
export class TenantService implements OnModuleInit {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureTechfindTenant();
    await this.ensureTelnyxTechfindDemoTenant();
    await this.ensureConnectTokens();
  }

  async findByWhatsappPhoneNumberId(
    whatsappPhoneNumberId: string,
  ): Promise<Tenant | null> {
    return this.tenants.findOne({ where: { whatsappPhoneNumberId } });
  }

  async findDefault(): Promise<Tenant | null> {
    const [tenant] = await this.tenants.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    return tenant ?? null;
  }

  /** Oldest tenant created with Twilio as the primary WhatsApp channel. */
  async findOldestTwilioPrimary(): Promise<Tenant | null> {
    const [tenant] = await this.tenants.find({
      where: { primaryChannel: 'twilio' },
      order: { createdAt: 'ASC' },
      take: 1,
    });
    return tenant ?? null;
  }

  /** Oldest tenant created with Telnyx as the primary WhatsApp channel. */
  async findOldestTelnyxPrimary(): Promise<Tenant | null> {
    const [tenant] = await this.tenants.find({
      where: { primaryChannel: 'telnyx' },
      order: { createdAt: 'ASC' },
      take: 1,
    });
    return tenant ?? null;
  }

  async findByTelnyxWhatsappFrom(raw: string): Promise<Tenant | null> {
    let normalized: string;
    try {
      normalized = normalizeTelnyxWhatsappFrom(raw);
    } catch {
      return null;
    }
    return this.tenants.findOne({
      where: { telnyxWhatsappFrom: normalized },
    });
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenants.findOne({ where: { id } });
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.tenants.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  async findByConnectToken(token: string): Promise<Tenant | null> {
    const trimmed = token.trim();
    if (!trimmed) {
      return null;
    }
    return this.tenants.findOne({ where: { connectToken: trimmed } });
  }

  /** Existing rows predate connect links. Fill any that are still blank. */
  async ensureConnectTokens(): Promise<void> {
    const missing = await this.tenants.find({
      where: { connectToken: IsNull() },
    });
    for (const tenant of missing) {
      tenant.connectToken = newConnectToken();
      await this.tenants.save(tenant);
    }
  }

  async list(): Promise<Tenant[]> {
    return this.tenants.find({ order: { createdAt: 'ASC' } });
  }

  async createStaffTenant(input: {
    name: string;
    flow: string;
    primaryChannel: string;
    telnyxWhatsappFrom?: string;
  }): Promise<Tenant> {
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }
    if (name.length > 255) {
      throw new BadRequestException('name must be 255 characters or fewer');
    }
    if (!isTenantFlow(input.flow)) {
      throw new BadRequestException(
        `flow must be ${TENANT_FLOWS.join(' or ')}`,
      );
    }
    if (!isTenantPrimaryChannel(input.primaryChannel)) {
      throw new BadRequestException(
        `primaryChannel must be ${TENANT_PRIMARY_CHANNELS.join(' or ')}`,
      );
    }
    this.assertPrimaryChannelReady(input.primaryChannel);

    let telnyxWhatsappFrom: string | null = null;
    let whatsappPhoneNumberId = `baileys:${randomUUID()}`;
    if (input.primaryChannel === 'telnyx') {
      telnyxWhatsappFrom = this.parseTelnyxWhatsappFromInput(
        input.telnyxWhatsappFrom,
      );
      await this.assertTelnyxNumberAvailable(telnyxWhatsappFrom);
      whatsappPhoneNumberId = `telnyx:${randomUUID()}`;
    }

    return this.tenants.save(
      this.tenants.create({
        name,
        flow: input.flow,
        primaryChannel: input.primaryChannel,
        whatsappPhoneNumberId,
        whatsappBusinessAccountId: null,
        linkedPhone: null,
        telnyxWhatsappFrom,
        connectToken: newConnectToken(),
      }),
    );
  }

  private async assertTelnyxNumberAvailable(from: string): Promise<void> {
    const taken = await this.findByTelnyxWhatsappFrom(from);
    if (taken) {
      throw new BadRequestException(
        'That Telnyx WhatsApp number is already assigned to another tenant',
      );
    }
  }

  private parseTelnyxWhatsappFromInput(raw: string | undefined): string {
    const fallback = this.config.get<string>('TELNYX_WHATSAPP_FROM')?.trim();
    const source = raw?.trim() || fallback;
    if (!source) {
      throw new BadRequestException(
        'telnyxWhatsappFrom is required when primaryChannel is telnyx',
      );
    }
    try {
      return normalizeTelnyxWhatsappFrom(source);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid Telnyx WhatsApp number',
      );
    }
  }

  private assertPrimaryChannelReady(channel: TenantPrimaryChannel): void {
    if (channel === 'twilio') {
      const ready = Boolean(
        this.config.get<string>('TWILIO_ACCOUNT_SID') &&
          this.config.get<string>('TWILIO_AUTH_TOKEN') &&
          this.config.get<string>('TWILIO_WHATSAPP_FROM'),
      );
      if (!ready) {
        throw new BadRequestException(
          'Twilio WhatsApp is not configured on this server',
        );
      }
      return;
    }
    if (channel === 'telnyx') {
      if (!this.config.get<string>('TELNYX_API_KEY')) {
        throw new BadRequestException(
          'Telnyx WhatsApp is not configured on this server (TELNYX_API_KEY)',
        );
      }
      return;
    }
    if (this.config.get<string>('BAILEYS_ENABLED') !== 'true') {
      throw new BadRequestException('Baileys is not enabled on this server');
    }
  }

  private seedPrimaryChannel(): TenantPrimaryChannel {
    const configured = this.config.get<string>('WHATSAPP_PRIMARY_CHANNEL');
    if (configured === 'twilio') {
      return 'twilio';
    }
    if (configured === 'telnyx') {
      return 'telnyx';
    }
    return DEFAULT_TENANT_PRIMARY_CHANNEL;
  }

  async setLinkedPhone(id: string, linkedPhone: string): Promise<void> {
    await this.tenants.update({ id }, { linkedPhone });
  }

  async ensureTechfindTenant(): Promise<Tenant | null> {
    const metaPhoneNumberId = this.config.get<string>('META_PHONE_NUMBER_ID');
    const twilioReady = Boolean(
      this.config.get<string>('TWILIO_ACCOUNT_SID') &&
      this.config.get<string>('TWILIO_AUTH_TOKEN') &&
      this.config.get<string>('TWILIO_WHATSAPP_FROM'),
    );
    const baileysReady = this.config.get<string>('BAILEYS_ENABLED') === 'true';
    const whatsappPhoneNumberId =
      metaPhoneNumberId ||
      (twilioReady ? TWILIO_PHONE_NUMBER_PLACEHOLDER : null) ||
      (baileysReady ? BAILEYS_PHONE_NUMBER_PLACEHOLDER : null);
    if (!whatsappPhoneNumberId) {
      this.logger.warn(
        'Neither META_PHONE_NUMBER_ID, Twilio credentials, nor BAILEYS_ENABLED are set; Techfind tenant will not be seeded',
      );
      return null;
    }

    const whatsappBusinessAccountId =
      this.config.get<string>('META_WHATSAPP_BUSINESS_ACCOUNT_ID') ?? null;

    const existing = await this.findExistingTechfind(metaPhoneNumberId);
    const flow = this.configuredFlow();
    if (existing) {
      existing.name = 'Techfind Consulting';
      existing.whatsappPhoneNumberId = whatsappPhoneNumberId;
      existing.whatsappBusinessAccountId = whatsappBusinessAccountId;
      if (flow) {
        existing.flow = flow;
      }
      return this.tenants.save(existing);
    }

    const saved = await this.tenants.save(
      this.tenants.create({
        name: 'Techfind Consulting',
        whatsappPhoneNumberId,
        whatsappBusinessAccountId,
        flow: flow ?? DEFAULT_TENANT_FLOW,
        primaryChannel: this.seedPrimaryChannel(),
        connectToken: newConnectToken(),
      }),
    );
    this.logger.log(`Seeded Techfind tenant id=${saved.id}`);
    return saved;
  }

  /**
   * Second tenant for Telnyx WABA: techfind_demo on primary_channel=telnyx.
   * Inbound Telnyx webhooks resolve here before the default Baileys/Meta row.
   */
  async ensureTelnyxTechfindDemoTenant(): Promise<Tenant | null> {
    const apiKey = this.config.get<string>('TELNYX_API_KEY');
    const fromEnv = this.config.get<string>('TELNYX_WHATSAPP_FROM')?.trim();
    if (!apiKey || !fromEnv) {
      return null;
    }
    let telnyxWhatsappFrom: string;
    try {
      telnyxWhatsappFrom = normalizeTelnyxWhatsappFrom(fromEnv);
    } catch {
      this.logger.warn('Ignoring invalid TELNYX_WHATSAPP_FROM for demo tenant seed');
      return null;
    }

    let existing = await this.tenants.findOne({
      where: { whatsappPhoneNumberId: TELNYX_TECHFIND_DEMO_PHONE_ID },
    });
    if (!existing) {
      existing = await this.tenants.findOne({
        where: {
          whatsappPhoneNumberId: TELNYX_PHONE_NUMBER_PLACEHOLDER,
          primaryChannel: 'telnyx',
        },
      });
    }
    if (!existing) {
      existing = await this.findByTelnyxWhatsappFrom(telnyxWhatsappFrom);
    }

    if (existing) {
      existing.name = 'Techfind Consulting (Telnyx)';
      existing.whatsappPhoneNumberId = TELNYX_TECHFIND_DEMO_PHONE_ID;
      existing.flow = 'techfind_demo';
      existing.primaryChannel = 'telnyx';
      existing.telnyxWhatsappFrom = telnyxWhatsappFrom;
      if (!existing.connectToken) {
        existing.connectToken = newConnectToken();
      }
      return this.tenants.save(existing);
    }

    const saved = await this.tenants.save(
      this.tenants.create({
        name: 'Techfind Consulting (Telnyx)',
        whatsappPhoneNumberId: TELNYX_TECHFIND_DEMO_PHONE_ID,
        whatsappBusinessAccountId: null,
        flow: 'techfind_demo',
        primaryChannel: 'telnyx',
        telnyxWhatsappFrom,
        connectToken: newConnectToken(),
      }),
    );
    this.logger.log(`Seeded Telnyx Techfind demo tenant id=${saved.id}`);
    return saved;
  }

  private async findExistingTechfind(
    metaPhoneNumberId: string | undefined,
  ): Promise<Tenant | null> {
    if (metaPhoneNumberId) {
      const byMeta = await this.tenants.findOne({
        where: { whatsappPhoneNumberId: metaPhoneNumberId },
      });
      if (byMeta) {
        return byMeta;
      }
    }
    const byTwilio = await this.tenants.findOne({
      where: { whatsappPhoneNumberId: TWILIO_PHONE_NUMBER_PLACEHOLDER },
    });
    if (byTwilio) {
      return byTwilio;
    }
    const byTelnyx = await this.tenants.findOne({
      where: { whatsappPhoneNumberId: TELNYX_PHONE_NUMBER_PLACEHOLDER },
    });
    if (byTelnyx) {
      return byTelnyx;
    }
    return this.tenants.findOne({
      where: { whatsappPhoneNumberId: BAILEYS_PHONE_NUMBER_PLACEHOLDER },
    });
  }

  /**
   * Optional override so a single Twilio number can be pointed at the
   * Divine Budget intake without a SQL update. Unset, the existing tenant
   * keeps whatever flow it already has (default techfind_demo).
   */
  private configuredFlow(): TenantFlow | null {
    const raw = this.config.get<string>('TENANT_FLOW')?.trim();
    if (!raw) {
      return null;
    }
    if (!isTenantFlow(raw)) {
      this.logger.warn(`Ignoring unknown TENANT_FLOW=${raw}`);
      return null;
    }
    return raw;
  }
}

function newConnectToken(): string {
  return randomBytes(32).toString('base64url');
}

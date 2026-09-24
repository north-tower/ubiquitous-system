import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import {
  DEFAULT_TENANT_FLOW,
  isTenantFlow,
  TENANT_FLOWS,
  type TenantFlow,
} from './tenant-flow';

const TWILIO_PHONE_NUMBER_PLACEHOLDER = 'twilio';
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

  async findById(id: string): Promise<Tenant | null> {
    return this.tenants.findOne({ where: { id } });
  }

  async list(): Promise<Tenant[]> {
    return this.tenants.find({ order: { createdAt: 'ASC' } });
  }

  async createStaffTenant(input: {
    name: string;
    flow: string;
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

    return this.tenants.save(
      this.tenants.create({
        name,
        flow: input.flow,
        whatsappPhoneNumberId: `baileys:${randomUUID()}`,
        whatsappBusinessAccountId: null,
        linkedPhone: null,
      }),
    );
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
      }),
    );
    this.logger.log(`Seeded Techfind tenant id=${saved.id}`);
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

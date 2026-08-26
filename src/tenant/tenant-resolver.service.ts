import { Injectable } from '@nestjs/common';
import { Tenant } from './tenant.entity';
import { TenantService } from './tenant.service';

@Injectable()
export class TenantResolverService {
  constructor(private readonly tenantService: TenantService) {}

  async resolveByWhatsappPhoneNumberId(
    phoneNumberId: string,
  ): Promise<Tenant | null> {
    if (!phoneNumberId) {
      return null;
    }
    return this.tenantService.findByWhatsappPhoneNumberId(phoneNumberId);
  }

  async resolveDefault(): Promise<Tenant | null> {
    return this.tenantService.findDefault();
  }
}

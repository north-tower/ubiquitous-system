import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { TenantResolverService } from './tenant-resolver.service';
import { TenantService } from './tenant.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [TenantService, TenantResolverService],
  exports: [TenantService, TenantResolverService],
})
export class TenantModule {}

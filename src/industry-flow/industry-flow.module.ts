import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantModule } from '../tenant/tenant.module';
import { IndustryFlowDefinition } from './industry-flow.entity';
import { IndustryFlowSeedService } from './industry-flow-seed.service';
import { IndustryFlowService } from './industry-flow.service';

@Module({
  imports: [TypeOrmModule.forFeature([IndustryFlowDefinition]), TenantModule],
  providers: [IndustryFlowService, IndustryFlowSeedService],
  exports: [IndustryFlowService],
})
export class IndustryFlowModule {}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { NumberedOption } from '../enquiry-flow/match-numbered-option';
import { IndustryFlowDefinition } from './industry-flow.entity';
import type {
  IndustryFlowRecord,
  UpsertIndustryFlowInput,
} from './industry-flow.types';

@Injectable()
export class IndustryFlowService {
  constructor(
    @InjectRepository(IndustryFlowDefinition)
    private readonly flows: Repository<IndustryFlowDefinition>,
  ) {}

  async listForTenant(tenantId: string): Promise<IndustryFlowRecord[]> {
    const rows = await this.flows.find({
      where: { tenantId },
      order: { sortOrder: 'ASC', menuLabel: 'ASC' },
    });
    return rows.map(toRecord);
  }

  async listActivePlaaggMenu(tenantId: string): Promise<NumberedOption[]> {
    const rows = await this.flows.find({
      where: { tenantId, isActive: true },
      order: { sortOrder: 'ASC', menuLabel: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.plaaggMenuId,
      label: row.menuLabel,
      aliases: row.definition.aliases ?? [],
    }));
  }

  async findByPlaaggMenuId(
    tenantId: string,
    plaaggMenuId: string,
  ): Promise<IndustryFlowRecord | null> {
    const row = await this.flows.findOne({
      where: { tenantId, plaaggMenuId, isActive: true },
    });
    return row ? toRecord(row) : null;
  }

  async findByDemoMode(
    tenantId: string,
    demoMode: string,
  ): Promise<IndustryFlowRecord | null> {
    const row = await this.flows.findOne({
      where: { tenantId, demoMode, isActive: true },
    });
    return row ? toRecord(row) : null;
  }

  async findById(tenantId: string, id: string): Promise<IndustryFlowRecord> {
    const row = await this.flows.findOne({ where: { id, tenantId } });
    if (!row) {
      throw new NotFoundException('Industry flow not found');
    }
    return toRecord(row);
  }

  async create(
    tenantId: string,
    input: UpsertIndustryFlowInput,
  ): Promise<IndustryFlowRecord> {
    const saved = await this.flows.save(
      this.flows.create({
        tenantId,
        demoMode: input.demoMode,
        menuLabel: input.menuLabel,
        plaaggMenuId: input.plaaggMenuId,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
        engineKind: input.engineKind,
        definition: input.definition,
      }),
    );
    return toRecord(saved);
  }

  async update(
    tenantId: string,
    id: string,
    input: UpsertIndustryFlowInput,
  ): Promise<IndustryFlowRecord> {
    const row = await this.flows.findOne({ where: { id, tenantId } });
    if (!row) {
      throw new NotFoundException('Industry flow not found');
    }
    row.demoMode = input.demoMode;
    row.menuLabel = input.menuLabel;
    row.plaaggMenuId = input.plaaggMenuId;
    row.sortOrder = input.sortOrder ?? row.sortOrder;
    row.isActive = input.isActive ?? row.isActive;
    row.engineKind = input.engineKind;
    row.definition = input.definition;
    return toRecord(await this.flows.save(row));
  }

  async upsertByDemoMode(
    tenantId: string,
    input: UpsertIndustryFlowInput,
  ): Promise<void> {
    const existing = await this.flows.findOne({
      where: { tenantId, demoMode: input.demoMode },
    });
    if (existing) {
      await this.update(tenantId, existing.id, input);
      return;
    }
    await this.create(tenantId, input);
  }
}

function toRecord(row: IndustryFlowDefinition): IndustryFlowRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    demoMode: row.demoMode,
    menuLabel: row.menuLabel,
    plaaggMenuId: row.plaaggMenuId,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    engineKind: row.engineKind,
    definition: row.definition,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

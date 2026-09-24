import { BadRequestException } from '@nestjs/common';
import type {
  IndustryFlowDefinitionBody,
  IndustryFlowEngineKind,
  UpsertIndustryFlowInput,
} from './industry-flow.types';

const ENGINE_KINDS: IndustryFlowEngineKind[] = ['script', 'salon', 'solar'];

export function parseUpsertIndustryFlow(body: unknown): UpsertIndustryFlowInput {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Request body is required');
  }
  const value = body as Record<string, unknown>;
  const demoMode = readString(value.demoMode);
  const menuLabel = readString(value.menuLabel);
  const plaaggMenuId = readString(value.plaaggMenuId);
  const engineKind = readEngineKind(value.engineKind);
  const definition = parseDefinition(value.definition, engineKind);

  if (!demoMode || !menuLabel || !plaaggMenuId) {
    throw new BadRequestException(
      'demoMode, menuLabel, and plaaggMenuId are required',
    );
  }

  return {
    demoMode,
    menuLabel,
    plaaggMenuId,
    sortOrder: readOptionalInt(value.sortOrder) ?? 0,
    isActive: value.isActive === undefined ? true : Boolean(value.isActive),
    engineKind,
    definition,
  };
}

function parseDefinition(
  raw: unknown,
  engineKind: IndustryFlowEngineKind,
): IndustryFlowDefinitionBody {
  if (!raw || typeof raw !== 'object') {
    throw new BadRequestException('definition object is required');
  }
  const value = raw as Record<string, unknown>;
  const plaaggInsights = readInsights(value.plaaggInsights);
  const recommendedPlan = readPlan(value.recommendedPlan);

  const definition: IndustryFlowDefinitionBody = {
    plaaggInsights,
    recommendedPlan,
  };

  if (typeof value.intro === 'string') {
    definition.intro = value.intro;
  }
  if (Array.isArray(value.aliases)) {
    definition.aliases = value.aliases.map(String);
  }
  if (Array.isArray(value.steps)) {
    definition.steps = value.steps.map(parseStep);
  }
  if (Array.isArray(value.customerSummaryTemplate)) {
    definition.customerSummaryTemplate = value.customerSummaryTemplate.map(
      String,
    );
  }

  if (engineKind === 'script') {
    if (!definition.steps?.length) {
      throw new BadRequestException(
        'Script flows need at least one step in definition.steps',
      );
    }
    if (!definition.intro?.trim()) {
      throw new BadRequestException('Script flows need definition.intro');
    }
  }

  return definition;
}

function parseStep(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    throw new BadRequestException('Invalid step');
  }
  const value = raw as Record<string, unknown>;
  const id = readString(value.id);
  const prompt = readString(value.prompt);
  const reask = readString(value.reask);
  if (!id || !prompt || !reask) {
    throw new BadRequestException('Each step needs id, prompt, and reask');
  }
  return {
    id,
    prompt,
    reask,
    minLength: readOptionalInt(value.minLength) ?? 3,
  };
}

function readInsights(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    throw new BadRequestException('definition.plaaggInsights is required');
  }
  const value = raw as Record<string, unknown>;
  return {
    pipelineStage: readString(value.pipelineStage) ?? '',
    followUp: readString(value.followUp) ?? '',
    assignee: readString(value.assignee) ?? '',
    dashboardInsight: readString(value.dashboardInsight) ?? '',
  };
}

function readPlan(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    throw new BadRequestException('definition.recommendedPlan is required');
  }
  const value = raw as Record<string, unknown>;
  const name = readString(value.name);
  const summary = readString(value.summary);
  if (!name || !summary) {
    throw new BadRequestException('recommendedPlan needs name and summary');
  }
  const modules = Array.isArray(value.modules)
    ? value.modules.map(String)
    : [];
  return { name, summary, modules };
}

function readEngineKind(raw: unknown): IndustryFlowEngineKind {
  const value = readString(raw);
  if (value && ENGINE_KINDS.includes(value as IndustryFlowEngineKind)) {
    return value as IndustryFlowEngineKind;
  }
  throw new BadRequestException('engineKind must be script, salon, or solar');
}

function readString(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readOptionalInt(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.trunc(raw);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

import { BadRequestException } from '@nestjs/common';
import { type LeadScore } from '../lead/lead-profile.entity';

const LEAD_SCORES: ReadonlySet<string> = new Set(['HOT', 'WARM', 'COLD']);

export function parseLeadScoreQuery(
  value: string | undefined,
): LeadScore | undefined {
  if (!value) {
    return undefined;
  }
  if (!LEAD_SCORES.has(value)) {
    throw new BadRequestException('leadScore must be HOT, WARM, or COLD');
  }
  return value as LeadScore;
}

export function parsePageQuery(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new BadRequestException('page must be a positive integer');
  }
  return parsed;
}

export function parsePageSizeQuery(
  value: string | undefined,
  fallback: number,
  max: number,
): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new BadRequestException('pageSize must be a positive integer');
  }
  return Math.min(parsed, max);
}

export function parseDateQuery(
  value: string | undefined,
  field: string,
): Date | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${field} must be an ISO date`);
  }
  return parsed;
}

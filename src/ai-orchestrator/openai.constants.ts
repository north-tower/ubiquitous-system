export const OPENAI_SDK = Symbol('OPENAI_SDK');

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

export const AI_PURPOSE = {
  INDUSTRY_CLASSIFICATION: 'industry_classification',
  ENTITY_EXTRACTION: 'entity_extraction',
  CONVERSATION_SUMMARY: 'conversation_summary',
} as const;

/** Models that accept response_format.json_schema (Structured Outputs). */
export function supportsJsonSchema(model: string): boolean {
  const id = model.trim().toLowerCase();
  return (
    id.includes('gpt-4o') ||
    id.includes('gpt-4.1') ||
    id.includes('gpt-5') ||
    id.startsWith('o1') ||
    id.startsWith('o3') ||
    id.startsWith('o4')
  );
}

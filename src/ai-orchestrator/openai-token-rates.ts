/**
 * Approximate USD per 1k tokens. Not fetched live — update this table when
 * we change models or OpenAI posts a durable price change.
 */
export const OPENAI_TOKEN_RATES_PER_1K_USD: Record<
  string,
  { input: number; output: number }
> = {
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4.1-mini': { input: 0.0004, output: 0.0016 },
};

const FALLBACK_RATES = OPENAI_TOKEN_RATES_PER_1K_USD['gpt-4o-mini'];

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = OPENAI_TOKEN_RATES_PER_1K_USD[model] ?? FALLBACK_RATES;
  const raw =
    (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
  return Math.round(raw * 1e8) / 1e8;
}

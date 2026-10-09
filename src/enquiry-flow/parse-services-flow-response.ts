/**
 * Twilio / WhatsApp Flow submissions (InteractiveData, FlowData).
 * MULTI_SELECT option ids should match SERVICE_OPTIONS ids in enquiry-options.ts.
 */
export function parseServicesFlowInbound(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
  const ids = collectServiceIdsFromFlowPayload(parsed);
  if (ids.length === 0) {
    return null;
  }
  return ids.join(', ');
}

function collectServiceIdsFromFlowPayload(data: unknown): string[] {
  if (!isRecord(data)) {
    return [];
  }
  const flowResponse = data.flowResponse;
  if (isRecord(flowResponse)) {
    return uniqueIds(collectFromObject(flowResponse));
  }
  return uniqueIds(collectFromObject(data));
}

function collectFromObject(obj: Record<string, unknown>): string[] {
  const ids: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'flow_token') {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          ids.push(normalizeFlowOptionId(item));
        }
      }
      continue;
    }
    if (typeof value === 'string' && isFlowFieldValue(key, value)) {
      ids.push(normalizeFlowOptionId(value));
    }
  }
  return ids;
}

/** Twilio often returns `0_sound_pa`; Meta may return plain `sound_pa`. */
export function normalizeFlowOptionId(value: string): string {
  return value.trim().replace(/^\d+_/, '');
}

function isFlowFieldValue(key: string, value: string): boolean {
  if (key.startsWith('screen_')) {
    return true;
  }
  return /^\d+_/.test(value.trim());
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type NumberedOption = {
  id: string;
  label: string;
  aliases: readonly string[];
};

export function formatNumberedOptions(
  options: readonly NumberedOption[],
): string {
  return options
    .map((option, index) => `${index + 1}  ${option.label}`)
    .join('\n');
}

/**
 * Accepts either the list number ("2", "2.") or the words on the button
 * ("wedding", "a wedding"). Number matching is exact so "20th December"
 * cannot accidentally pick option 20; word matching prefers longer aliases
 * so "corporate event" wins over "event".
 */
export function matchNumberedOption(
  text: string,
  options: readonly NumberedOption[],
): NumberedOption | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const numbered = trimmed.match(/^(?:option\s*)?(\d+)\s*[.)]?$/i);
  if (numbered) {
    const index = Number(numbered[1]) - 1;
    return options[index] ?? null;
  }

  const haystack = normalize(trimmed);
  const ranked = options
    .flatMap((option) =>
      [option.id, option.label, ...option.aliases].map((alias) => ({
        option,
        alias: normalize(alias),
      })),
    )
    .filter((row) => row.alias.length > 0)
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const { option, alias } of ranked) {
    if (haystack === alias) {
      return option;
    }
    if (alias.length >= 3 && includesWord(haystack, alias)) {
      return option;
    }
  }
  return null;
}

/**
 * Picks one or more options from a reply like "1, 2", "1 and 3", or
 * "sound and lighting". A single match still returns a one-item list so
 * callers can join labels without a second code path.
 */
export function matchNumberedOptions(
  text: string,
  options: readonly NumberedOption[],
): NumberedOption[] | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const numericParts = splitNumericList(trimmed);
  if (numericParts) {
    const matched = numericParts.map((part) =>
      matchNumberedOption(part, options),
    );
    if (matched.every((row): row is NumberedOption => row !== null)) {
      return uniqueById(matched);
    }
    return null;
  }

  const fromWords = matchAllOptionsInText(trimmed, options);
  if (fromWords.length > 1) {
    return fromWords;
  }

  const single = matchNumberedOption(trimmed, options);
  if (single) {
    return [single];
  }
  return fromWords.length === 1 ? fromWords : null;
}

/** True when the reply looks like list numbers that failed to match, not
 * a custom "stage wash" description we should accept as-is. */
export function looksLikeFailedOptionNumber(text: string): boolean {
  return /^(?:option\s*)?\d+(?:\s*[,&/]\s*\d+)*\s*[.)]?$/i.test(text.trim());
}

function splitNumericList(text: string): string[] | null {
  const stripped = text.replace(/option/gi, '').trim();
  const parts = stripped
    .split(/\s*(?:,|&|\/|\band\b)\s*/i)
    .flatMap((part) => part.trim().split(/\s+/))
    .map((part) => part.replace(/[.)]/g, ''))
    .filter((part) => /^\d+$/.test(part));
  return parts.length >= 2 ? parts : null;
}

function matchAllOptionsInText(
  text: string,
  options: readonly NumberedOption[],
): NumberedOption[] {
  const haystack = normalize(text);
  const found: NumberedOption[] = [];
  const ranked = [...options].sort(
    (a, b) => longestAlias(b).length - longestAlias(a).length,
  );
  for (const option of ranked) {
    const aliases = [option.id, option.label, ...option.aliases].map(normalize);
    if (
      aliases.some(
        (alias) =>
          alias.length >= 3 &&
          (haystack === alias || includesWord(haystack, alias)),
      )
    ) {
      found.push(option);
    }
  }
  return uniqueById(found);
}

function longestAlias(option: NumberedOption): string {
  return [option.id, option.label, ...option.aliases].reduce((best, alias) =>
    alias.length > best.length ? alias : best,
  );
}

function uniqueById(options: NumberedOption[]): NumberedOption[] {
  const seen = new Set<string>();
  const unique: NumberedOption[] = [];
  for (const option of options) {
    if (seen.has(option.id)) {
      continue;
    }
    seen.add(option.id);
    unique.push(option);
  }
  return unique;
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/[?!.]/g, '').replace(/\s+/g, ' ');
}

function includesWord(haystack: string, alias: string): boolean {
  if (haystack.includes(alias)) {
    return true;
  }
  return false;
}

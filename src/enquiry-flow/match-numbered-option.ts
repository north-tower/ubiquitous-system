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
      [option.label, ...option.aliases].map((alias) => ({
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

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/[?!.]/g, '').replace(/\s+/g, ' ');
}

function includesWord(haystack: string, alias: string): boolean {
  if (haystack.includes(alias)) {
    return true;
  }
  return false;
}

import { SOLAR_PROPERTY_TYPES, type SolarPropertyType } from './solar.fixture';

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function matchSolarPropertyType(
  userText: string,
): SolarPropertyType | null {
  const haystack = normalize(userText);
  const ranked = SOLAR_PROPERTY_TYPES.flatMap((type) =>
    type.aliases.map((alias) => ({ type, alias: normalize(alias) })),
  ).sort((a, b) => b.alias.length - a.alias.length);

  for (const { type, alias } of ranked) {
    if (haystack === alias || haystack.includes(alias)) {
      return type;
    }
  }
  return null;
}

export function parseKesAmount(text: string): number | null {
  const withoutCommas = text.toLowerCase().replace(/,/g, '');
  const withoutCurrency = withoutCommas
    .replace(/\b(kes|ksh|shillings?)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const thousandMatch = withoutCurrency.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (thousandMatch) {
    return Math.round(Number(thousandMatch[1]) * 1000);
  }

  const spacedThousands = withoutCurrency.match(/\b(\d{1,3}(?: \d{3})+)\b/);
  if (spacedThousands) {
    return Number(spacedThousands[1].replace(/ /g, ''));
  }

  const plain = withoutCurrency.match(/\b(\d+(?:\.\d+)?)\b/);
  if (!plain) {
    return null;
  }
  return Math.round(Number(plain[1]));
}

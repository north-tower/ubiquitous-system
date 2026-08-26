export type SolarPropertyType = {
  id: string;
  label: string;
  aliases: string[];
};

export type SolarTier = {
  id: string;
  label: string;
  minKesInclusive: number;
  maxKesExclusive: number | null;
  summary: string;
};

export const SOLAR_PROPERTY_TYPES: readonly SolarPropertyType[] = [
  {
    id: 'apartment',
    label: 'Apartment',
    aliases: ['apartment', 'flat', 'bedsitter'],
  },
  {
    id: 'bungalow',
    label: 'Bungalow',
    aliases: ['bungalow', 'house'],
  },
  {
    id: 'maisonette',
    label: 'Maisonette',
    aliases: ['maisonette', 'townhouse'],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    aliases: ['commercial', 'shop', 'office'],
  },
];

export const SOLAR_TIERS: readonly SolarTier[] = [
  {
    id: 'starter',
    label: 'Starter rooftop (simulated)',
    minKesInclusive: 0,
    maxKesExclusive: 15000,
    summary: 'A small simulated starter kit for lower monthly spend.',
  },
  {
    id: 'standard',
    label: 'Standard home system (simulated)',
    minKesInclusive: 15000,
    maxKesExclusive: 40000,
    summary: 'A simulated typical home array for mid-range monthly spend.',
  },
  {
    id: 'high_usage',
    label: 'High-usage / hybrid (simulated)',
    minKesInclusive: 40000,
    maxKesExclusive: null,
    summary: 'A simulated larger system for higher monthly electricity spend.',
  },
];

export const SOLAR_STEPS = {
  AWAITING_PROPERTY_TYPE: 'awaiting_property_type',
  AWAITING_SPEND: 'awaiting_spend',
  COMPLETE: 'complete',
} as const;

export function recommendSolarTier(monthlySpendKes: number): SolarTier {
  const match = SOLAR_TIERS.find((candidate) => {
    const aboveMin = monthlySpendKes >= candidate.minKesInclusive;
    const belowMax =
      candidate.maxKesExclusive === null ||
      monthlySpendKes < candidate.maxKesExclusive;
    return aboveMin && belowMax;
  });
  if (!match) {
    throw new Error(
      `No solar recommendation tier for spend ${monthlySpendKes}`,
    );
  }
  return match;
}

export function listSolarPropertyTypes(): string {
  return SOLAR_PROPERTY_TYPES.map((type) => `• ${type.label}`).join('\n');
}

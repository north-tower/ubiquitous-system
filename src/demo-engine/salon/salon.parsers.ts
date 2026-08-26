import {
  SALON_SERVICES,
  SALON_SLOTS,
  type SalonService,
  type SalonSlot,
} from './salon.fixture';

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function matchSalonService(userText: string): SalonService | null {
  const haystack = normalize(userText);
  const ranked = SALON_SERVICES.flatMap((service) =>
    service.aliases.map((alias) => ({ service, alias: normalize(alias) })),
  ).sort((a, b) => b.alias.length - a.alias.length);

  for (const { service, alias } of ranked) {
    if (haystack === alias || haystack.includes(alias)) {
      return service;
    }
  }
  return null;
}

export function matchSalonSlot(userText: string): SalonSlot | null {
  const haystack = normalize(userText).replace(/\s+/g, '');

  for (const slot of SALON_SLOTS) {
    for (const alias of slot.aliases) {
      const needle = normalize(alias).replace(/\s+/g, '');
      if (haystack === needle) {
        return slot;
      }
    }
  }
  return null;
}

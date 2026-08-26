import { formatKes } from '../demo-copy';

export type SalonService = {
  id: string;
  name: string;
  priceKes: number;
  aliases: string[];
};

export type SalonSlot = {
  id: string;
  label: string;
  aliases: string[];
};

export const SALON_SERVICES: readonly SalonService[] = [
  {
    id: 'braids',
    name: 'Braids',
    priceKes: 3500,
    aliases: ['braids', 'braid', 'box braids'],
  },
  {
    id: 'cornrows',
    name: 'Cornrows',
    priceKes: 2000,
    aliases: ['cornrows', 'cornrow', 'canerows', 'cane rows'],
  },
  {
    id: 'wash_blowdry',
    name: 'Wash & blow-dry',
    priceKes: 1200,
    aliases: ['wash & blow-dry', 'blow-dry', 'blow dry', 'blowdry', 'wash'],
  },
  {
    id: 'locs_retwist',
    name: 'Locs retwist',
    priceKes: 2500,
    aliases: ['locs retwist', 'retwist', 'locs', 'dreadlocks'],
  },
];

export const SALON_SLOTS: readonly SalonSlot[] = [
  {
    id: '1',
    label: '10:30 AM',
    aliases: ['1', '10:30', '10.30', '1030', '10:30am', '10:30 am'],
  },
  {
    id: '2',
    label: '1:00 PM',
    aliases: ['2', '1:00', '1.00', '1pm', '1 pm', '1:00pm', '13:00'],
  },
  {
    id: '3',
    label: '3:30 PM',
    aliases: ['3', '3:30', '3.30', '1530', '3:30pm', '3:30 pm'],
  },
];

export const SALON_STEPS = {
  AWAITING_SERVICE: 'awaiting_service',
  AWAITING_SLOT: 'awaiting_slot',
  COMPLETE: 'complete',
} as const;

export function listSalonServices(): string {
  return SALON_SERVICES.map(
    (service) => `• ${service.name} — ${formatKes(service.priceKes)}`,
  ).join('\n');
}

export function listSalonSlots(): string {
  return SALON_SLOTS.map((slot) => `${slot.id}) ${slot.label}`).join('\n');
}

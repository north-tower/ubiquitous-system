export type ScriptDemoStep = {
  id: string;
  prompt: string;
  reask: string;
  minLength: number;
};

export type ScriptDemoDefinition = {
  mode: string;
  intro: string;
  steps: ScriptDemoStep[];
  customerSummary: (payload: Record<string, unknown>) => string;
};

export const SCRIPT_DEMO_DEFINITIONS: ScriptDemoDefinition[] = [
  {
    mode: 'dental',
    intro: [
      'Perfect 😊',
      "Pretend this is a dental clinic's WhatsApp — you're the patient.",
      'What would you like to ask? For example: teeth cleaning price or book a check-up.',
    ].join('\n'),
    steps: [
      {
        id: 'service',
        prompt: 'Got it. Which day works for you — weekday or weekend?',
        reask: 'Tell me the service you need (e.g. cleaning or check-up).',
        minLength: 3,
      },
      {
        id: 'timing',
        prompt: 'Noted — simulated slot held for demo purposes.',
        reask: 'Reply with weekday or weekend, or a day that suits you.',
        minLength: 3,
      },
    ],
    customerSummary: (payload) =>
      [
        'Simulated dental enquiry logged:',
        `• Request: ${String(payload.service ?? 'General enquiry')}`,
        `• Preferred timing: ${String(payload.timing ?? 'Flexible')}`,
        'No real appointment was booked.',
      ].join('\n'),
  },
  {
    mode: 'wines_spirits',
    intro: [
      'Perfect 😊',
      "Pretend this is a wines & spirits shop on WhatsApp — you're the customer.",
      'Ask like you would in chat — e.g. Do you deliver? or price for Johnnie Walker?',
    ].join('\n'),
    steps: [
      {
        id: 'product',
        prompt: 'How many bottles do you need, and is this pickup or delivery?',
        reask: 'Name a product or ask a question about stock or delivery.',
        minLength: 3,
      },
      {
        id: 'fulfilment',
        prompt: 'Got it — we would confirm stock and delivery fee next (simulated).',
        reask: 'Share quantity and pickup or delivery.',
        minLength: 3,
      },
    ],
    customerSummary: (payload) =>
      [
        'Simulated order enquiry:',
        `• Product / question: ${String(payload.product ?? 'General')}`,
        `• Fulfilment: ${String(payload.fulfilment ?? 'TBC')}`,
        'Inventory and prices were demo data only.',
      ].join('\n'),
  },
  {
    mode: 'events',
    intro: [
      'Perfect 😊',
      "Pretend this is an events company's WhatsApp — you're planning a function.",
      'Try: wedding decor quote or availability for 15 December.',
    ].join('\n'),
    steps: [
      {
        id: 'event',
        prompt: 'Roughly how many guests, and what is the venue or area?',
        reask: 'Describe the event type or date you have in mind.',
        minLength: 3,
      },
      {
        id: 'scale',
        prompt: 'Thanks — a coordinator would send packages next (simulated).',
        reask: 'Share guest count and venue or area.',
        minLength: 3,
      },
    ],
    customerSummary: (payload) =>
      [
        'Simulated event enquiry:',
        `• Event: ${String(payload.event ?? 'Celebration')}`,
        `• Scale / venue: ${String(payload.scale ?? 'TBC')}`,
        'No venue was held and no quote is binding.',
      ].join('\n'),
  },
  {
    mode: 'generic',
    intro: [
      'Perfect 😊',
      "Pretend this is the business's WhatsApp — you're the customer.",
      'Send a typical first message you would ask this industry.',
    ].join('\n'),
    steps: [
      {
        id: 'need',
        prompt: 'Anything else we should note for this simulated enquiry?',
        reask: 'Send a short customer question or request.',
        minLength: 3,
      },
      {
        id: 'extra',
        prompt: 'Captured for the simulated enquiry.',
        reask: 'A short line is enough — or type "none".',
        minLength: 2,
      },
    ],
    customerSummary: (payload) =>
      [
        'Simulated customer journey complete:',
        `• Initial ask: ${String(payload.need ?? 'Enquiry')}`,
        `• Notes: ${String(payload.extra ?? 'None')}`,
      ].join('\n'),
  },
];

export const SCRIPT_DEMO_MODES = SCRIPT_DEMO_DEFINITIONS.map((def) => def.mode);

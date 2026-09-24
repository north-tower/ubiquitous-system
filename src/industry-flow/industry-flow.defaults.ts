import type { UpsertIndustryFlowInput } from './industry-flow.types';

export const DEFAULT_INDUSTRY_FLOWS: UpsertIndustryFlowInput[] = [
  {
    demoMode: 'solar',
    menuLabel: 'Solar',
    plaaggMenuId: 'solar',
    sortOrder: 10,
    engineKind: 'solar',
    definition: {
      aliases: ['solar power', 'panels'],
      plaaggInsights: {
        pipelineStage: 'Qualified — site survey pending',
        followUp: 'Send tiered quote PDF within 24h',
        assignee: 'Simulated: Alex (Solar desk)',
        dashboardInsight:
          '3 new WhatsApp leads this week; avg reply time 4m (demo)',
      },
      recommendedPlan: {
        name: 'PLAAGG Growth — Solar',
        summary: 'Lead capture, tariff FAQ, and survey booking handoff.',
        modules: [
          'WhatsApp lead inbox',
          'Quote templates',
          'Staff assignment rules',
        ],
      },
    },
  },
  {
    demoMode: 'salon',
    menuLabel: 'Salon / Beauty',
    plaaggMenuId: 'salon_beauty',
    sortOrder: 20,
    engineKind: 'salon',
    definition: {
      aliases: ['salon', 'beauty', 'hair'],
      plaaggInsights: {
        pipelineStage: 'Booking intent — slot held (demo)',
        followUp: 'Confirm stylist and deposit link',
        assignee: 'Simulated: Mercy (Front desk)',
        dashboardInsight:
          'Peak enquiries Fri 4–7pm; 62% ask for braids (demo)',
      },
      recommendedPlan: {
        name: 'PLAAGG Growth — Beauty',
        summary: 'Service menu, pricing replies, and appointment slots.',
        modules: [
          'Service catalogue',
          'Slot picker (demo)',
          'Deposit reminders',
        ],
      },
    },
  },
  {
    demoMode: 'dental',
    menuLabel: 'Dental',
    plaaggMenuId: 'dental',
    sortOrder: 30,
    engineKind: 'script',
    definition: {
      intro: [
        'Perfect 😊',
        "Pretend this is a dental clinic's WhatsApp — you're the patient.",
        'What would you like to ask? For example: teeth cleaning price or book a check-up.',
      ].join('\n'),
      aliases: ['dentist', 'clinic'],
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
      customerSummaryTemplate: [
        'Simulated dental enquiry logged:',
        '• Request: {{service}}',
        '• Preferred timing: {{timing}}',
        'No real appointment was booked.',
      ],
      plaaggInsights: {
        pipelineStage: 'New patient enquiry',
        followUp: 'Offer cleaning + check-up bundle',
        assignee: 'Simulated: Dr. Wanjiku’s coordinator',
        dashboardInsight: 'Most asks: pricing & Saturday slots (demo data)',
      },
      recommendedPlan: {
        name: 'PLAAGG Care — Dental',
        summary: 'Triage FAQs, appointment requests, and recall reminders.',
        modules: [
          'Patient intake',
          'Clinic hours bot',
          'Handoff to reception',
        ],
      },
    },
  },
  {
    demoMode: 'wines_spirits',
    menuLabel: 'Wines & Spirits',
    plaaggMenuId: 'wines_spirits',
    sortOrder: 40,
    engineKind: 'script',
    definition: {
      intro: [
        'Perfect 😊',
        "Pretend this is a wines & spirits shop on WhatsApp — you're the customer.",
        'Ask like you would in chat — e.g. Do you deliver? or price for Johnnie Walker?',
      ].join('\n'),
      aliases: ['wine', 'liquor', 'spirits'],
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
      customerSummaryTemplate: [
        'Simulated order enquiry:',
        '• Product / question: {{product}}',
        '• Fulfilment: {{fulfilment}}',
        'Inventory and prices were demo data only.',
      ],
      plaaggInsights: {
        pipelineStage: 'Order enquiry — delivery zone check',
        followUp: 'Confirm stock and delivery fee',
        assignee: 'Simulated: Kevin (Retail WhatsApp)',
        dashboardInsight:
          'Top SKU questions: premium whisky & gift packs (demo)',
      },
      recommendedPlan: {
        name: 'PLAAGG Retail — Beverages',
        summary: 'SKU lookup, delivery zones, and order notes.',
        modules: ['Product FAQ', 'Delivery checker', 'Order summary to staff'],
      },
    },
  },
  {
    demoMode: 'events',
    menuLabel: 'Events',
    plaaggMenuId: 'events',
    sortOrder: 50,
    engineKind: 'script',
    definition: {
      intro: [
        'Perfect 😊',
        "Pretend this is an events company's WhatsApp — you're planning a function.",
        'Try: wedding decor quote or availability for 15 December.',
      ].join('\n'),
      aliases: ['wedding', 'party', 'event'],
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
      customerSummaryTemplate: [
        'Simulated event enquiry:',
        '• Event: {{event}}',
        '• Scale / venue: {{scale}}',
        'No venue was held and no quote is binding.',
      ],
      plaaggInsights: {
        pipelineStage: 'Proposal requested',
        followUp: 'Send package menu and site visit options',
        assignee: 'Simulated: Nyambura (Events)',
        dashboardInsight: 'Average guest count parsed: 180 (simulated)',
      },
      recommendedPlan: {
        name: 'PLAAGG Events',
        summary: 'Package discovery, date capture, and proposal pipeline.',
        modules: [
          'Event type flows',
          'Guest count parser',
          'Proposal stage tracking',
        ],
      },
    },
  },
  {
    demoMode: 'generic',
    menuLabel: 'Other',
    plaaggMenuId: 'other',
    sortOrder: 60,
    engineKind: 'script',
    definition: {
      intro: [
        'Perfect 😊',
        "Pretend this is the business's WhatsApp — you're the customer.",
        'Send a typical first message you would ask this industry.',
      ].join('\n'),
      aliases: ['other industry', 'something else'],
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
      customerSummaryTemplate: [
        'Simulated customer journey complete:',
        '• Initial ask: {{need}}',
        '• Notes: {{extra}}',
      ],
      plaaggInsights: {
        pipelineStage: 'New WhatsApp lead',
        followUp: 'Qualify budget and timeline',
        assignee: 'Simulated: Techfind success team',
        dashboardInsight: 'Conversion from chat to booked call: 18% (demo KPI)',
      },
      recommendedPlan: {
        name: 'PLAAGG Starter',
        summary: 'Core WhatsApp lead capture with human handoff.',
        modules: ['Unified inbox', 'Lead stages', 'Basic analytics'],
      },
    },
  },
];

export type PlaaggInsightContext = {
  industryLabel: string;
  contactName: string;
  businessName: string;
  capturedDetail: string;
  pipelineStage: string;
  followUp: string;
  assignee: string;
  dashboardInsight: string;
};

type PlanFixture = {
  name: string;
  summary: string;
  modules: string[];
};

const INSIGHTS: Record<
  string,
  Omit<
    PlaaggInsightContext,
    'contactName' | 'businessName' | 'capturedDetail' | 'industryLabel'
  >
> = {
  solar: {
    pipelineStage: 'Qualified — site survey pending',
    followUp: 'Send tiered quote PDF within 24h',
    assignee: 'Simulated: Alex (Solar desk)',
    dashboardInsight: '3 new WhatsApp leads this week; avg reply time 4m (demo)',
  },
  salon: {
    pipelineStage: 'Booking intent — slot held (demo)',
    followUp: 'Confirm stylist and deposit link',
    assignee: 'Simulated: Mercy (Front desk)',
    dashboardInsight: 'Peak enquiries Fri 4–7pm; 62% ask for braids (demo)',
  },
  salon_beauty: {
    pipelineStage: 'Booking intent — slot held (demo)',
    followUp: 'Confirm stylist and deposit link',
    assignee: 'Simulated: Mercy (Front desk)',
    dashboardInsight: 'Peak enquiries Fri 4–7pm; 62% ask for braids (demo)',
  },
  dental: {
    pipelineStage: 'New patient enquiry',
    followUp: 'Offer cleaning + check-up bundle',
    assignee: 'Simulated: Dr. Wanjiku’s coordinator',
    dashboardInsight: 'Most asks: pricing & Saturday slots (demo data)',
  },
  wines_spirits: {
    pipelineStage: 'Order enquiry — delivery zone check',
    followUp: 'Confirm stock and delivery fee',
    assignee: 'Simulated: Kevin (Retail WhatsApp)',
    dashboardInsight: 'Top SKU questions: premium whisky & gift packs (demo)',
  },
  events: {
    pipelineStage: 'Proposal requested',
    followUp: 'Send package menu and site visit options',
    assignee: 'Simulated: Nyambura (Events)',
    dashboardInsight: 'Average guest count parsed: 180 (simulated)',
  },
  generic: {
    pipelineStage: 'New WhatsApp lead',
    followUp: 'Qualify budget and timeline',
    assignee: 'Simulated: Techfind success team',
    dashboardInsight: 'Conversion from chat to booked call: 18% (demo KPI)',
  },
  other: {
    pipelineStage: 'New WhatsApp lead',
    followUp: 'Qualify budget and timeline',
    assignee: 'Simulated: Techfind success team',
    dashboardInsight: 'Conversion from chat to booked call: 18% (demo KPI)',
  },
};

const PLANS: Record<string, PlanFixture> = {
  solar: {
    name: 'PLAAGG Growth — Solar',
    summary: 'Lead capture, tariff FAQ, and survey booking handoff.',
    modules: ['WhatsApp lead inbox', 'Quote templates', 'Staff assignment rules'],
  },
  salon_beauty: {
    name: 'PLAAGG Growth — Beauty',
    summary: 'Service menu, pricing replies, and appointment slots.',
    modules: ['Service catalogue', 'Slot picker (demo)', 'Deposit reminders'],
  },
  dental: {
    name: 'PLAAGG Care — Dental',
    summary: 'Triage FAQs, appointment requests, and recall reminders.',
    modules: ['Patient intake', 'Clinic hours bot', 'Handoff to reception'],
  },
  wines_spirits: {
    name: 'PLAAGG Retail — Beverages',
    summary: 'SKU lookup, delivery zones, and order notes.',
    modules: ['Product FAQ', 'Delivery checker', 'Order summary to staff'],
  },
  events: {
    name: 'PLAAGG Events',
    summary: 'Package discovery, date capture, and proposal pipeline.',
    modules: ['Event type flows', 'Guest count parser', 'Proposal stage tracking'],
  },
  default: {
    name: 'PLAAGG Starter',
    summary: 'Core WhatsApp lead capture with human handoff.',
    modules: ['Unified inbox', 'Lead stages', 'Basic analytics'],
  },
};

export function buildPlaaggInsightContext(params: {
  industryId: string;
  industryLabel: string;
  contactName: string;
  businessName: string;
  demoSummaryLine: string;
}): PlaaggInsightContext {
  const template =
    INSIGHTS[params.industryId] ??
    INSIGHTS.generic;
  return {
    industryLabel: params.industryLabel,
    contactName: params.contactName,
    businessName: params.businessName,
    capturedDetail: params.demoSummaryLine,
    ...template,
  };
}

export function recommendedPlaaggPlan(
  industryId: string,
  industryLabel: string,
): PlanFixture {
  const plan =
    PLANS[industryId] ??
    (industryId === 'salon' ? PLANS.salon_beauty : null) ??
    PLANS.default;
  if (industryId === 'other' || industryId === 'generic') {
    return {
      ...PLANS.default,
      summary: `${PLANS.default.summary} Tailored for ${industryLabel}.`,
    };
  }
  return plan;
}

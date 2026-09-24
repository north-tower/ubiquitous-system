import { DEMO_DISCLAIMER } from '../demo-engine/demo-copy';
import { formatNumberedOptions as formatMenu } from '../enquiry-flow/match-numbered-option';
import { PLAAGG_FINISH_OPTIONS } from './plaagg-finish-options';
import type { NumberedOption } from '../enquiry-flow/match-numbered-option';
import { PLAAGG_INDUSTRY_OPTIONS } from './plaagg-industry-options';
import type { PlaaggInsightContext } from './plaagg-simulated-insights';

export { DEMO_DISCLAIMER };

export function plaaggIndustryMenu(options: readonly NumberedOption[]): string {
  return [
    '*Explore PLAAGG* — pick an industry to play through as a customer.',
    'All data below is simulated.',
    '',
    formatMenu(options),
  ].join('\n');
}

export function reaskPlaaggIndustry(options: readonly NumberedOption[]): string {
  return [
    'Pick a number from the list, or type an industry name.',
    '',
    formatMenu(options),
  ].join('\n');
}

export const PLAAGG_INDUSTRY_MENU = plaaggIndustryMenu(PLAAGG_INDUSTRY_OPTIONS);

export const REASK_PLAAGG_INDUSTRY = reaskPlaaggIndustry(PLAAGG_INDUSTRY_OPTIONS);

export const ASK_OTHER_INDUSTRY =
  'Which industry should we simulate? (A few words is fine.)';

export const REASK_OTHER_INDUSTRY = 'Tell us the industry in a few words.';

export function plaaggBusinessReceives(context: PlaaggInsightContext): string {
  const {
    industryLabel,
    contactName,
    businessName,
    capturedDetail,
    pipelineStage,
    followUp,
    assignee,
    dashboardInsight,
  } = context;

  return [
    DEMO_DISCLAIMER,
    '',
    '*What the business would receive on PLAAGG*',
    '',
    `• *Captured customer details:* ${contactName} (${businessName}) — ${capturedDetail}`,
    '• *New lead / enquiry:* Simulated record #PLA-DEMO-8842 created on WhatsApp',
    `• *Pipeline stage:* ${pipelineStage}`,
    `• *Required follow-up:* ${followUp}`,
    `• *Assigned staff member:* ${assignee}`,
    `• *Dashboard insight:* ${dashboardInsight}`,
    '',
    `Industry played: *${industryLabel}*`,
  ].join('\n');
}

export const PLAAGG_FINISH_MENU = [
  'What would you like to do next?',
  '',
  formatMenu(PLAAGG_FINISH_OPTIONS),
].join('\n');

export function plaaggRecommendedPlanReply(plan: {
  name: string;
  summary: string;
  modules: string[];
}): string {
  return [
    `*Recommended PLAAGG plan (simulated):* ${plan.name}`,
    plan.summary,
    '',
    plan.modules.map((line) => `• ${line}`).join('\n'),
    '',
    PLAAGG_FINISH_MENU,
  ].join('\n');
}

export const PLAAGG_BOOK_DEMO_REPLY = [
  '*Book a personalized demo*',
  "Thanks — we'll use the details you already shared to schedule a live walkthrough with Techfind.",
  'A consultant will confirm a time on WhatsApp or email.',
  '',
  PLAAGG_FINISH_MENU,
].join('\n');

export function plaaggTryAnother(options: readonly NumberedOption[]): string {
  return [
    'Sure — pick another industry to explore.',
    '',
    formatMenu(options),
  ].join('\n');
}

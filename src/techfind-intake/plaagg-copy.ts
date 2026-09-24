import { DEMO_DISCLAIMER } from '../demo-engine/demo-copy';
import { formatNumberedOptions as formatMenu } from '../enquiry-flow/match-numbered-option';
import { PLAAGG_FINISH_OPTIONS } from './plaagg-finish-options';
import { PLAAGG_INDUSTRY_OPTIONS } from './plaagg-industry-options';
import { recommendedPlaaggPlan } from './plaagg-simulated-insights';
import type { PlaaggInsightContext } from './plaagg-simulated-insights';

export { DEMO_DISCLAIMER };

export const PLAAGG_INDUSTRY_MENU = [
  '*Explore PLAAGG* — pick an industry to play through as a customer.',
  'All data below is simulated.',
  '',
  formatMenu(PLAAGG_INDUSTRY_OPTIONS),
].join('\n');

export const REASK_PLAAGG_INDUSTRY = [
  "Pick a number from the list, or type an industry name.",
  '',
  formatMenu(PLAAGG_INDUSTRY_OPTIONS),
].join('\n');

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

export function plaaggRecommendedPlanReply(
  industryId: string,
  industryLabel: string,
): string {
  const plan = recommendedPlaaggPlan(industryId, industryLabel);
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

export const PLAAGG_TRY_ANOTHER = [
  'Sure — pick another industry to explore.',
  '',
  formatMenu(PLAAGG_INDUSTRY_OPTIONS),
].join('\n');

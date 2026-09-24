import { formatNumberedOptions } from '../enquiry-flow/match-numbered-option';
import { TECHFIND_MENU_OPTIONS } from './techfind-menu-options';

export const TECHFIND_INTAKE_GREETING = [
  'Hi — this is *Techfind Consulting* on WhatsApp.',
  '',
  'How can we help you today? Reply with a number or the option name.',
  '',
  formatNumberedOptions(TECHFIND_MENU_OPTIONS),
  '',
  'Type *reset* anytime to start over.',
].join('\n');

export const REASK_MENU = [
  "I didn't catch that option.",
  '',
  formatNumberedOptions(TECHFIND_MENU_OPTIONS),
].join('\n');

export const ASK_NAME = "Great — what's your name?";

export const REASK_NAME =
  "Please send your name (first name is fine), or type *reset* to start over.";

export const ASK_BUSINESS = 'And the name of your business?';

export const REASK_BUSINESS = 'What business is this for?';

export const QUALIFICATION_BY_SERVICE: Record<string, string> = {
  website:
    'Tell us a bit about the website you have in mind — who it is for and what it should do.',
  crm: 'What are you trying to track or automate in the business today?',
  whatsapp_automation:
    'What do customers usually message you about, and how do you handle it now?',
  plaagg:
    'Which industry would you like to explore first? (Solar, Salon/Beauty, Dental, Wines & Spirits, Events, or Other)',
  ai_training:
    'Who needs training, and on which tools or topics?',
  existing_client: 'What do you need help with as an existing client?',
  speak_to_team: 'What should we pass to the team when they reach out?',
};

export const REASK_QUALIFICATION =
  'Please share a sentence or two so we can route this properly.';

export const LEAD_SAVED =
  "Thanks — we've logged your details and a sales lead for our team.";

export function websiteFollowUp(websiteUrl: string): string {
  return [
    LEAD_SAVED,
    '',
    'For websites, start here:',
    websiteUrl,
    '',
    'Browse packages and examples, then reply here if you want us to scope something custom.',
  ].join('\n');
}

export const CRM_FOLLOW_UP = [
  LEAD_SAVED,
  '',
  '*Business software & CRM*',
  'We help teams replace spreadsheets with CRMs and ops tools tailored to how you sell and deliver.',
  '',
  'Typical next steps: a short discovery call, process map, and a phased rollout plan.',
  '',
  'Our team will follow up on WhatsApp or email using the details you shared.',
].join('\n');

export const WHATSAPP_AUTOMATION_FOLLOW_UP = [
  LEAD_SAVED,
  '',
  '*WhatsApp automation*',
  'We design customer journeys on WhatsApp — FAQs, bookings, lead capture, and handoff to your team when it matters.',
  '',
  'Everything can start with a pilot on your number before wider rollout.',
  '',
  'A Techfind consultant will reach out with next steps.',
].join('\n');

export const PLAAGG_PHASE2_HOLD = [
  LEAD_SAVED,
  '',
  '*Explore PLAAGG*',
  'Interactive industry demos (Solar, Salon, Dental, and more) are being upgraded on this line.',
  '',
  'We saved your interest — a consultant can walk you through PLAAGG live, or type *reset* and pick another service.',
].join('\n');

export const AI_TRAINING_FOLLOW_UP = [
  LEAD_SAVED,
  '',
  '*AI training*',
  'We run practical workshops for teams adopting AI in sales, ops, and customer service — grounded in your workflows, not generic slides.',
  '',
  'Our team will suggest a format and schedule based on what you shared.',
].join('\n');

export const EXISTING_CLIENT_FOLLOW_UP = [
  LEAD_SAVED,
  '',
  '*Existing-client support*',
  "We've flagged this for our support queue. If it's urgent, type *human* anytime to pause the bot so a person can reply on this thread.",
].join('\n');

export const SPEAK_TO_TEAM_FOLLOW_UP = [
  LEAD_SAVED,
  '',
  "A team member will pick this up on WhatsApp shortly. Type *human* if you need to talk to someone right away.",
].join('\n');

export const HUMAN_HANDOVER_ACK =
  "Understood — a Techfind team member will reply here. The bot is paused until you type *reset*.";

export const ALREADY_FILED =
  "We've already captured your details for this chat. Type *reset* to start a new request.";

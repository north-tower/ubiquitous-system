export const QUALIFICATION_FIELDS = [
  'businessName',
  'dailyEnquiryVolume',
  'currentProcess',
  'staffCount',
  'existingSystem',
  'painPoint',
] as const;

export type QualificationField = (typeof QUALIFICATION_FIELDS)[number];

export const QUALIFICATION_QUESTIONS: Record<QualificationField, string> = {
  businessName: "What's the name of the business?",
  dailyEnquiryVolume:
    'Roughly how many customer enquiries land on WhatsApp in a day?',
  currentProcess:
    'What do customers normally ask, and how do you handle those messages today?',
  staffCount: 'How many people currently handle the WhatsApp inbox?',
  existingSystem:
    'Are you using any tool or system for this already — or is it mostly manual?',
  painPoint: "What's the biggest WhatsApp problem for the business right now?",
};

export const QUALIFICATION_INTRO =
  "Great — I'll ask a few things about the live setup so we can see if this would actually help.";

export const QUALIFICATION_REASK_NUMBER =
  "I didn't catch a number there. Could you give me an estimate?";

export const HMG_STEPS = {
  AWAITING_TOPIC: 'AWAITING_TOPIC',
  AWAITING_BRIEF: 'AWAITING_BRIEF',
  SUBMITTED: 'SUBMITTED',
} as const;

export type HmgStep = (typeof HMG_STEPS)[keyof typeof HMG_STEPS];

import {
  SALON_SERVICES,
  SALON_SLOTS,
  SALON_STEPS,
} from '../demo-engine/salon/salon.fixture';
import {
  SOLAR_PROPERTY_TYPES,
  SOLAR_STEPS,
} from '../demo-engine/solar/solar.fixture';

export type ExtractionSchema = {
  schemaName: string;
  schema: { [key: string]: unknown };
  systemPrompt: string;
};

export function extractionSchemaFor(
  demoMode: string,
  step: string,
): ExtractionSchema | null {
  const key = `${demoMode}:${step}`;
  return EXTRACTION_SCHEMAS[key] ?? null;
}

const EXTRACTION_SCHEMAS: Record<string, ExtractionSchema> = {
  [`salon:${SALON_STEPS.AWAITING_SERVICE}`]: {
    schemaName: 'salon_service',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        matched: { type: 'boolean' },
        serviceId: {
          type: 'string',
          enum: SALON_SERVICES.map((service) => service.id),
        },
      },
      required: ['matched', 'serviceId'],
    },
    systemPrompt:
      'Map free text onto one simulated salon service id. If none fit, matched=false.',
  },
  [`salon:${SALON_STEPS.AWAITING_SLOT}`]: {
    schemaName: 'salon_slot',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        matched: { type: 'boolean' },
        slotId: {
          type: 'string',
          enum: SALON_SLOTS.map((slot) => slot.id),
        },
      },
      required: ['matched', 'slotId'],
    },
    systemPrompt:
      'Map free text onto a simulated salon slot id (1, 2, or 3). If none fit, matched=false.',
  },
  [`solar:${SOLAR_STEPS.AWAITING_PROPERTY_TYPE}`]: {
    schemaName: 'solar_property_type',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        matched: { type: 'boolean' },
        propertyTypeId: {
          type: 'string',
          enum: SOLAR_PROPERTY_TYPES.map((type) => type.id),
        },
      },
      required: ['matched', 'propertyTypeId'],
    },
    systemPrompt:
      'Map free text onto a simulated solar property type id. If none fit, matched=false.',
  },
  [`solar:${SOLAR_STEPS.AWAITING_SPEND}`]: {
    schemaName: 'solar_spend',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        matched: { type: 'boolean' },
        monthlySpendKes: { type: 'number' },
      },
      required: ['matched', 'monthlySpendKes'],
    },
    systemPrompt:
      'Extract a monthly electricity spend in Kenyan shillings as a number. If none, matched=false.',
  },
  'qualification:dailyEnquiryVolume': {
    schemaName: 'qualification_daily_enquiry_volume',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        matched: { type: 'boolean' },
        dailyEnquiryVolume: { type: 'number' },
      },
      required: ['matched', 'dailyEnquiryVolume'],
    },
    systemPrompt:
      'Extract a daily WhatsApp enquiry count as a number. If none, matched=false.',
  },
  'qualification:staffCount': {
    schemaName: 'qualification_staff_count',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        matched: { type: 'boolean' },
        staffCount: { type: 'number' },
      },
      required: ['matched', 'staffCount'],
    },
    systemPrompt:
      'Extract how many people handle WhatsApp as a number. If none, matched=false.',
  },
};

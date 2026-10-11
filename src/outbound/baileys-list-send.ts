import type { BaileysListMessageSpec } from '../enquiry-flow/enquiry-baileys-interactive';

export type BaileysSendListPayload = BaileysListMessageSpec;

export function toBaileysListSendContent(
  spec: BaileysListMessageSpec,
): Record<string, unknown> {
  return {
    text: spec.text,
    title: spec.title,
    buttonText: spec.buttonText,
    sections: spec.sections,
  };
}

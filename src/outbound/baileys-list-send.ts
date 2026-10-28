import type { ConfigService } from '@nestjs/config';
import type { BaileysListMessageSpec } from '../enquiry-flow/enquiry-baileys-interactive';
import {
  buildPollValuesFromChoices,
  type BaileysPollChoice,
} from './baileys-poll-choices';

export type BaileysSendListPayload = BaileysListMessageSpec;

export type BaileysListWireFormat =
  | 'poll'
  | 'native_flow'
  | 'legacy_list'
  | 'text';

/** Minimal proto shape for legacy listMessage (often not rendered on current WhatsApp). */
export type BaileysListProtoMessage = {
  listMessage: {
    title: string;
    description: string;
    buttonText: string;
    listType: number;
    sections: {
      title: string;
      rows: { title: string; rowId: string; description?: string }[];
    }[];
  };
};

export type BaileysNativeFlowWaMessage = {
  messageContextInfo: { messageSecret: Uint8Array };
  interactiveMessage: {
    body: { text: string };
    nativeFlowMessage: {
      messageVersion: number;
      buttons: {
        name: string;
        buttonParamsJson: string;
      }[];
    };
  };
};

export type BaileysPollSendContent = {
  poll: {
    name: string;
    values: string[];
    selectableCount: number;
    messageSecret?: Uint8Array;
  };
};

export function resolveBaileysListWireFormat(
  config: ConfigService,
): BaileysListWireFormat {
  const raw = config.get<string>('BAILEYS_LIST_FORMAT')?.trim().toLowerCase();
  if (raw === 'legacy_list' || raw === 'legacy') {
    return 'legacy_list';
  }
  if (raw === 'native_flow' || raw === 'interactive') {
    return 'native_flow';
  }
  if (raw === 'text' || raw === 'numbered' || raw === 'plain') {
    return 'text';
  }
  return 'poll';
}

export function listSpecToPollChoices(
  spec: BaileysListMessageSpec,
): BaileysPollChoice[] {
  return spec.sections.flatMap((section) =>
    section.rows.map((row) => ({ id: row.rowId, label: row.title })),
  );
}

export function buildBaileysPollSendContent(
  spec: BaileysListMessageSpec,
): BaileysPollSendContent {
  const choices = listSpecToPollChoices(spec);
  const maxSelectable = spec.pollSelectableCount ?? 1;
  const selectableCount = Math.min(
    Math.max(maxSelectable, 1),
    choices.length,
  );
  return {
    poll: {
      name: spec.buttonText || spec.title,
      values: buildPollValuesFromChoices(choices),
      selectableCount,
    },
  };
}

export function buildBaileysListWaPayload(
  spec: BaileysListMessageSpec,
  format: BaileysListWireFormat,
  messageSecret: Uint8Array,
): BaileysListProtoMessage | BaileysNativeFlowWaMessage {
  if (format === 'legacy_list') {
    return buildBaileysListProtoMessage(spec);
  }
  return buildBaileysNativeFlowListMessage(spec, messageSecret);
}

/** Legacy listMessage proto — relay succeeds but many clients no longer render it. */
export function buildBaileysListProtoMessage(
  spec: BaileysListMessageSpec,
): BaileysListProtoMessage {
  return {
    listMessage: {
      title: spec.title,
      description: spec.text,
      buttonText: spec.buttonText,
      listType: 1,
      sections: spec.sections.map((section) => ({
        title: section.title,
        rows: section.rows.map((row) => ({
          title: row.title,
          rowId: row.rowId,
          ...(row.description ? { description: row.description } : {}),
        })),
      })),
    },
  };
}

export function buildBaileysNativeFlowListMessage(
  spec: BaileysListMessageSpec,
  messageSecret: Uint8Array,
): BaileysNativeFlowWaMessage {
  const bodyText =
    spec.text.trim() ||
    spec.title.trim() ||
    'Choose an option from the list below.';
  return {
    messageContextInfo: { messageSecret },
    interactiveMessage: {
      body: { text: bodyText },
      nativeFlowMessage: {
        messageVersion: 1,
        buttons: [
          {
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: spec.buttonText,
              sections: spec.sections.map((section) => ({
                title: section.title,
                rows: section.rows.map((row) => ({
                  id: row.rowId,
                  title: row.title,
                  ...(row.description ? { description: row.description } : {}),
                })),
              })),
            }),
          },
        ],
      },
    },
  };
}

/** Personal WhatsApp often rejects extra biz nodes with smax-invalid (479). */
export function baileysListRelayAdditionalNodes(
  _format: BaileysListWireFormat,
): { tag: string; attrs: Record<string, string> }[] | undefined {
  return undefined;
}

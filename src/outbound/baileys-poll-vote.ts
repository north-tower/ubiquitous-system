import { createHash } from 'crypto';
import type { BaileysPollChoice } from './baileys-poll-choices';
import type { BaileysInboundMessage } from './parse-baileys-message';

export type BaileysPollMessageKey = {
  fromMe?: boolean | null;
  remoteJid?: string | null;
  remoteJidAlt?: string | null;
  participant?: string | null;
  participantAlt?: string | null;
  id?: string | null;
};

export type StoredBaileysPoll = {
  choices: BaileysPollChoice[];
  phoneDigits: string;
  pollEncKey: Uint8Array;
  pollMsgId: string;
  pollCreatorJid: string;
  creationKey?: BaileysPollMessageKey | null;
  /** 1 = single-select poll; >1 = wait for user to finish tapping. */
  pollSelectableCount?: number;
};

type PollEncValue = {
  encPayload?: Uint8Array | Buffer | null;
  encIv?: Uint8Array | Buffer | null;
};

type DecryptPollVoteFn = (
  vote: { encPayload: Uint8Array; encIv: Uint8Array },
  ctx: {
    pollCreatorJid: string;
    pollMsgId: string;
    pollEncKey: Uint8Array;
    voterJid: string;
  },
) => { selectedOptions?: Uint8Array[] | null };

type GetKeyAuthorFn = (
  key: BaileysPollMessageKey | undefined | null,
  meId?: string,
) => string;

type JidNormalizedUserFn = (jid: string | undefined) => string;

export function pollOptionNameHash(optionName: string): Buffer {
  return createHash('sha256').update(Buffer.from(optionName)).digest();
}

/** Map decrypted poll vote hashes to enquiry list row ids (poll order preserved). */
export function pollVoteSelectedOptionIds(
  vote: { selectedOptions?: Uint8Array[] | null },
  choices: readonly BaileysPollChoice[],
): string[] {
  const ids: string[] = [];
  for (const selected of vote.selectedOptions ?? []) {
    const hashBuf = Buffer.from(selected);
    for (const choice of choices) {
      if (hashBuf.equals(pollOptionNameHash(choice.label))) {
        if (!ids.includes(choice.id)) {
          ids.push(choice.id);
        }
        break;
      }
    }
  }
  return ids;
}

/** Map decrypted poll vote hashes to an enquiry list row id. */
export function pollVoteSelectedOptionId(
  vote: { selectedOptions?: Uint8Array[] | null },
  choices: readonly BaileysPollChoice[],
): string | null {
  const ids = pollVoteSelectedOptionIds(vote, choices);
  if (ids.length === 0) {
    return null;
  }
  return ids.join(',');
}

function toBytes(value: unknown): Uint8Array | null {
  if (!value) {
    return null;
  }
  if (value instanceof Uint8Array) {
    return value.length ? value : null;
  }
  if (Buffer.isBuffer(value)) {
    return value.length ? new Uint8Array(value) : null;
  }
  if (typeof value === 'object' && value !== null && 'type' in value) {
    const serialized = value as unknown as { type?: string; data?: number[] };
    if (
      serialized.type === 'Buffer' &&
      Array.isArray(serialized.data) &&
      serialized.data.length > 0
    ) {
      return Uint8Array.from(serialized.data);
    }
  }
  return null;
}

function readMessageSecret(sent: unknown): Uint8Array | null {
  if (!sent || typeof sent !== 'object') {
    return null;
  }
  const message = (sent as { message?: unknown }).message;
  if (!message || typeof message !== 'object') {
    return null;
  }
  const secret = (
    message as {
      messageContextInfo?: { messageSecret?: unknown };
    }
  ).messageContextInfo?.messageSecret;
  return toBytes(secret);
}

export function extractStoredPollFromSent(
  sent: unknown,
  choices: BaileysPollChoice[],
  phoneDigits: string,
  pollCreatorJid: string,
  pollSelectableCount = 1,
): StoredBaileysPoll | null {
  if (!sent || typeof sent !== 'object') {
    return null;
  }
  const key = (sent as { key?: BaileysPollMessageKey }).key;
  const pollMsgId = key?.id?.trim() ?? '';
  const pollEncKey = readMessageSecret(sent);
  if (!pollMsgId || !pollEncKey || !pollCreatorJid.trim()) {
    return null;
  }
  return {
    choices,
    phoneDigits,
    pollEncKey,
    pollMsgId,
    pollCreatorJid: pollCreatorJid.trim(),
    creationKey: key ?? null,
    pollSelectableCount: Math.max(1, pollSelectableCount),
  };
}

export function multiSelectPollKey(
  phoneDigits: string,
  pollMsgId: string,
): string {
  return `${phoneDigits}:${pollMsgId}`;
}

export function hasBaileysPollUpdate(
  message: BaileysInboundMessage,
): boolean {
  return Boolean(message.message?.pollUpdateMessage?.vote);
}

export function uniqueNonEmptyJids(
  jids: Iterable<string | null | undefined>,
  jidNormalizedUser: JidNormalizedUserFn,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of jids) {
    const trimmed = raw?.trim() ?? '';
    if (!trimmed) {
      continue;
    }
    for (const candidate of [trimmed, jidNormalizedUser(trimmed)]) {
      if (!candidate || seen.has(candidate)) {
        continue;
      }
      seen.add(candidate);
      out.push(candidate);
    }
  }
  return out;
}

export function pollVoteJidCandidates(
  messageKey: BaileysPollMessageKey | null | undefined,
  creationKey: BaileysPollMessageKey | null | undefined,
  meIdNormalized: string,
  phoneDigits: string,
  getKeyAuthor: GetKeyAuthorFn,
  jidNormalizedUser: JidNormalizedUserFn,
  role: 'creator' | 'voter',
): string[] {
  const forcedFromMe =
    role === 'creator'
      ? [
          creationKey,
          creationKey ? { ...creationKey, fromMe: true } : null,
        ]
      : [messageKey, messageKey ? { ...messageKey, fromMe: false } : null];

  const phoneJid = phoneDigits ? `${phoneDigits}@s.whatsapp.net` : '';
  return uniqueNonEmptyJids(
    [
      meIdNormalized,
      role === 'creator' ? meIdNormalized : null,
      ...forcedFromMe.flatMap((key) =>
        key ? [getKeyAuthor(key, meIdNormalized)] : [],
      ),
      messageKey?.remoteJidAlt,
      messageKey?.participantAlt,
      messageKey?.participant,
      messageKey?.remoteJid,
      creationKey?.remoteJid,
      phoneJid,
    ],
    jidNormalizedUser,
  );
}

export type PollVoteDecryptAttempt = {
  pollCreatorJid: string;
  voterJid: string;
};

export function buildPollVoteDecryptAttempts(
  message: BaileysInboundMessage,
  stored: StoredBaileysPoll,
  meIdNormalized: string,
  getKeyAuthor: GetKeyAuthorFn,
  jidNormalizedUser: JidNormalizedUserFn,
  meLid?: string | null,
): PollVoteDecryptAttempt[] {
  const creationKey =
    message.message?.pollUpdateMessage?.pollCreationMessageKey ??
    stored.creationKey ??
    null;
  const voteKey = message.key ?? null;
  const creators = pollVoteJidCandidates(
    null,
    creationKey,
    meIdNormalized,
    stored.phoneDigits,
    getKeyAuthor,
    jidNormalizedUser,
    'creator',
  );
  for (const jid of uniqueNonEmptyJids(
    meLid?.trim() ? [meLid] : [],
    jidNormalizedUser,
  ).reverse()) {
    if (!creators.includes(jid)) {
      creators.unshift(jid);
    }
  }
  const voters = pollVoteJidCandidates(
    voteKey,
    creationKey,
    meIdNormalized,
    stored.phoneDigits,
    getKeyAuthor,
    jidNormalizedUser,
    'voter',
  );
  const attempts: PollVoteDecryptAttempt[] = [];
  const seen = new Set<string>();
  const pushAttempt = (pollCreatorJid: string, voterJid: string) => {
    const key = `${pollCreatorJid}\0${voterJid}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    attempts.push({ pollCreatorJid, voterJid });
  };
  if (creationKey && voteKey) {
    pushAttempt(
      getKeyAuthor(creationKey, meIdNormalized),
      getKeyAuthor(voteKey, meIdNormalized),
    );
  }
  for (const pollCreatorJid of creators) {
    for (const voterJid of voters) {
      pushAttempt(pollCreatorJid, voterJid);
    }
  }
  return attempts;
}

export async function resolvePollVoteOptionId(
  message: BaileysInboundMessage,
  stored: StoredBaileysPoll,
  meIdNormalized: string,
  deps?: {
    decryptPollVote?: DecryptPollVoteFn;
    getKeyAuthor?: GetKeyAuthorFn;
    jidNormalizedUser?: JidNormalizedUserFn;
    meLid?: string | null;
  },
): Promise<{ optionId: string | null; lastError?: string }> {
  const pollUpdate = message.message?.pollUpdateMessage;
  const voteRaw = pollUpdate?.vote;
  const encPayload = toBytes(voteRaw?.encPayload);
  const encIv = toBytes(voteRaw?.encIv);
  if (!encPayload || !encIv) {
    return { optionId: null, lastError: 'missing encPayload or encIv' };
  }
  const vote = { encPayload, encIv };

  let decryptPollVote = deps?.decryptPollVote;
  let getKeyAuthor = deps?.getKeyAuthor;
  let jidNormalizedUser = deps?.jidNormalizedUser;
  if (!decryptPollVote || !getKeyAuthor || !jidNormalizedUser) {
    const baileys = (await import(
      '@whiskeysockets/baileys/lib/Utils/process-message.js'
    )) as {
      decryptPollVote: DecryptPollVoteFn;
    };
    const generics = (await import(
      '@whiskeysockets/baileys/lib/Utils/generics.js'
    )) as {
      getKeyAuthor: GetKeyAuthorFn;
    };
    const jidUtils = (await import(
      '@whiskeysockets/baileys/lib/WABinary/jid-utils.js'
    )) as {
      jidNormalizedUser: JidNormalizedUserFn;
    };
    decryptPollVote = decryptPollVote ?? baileys.decryptPollVote;
    getKeyAuthor = getKeyAuthor ?? generics.getKeyAuthor;
    jidNormalizedUser = jidNormalizedUser ?? jidUtils.jidNormalizedUser;
  }
  if (!decryptPollVote || !getKeyAuthor || !jidNormalizedUser) {
    return { optionId: null, lastError: 'baileys decrypt deps unavailable' };
  }

  const meId = jidNormalizedUser(meIdNormalized) || meIdNormalized;
  const pollMsgId =
    message.message?.pollUpdateMessage?.pollCreationMessageKey?.id?.trim() ||
    stored.pollMsgId;
  const pollEncKey = Buffer.from(stored.pollEncKey);
  const attempts = buildPollVoteDecryptAttempts(
    message,
    stored,
    meId,
    getKeyAuthor,
    jidNormalizedUser,
    deps?.meLid,
  );

  let lastError = 'no attempts';
  for (const attempt of attempts) {
    try {
      const decrypted = decryptPollVote(
        {
          encPayload: Buffer.from(vote.encPayload),
          encIv: Buffer.from(vote.encIv),
        },
        {
          pollEncKey,
          pollCreatorJid: attempt.pollCreatorJid,
          pollMsgId,
          voterJid: attempt.voterJid,
        },
      );
      const optionId = pollVoteSelectedOptionId(decrypted, stored.choices);
      if (optionId) {
        return { optionId, lastError: undefined };
      }
      lastError = 'decrypted but option hash did not match';
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : String(error);
    }
  }
  return { optionId: null, lastError };
}

export function pollCreationMessageId(
  message: BaileysInboundMessage,
): string | null {
  const id =
    message.message?.pollUpdateMessage?.pollCreationMessageKey?.id?.trim() ??
    '';
  return id || null;
}

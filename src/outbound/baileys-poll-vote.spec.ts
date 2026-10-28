import {
  buildPollVoteDecryptAttempts,
  extractStoredPollFromSent,
  pollOptionNameHash,
  pollVoteSelectedOptionId,
  pollVoteSelectedOptionIds,
  resolvePollVoteOptionId,
} from './baileys-poll-vote';

const choices = [
  { id: 'wedding', label: 'Wedding' },
  { id: 'corporate', label: 'Corporate event' },
];

const getKeyAuthor = (
  key:
    | {
        fromMe?: boolean | null;
        remoteJid?: string | null;
      }
    | undefined
    | null,
  meId = 'me',
) => (key?.fromMe ? meId : key?.remoteJid ?? '');

const jidNormalizedUser = (jid: string | undefined) =>
  jid?.replace(/:\d+@/, '@') ?? '';

describe('baileys poll vote', () => {
  it('maps option label hashes to ids', () => {
    const vote = {
      selectedOptions: [pollOptionNameHash('Corporate event')],
    };
    expect(pollVoteSelectedOptionId(vote, choices)).toBe('corporate');
  });

  it('maps multiple poll selections to comma-separated ids', () => {
    const vote = {
      selectedOptions: [
        pollOptionNameHash('Wedding'),
        pollOptionNameHash('Corporate event'),
      ],
    };
    expect(pollVoteSelectedOptionIds(vote, choices)).toEqual([
      'wedding',
      'corporate',
    ]);
    expect(pollVoteSelectedOptionId(vote, choices)).toBe('wedding,corporate');
  });

  it('stores poll encryption context from sendMessage result', () => {
    const secret = new Uint8Array(32).fill(7);
    const stored = extractStoredPollFromSent(
      {
        key: {
          id: 'ABC123',
          fromMe: true,
          remoteJid: '254799229340@s.whatsapp.net',
        },
        message: { messageContextInfo: { messageSecret: secret } },
      },
      choices,
      '254799229340',
      '254786487316@s.whatsapp.net',
    );
    expect(stored?.pollMsgId).toBe('ABC123');
    expect(stored?.pollEncKey).toEqual(secret);
    expect(stored?.creationKey?.remoteJid).toBe('254799229340@s.whatsapp.net');
  });

  it('builds creator/voter jid attempts for lid inbound votes', () => {
    const attempts = buildPollVoteDecryptAttempts(
      {
        key: {
          fromMe: false,
          remoteJid: '159953272705116@lid',
          remoteJidAlt: '254799229340@s.whatsapp.net',
        },
        message: {
          pollUpdateMessage: {
            pollCreationMessageKey: {
              id: 'POLL1',
              fromMe: true,
              remoteJid: '254799229340@s.whatsapp.net',
            },
            vote: { encPayload: new Uint8Array(1), encIv: new Uint8Array(1) },
          },
        },
      },
      {
        choices,
        phoneDigits: '254799229340',
        pollEncKey: new Uint8Array(32),
        pollMsgId: 'POLL1',
        pollCreatorJid: '254786487316@s.whatsapp.net',
      },
      '254786487316@s.whatsapp.net',
      getKeyAuthor,
      jidNormalizedUser,
    );
    expect(attempts.some((a) => a.voterJid.includes('254799229340'))).toBe(
      true,
    );
    expect(attempts.some((a) => a.pollCreatorJid.includes('254786487316'))).toBe(
      true,
    );
  });

  it('decrypts poll votes with injected decryptPollVote', async () => {
    const { optionId } = await resolvePollVoteOptionId(
      {
        key: { fromMe: false, remoteJid: '254799229340@s.whatsapp.net' },
        message: {
          pollUpdateMessage: {
            pollCreationMessageKey: { id: 'POLL1', fromMe: true },
            vote: { encPayload: new Uint8Array(1), encIv: new Uint8Array(1) },
          },
        },
      },
      {
        choices,
        phoneDigits: '254799229340',
        pollEncKey: new Uint8Array(32),
        pollMsgId: 'POLL1',
        pollCreatorJid: '254786487316@s.whatsapp.net',
      },
      '254786487316@s.whatsapp.net',
      {
        getKeyAuthor,
        jidNormalizedUser,
        decryptPollVote: () => ({
          selectedOptions: [pollOptionNameHash('Wedding')],
        }),
      },
    );
    expect(optionId).toBe('wedding');
  });
});

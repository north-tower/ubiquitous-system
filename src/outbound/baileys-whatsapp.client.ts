import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Dirent } from 'fs';
import { readdir } from 'fs/promises';
import { TenantService } from '../tenant/tenant.service';
import {
  authDirForTenant,
  BAILEYS_SESSIONS_ROOT,
  isTenantAuthFolderName,
  linkedPhoneFromUser,
  visibleQrDataUrl,
  type BaileysSessionStatus,
} from './baileys-session';
import { toDigits, type WhatsappSender } from './whatsapp-channel';
import {
  parseBaileysTextMessage,
  type BaileysInboundMessage,
} from './parse-baileys-message';

export type BaileysInboundNotice = {
  tenantId: string;
  phoneNumber: string;
  text: string;
  raw: unknown;
};

export type BaileysInboundHandler = (
  message: BaileysInboundNotice,
) => Promise<void>;

export type BaileysWhatsappLink = {
  status: BaileysSessionStatus | null;
  qrDataUrl: string | null;
};

type BaileysSocket = {
  user?: { id?: string; phoneNumber?: string };
  ev: {
    on(event: 'creds.update', listener: () => void): void;
    on(
      event: 'connection.update',
      listener: (update: {
        connection?: string;
        lastDisconnect?: { error?: unknown };
        qr?: string;
      }) => void,
    ): void;
    on(
      event: 'messages.upsert',
      listener: (update: {
        type?: string;
        messages: BaileysInboundMessage[];
      }) => void,
    ): void;
  };
  sendMessage(
    jid: string,
    content: { text: string },
  ): Promise<{ key?: { id?: string | null } | null } | undefined>;
  onWhatsApp(
    ...phones: string[]
  ): Promise<{ jid: string; exists: boolean }[] | undefined>;
  end(error: Error | undefined): Promise<void>;
};

type BaileysModule = {
  default: (config: { auth: unknown; logger: unknown }) => BaileysSocket;
  useMultiFileAuthState: (folder: string) => Promise<{
    state: unknown;
    saveCreds: () => Promise<void>;
  }>;
  DisconnectReason: { loggedOut: number };
};

type QrCodeModule = {
  toDataURL?: (text: string) => Promise<string>;
  default?: { toDataURL?: (text: string) => Promise<string> };
};

type SessionRecord = {
  tenantId: string;
  sock: BaileysSocket | null;
  jids: Map<string, string>;
  status: BaileysSessionStatus;
  qrDataUrl: string | null;
  qrVersion: number;
  linkedPhone: string | null;
  connectPromise: Promise<void> | null;
  stopped: boolean;
};

@Injectable()
export class BaileysWhatsappClient
  implements WhatsappSender, OnModuleInit, OnModuleDestroy
{
  readonly channel = 'baileys' as const;
  private readonly logger = new Logger(BaileysWhatsappClient.name);
  private readonly sessions = new Map<string, SessionRecord>();
  private inboundHandler: BaileysInboundHandler | null = null;
  private autostart = false;
  private destroyed = false;
  private bootPromise: Promise<void> | null = null;
  private defaultTenantId: string | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly tenants: TenantService,
  ) {}

  isConfigured(): boolean {
    return this.config.get<string>('BAILEYS_ENABLED') === 'true';
  }

  setInboundHandler(handler: BaileysInboundHandler): void {
    this.inboundHandler = handler;
    if (this.autostart) {
      void this.bootSessions();
    }
  }

  connectionStatus(tenantId: string): BaileysSessionStatus | null {
    return this.sessions.get(tenantId)?.status ?? null;
  }

  whatsappLink(tenantId: string): BaileysWhatsappLink {
    const session = this.sessions.get(tenantId);
    if (!session) {
      return { status: null, qrDataUrl: null };
    }
    return {
      status: session.status,
      qrDataUrl: visibleQrDataUrl(session.status, session.qrDataUrl),
    };
  }

  async startSession(tenantId: string): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(
        `Baileys is disabled; not starting session tenant=${tenantId}`,
      );
      return;
    }
    const session = this.ensureSession(tenantId);
    if (session.status === 'logged_out' && !session.sock) {
      return;
    }
    if (session.connectPromise) {
      return session.connectPromise;
    }
    if (session.sock) {
      return;
    }
    session.connectPromise = this.connect(session)
      .catch((error: unknown) => {
        if (!session.sock) {
          this.sessions.delete(tenantId);
        }
        throw error;
      })
      .finally(() => {
        session.connectPromise = null;
      });
    return session.connectPromise;
  }

  async onModuleInit(): Promise<void> {
    if (!this.isConfigured() || process.env.NODE_ENV === 'test') {
      return;
    }
    this.autostart = true;
    if (this.inboundHandler) {
      await this.bootSessions();
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.destroyed = true;
    this.autostart = false;
    await Promise.all(
      [...this.sessions.values()].map(async (session) => {
        session.stopped = true;
        const sock = session.sock;
        session.sock = null;
        if (sock) {
          await sock.end(undefined);
        }
      }),
    );
  }

  async sendText(
    to: string,
    body: string,
    tenantId?: string,
  ): Promise<{ messageId: string | null; raw: unknown }> {
    const id = tenantId ?? this.defaultTenantId;
    const session = id ? this.sessions.get(id) : undefined;
    const sock = session?.sock;
    if (!session || !sock) {
      throw new Error(
        `Baileys WhatsApp socket is not connected${id ? ` for tenant ${id}` : ''}`,
      );
    }

    const digits = toDigits(to);
    const jid = await this.resolveJid(session, sock, digits);
    const sent = await sock.sendMessage(jid, { text: body });
    return { messageId: sent?.key?.id ?? null, raw: sent ?? null };
  }

  private ensureSession(tenantId: string): SessionRecord {
    const existing = this.sessions.get(tenantId);
    if (existing) {
      return existing;
    }
    const created: SessionRecord = {
      tenantId,
      sock: null,
      jids: new Map(),
      status: 'waiting_for_scan',
      qrDataUrl: null,
      qrVersion: 0,
      linkedPhone: null,
      connectPromise: null,
      stopped: false,
    };
    this.sessions.set(tenantId, created);
    return created;
  }

  private bootSessions(): Promise<void> {
    if (this.bootPromise) {
      return this.bootPromise;
    }
    this.bootPromise = this.openKnownSessions().finally(() => {
      this.bootPromise = null;
    });
    return this.bootPromise;
  }

  private async openKnownSessions(): Promise<void> {
    const fallback = await this.tenants.findDefault();
    this.defaultTenantId = fallback?.id ?? null;
    const ids = new Set<string>();
    if (fallback) {
      ids.add(fallback.id);
    }
    for (const tenantId of await this.tenantIdsWithAuthFolders()) {
      if (ids.has(tenantId)) {
        continue;
      }
      const tenant = await this.tenants.findById(tenantId);
      if (!tenant) {
        this.logger.warn(
          `Ignoring Baileys auth folder with no tenant id=${tenantId}`,
        );
        continue;
      }
      ids.add(tenant.id);
    }
    for (const id of ids) {
      try {
        await this.startSession(id);
      } catch (error) {
        this.logger.error(
          `Baileys session failed to start tenant=${id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  private async tenantIdsWithAuthFolders(): Promise<string[]> {
    let entries: Dirent[];
    try {
      entries = await readdir(BAILEYS_SESSIONS_ROOT, { withFileTypes: true });
    } catch (error) {
      if (isEnoent(error)) {
        return [];
      }
      throw error;
    }
    return entries
      .filter(
        (entry) => entry.isDirectory() && isTenantAuthFolderName(entry.name),
      )
      .map((entry) => entry.name);
  }

  private authDir(tenantId: string): string {
    return authDirForTenant(
      tenantId,
      this.defaultTenantId,
      this.config.get<string>('BAILEYS_AUTH_DIR'),
    );
  }

  private async resolveJid(
    session: SessionRecord,
    sock: BaileysSocket,
    digits: string,
  ): Promise<string> {
    const remembered = session.jids.get(digits);
    if (remembered) {
      return remembered;
    }

    const matches = await sock.onWhatsApp(digits);
    const found = matches?.find((match) => match.exists)?.jid;
    if (!found) {
      throw new Error(`No WhatsApp account for ${digits}`);
    }
    session.jids.set(digits, found);
    return found;
  }

  private async connect(session: SessionRecord): Promise<void> {
    if (this.destroyed || session.stopped) {
      return;
    }

    const baileys = (await import('@whiskeysockets/baileys')) as BaileysModule;
    const pinoModule = (await import('pino')) as {
      default: (options: { level: string }) => unknown;
    };
    const { state, saveCreds } = await baileys.useMultiFileAuthState(
      this.authDir(session.tenantId),
    );
    const sock = baileys.default({
      auth: state,
      logger: pinoModule.default({ level: 'warn' }),
    });
    if (this.destroyed || session.stopped) {
      await sock.end(undefined);
      return;
    }
    session.sock = sock;
    this.logger.log(`Starting Baileys session tenant=${session.tenantId}`);
    sock.ev.on('creds.update', () => {
      void saveCreds();
      void this.saveLinkedPhone(session);
    });
    sock.ev.on('connection.update', (update) => {
      this.onConnectionUpdate(session, sock, baileys, update);
    });
    sock.ev.on('messages.upsert', (update) => {
      if (update.type !== 'notify') {
        return;
      }
      void this.onMessages(session, update.messages);
    });
  }

  private onConnectionUpdate(
    session: SessionRecord,
    sock: BaileysSocket,
    baileys: BaileysModule,
    update: {
      connection?: string;
      lastDisconnect?: { error?: unknown };
      qr?: string;
    },
  ): void {
    if (session.sock !== sock) {
      return;
    }

    if (update.qr) {
      session.status = 'waiting_for_scan';
      void this.storeQr(session, update.qr);
    }

    if (update.connection === 'open') {
      session.status = 'connected';
      session.qrDataUrl = null;
      this.logger.log(
        `Baileys WhatsApp connected tenant=${session.tenantId}`,
      );
      void this.saveLinkedPhone(session);
      return;
    }

    if (update.connection !== 'close') {
      return;
    }

    const statusCode = disconnectStatus(update.lastDisconnect?.error);
    session.sock = null;
    if (this.destroyed || session.stopped) {
      return;
    }
    if (statusCode === baileys.DisconnectReason.loggedOut) {
      session.status = 'logged_out';
      session.qrDataUrl = null;
      this.logger.warn(
        `Baileys session logged out tenant=${session.tenantId}. Delete that auth folder and scan a new QR.`,
      );
      return;
    }
    this.logger.warn(
      `Baileys connection closed tenant=${session.tenantId} (${statusCode ?? 'unknown'}). Reconnecting.`,
    );
    const reconnect = () => {
      if (!this.destroyed && !session.stopped && !session.sock) {
        void this.startSession(session.tenantId);
      }
    };
    if (session.connectPromise) {
      void session.connectPromise.finally(reconnect);
      return;
    }
    reconnect();
  }

  private async onMessages(
    session: SessionRecord,
    messages: BaileysInboundMessage[],
  ): Promise<void> {
    for (const message of messages) {
      const parsed = parseBaileysTextMessage(message);
      if (!parsed || !this.inboundHandler) {
        continue;
      }
      session.jids.set(parsed.phoneNumber, parsed.jid);
      try {
        await this.inboundHandler({
          tenantId: session.tenantId,
          phoneNumber: parsed.phoneNumber,
          text: parsed.text,
          raw: message,
        });
      } catch (error) {
        this.logger.error(
          `Baileys inbound failed tenant=${session.tenantId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  private async saveLinkedPhone(session: SessionRecord): Promise<void> {
    const phone = linkedPhoneFromUser(session.sock?.user);
    if (!phone || phone === session.linkedPhone) {
      return;
    }
    session.linkedPhone = phone;
    try {
      await this.tenants.setLinkedPhone(session.tenantId, phone);
      this.logger.log(
        `Linked WhatsApp tenant=${session.tenantId} phone=${phone}`,
      );
    } catch (error) {
      session.linkedPhone = null;
      this.logger.error(
        `Failed to save linked phone tenant=${session.tenantId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async storeQr(session: SessionRecord, qr: string): Promise<void> {
    session.qrVersion += 1;
    const version = session.qrVersion;
    const dataUrl = await this.toQrDataUrl(qr);
    if (
      dataUrl &&
      session.status === 'waiting_for_scan' &&
      session.qrVersion === version
    ) {
      session.qrDataUrl = dataUrl;
    }
    await this.printQr(qr, session.tenantId);
  }

  private async toQrDataUrl(qr: string): Promise<string | null> {
    try {
      const qrcode = (await import('qrcode')) as QrCodeModule;
      const toDataURL = qrcode.toDataURL ?? qrcode.default?.toDataURL;
      if (!toDataURL) {
        throw new Error('qrcode.toDataURL is unavailable');
      }
      return await toDataURL(qr);
    } catch (error) {
      this.logger.error(
        `Failed to render WhatsApp QR: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private async printQr(qr: string, tenantId: string): Promise<void> {
    const qrcode = (await import('qrcode-terminal')) as {
      generate?: (text: string, options?: { small?: boolean }) => void;
      default?: {
        generate: (text: string, options?: { small?: boolean }) => void;
      };
    };
    const generate = qrcode.generate ?? qrcode.default?.generate;
    this.logger.log(
      `Scan the QR code below to link WhatsApp tenant=${tenantId}`,
    );
    generate?.(qr, { small: true });
  }
}

function disconnectStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('output' in error)) {
    return undefined;
  }
  const output = (error as { output?: { statusCode?: number } }).output;
  return output?.statusCode;
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT'
  );
}

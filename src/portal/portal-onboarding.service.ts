import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { Tenant } from '../tenant/tenant.entity';
import { EmailService, type SendEmailResult } from './email.service';
import { TenantInvitation } from './tenant-invitation.entity';
import { TenantUser } from './tenant-user.entity';

const INVITE_TTL_MS = 1000 * 60 * 60 * 72;

export type TenantOnboardingResult = {
  tenantUserId: string;
  acceptUrl: string;
  connectUrl: string;
  loginUrl: string;
  emailResult: SendEmailResult;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildTenantOnboardEmail(params: {
  firstName: string;
  tenantName: string;
  acceptUrl: string;
  connectUrl: string;
  loginUrl: string;
}) {
  const name = escapeHtml(params.firstName);
  const business = escapeHtml(params.tenantName);
  const acceptUrl = escapeHtml(params.acceptUrl);
  const connectUrl = escapeHtml(params.connectUrl);
  const loginUrl = escapeHtml(params.loginUrl);
  return {
    subject: `Set up your WhatsApp desk for ${params.tenantName}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#1A1614">
  <p>Hi ${name},</p>
  <p>Your WhatsApp desk for <strong>${business}</strong> is ready. Create a password to open your dashboard any time, then link WhatsApp when you are ready.</p>
  <p>
    <a href="${acceptUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Create your password</a>
  </p>
  <p>After setup, sign in here: <a href="${loginUrl}">${loginUrl}</a></p>
  <p>You can also open your WhatsApp connect page directly (same business, no staff login):</p>
  <p style="word-break:break-all"><a href="${connectUrl}">${connectUrl}</a></p>
  <p>The setup link expires in 72 hours. If a button is not clickable, copy and paste this URL:</p>
  <p style="word-break:break-all">${acceptUrl}</p>
</body>
</html>`,
    text: `Hi ${params.firstName},

Your WhatsApp desk for ${params.tenantName} is ready.

Create your password (expires in 72 hours):
${params.acceptUrl}

Sign in anytime after setup:
${params.loginUrl}

WhatsApp connect link:
${params.connectUrl}
`,
  };
}

@Injectable()
export class PortalOnboardingService {
  constructor(
    @InjectRepository(TenantUser)
    private readonly users: Repository<TenantUser>,
    @InjectRepository(TenantInvitation)
    private readonly invitations: Repository<TenantInvitation>,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async inviteOwnerForTenant(params: {
    tenant: Tenant;
    email: string;
    firstName: string;
    lastName: string;
    appUrl?: string;
  }): Promise<TenantOnboardingResult> {
    const email = params.email.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new BadRequestException('A valid owner email is required');
    }
    const firstName = params.firstName.trim();
    const lastName = params.lastName.trim();
    if (!firstName || !lastName) {
      throw new BadRequestException('Owner first and last name are required');
    }

    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException(
        'A portal account with this email already exists',
      );
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const user = await this.users.save(
      this.users.create({
        tenantId: params.tenant.id,
        email,
        firstName,
        lastName,
        passwordHash: null,
        status: 'invited',
        invitedAt: new Date(),
        activatedAt: null,
      }),
    );

    await this.invitations.save(
      this.invitations.create({
        tenantUserId: user.id,
        tokenHash,
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
      }),
    );

    const urls = this.buildUrls(params.appUrl, params.tenant.connectToken, token);

    const message = buildTenantOnboardEmail({
      firstName,
      tenantName: params.tenant.name,
      acceptUrl: urls.acceptUrl,
      connectUrl: urls.connectUrl,
      loginUrl: urls.loginUrl,
    });

    const emailResult = await this.email.send({
      to: `${firstName} ${lastName} <${email}>`,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    return {
      tenantUserId: user.id,
      ...urls,
      emailResult,
    };
  }

  async resendForTenant(params: {
    tenantId: string;
    appUrl?: string;
  }): Promise<TenantOnboardingResult> {
    const user = await this.users.findOne({
      where: { tenantId: params.tenantId },
      relations: { tenant: true },
    });
    if (!user) {
      throw new NotFoundException('This tenant has no portal owner yet');
    }
    if (user.status === 'active') {
      throw new BadRequestException(
        'The owner has already activated their account',
      );
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    await this.invitations.update(
      {
        tenantUserId: user.id,
        acceptedAt: IsNull(),
        revokedAt: IsNull(),
      },
      { revokedAt: new Date() },
    );

    await this.invitations.save(
      this.invitations.create({
        tenantUserId: user.id,
        tokenHash,
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
      }),
    );

    await this.users.update({ id: user.id }, { invitedAt: new Date() });

    const tenant = user.tenant;
    if (!tenant?.connectToken) {
      throw new BadRequestException('Tenant connect link is not ready');
    }

    const urls = this.buildUrls(params.appUrl, tenant.connectToken, token);
    const message = buildTenantOnboardEmail({
      firstName: user.firstName,
      tenantName: tenant.name,
      acceptUrl: urls.acceptUrl,
      connectUrl: urls.connectUrl,
      loginUrl: urls.loginUrl,
    });

    const emailResult = await this.email.send({
      to: `${user.firstName} ${user.lastName} <${user.email}>`,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    return {
      tenantUserId: user.id,
      ...urls,
      emailResult,
    };
  }

  async findOwnerByTenantId(tenantId: string): Promise<TenantUser | null> {
    return this.users.findOne({ where: { tenantId } });
  }

  private buildUrls(
    appUrl: string | undefined,
    connectToken: string | null,
    inviteToken: string,
  ) {
    const base = (
      appUrl ||
      this.config.get<string>('TENANT_PORTAL_APP_URL') ||
      this.config.get<string>('CORS_ORIGIN') ||
      'http://localhost:3001'
    ).replace(/\/$/, '');
    const acceptUrl = `${base}/portal/accept-invite/${inviteToken}`;
    const loginUrl = `${base}/portal/login`;
    const connectUrl = connectToken
      ? `${base}/connect/${connectToken}`
      : `${base}/portal/login`;
    return { acceptUrl, connectUrl, loginUrl };
  }
}

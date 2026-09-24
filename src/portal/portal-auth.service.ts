import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { TenantInvitation } from './tenant-invitation.entity';
import { TenantSession } from './tenant-session.entity';
import { TenantUser } from './tenant-user.entity';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type PortalPrincipal = {
  userId: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type PortalSessionPayload = {
  token: string;
  user: PortalPrincipal & { tenantName: string; flow: string };
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class PortalAuthService {
  constructor(
    @InjectRepository(TenantUser)
    private readonly users: Repository<TenantUser>,
    @InjectRepository(TenantInvitation)
    private readonly invitations: Repository<TenantInvitation>,
    @InjectRepository(TenantSession)
    private readonly sessions: Repository<TenantSession>,
  ) {}

  async login(email: string, password: string): Promise<PortalSessionPayload> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findOne({
      where: { email: normalized },
      relations: { tenant: true },
    });
    if (!user || user.status !== 'active' || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueSession(user);
  }

  async acceptInvite(
    token: string,
    password: string,
  ): Promise<PortalSessionPayload> {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const invitation = await this.invitations.findOne({
      where: { tokenHash: hashToken(token.trim()) },
      relations: { tenantUser: { tenant: true } },
    });
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt < new Date()
    ) {
      throw new BadRequestException(
        'This invitation link is invalid or has expired',
      );
    }

    const user = invitation.tenantUser;
    if (!user || user.status !== 'invited') {
      throw new BadRequestException('This invitation has already been used');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    user.passwordHash = passwordHash;
    user.status = 'active';
    user.activatedAt = new Date();
    invitation.acceptedAt = new Date();

    await this.users.save(user);
    await this.invitations.save(invitation);

    const active = await this.users.findOne({
      where: { id: user.id },
      relations: { tenant: true },
    });
    if (!active) {
      throw new BadRequestException('Could not activate account');
    }
    return this.issueSession(active);
  }

  async previewInvite(token: string): Promise<{
    valid: boolean;
    firstName?: string;
    tenantName?: string;
  }> {
    const invitation = await this.invitations.findOne({
      where: { tokenHash: hashToken(token.trim()) },
      relations: { tenantUser: { tenant: true } },
    });
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt < new Date()
    ) {
      return { valid: false };
    }
    return {
      valid: true,
      firstName: invitation.tenantUser.firstName,
      tenantName: invitation.tenantUser.tenant?.name,
    };
  }

  async validateSessionToken(token: string): Promise<PortalPrincipal | null> {
    const trimmed = token.trim();
    if (!trimmed) {
      return null;
    }
    const session = await this.sessions.findOne({
      where: { tokenHash: hashToken(trimmed) },
      relations: { tenantUser: { tenant: true } },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.tenantUser.status !== 'active'
    ) {
      return null;
    }
    const user = session.tenantUser;
    return {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async logout(token: string): Promise<void> {
    await this.sessions.update(
      { tokenHash: hashToken(token.trim()), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async issueSession(user: TenantUser): Promise<PortalSessionPayload> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.sessions.save(
      this.sessions.create({
        tenantUserId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
        revokedAt: null,
      }),
    );

    const tenant = user.tenant;
    return {
      token,
      user: {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantName: tenant?.name ?? 'Your business',
        flow: tenant?.flow ?? 'techfind_demo',
      },
    };
  }
}

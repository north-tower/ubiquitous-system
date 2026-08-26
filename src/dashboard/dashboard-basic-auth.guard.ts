import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { type Request, type Response } from 'express';

/**
 * STUB: HTTP Basic Auth for internal dashboard routes.
 * Replace with real staff auth (SSO / session) before anyone outside this
 * repo uses these routes. Do not treat this as production access control.
 */
@Injectable()
export class DashboardBasicAuthGuard implements CanActivate {
  private readonly logger = new Logger(DashboardBasicAuthGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const user = this.config.get<string>('DASHBOARD_BASIC_AUTH_USER')?.trim();
    const pass = this.config.get<string>('DASHBOARD_BASIC_AUTH_PASSWORD');
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader(
      'WWW-Authenticate',
      'Basic realm="Techfind dashboard (STUB - replace before staff access)"',
    );

    if (!user || !pass) {
      this.logger.error(
        'Dashboard routes are locked: set DASHBOARD_BASIC_AUTH_USER and DASHBOARD_BASIC_AUTH_PASSWORD. This stub MUST be replaced before real staff access.',
      );
      throw new UnauthorizedException('Dashboard auth is not configured');
    }

    const req = context.switchToHttp().getRequest<Request>();
    const parsed = parseBasicAuth(req.headers.authorization);
    if (
      !parsed ||
      !safeEqual(parsed.user, user) ||
      !safeEqual(parsed.pass, pass)
    ) {
      throw new UnauthorizedException('Unauthorized');
    }
    return true;
  }
}

function parseBasicAuth(
  header: string | undefined,
): { user: string; pass: string } | null {
  if (!header || !header.startsWith('Basic ')) {
    return null;
  }
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return null;
  }
  const colon = decoded.indexOf(':');
  if (colon < 0) {
    return null;
  }
  return {
    user: decoded.slice(0, colon),
    pass: decoded.slice(colon + 1),
  };
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = createHash('sha256').update(left).digest();
  const rightHash = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

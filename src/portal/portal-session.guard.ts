import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type Request } from 'express';
import { PortalAuthService } from './portal-auth.service';

export type PortalRequest = Request & {
  portalUser?: Awaited<
    ReturnType<PortalAuthService['validateSessionToken']>
  >;
};

@Injectable()
export class PortalSessionGuard implements CanActivate {
  constructor(private readonly auth: PortalAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<PortalRequest>();
    const token = parseBearer(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing portal session');
    }
    const user = await this.auth.validateSessionToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired portal session');
    }
    req.portalUser = user;
    return true;
  }
}

function parseBearer(header: string | undefined): string | null {
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice(7).trim();
  return token || null;
}

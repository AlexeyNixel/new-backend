import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import {
  ADMIN_ONLY,
  hasSection,
  SECTION_KEY,
  SECTIONS,
  type SectionUser,
} from '../sections';

/**
 * Проверяет токен, а если маршрут или контроллер помечен @Section — ещё и доступ
 * сотрудника к этому разделу админки.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.headers.authorization) {
      const token = this.parseToken(request);
      if (token) {
        request.headers.authorization = `Bearer ${token}`;
      }
    }

    const authenticated = (await super.canActivate(context)) as boolean;
    if (!authenticated) return false;

    const section = this.reflector.getAllAndOverride<string | undefined>(
      SECTION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (section && !hasSection(request.user as SectionUser, section)) {
      const label =
        section === ADMIN_ONLY
          ? 'служебным операциям'
          : `разделу «${SECTIONS[section as keyof typeof SECTIONS] ?? section}»`;
      throw new ForbiddenException(`Нет доступа к ${label}`);
    }
    return true;
  }

  private parseToken(request: Request): string | null {
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.token || cookies?.access_token || null;
  }
}

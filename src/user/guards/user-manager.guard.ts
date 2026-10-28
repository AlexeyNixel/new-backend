import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { canManageUsers } from '../user-managers';

/** Ставится после JwtAuthGuard: пускает только управляющих пользователями */
@Injectable()
export class UserManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { username?: string } | undefined;
    if (!canManageUsers(user?.username)) {
      throw new ForbiddenException(
        'Управлять пользователями могут только администраторы',
      );
    }
    return true;
  }
}

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import { AuditAction } from 'generated/prisma';
import { AUDITED_ENTITY_KEY } from '../decorators/audited.decorator';
import { AuditLogService } from '../../audit-log/audit-log.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entityType = this.reflector.get<string | undefined>(
      AUDITED_ENTITY_KEY,
      context.getHandler(),
    );

    if (!entityType) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const action =
      request.method === 'POST' ? AuditAction.CREATE : AuditAction.UPDATE;
    const userId = (request.user as { id?: string } | undefined)?.id ?? null;

    return next.handle().pipe(
      tap((response: unknown) => {
        const entityId = (response as { id?: string } | null)?.id;
        if (!entityId) {
          return;
        }

        this.auditLogService
          .log({ entityType, entityId, action, userId })
          .catch((error: Error) => {
            this.logger.warn(
              `Не удалось записать audit-лог для ${entityType}#${entityId}: ${error.message}`,
            );
          });
      }),
    );
  }
}

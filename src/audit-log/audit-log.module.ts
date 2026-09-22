import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ResponseService } from '../common/services/response.service';

@Global()
@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditInterceptor, ResponseService],
  exports: [AuditLogService, AuditInterceptor],
})
export class AuditLogModule {}

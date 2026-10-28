import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audit-log')
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly responseService: ResponseService,
  ) {}

  /** Сотрудники, у которых есть изменения, — для фильтра в журнале */
  @Get('authors')
  authors() {
    return this.auditLogService.authors();
  }

  @Get()
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('userId') userId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const page = Number(paginationQuery.page) || 1;
    const limit = Math.min(Number(paginationQuery.limit) || 10, 100);

    const { items, total } = await this.auditLogService.findAll(
      { entityType, entityId, userId, from, to },
      page,
      limit,
    );

    return this.responseService.paginated(items, total, page, limit);
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { AuditAction } from 'generated/prisma';

export interface CreateAuditLogEntry {
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId?: string | null;
}

export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prismaService: PrismaService) {}

  log(entry: CreateAuditLogEntry) {
    return this.prismaService.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        userId: entry.userId ?? null,
      },
    });
  }

  async findAll(filters: AuditLogFilters, page: number, limit: number) {
    const where = {
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prismaService.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.auditLog.count({ where }),
    ]);

    return { items, total };
  }
}

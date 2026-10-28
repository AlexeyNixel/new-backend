import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { AuditAction, Prisma } from 'generated/prisma';

export interface CreateAuditLogEntry {
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId?: string | null;
}

export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  userId?: string;
  /** Границы по дате изменения (ISO), включительно */
  from?: string;
  to?: string;
}

interface EntityTitle {
  id: string;
  title: string | null;
  slug?: string | null;
}

/** Название записи по её id: у сущностей разные поля и таблицы */
type TitleLoader = (
  prisma: PrismaService,
  ids: string[],
) => Promise<EntityTitle[]>;

const byIds = (ids: string[]) => ({ id: { in: ids } });

const TITLE_LOADERS: Record<string, TitleLoader> = {
  Post: (p, ids) =>
    p.post.findMany({
      where: byIds(ids),
      select: { id: true, title: true, slug: true },
    }),
  Page: (p, ids) =>
    p.page.findMany({
      where: byIds(ids),
      select: { id: true, title: true, slug: true },
    }),
  Event: (p, ids) =>
    p.event.findMany({ where: byIds(ids), select: { id: true, title: true } }),
  Department: (p, ids) =>
    p.department.findMany({
      where: byIds(ids),
      select: { id: true, title: true },
    }),
  Tag: (p, ids) =>
    p.tag.findMany({ where: byIds(ids), select: { id: true, title: true } }),
  Notification: (p, ids) =>
    p.notification.findMany({
      where: byIds(ids),
      select: { id: true, title: true },
    }),
  Book: (p, ids) =>
    p.book.findMany({ where: byIds(ids), select: { id: true, title: true } }),
  BookCollection: async (p, ids) =>
    (
      await p.bookCollection.findMany({
        where: byIds(ids),
        select: { id: true, label: true },
      })
    ).map(({ id, label }) => ({ id, title: label })),
  Club: async (p, ids) =>
    (
      await p.club.findMany({
        where: byIds(ids),
        select: { id: true, name: true },
      })
    ).map(({ id, name }) => ({ id, title: name })),
  MapPoint: (p, ids) =>
    p.mapPoint.findMany({
      where: byIds(ids),
      select: { id: true, title: true },
    }),
  NavigationItem: (p, ids) =>
    p.navigationItem.findMany({
      where: byIds(ids),
      select: { id: true, title: true },
    }),
  Game: (p, ids) =>
    p.game.findMany({ where: byIds(ids), select: { id: true, title: true } }),
  GameGenre: (p, ids) =>
    p.gameGenre.findMany({
      where: byIds(ids),
      select: { id: true, title: true },
    }),
  GameSeries: (p, ids) =>
    p.gameSeries.findMany({
      where: byIds(ids),
      select: { id: true, title: true },
    }),
  Comic: (p, ids) =>
    p.comic.findMany({ where: byIds(ids), select: { id: true, title: true } }),
  ComicGenre: (p, ids) =>
    p.comicGenre.findMany({
      where: byIds(ids),
      select: { id: true, title: true },
    }),
  ComicSeries: (p, ids) =>
    p.comicSeries.findMany({
      where: byIds(ids),
      select: { id: true, title: true },
    }),
  Achievement: async (p, ids) =>
    (
      await p.achievement.findMany({
        where: byIds(ids),
        select: { id: true, label: true },
      })
    ).map(({ id, label }) => ({ id, title: label })),
  ShortLink: async (p, ids) =>
    (
      await p.shortLink.findMany({
        where: byIds(ids),
        select: { id: true, title: true, slug: true },
      })
    ).map(({ id, title, slug }) => ({ id, title: title || `/go/${slug}` })),
  Exhibition: async (p, ids) =>
    (
      await p.file.findMany({
        where: byIds(ids),
        select: { id: true, title: true, path: true },
      })
    ).map(({ id, title, path }) => ({
      id,
      title: title || path.split('/').at(-2) || null,
    })),
  User: async (p, ids) =>
    (
      await p.user.findMany({
        where: byIds(ids),
        select: { id: true, name: true, username: true },
      })
    ).map(({ id, name, username }) => ({ id, title: name || username })),
};

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
    const from = this.parseDate(filters.from);
    const to = this.parseDate(filters.to);
    const where: Prisma.AuditLogWhereInput = {
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...((from || to) && {
        createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) },
      }),
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

    return { items: await this.withTitles(items), total };
  }

  /** Кто хоть раз что-то менял — для фильтра по сотруднику */
  async authors() {
    const rows = await this.prismaService.auditLog.groupBy({
      by: ['userId'],
      where: { userId: { not: null } },
      _count: { _all: true },
    });
    const counts = new Map(rows.map((row) => [row.userId, row._count._all]));
    const users = await this.prismaService.user.findMany({
      where: {
        id: { in: [...counts.keys()].filter((id): id is string => !!id) },
      },
      select: { id: true, username: true, name: true },
      orderBy: { name: 'asc' },
    });
    return users.map((user) => ({
      ...user,
      changes: counts.get(user.id) ?? 0,
    }));
  }

  /** Подставляет название (и slug для страниц) — у записи журнала есть только id */
  private async withTitles<T extends { entityType: string; entityId: string }>(
    items: T[],
  ) {
    const idsByType = new Map<string, Set<string>>();
    for (const item of items) {
      if (!TITLE_LOADERS[item.entityType]) continue;
      const ids = idsByType.get(item.entityType) ?? new Set<string>();
      ids.add(item.entityId);
      idsByType.set(item.entityType, ids);
    }

    const found = new Map<string, EntityTitle>();
    await Promise.all(
      [...idsByType].map(async ([type, ids]) => {
        // Сбой одной таблицы не должен ронять весь журнал — останется без названий
        const rows = await TITLE_LOADERS[type](this.prismaService, [
          ...ids,
        ]).catch(() => [] as EntityTitle[]);
        for (const row of rows) found.set(`${type}:${row.id}`, row);
      }),
    );

    return items.map((item) => {
      const entity = found.get(`${item.entityType}:${item.entityId}`);
      return {
        ...item,
        entityTitle: entity?.title ?? null,
        entitySlug: entity?.slug ?? null,
      };
    });
  }

  private parseDate(value?: string) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
}

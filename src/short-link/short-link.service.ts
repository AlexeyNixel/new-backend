import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { CreateShortLinkDto } from './dto/create-short-link.dto';
import { UpdateShortLinkDto } from './dto/update-short-link.dto';
import { PrismaService } from '../prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';
import { v4 } from 'uuid';
import { DateTime } from 'luxon';

/** Сутки для статистики переходов считаем по времени библиотеки */
const LIBRARY_ZONE = 'Asia/Novosibirsk';
const MAX_STATS_DAYS = 365;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Без похожих символов (0/o, 1/l/i) — ссылку могут перепечатывать с листовки
const SLUG_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const SLUG_LENGTH = 6;

@Injectable()
export class ShortLinkService {
  constructor(
    private readonly prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  async create(createShortLinkDto: CreateShortLinkDto) {
    const { slug, url, title, isDeleted } = createShortLinkDto;
    const data = {
      id: v4(),
      url: this.normalizeUrl(url),
      title: title?.trim() || null,
      isDeleted: isDeleted ?? false,
    };

    if (slug?.trim()) {
      return this.save(() =>
        this.prismaService.shortLink.create({
          data: { ...data, slug: this.normalizeSlug(slug) },
        }),
      );
    }

    // Автогенерация: при редком совпадении пробуем другой хвост
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.prismaService.shortLink.create({
          data: { ...data, slug: this.generateSlug() },
        });
      } catch (error) {
        if (!this.isSlugTaken(error)) throw error;
      }
    }
    throw new ConflictException(
      'Не удалось сгенерировать адрес, попробуйте ещё раз',
    );
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10, isDeleted, search } = paginationQuery;

    const skip = (page - 1) * limit;
    const query = search?.trim();
    const where: Prisma.ShortLinkWhereInput = {
      isDeleted: isDeleted ? undefined : false,
      ...(query && {
        OR: [
          { title: { contains: query } },
          { slug: { contains: query } },
          { url: { contains: query } },
        ],
      }),
    };

    const [shortLinks, total] = await Promise.all([
      this.prismaService.shortLink.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.shortLink.count({ where }),
    ]);

    return this.responseService.paginated(
      shortLinks,
      total,
      page,
      limit,
      'Короткие ссылки успешно найдены',
    );
  }

  async findOne(id: string) {
    const shortLink = await this.prismaService.shortLink.findUnique({
      where: { id },
    });

    if (shortLink) {
      return {
        status: 200,
        data: shortLink,
      };
    } else {
      return {
        status: 404,
        message: 'Короткая ссылка не найдена',
      };
    }
  }

  async resolve(slug: string) {
    const shortLink = await this.prismaService.shortLink.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true, url: true, isDeleted: true },
    });
    if (!shortLink || shortLink.isDeleted) {
      throw new NotFoundException('Короткая ссылка не найдена');
    }

    const day = this.dayKey(DateTime.now().setZone(LIBRARY_ZONE));
    await this.prismaService.$transaction([
      this.prismaService.shortLink.update({
        where: { id: shortLink.id },
        data: { clicks: { increment: 1 } },
      }),
      this.prismaService.shortLinkClickDay.upsert({
        where: { shortLinkId_day: { shortLinkId: shortLink.id, day } },
        create: { shortLinkId: shortLink.id, day, clicks: 1 },
        update: { clicks: { increment: 1 } },
      }),
    ]);
    return { url: shortLink.url };
  }

  /**
   * Переходы по дням за последние `days` суток (дни без переходов — с нулём).
   * По дням переходы считаются с момента обновления — более ранние учтены
   * только в общем счётчике `clicks`.
   */
  async stats(id: string, days = 30) {
    const span = Math.min(Math.max(Math.floor(days) || 30, 1), MAX_STATS_DAYS);
    const today = DateTime.now().setZone(LIBRARY_ZONE).startOf('day');
    const first = today.minus({ days: span - 1 });

    const rows = await this.prismaService.shortLinkClickDay.findMany({
      where: { shortLinkId: id, day: { gte: this.dayKey(first) } },
      orderBy: { day: 'asc' },
    });
    const byDay = new Map(
      rows.map((row) => [row.day.toISOString().slice(0, 10), row.clicks]),
    );

    return Array.from({ length: span }, (_, i) => {
      const day = first.plus({ days: i }).toISODate()!;
      return { day, clicks: byDay.get(day) ?? 0 };
    });
  }

  /** Колонка DATE: местная дата, записанная как полночь UTC */
  private dayKey(date: DateTime) {
    return new Date(`${date.toISODate()}T00:00:00.000Z`);
  }

  update(id: string, updateShortLinkDto: UpdateShortLinkDto) {
    const { slug, url, title, isDeleted } = updateShortLinkDto;
    return this.save(() =>
      this.prismaService.shortLink.update({
        where: { id },
        data: {
          // Хвост можно поменять, но не стереть — у ссылки он есть всегда
          ...(slug?.trim() && { slug: this.normalizeSlug(slug) }),
          ...(url !== undefined && { url: this.normalizeUrl(url) }),
          ...(title !== undefined && { title: title?.trim() || null }),
          ...(isDeleted !== undefined && { isDeleted }),
        },
      }),
    );
  }

  private async save<T>(query: () => Promise<T>) {
    try {
      return await query();
    } catch (error) {
      if (this.isSlugTaken(error)) {
        throw new ConflictException('Такой адрес уже занят');
      }
      throw error;
    }
  }

  private isSlugTaken(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private normalizeSlug(slug: string) {
    const normalized = slug.trim().toLowerCase();
    if (!SLUG_PATTERN.test(normalized) || normalized.length > 100) {
      throw new BadRequestException(
        'Адрес может содержать только латинские буквы, цифры и дефис',
      );
    }
    return normalized;
  }

  private normalizeUrl(url: string | undefined) {
    const trimmed = url?.trim() ?? '';
    if (trimmed.length <= 2000 && URL.canParse(trimmed)) {
      const { protocol } = new URL(trimmed);
      if (protocol === 'http:' || protocol === 'https:') return trimmed;
    }
    throw new BadRequestException(
      'Укажите полный адрес ссылки, начиная с http:// или https://',
    );
  }

  private generateSlug() {
    let slug = '';
    for (let i = 0; i < SLUG_LENGTH; i++) {
      slug += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
    }
    return slug;
  }
}

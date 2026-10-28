import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '../prisma.service';
import { MinioService } from '../common/services/minio.service';
import { ResponseService } from '../common/services/response.service';

export interface MediaQuery {
  page?: string;
  limit?: string;
  search?: string;
  /** IMAGE | DOCUMENT | … — без него все, кроме выставок */
  type?: string;
  /** Только файлы, не привязанные ни к одной записи */
  unused?: string;
}

/** Где используется файл: связь с записью или упоминание в тексте */
export interface MediaUsage {
  type: string;
  id: string;
  title: string;
  /** relation — превью/картинка записи, text — ссылка в тексте или адресе */
  via: 'relation' | 'text';
}

/** Связи File → записи (поля модели File в schema.prisma) */
const RELATIONS = [
  'BookCollection',
  'books',
  'departments',
  'club',
  'slide',
  'posts',
  'mapPoints',
  'gameImages',
  'gameRulesFor',
  'comicImages',
  'feedback',
] as const;

const NO_RELATIONS: Prisma.FileWhereInput = Object.fromEntries(
  RELATIONS.map((relation) => [relation, { none: {} }]),
);

const COUNT_SELECT = Object.fromEntries(
  RELATIONS.map((relation) => [relation, true]),
) as Record<(typeof RELATIONS)[number], true>;

const FILE_TYPES = ['IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO', 'ARCHIVE', 'OTHER'];

@Injectable()
export class MediaService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly minioService: MinioService,
    private readonly responseService: ResponseService,
  ) {}

  async findAll(query: MediaQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Number(query.limit) || 24, 100);
    const search = query.search?.trim();
    const type = query.type?.toUpperCase();

    const where: Prisma.FileWhereInput = {
      type:
        type && FILE_TYPES.includes(type)
          ? (type as never)
          : { not: 'EXHIBITION' },
      ...(search && {
        OR: [
          { originalName: { contains: search } },
          { path: { contains: search } },
        ],
      }),
      ...(query.unused && NO_RELATIONS),
    };

    const [files, total, totalSize] = await Promise.all([
      this.prismaService.file.findMany({
        where,
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          type: true,
          path: true,
          size: true,
          width: true,
          height: true,
          variants: true,
          createdAt: true,
          _count: { select: COUNT_SELECT },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.file.count({ where }),
      this.prismaService.file.aggregate({ where, _sum: { size: true } }),
    ]);

    const items = files.map(({ _count, ...file }) => ({
      ...file,
      usedIn: Object.values(_count).reduce((sum, count) => sum + count, 0),
      canDelete: this.minioService.isOwnPath(file.path),
    }));

    return {
      ...this.responseService.paginated(items, total, page, limit),
      totalSize: totalSize._sum.size ?? 0,
    };
  }

  async usage(id: string): Promise<MediaUsage[]> {
    const file = await this.prismaService.file.findUnique({
      where: { id },
      include: {
        BookCollection: { select: { id: true, label: true } },
        books: { select: { id: true, title: true } },
        departments: { select: { id: true, title: true } },
        club: { select: { id: true, name: true } },
        slide: { select: { id: true, post: { select: { title: true } } } },
        posts: { select: { id: true, title: true } },
        mapPoints: { select: { id: true, title: true } },
        gameImages: { select: { game: { select: { id: true, title: true } } } },
        gameRulesFor: { select: { id: true, title: true } },
        comicImages: {
          select: { comic: { select: { id: true, title: true } } },
        },
        feedback: { select: { id: true, title: true } },
      },
    });
    if (!file) {
      throw new NotFoundException('Файл не найден');
    }

    const rel = (
      type: string,
      id: string,
      title: string | null,
    ): MediaUsage => ({
      type,
      id,
      title: title || 'Без названия',
      via: 'relation',
    });
    const relations: MediaUsage[] = [
      ...file.BookCollection.map((c) => rel('BookCollection', c.id, c.label)),
      ...file.books.map((b) => rel('Book', b.id, b.title)),
      ...file.departments.map((d) => rel('Department', d.id, d.title)),
      ...file.club.map((c) => rel('Club', c.id, c.name)),
      ...file.slide.map((s) =>
        rel('MainSliderSlide', s.id, s.post?.title ?? 'Слайд'),
      ),
      ...file.posts.map((p) => rel('Post', p.id, p.title)),
      ...file.mapPoints.map((m) => rel('MapPoint', m.id, m.title)),
      ...file.gameImages.map((g) => rel('Game', g.game.id, g.game.title)),
      ...file.gameRulesFor.map((g) => rel('Game', g.id, g.title)),
      ...file.comicImages.map((c) => rel('Comic', c.comic.id, c.comic.title)),
      ...file.feedback.map((f) => rel('Feedback', f.id, f.title)),
    ];

    return [...relations, ...(await this.textMentions(file.path))];
  }

  /**
   * Удаляет файл, который нигде не используется. Картинки из текста новостей
   * не связаны с записями через внешние ключи, поэтому тексты тоже проверяются.
   */
  async remove(id: string) {
    const file = await this.prismaService.file.findUnique({ where: { id } });
    if (!file) {
      throw new NotFoundException('Файл не найден');
    }
    if (file.type === 'EXHIBITION') {
      throw new BadRequestException(
        'Выставки скрываются в разделе «Выставки», а не удаляются',
      );
    }
    if (!this.minioService.isOwnPath(file.path)) {
      throw new BadRequestException(
        'Файлы старого сайта удалять нельзя — хранилище только для чтения',
      );
    }

    const usage = await this.usage(id);
    if (usage.length) {
      throw new ConflictException(
        `Файл используется: ${usage.length} шт. Сначала уберите его из записей`,
      );
    }

    // Сначала хранилище, потом БД: если удаление файла упадёт, запись останется и её можно повторить
    const variants = Object.values(
      (file.variants as Record<string, string> | null) ?? {},
    );
    for (const path of [file.path, ...variants]) {
      if (this.minioService.isOwnPath(path)) {
        await this.minioService.removeByPath(path);
      }
    }
    await this.prismaService.file.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * Упоминания файла в текстах и адресах. Ищем по имени файла: в тексте он
   * встречается и как `/dev/images/…`, и как `https://s3.infomania.ru/dev/images/…`,
   * а уменьшенные копии содержат имя исходника.
   */
  private async textMentions(path: string): Promise<MediaUsage[]> {
    const needle = path.split('/').at(-1);
    if (!needle || needle.length < 8) return [];
    const has = { contains: needle };
    const select = { id: true, title: true } as const;
    const text =
      (type: string) => (rows: Array<{ id: string; title: string | null }>) =>
        rows.map(
          (row): MediaUsage => ({
            type,
            id: row.id,
            title: row.title || 'Без названия',
            via: 'text',
          }),
        );

    const groups = await Promise.all([
      this.prismaService.post
        .findMany({
          where: { OR: [{ content: has }, { description: has }] },
          select,
        })
        .then(text('Post')),
      this.prismaService.page
        .findMany({ where: { content: has }, select })
        .then(text('Page')),
      this.prismaService.event
        .findMany({ where: { content: has }, select })
        .then(text('Event')),
      this.prismaService.book
        .findMany({
          where: { OR: [{ content: has }, { description: has }] },
          select,
        })
        .then(text('Book')),
      this.prismaService.bookCollection
        .findMany({
          where: { description: has },
          select: { id: true, label: true },
        })
        .then((rows) =>
          text('BookCollection')(
            rows.map((r) => ({ id: r.id, title: r.label })),
          ),
        ),
      this.prismaService.mapPoint
        .findMany({ where: { content: has }, select })
        .then(text('MapPoint')),
      this.prismaService.game
        .findMany({ where: { description: has }, select })
        .then(text('Game')),
      this.prismaService.comic
        .findMany({
          where: { OR: [{ content: has }, { description: has }] },
          select,
        })
        .then(text('Comic')),
      this.prismaService.navigationItem
        .findMany({ where: { to: has }, select })
        .then(text('NavigationItem')),
      this.prismaService.mainSliderSlide
        .findMany({
          where: { url: has },
          select: { id: true, post: { select: { title: true } } },
        })
        .then((rows) =>
          text('MainSliderSlide')(
            rows.map((r) => ({ id: r.id, title: r.post?.title ?? 'Слайд' })),
          ),
        ),
      this.prismaService.shortLink
        .findMany({ where: { url: has }, select })
        .then(text('ShortLink')),
    ]);
    return groups.flat();
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookCategoryDto } from './dto/create-book-category.dto';
import { UpdateBookCategoryDto } from './dto/update-book-category.dto';
import { SetCollectionBooksDto } from './dto/set-collection-books.dto';
import { PrismaService } from '../prisma.service';
import { v4, validate } from 'uuid';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';
import { createSlug } from '../common/utils/slugify.utils';
import { parseSlug } from '../common/utils/validate.utils';

/** Сколько обложек книг отдавать в карточке подборки (веер обложек) */
const COVERS_IN_CARD = 4;

/** Порядок книг в подборке: позиция от редактора, при равной — дата добавления */
const BOOKS_ORDER = [
  { position: 'asc' as const },
  { assignedAt: 'asc' as const },
];

/** Поля книги для карточек — без тяжёлого HTML `content` */
const BOOK_CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  place: true,
  isVideo: true,
  isDeleted: true,
  litresLink: true,
  previewFileId: true,
  createdAt: true,
  preview: true,
};

@Injectable()
export class BookCategoryService {
  constructor(
    private responseService: ResponseService,
    private readonly prismaService: PrismaService,
  ) {}

  async create(createBookCategoryDto: CreateBookCategoryDto) {
    const { slug, ...data } = createBookCategoryDto;
    return this.prismaService.bookCollection.create({
      data: {
        id: v4(),
        ...data,
        slug: await this.uniqueSlug(createSlug(data.label, slug)),
      },
    });
  }

  /**
   * Список подборок для сайта и админки. К каждой — число видимых книг
   * и обложки первых книг: из них карточка собирает веер обложек.
   */
  async findAll(paginationQuery: PaginationQueryDto) {
    const {
      page = 1,
      limit = 10,
      isDeleted,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = paginationQuery;

    const skip = (page - 1) * limit;
    const where = { isDeleted: isDeleted ? undefined : false };

    const [collections, total] = await Promise.all([
      this.prismaService.bookCollection.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        include: {
          preview: true,
          books: {
            where: { book: { isDeleted: false } },
            orderBy: BOOKS_ORDER,
            select: {
              book: { select: { id: true, title: true, preview: true } },
            },
          },
        },
        skip,
        take: +limit,
      }),
      this.prismaService.bookCollection.count({ where }),
    ]);

    const data = collections.map(({ books, ...collection }) => ({
      ...collection,
      bookCount: books.length,
      covers: books.slice(0, COVERS_IN_CARD).map(({ book }) => book),
    }));

    return this.responseService.paginated(data, total, page, limit);
  }

  /**
   * Подборка по id или адресу вместе с книгами в порядке редактора.
   * Скрытые подборки и книги отдаются только с `isDeleted` (для админки).
   */
  async findOne(idOrSlug: string, paginationQuery?: PaginationQueryDto) {
    const withHidden = !!paginationQuery?.isDeleted;

    const collection = await this.prismaService.bookCollection.findFirst({
      where: {
        ...parseSlug(idOrSlug),
        isDeleted: withHidden ? undefined : false,
      },
      include: {
        preview: true,
        books: {
          where: withHidden ? undefined : { book: { isDeleted: false } },
          orderBy: BOOKS_ORDER,
          select: { book: { select: BOOK_CARD_SELECT } },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Подборка не найдена');
    }

    const books = collection.books.map(({ book }) => book);
    return { ...collection, bookCount: books.length, books };
  }

  async update(id: string, updateBookCategoryDto: UpdateBookCategoryDto) {
    const current = await this.prismaService.bookCollection.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException('Подборка не найдена');
    }

    const { slug, ...data } = updateBookCategoryDto;
    const label = data.label ?? current.label;

    // Адрес задан редактором — нормализуем. Не задан, а сейчас временный
    // (после миграции slug = id) — строим из названия.
    let nextSlug: string | undefined;
    if (slug?.trim()) {
      nextSlug = createSlug(label, slug);
    } else if (validate(current.slug)) {
      nextSlug = createSlug(label);
    }

    return this.prismaService.bookCollection.update({
      where: { id },
      data: {
        ...data,
        slug:
          nextSlug && nextSlug !== current.slug
            ? await this.uniqueSlug(nextSlug, id)
            : undefined,
      },
    });
  }

  /**
   * Состав и порядок книг подборки целиком: список из админки заменяет прежний,
   * позиция книги = её индекс в списке.
   */
  async setBooks(id: string, dto: SetCollectionBooksDto) {
    const bookIds: unknown = dto?.bookIds;
    if (
      !Array.isArray(bookIds) ||
      bookIds.some((bookId) => typeof bookId !== 'string')
    ) {
      throw new BadRequestException('Ожидается bookIds: массив id книг');
    }
    const uniqueIds = [...new Set(bookIds as string[])];

    const collection = await this.prismaService.bookCollection.findUnique({
      where: { id },
    });
    if (!collection) {
      throw new NotFoundException('Подборка не найдена');
    }

    const found = await this.prismaService.book.count({
      where: { id: { in: uniqueIds } },
    });
    if (found !== uniqueIds.length) {
      throw new BadRequestException(
        'Часть книг не найдена — обновите страницу',
      );
    }

    await this.prismaService.$transaction([
      this.prismaService.bookOnCollection.deleteMany({
        where: { collectionsId: id },
      }),
      this.prismaService.bookOnCollection.createMany({
        data: uniqueIds.map((bookId, position) => ({
          bookId,
          collectionsId: id,
          position,
        })),
      }),
    ]);

    return this.findOne(id, { isDeleted: true } as PaginationQueryDto);
  }

  /** Свободный адрес: при совпадении добавляет -2, -3… */
  private async uniqueSlug(base: string, exceptId?: string) {
    const root = base || 'podborka';
    for (let index = 1; ; index++) {
      const candidate = index === 1 ? root : `${root}-${index}`;
      const taken = await this.prismaService.bookCollection.findFirst({
        where: {
          slug: candidate,
          id: exceptId ? { not: exceptId } : undefined,
        },
        select: { id: true },
      });
      if (!taken) return candidate;
    }
  }
}

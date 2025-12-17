import { Injectable } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { createSlug } from '../common/utils/slugify.utils';
import { PrismaService } from '../prisma.service';
import { v4 } from 'uuid';
import { ResponseService } from '../common/services/response.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { createInclude } from '../common/utils/include.utils';
import { parseSlug } from '../common/utils/validate.utils';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class BookService {
  constructor(
    @InjectDataSource('sourceDB')
    private readonly sourceDB: DataSource,
    private responseService: ResponseService,
    private prismaService: PrismaService,
  ) {}

  async create(createBookDto: CreateBookDto) {
    const { collections, ...newBook } = createBookDto;

    newBook.slug = createSlug(newBook.title, newBook.slug);

    const book = await this.prismaService.book.create({
      data: {
        id: v4(),
        ...newBook,
      },
    });

    if (collections) {
      for (const collection of collections) {
        await this.prismaService.bookOnCollection.create({
          data: {
            bookId: book.id,
            collectionsId: collection,
          },
        });
      }
    }

    return book;
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const {
      page = 1,
      limit = 10,
      isDeleted,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      include = '',
    } = paginationQuery;

    const skip = (page - 1) * limit;

    const [books, total] = await Promise.all([
      this.prismaService.book.findMany({
        where: {
          isDeleted: isDeleted ? undefined : false,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: createInclude(include),
        skip: skip,
        take: +limit,
      }),

      this.prismaService.book.count({
        where: {
          isDeleted: isDeleted ? undefined : false,
        },
      }),
    ]);

    return this.responseService.paginated(books, total, page, limit);
  }

  async findOne(id: string, paginationQuery: PaginationQueryDto) {
    const { include = '' } = paginationQuery;
    const book = await this.prismaService.book.findUnique({
      where: {
        ...parseSlug(id),
      },
      include: {
        ...createInclude(include),
        collections: {
          select: {
            collections: {
              select: {
                id: true,
                label: true,
              },
            },
          },
        },
      },
    });

    if (!book) {
      return {
        message: `Пост по slug или id '${id}' не найден`,
      };
    }

    return {
      ...book,
      collections: book.collections.map((collection) => ({
        id: collection.collections.id,
        label: collection.collections.label,
      })),
    };
  }

  async update(id: string, updateBookDto: UpdateBookDto) {
    const { collections, ...updateData } = updateBookDto;
    const book = await this.prismaService.book.findUnique({
      where: {
        ...parseSlug(id),
      },
    });

    if (!book) {
      return {
        message: 'Записи не существует',
      };
    }

    if (collections) {
      await this.prismaService.bookOnCollection.deleteMany({
        where: {
          bookId: book.id,
        },
      });

      const collectionsData = collections.map((collectionsId) => ({
        collectionsId: collectionsId,
        bookId: book.id,
      }));

      await this.prismaService.bookOnCollection.createMany({
        data: collectionsData,
        skipDuplicates: true,
      });
    }

    if (!updateBookDto.slug?.length) {
      updateBookDto.slug = undefined;
    }

    return this.prismaService.book.update({
      where: {
        id,
      },
      data: {
        ...updateData,
      },
    });
  }

  async migrate() {
    const books = await this.sourceDB.query('SELECT * FROM Book');

    for (const book of books) {
      try {
        await this.prismaService.book.update({
          where: {
            id: book.id,
          },
          data: {
            previewFileId: book.fileId,
          },
        });
      } catch (e) {
        console.log(e);
      }
    }
  }
}

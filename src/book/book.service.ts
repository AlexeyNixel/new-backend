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
    const { categories, ...newBook } = createBookDto;

    newBook.slug = createSlug(newBook.title, newBook.slug);

    const book = await this.prismaService.book.create({
      data: {
        id: v4(),
        ...newBook,
      },
    });

    if (categories) {
      for (const category of categories) {
        await this.prismaService.categoriesOnBook.create({
          data: {
            bookId: book.id,
            categoryId: category,
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

  async findOne(id: string) {
    const book = await this.prismaService.book.findUnique({
      where: {
        ...parseSlug(id),
      },
      include: {
        categories: {
          select: {
            category: {
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
      categories: book.categories.map((category) => ({
        id: category.category.id,
        label: category.category.label,
      })),
    };
  }

  async update(id: string, updateBookDto: UpdateBookDto) {
    const { categories, ...updateData } = updateBookDto;
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

    if (categories) {
      await this.prismaService.categoriesOnBook.deleteMany({
        where: {
          bookId: book.id,
        },
      });

      const categoriesData = categories.map((categoryId) => ({
        categoryId: categoryId,
        bookId: book.id,
      }));

      await this.prismaService.categoriesOnBook.createMany({
        data: categoriesData,
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
          //@ts-ignore
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

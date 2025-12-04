import { Injectable } from '@nestjs/common';
import { CreateBookCategoryDto } from './dto/create-book-category.dto';
import { UpdateBookCategoryDto } from './dto/update-book-category.dto';
import { PrismaService } from '../prisma.service';
import { v4 } from 'uuid';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { createInclude } from '../common/utils/include.utils';
import { ResponseService } from '../common/services/response.service';

@Injectable()
export class BookCategoryService {
  constructor(
    private responseService: ResponseService,
    private readonly prismaService: PrismaService,
  ) {}

  create(createBookCategoryDto: CreateBookCategoryDto) {
    return this.prismaService.bookCollection.create({
      data: {
        id: v4(),
        ...createBookCategoryDto,
      },
    });
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
    const [collections, total] = await Promise.all([
      this.prismaService.bookCollection.findMany({
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

      this.prismaService.bookCollection.count({
        where: { isDeleted: isDeleted ? undefined : false },
      }),
    ]);

    return this.responseService.paginated(collections, total, page, limit);
  }

  async findOne(id: string) {
    const category = await this.prismaService.bookCollection.findUnique({
      where: { id },
    });
    if (!category) {
      return {
        message: 'Категория не найдена',
      };
    }
    return category;
  }

  update(id: string, updateBookCategoryDto: UpdateBookCategoryDto) {
    return this.prismaService.bookCollection.update({
      where: {
        id,
      },
      data: {
        ...updateBookCategoryDto,
      },
    });
  }

  remove(id: number) {
    return `This action removes a #${id} bookCategory`;
  }
}

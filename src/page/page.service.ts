import { Injectable } from '@nestjs/common';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PrismaService } from '../prisma.service';
import { createSlug } from '../common/utils/slugify.utils';
import { v4 } from 'uuid';
import { ResponseService } from '../common/services/response.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class PageService {
  constructor(
    private readonly prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  create(createPageDto: CreatePageDto) {
    if (!createPageDto.slug) {
      createPageDto.slug = createSlug(createPageDto.title);
    }
    return this.prismaService.page.create({
      data: {
        id: v4(),
        ...createPageDto,
      },
    });
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const {
      page = 1,
      limit = 10,
      isDeleted,
      sortBy = 'title',
      sortOrder = 'asc',
    } = paginationQuery;

    const skip = (page - 1) * limit;

    const [pages, total] = await Promise.all([
      this.prismaService.page.findMany({
        where: { isDeleted: isDeleted ? undefined : false },
        skip,
        orderBy: {
          [sortBy]: sortOrder,
        },
        take: +limit,
      }),

      this.prismaService.page.count({
        where: { isDeleted: isDeleted ? undefined : false },
      }),
    ]);

    return this.responseService.paginated(pages, total, page, limit);
  }

  async findOne(id: string) {
    const page = await this.prismaService.page.findUnique({
      where: { slug: id },
    });

    if (!page) {
      return {
        message: 'Page not found',
      };
    }
    return page;
  }

  update(id: string, updatePageDto: UpdatePageDto) {
    return this.prismaService.page.update({
      where: {
        id: id,
      },
      data: {
        ...updatePageDto,
      },
    });
  }

  async updateTo() {
    const pages = await this.prismaService.page.findMany();

    for (const page of pages) {
      const copy = await this.prismaService.page.findUnique({
        where: {
          slug: createSlug(page.title),
        },
      });

      if (copy) {
        continue;
      }

      if (!page.slug) {
        await this.prismaService.page.update({
          where: {
            id: page.id,
          },
          data: {
            slug: createSlug(page.title),
          },
        });
      }
    }
    return `success`;
  }

  remove(id: string) {
    return `This action removes a #${id} page`;
  }
}

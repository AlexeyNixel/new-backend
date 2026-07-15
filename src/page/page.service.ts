import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PrismaService } from '../prisma.service';
import { createSlug } from '../common/utils/slugify.utils';
import { v4 } from 'uuid';
import { Prisma } from 'generated/prisma';
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
    const { blocks, ...rest } = createPageDto;
    return this.prismaService.page.create({
      data: {
        id: v4(),
        ...rest,
        blocks: blocks as unknown as Prisma.InputJsonValue,
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
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
    return page;
  }

  update(id: string, updatePageDto: UpdatePageDto) {
    const { blocks, ...rest } = updatePageDto;
    return this.prismaService.page.update({
      where: {
        id: id,
      },
      data: {
        ...rest,
        blocks: blocks as unknown as Prisma.InputJsonValue,
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

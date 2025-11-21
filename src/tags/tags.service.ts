import { Injectable } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { PrismaService } from '../prisma.service';
import { v4 } from 'uuid';
import { createSlug } from '../common/utils/slugify.utils';
import { parseSlug } from '../common/utils/validate.utils';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OldTag } from './dto/old-tag.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';

@Injectable()
export class TagsService {
  constructor(
    @InjectDataSource('sourceDB')
    private readonly sourceDB: DataSource,
    private prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  create(createTagDto: CreateTagDto) {
    createTagDto.slug = createSlug(
      createTagDto.title,
      createTagDto.slug,
      false,
    );

    return this.prismaService.tag.create({
      data: {
        id: v4(),
        ...createTagDto,
      },
    });
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = paginationQuery;

    const skip = (page - 1) * limit;

    const [tag, total] = await Promise.all([
      this.prismaService.tag.findMany({
        skip,
        take: +limit,
        orderBy: { [sortBy]: sortOrder },
      }),

      this.prismaService.tag.count(),
    ]);

    return this.responseService.paginated(tag, total, page, limit);
  }

  findOne(id: string) {
    return this.prismaService.tag.findUnique({
      where: { ...parseSlug(id) },
    });
  }

  update(id: number, updateTagDto: UpdateTagDto) {
    return `This action updates a #${id} tag`;
  }

  remove(id: number) {
    return `This action removes a #${id} tag`;
  }

  async migrateTag() {
    const oldTags: OldTag[] = await this.sourceDB.query('SELECT * FROM Rubric');

    for (const tag of oldTags) {
      await this.prismaService.tag.create({
        data: {
          id: tag.id,
          title: tag.title,
          slug: tag.slug,
        },
      });
    }
    return oldTags;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { createSlug } from '../common/utils/slugify.utils';
import { PrismaService } from '../prisma.service';
import { parseSlug } from '../common/utils/validate.utils';
import { ResponseService } from '../common/services/response.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { DateTime } from 'luxon';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class DepartmentsService {
  constructor(
    private prismaService: PrismaService,
    private responseService: ResponseService,

    @InjectDataSource('sourceDB')
    private readonly sourceDB: DataSource,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    createDepartmentDto.slug = createSlug(
      createDepartmentDto.title,
      createDepartmentDto.slug,
      false,
    );

    const dublicate = await this.prismaService.department.findUnique({
      where: {
        slug: createDepartmentDto.slug,
      },
    });

    if (dublicate) {
      return {
        message: 'Отдел с таким именем уже существует',
      };
    }

    return this.prismaService.department.create({
      data: {
        ...createDepartmentDto,
        createdAt: DateTime.now().toString(),
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
    } = paginationQuery;

    const skip = (page - 1) * limit;

    const [department, total] = await Promise.all([
      this.prismaService.department.findMany({
        where: { isDeleted: isDeleted ? undefined : false },
        skip,
        take: +limit,
        orderBy: { [sortBy]: sortOrder },
      }),

      this.prismaService.department.count({
        where: { isDeleted: isDeleted ? undefined : false },
      }),
    ]);

    return this.responseService.paginated(
      department,
      total,
      page,
      limit,
      'Posts retrieved successfully',
    );
  }

  async findOne(idOrSlug: string) {
    const post = await this.prismaService.department.findUnique({
      where: {
        ...parseSlug(idOrSlug),
      },
      include: {
        preview: true,
      },
    });

    if (!post) {
      throw new NotFoundException(
        `Пост по slug или id '${idOrSlug}' не найден`,
      );
    }

    return post;
  }

  update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    if (!updateDepartmentDto.slug && updateDepartmentDto.title) {
      updateDepartmentDto.slug = createSlug(updateDepartmentDto.title);
    }

    return this.prismaService.department.update({
      where: { id: id },
      data: {
        ...updateDepartmentDto,
      },
    });
  }

  async migrate() {
    const departments = await this.sourceDB.query('Select * from Department');

    for (const department of departments) {
      await this.prismaService.department.create({
        data: {
          id: department.id,
          title: department.title,
          slug: department.slug,
          createdAt: department.createdAt,
          isDeleted: !!department.isDeleted,
          previewFileId: department.fileId,
        },
      });
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { createSlug } from '../common/utils/slugify.utils';
import { PrismaService } from '../prisma.service';
import { v4 } from 'uuid';
import { parseSlug } from '../common/utils/validate.utils';
import { ResponseService } from '../common/services/response.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    createDepartmentDto.slug = createSlug(
      createDepartmentDto.title,
      createDepartmentDto.slug,
      false,
    );

    return this.prismaService.department.create({
      data: {
        id: v4(),
        ...createDepartmentDto,
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
    if (!updateDepartmentDto.slug) {
      updateDepartmentDto.slug = undefined;
    }

    return this.prismaService.department.update({
      where: { id: id },
      data: {
        slug: '',
        ...updateDepartmentDto,
      },
    });
  }
}

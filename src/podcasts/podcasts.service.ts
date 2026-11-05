import { Injectable } from '@nestjs/common';
import { CreatePodcastDto } from './dto/create-podcast.dto';
import { UpdatePodcastDto } from './dto/update-podcast.dto';
import { PrismaService } from '../prisma.service';
import { ResponseService } from '../common/services/response.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { createInclude } from '../common/utils/include.utils';

@Injectable()
export class PodcastsService {
  constructor(
    private readonly prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  create(createPodcastDto: CreatePodcastDto) {
    return this.prismaService.podcast.create({
      data: createPodcastDto,
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

    const [podcasts, total] = await Promise.all([
      this.prismaService.podcast.findMany({
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

      this.prismaService.podcast.count({
        where: {
          isDeleted: isDeleted ? undefined : false,
        },
      }),
    ]);

    return this.responseService.paginated(podcasts, total, page, limit);
  }

  findOne(id: string) {
    return this.prismaService.podcast.findUnique({
      where: { id },
      include: { audio: true },
    });
  }

  update(id: string, updatePodcastDto: UpdatePodcastDto) {
    return this.prismaService.podcast.update({
      where: { id },
      data: updatePodcastDto,
      include: { audio: true },
    });
  }
}

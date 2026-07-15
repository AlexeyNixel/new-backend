import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';

@Injectable()
export class GamesService {
  constructor(
    private prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  async findAll(paginationQuery: PaginationQueryDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc',
      genres = [],
      age = 0,
      search = '',
    } = paginationQuery;

    const skip = (page - 1) * limit;
    let newGenres: string[] = [];

    if (typeof genres === 'string') {
      newGenres = [genres];
    }

    if (typeof genres === 'object') {
      newGenres.push(...genres);
    }

    const [games, total] = await Promise.all([
      this.prismaService.games.findMany({
        where: {
          OR: [
            {
              name: { contains: search },
            },
          ],
          AND: newGenres.map((genre) => ({
            genres: {
              contains: genre,
            },
          })),
          player_age: {
            gte: +age,
          },
        },
        skip,
        orderBy: {
          [sortBy]: sortOrder,
        },
        take: +limit,
      }),

      this.prismaService.games.count({
        where: {
          OR: [
            {
              name: { contains: search },
            },
          ],
          AND: newGenres.map((genre) => ({
            genres: {
              contains: genre,
            },
          })),
          player_age: {
            gte: +age,
          },
        },
      }),
    ]);

    if (games && total) {
      return this.responseService.paginated(games, total, page, limit);
    }
  }

  async findAllGenres() {
    return await this.prismaService.genres.findMany({
      orderBy: {
        desc: 'asc',
      },
    });
  }

  findOne(id: string) {
    return this.prismaService.games.findUnique({
      where: {
        id: id,
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '../prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';
import { parseSlug } from '../common/utils/validate.utils';
import { toBooleanFulltextQuery } from '../common/utils/fulltext-query';

const GAME_INCLUDE = {
  images: { orderBy: { order: 'asc' as const }, include: { file: true } },
  genres: { select: { genre: true } },
  series: true,
  rulesFile: true,
} satisfies Prisma.GameInclude;

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
      sortBy = 'title',
      sortOrder = 'asc',
      search = '',
      genres = [],
      players,
      ageMin,
      ageMax,
      maxDuration,
      yearFrom,
      yearTo,
      seriesId,
      availableOnly,
    } = paginationQuery;

    const skip = (page - 1) * limit;

    let genreIds: string[] = [];
    if (typeof genres === 'string') {
      genreIds = [genres];
    } else if (typeof genres === 'object') {
      genreIds = [...genres];
    }

    const booleanQuery = toBooleanFulltextQuery(search);

    if (booleanQuery) {
      const { ids, total } = await this.searchGameIds({
        booleanQuery,
        genreIds,
        players,
        ageMin,
        ageMax,
        maxDuration,
        yearFrom,
        yearTo,
        seriesId,
        availableOnly,
        skip,
        take: +limit,
      });

      if (ids.length === 0) {
        return this.responseService.paginated([], total, page, limit);
      }

      const rows = await this.prismaService.game.findMany({
        where: { id: { in: ids } },
        include: GAME_INCLUDE,
      });
      const byId = new Map(rows.map((game) => [game.id, game]));
      const games = ids
        .map((id) => byId.get(id))
        .filter((game): game is (typeof rows)[number] => Boolean(game));

      return this.responseService.paginated(games, total, page, limit);
    }

    const where = this.buildWhere({
      genreIds,
      players,
      ageMin,
      ageMax,
      maxDuration,
      yearFrom,
      yearTo,
      seriesId,
      availableOnly,
    });

    const [games, total] = await Promise.all([
      this.prismaService.game.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: +limit,
        include: GAME_INCLUDE,
      }),
      this.prismaService.game.count({ where }),
    ]);

    return this.responseService.paginated(games, total, page, limit);
  }

  async findOne(idOrSlug: string) {
    const game = await this.prismaService.game.findUnique({
      where: { ...parseSlug(idOrSlug) },
      include: GAME_INCLUDE,
    });

    if (!game) {
      return { message: `Игра по slug или id '${idOrSlug}' не найдена` };
    }

    return game;
  }

  findAllGenres() {
    return this.prismaService.gameGenre.findMany({
      orderBy: { title: 'asc' },
    });
  }

  findAllSeries() {
    return this.prismaService.gameSeries.findMany({
      orderBy: { title: 'asc' },
    });
  }

  private buildWhere(filters: {
    genreIds: string[];
    players?: number;
    ageMin?: number;
    ageMax?: number;
    maxDuration?: number;
    yearFrom?: number;
    yearTo?: number;
    seriesId?: string;
    availableOnly?: boolean;
  }): Prisma.GameWhereInput {
    const {
      genreIds,
      players,
      ageMin,
      ageMax,
      maxDuration,
      yearFrom,
      yearTo,
      seriesId,
      availableOnly,
    } = filters;

    return {
      isDeleted: false,
      seriesId: seriesId || undefined,
      playerMin: players !== undefined ? { lte: +players } : undefined,
      playerMax: players !== undefined ? { gte: +players } : undefined,
      playerAge: {
        gte: ageMin !== undefined ? +ageMin : undefined,
        lte: ageMax !== undefined ? +ageMax : undefined,
      },
      durationMin:
        maxDuration !== undefined ? { lte: +maxDuration } : undefined,
      year: {
        gte: yearFrom !== undefined ? +yearFrom : undefined,
        lte: yearTo !== undefined ? +yearTo : undefined,
      },
      status: availableOnly
        ? { notIn: ['WRITTEN_OFF', 'LOST', 'DAMAGED'] }
        : undefined,
      AND: genreIds.map((genreId) => ({
        genres: { some: { genreId } },
      })),
    };
  }

  private async searchGameIds(params: {
    booleanQuery: string;
    genreIds: string[];
    players?: number;
    ageMin?: number;
    ageMax?: number;
    maxDuration?: number;
    yearFrom?: number;
    yearTo?: number;
    seriesId?: string;
    availableOnly?: boolean;
    skip: number;
    take: number;
  }): Promise<{ ids: string[]; total: number }> {
    const {
      booleanQuery,
      genreIds,
      players,
      ageMin,
      ageMax,
      maxDuration,
      yearFrom,
      yearTo,
      seriesId,
      availableOnly,
      skip,
      take,
    } = params;

    const conditions: string[] = ['g.isDeleted = false'];
    const conditionParams: unknown[] = [];

    if (players !== undefined) {
      conditions.push('g.playerMin <= ? AND g.playerMax >= ?');
      conditionParams.push(+players, +players);
    }
    if (ageMin !== undefined) {
      conditions.push('g.playerAge >= ?');
      conditionParams.push(+ageMin);
    }
    if (ageMax !== undefined) {
      conditions.push('g.playerAge <= ?');
      conditionParams.push(+ageMax);
    }
    if (maxDuration !== undefined) {
      conditions.push('g.durationMin <= ?');
      conditionParams.push(+maxDuration);
    }
    if (yearFrom !== undefined) {
      conditions.push('g.year >= ?');
      conditionParams.push(+yearFrom);
    }
    if (yearTo !== undefined) {
      conditions.push('g.year <= ?');
      conditionParams.push(+yearTo);
    }
    if (seriesId) {
      conditions.push('g.seriesId = ?');
      conditionParams.push(seriesId);
    }
    if (availableOnly) {
      conditions.push("g.status NOT IN ('WRITTEN_OFF', 'LOST', 'DAMAGED')");
    }
    for (const genreId of genreIds) {
      conditions.push(
        'EXISTS (SELECT 1 FROM genres_on_games go WHERE go.gameId = g.id AND go.genreId = ?)',
      );
      conditionParams.push(genreId);
    }

    const whereExtra = ` AND ${conditions.join(' AND ')}`;
    const matchExpr =
      'MATCH(g.title, g.shortDescription, g.description) AGAINST(? IN BOOLEAN MODE)';

    const rows = await this.prismaService.$queryRawUnsafe<
      Array<{ id: string }>
    >(
      `SELECT g.id
         FROM games g
        WHERE ${matchExpr}${whereExtra}
        ORDER BY g.title ASC
        LIMIT ? OFFSET ?`,
      booleanQuery,
      ...conditionParams,
      take,
      skip,
    );

    const countRows = await this.prismaService.$queryRawUnsafe<
      Array<{ total: bigint }>
    >(
      `SELECT COUNT(*) AS total FROM games g WHERE ${matchExpr}${whereExtra}`,
      booleanQuery,
      ...conditionParams,
    );

    return {
      ids: rows.map((row) => row.id),
      total: Number(countRows[0]?.total ?? 0),
    };
  }
}

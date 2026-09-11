import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { v4 } from 'uuid';
import { Readable } from 'stream';
import { PrismaService } from '../prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';
import { parseSlug } from '../common/utils/validate.utils';
import { createSlug } from '../common/utils/slugify.utils';
import { toBooleanFulltextQuery } from '../common/utils/fulltext-query';
import { decodeHtmlEntities } from '../common/utils/decode-html-entities.utils';
import { FilesService } from '../files/files.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { CreateGameGenreDto } from './dto/create-game-genre.dto';
import { CreateGameSeriesDto } from './dto/create-game-series.dto';
import {
  parseAgeWithPlus,
  parseDuration,
  parsePlayerRange,
  parseYear,
} from './utils/parse-game-fields.utils';
import { mapGameStatus } from './utils/map-game-status.utils';
import { extractSeriesBaseTitle } from './utils/extract-series-base-title.utils';

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
    private filesService: FilesService,
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

  async create(dto: CreateGameDto) {
    const { imageFileIds = [], genreIds = [], ...rest } = dto;

    if (imageFileIds.length > 3) {
      throw new BadRequestException('У игры может быть не более 3 изображений');
    }

    const slug = createSlug(dto.title, dto.slug);
    const game = await this.prismaService.game.create({
      data: {
        id: v4(),
        ...rest,
        slug,
      },
    });

    await this.syncImages(game.id, imageFileIds);
    await this.syncGenres(game.id, genreIds);

    return this.findOne(game.id);
  }

  async update(id: string, dto: UpdateGameDto) {
    const { imageFileIds, genreIds, ...rest } = dto;

    if (imageFileIds && imageFileIds.length > 3) {
      throw new BadRequestException('У игры может быть не более 3 изображений');
    }

    if (rest.title && !rest.slug) {
      rest.slug = createSlug(rest.title);
    }

    await this.prismaService.game.update({
      where: { id },
      data: { ...rest },
    });

    if (imageFileIds) {
      await this.syncImages(id, imageFileIds);
    }
    if (genreIds) {
      await this.syncGenres(id, genreIds);
    }

    return this.findOne(id);
  }

  createGenre(dto: CreateGameGenreDto) {
    return this.prismaService.gameGenre.create({
      data: { id: v4(), ...dto },
    });
  }

  updateGenre(id: string, dto: Partial<CreateGameGenreDto>) {
    return this.prismaService.gameGenre.update({
      where: { id },
      data: dto,
    });
  }

  createSeries(dto: CreateGameSeriesDto) {
    return this.prismaService.gameSeries.create({
      data: { id: v4(), slug: createSlug(dto.title), ...dto },
    });
  }

  updateSeries(id: string, dto: Partial<CreateGameSeriesDto>) {
    return this.prismaService.gameSeries.update({
      where: { id },
      data: dto,
    });
  }

  private async syncImages(gameId: string, fileIds: string[]) {
    await this.prismaService.gameImage.deleteMany({ where: { gameId } });

    for (let order = 0; order < fileIds.length; order++) {
      await this.prismaService.gameImage.create({
        data: { id: v4(), gameId, fileId: fileIds[order], order },
      });
    }
  }

  private async syncGenres(gameId: string, genreIds: string[]) {
    await this.prismaService.genresOnGames.deleteMany({ where: { gameId } });

    for (const genreId of genreIds) {
      await this.prismaService.genresOnGames.create({
        data: { gameId, genreId },
      });
    }
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

  private static readonly COVER_BASE_URL =
    'http://infomania.ru/gamelibrary/img/game-cover/';
  private static readonly RULES_BASE_URL =
    'http://infomania.ru/gamelibrary/files/rules/';

  /**
   * Переносит игры из старой БД nomb_games (g_data + service/status-справочники,
   * плюс уникальные по названию строки gl_list) в модель Game. Идемпотентно:
   * уже перенесённые (по externalId) пропускаются, ошибка одной строки не
   * прерывает остальные (см. память проекта migration-logic-duplicated).
   */
  async migrate() {
    let migrated = 0;
    let skipped = 0;
    let seriesCreated = 0;
    const errors: Array<{ externalId: string; error: string }> = [];

    await this.migrateGenres();

    const gData = await this.prismaService.$queryRawUnsafe<
      Array<{
        g_id: string;
        g_name: string;
        g_p_min: number | null;
        g_p_max: number | null;
        g_age: number | null;
        g_desc: string | null;
        g_content: string | null;
        g_cover: string | null;
        g_rules_file: string | null;
        g_tags: string | null;
        g_duration: string | null;
        g_year: string | null;
        g_status: number | null;
        g_place: string | null;
        g_comment: string | null;
      }>
    >(
      `SELECT d.g_id, d.g_name, d.g_p_min, d.g_p_max, d.g_age, d.g_desc,
              d.g_content, d.g_cover, d.g_rules_file, d.g_tags, d.g_duration,
              d.g_year, s.g_status, s.g_place, s.g_comment
         FROM nomb_games.g_data d
         JOIN nomb_games.g_service s ON s.id = d.g_id
        ORDER BY d.g_id`,
    );

    const glList = await this.prismaService.$queryRawUnsafe<
      Array<{
        id: number;
        title: string;
        description: string | null;
        category: string | null;
        count_gamers: string | null;
        gametime: string | null;
        age: string | null;
        create_year: string | null;
      }>
    >(
      `SELECT id, title, description, category, count_gamers, gametime, age, create_year
         FROM nomb_games.gl_list
        ORDER BY id`,
    );

    const gDataTitles = new Set(
      gData.map((row) => row.g_name.trim().toLowerCase()),
    );
    const glListUnique = glList.filter(
      (row) => !gDataTitles.has(row.title.trim().toLowerCase()),
    );

    const normalized: NormalizedGameRow[] = [
      ...gData.map((row) => this.normalizeGData(row)),
      ...glListUnique.map((row) => this.normalizeGlList(row)),
    ];

    // Группировка в серии: часть названия до ":" встречается у >= 2 игр.
    const seriesGroups = new Map<string, NormalizedGameRow[]>();
    for (const row of normalized) {
      const base = extractSeriesBaseTitle(row.title);
      if (!base) continue;

      const key = base.toLowerCase();
      const group = seriesGroups.get(key) ?? [];
      group.push(row);
      seriesGroups.set(key, group);
    }

    const seriesIdByKey = new Map<string, string>();
    for (const [key, rows] of seriesGroups) {
      if (rows.length < 2) continue;

      const title = extractSeriesBaseTitle(rows[0].title) as string;
      const series = await this.prismaService.gameSeries.create({
        data: { id: v4(), title, slug: createSlug(title, undefined, true) },
      });
      seriesIdByKey.set(key, series.id);
      seriesCreated++;
    }

    const genreByTag = new Map(
      (await this.prismaService.gameGenre.findMany()).map((genre) => [
        genre.tag,
        genre.id,
      ]),
    );

    for (const row of normalized) {
      try {
        const existing = await this.prismaService.game.findUnique({
          where: { externalId: row.externalId },
        });
        if (existing) {
          skipped++;
          continue;
        }

        const seriesKey = extractSeriesBaseTitle(row.title)?.toLowerCase();
        const seriesId = seriesKey ? seriesIdByKey.get(seriesKey) : undefined;

        const game = await this.prismaService.game.create({
          data: {
            id: v4(),
            externalId: row.externalId,
            title: row.title,
            slug: await this.uniqueSlug(row.title),
            shortDescription: row.shortDescription,
            description: row.description,
            playerMin: row.playerMin,
            playerMax: row.playerMax,
            playerAge: row.playerAge,
            durationMin: row.durationMin,
            durationMax: row.durationMax,
            year: row.year,
            status: row.status,
            place: row.place,
            comment: row.comment,
            seriesId: seriesId || undefined,
          },
        });

        for (const tag of row.genreTags) {
          const genreId = genreByTag.get(tag);
          if (genreId) {
            await this.prismaService.genresOnGames.create({
              data: { gameId: game.id, genreId },
            });
          }
        }

        if (row.coverFile) {
          await this.attachDownloadedImage(game.id, row.coverFile);
        }
        if (row.rulesFile) {
          await this.attachDownloadedRules(game.id, row.rulesFile);
        }

        migrated++;
      } catch (error) {
        errors.push({
          externalId: row.externalId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      total: normalized.length,
      migrated,
      skipped,
      failed: errors.length,
      errors,
      seriesCreated,
    };
  }

  private normalizeGData(row: {
    g_id: string;
    g_name: string;
    g_p_min: number | null;
    g_p_max: number | null;
    g_age: number | null;
    g_desc: string | null;
    g_content: string | null;
    g_cover: string | null;
    g_rules_file: string | null;
    g_tags: string | null;
    g_duration: string | null;
    g_year: string | null;
    g_status: number | null;
    g_place: string | null;
    g_comment: string | null;
  }): NormalizedGameRow {
    const duration = parseDuration(row.g_duration);

    return {
      externalId: row.g_id,
      title: decodeHtmlEntities(row.g_name),
      shortDescription: row.g_desc ? decodeHtmlEntities(row.g_desc) : null,
      description: row.g_content ? decodeHtmlEntities(row.g_content) : null,
      playerMin: row.g_p_min || null,
      playerMax: row.g_p_max || null,
      playerAge: row.g_age,
      durationMin: duration.min,
      durationMax: duration.max,
      year: parseYear(row.g_year),
      status: mapGameStatus(row.g_status),
      place: row.g_place,
      comment: row.g_comment,
      genreTags: (row.g_tags || '')
        .split(';')
        .map((tag) => tag.trim())
        .filter(Boolean),
      coverFile: row.g_cover || null,
      rulesFile: row.g_rules_file || null,
    };
  }

  private normalizeGlList(row: {
    id: number;
    title: string;
    description: string | null;
    category: string | null;
    count_gamers: string | null;
    gametime: string | null;
    age: string | null;
    create_year: string | null;
  }): NormalizedGameRow {
    const players = parsePlayerRange(row.count_gamers);
    const duration = parseDuration(row.gametime);

    return {
      externalId: `gl-${row.id}`,
      title: decodeHtmlEntities(row.title),
      shortDescription: null,
      description: row.description ? decodeHtmlEntities(row.description) : null,
      playerMin: players.min,
      playerMax: players.max,
      playerAge: parseAgeWithPlus(row.age),
      durationMin: duration.min,
      durationMax: duration.max,
      year: parseYear(row.create_year),
      status: 'IN_STOCK',
      place: null,
      comment: null,
      genreTags: [],
      coverFile: null,
      rulesFile: null,
    };
  }

  private async migrateGenres() {
    const genres = await this.prismaService.$queryRawUnsafe<
      Array<{ tag: string; desc: string | null }>
    >('SELECT tag, `desc` FROM nomb_games.g_genre');

    for (const genre of genres) {
      const existing = await this.prismaService.gameGenre.findUnique({
        where: { tag: genre.tag },
      });
      if (!existing) {
        await this.prismaService.gameGenre.create({
          data: { id: v4(), tag: genre.tag, title: genre.desc || genre.tag },
        });
      }
    }
  }

  private async uniqueSlug(title: string): Promise<string> {
    const base = createSlug(title);
    let slug = base;
    let suffix = 2;

    while (await this.prismaService.game.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix}`;
      suffix++;
    }

    return slug;
  }

  private toSyntheticMulterFile(
    buffer: Buffer,
    originalname: string,
    mimetype: string,
  ): Express.Multer.File {
    return {
      buffer,
      originalname,
      mimetype,
      size: buffer.length,
      fieldname: 'file',
      encoding: '7bit',
      stream: Readable.from(buffer),
      destination: '',
      filename: originalname,
      path: '',
    };
  }

  private async attachDownloadedImage(gameId: string, coverFile: string) {
    try {
      const response = await fetch(GamesService.COVER_BASE_URL + coverFile);
      if (!response.ok) return;

      const buffer = Buffer.from(await response.arrayBuffer());
      const extension = coverFile.split('.').pop()?.toLowerCase();
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

      const file = await this.filesService.uploadImage(
        this.toSyntheticMulterFile(buffer, coverFile, mimeType),
      );

      if (file) {
        await this.prismaService.gameImage.create({
          data: { id: v4(), gameId, fileId: file.id, order: 0 },
        });
      }
    } catch {
      // Игра создаётся и без обложки — картинку можно добавить в админке позже.
    }
  }

  private async attachDownloadedRules(gameId: string, rulesFile: string) {
    try {
      const response = await fetch(GamesService.RULES_BASE_URL + rulesFile);
      if (!response.ok) return;

      const buffer = Buffer.from(await response.arrayBuffer());
      const file = await this.filesService.uploadDocument(
        this.toSyntheticMulterFile(buffer, rulesFile, 'application/pdf'),
      );

      if (file) {
        await this.prismaService.game.update({
          where: { id: gameId },
          data: { rulesFileId: file.id },
        });
      }
    } catch {
      // Правила можно прикрепить и позже — не блокирует создание игры.
    }
  }
}

interface NormalizedGameRow {
  externalId: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  playerMin: number | null;
  playerMax: number | null;
  playerAge: number | null;
  durationMin: number | null;
  durationMax: number | null;
  year: number | null;
  status: ReturnType<typeof mapGameStatus>;
  place: string | null;
  comment: string | null;
  genreTags: string[];
  coverFile: string | null;
  rulesFile: string | null;
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { v4 } from 'uuid';
import { PrismaService } from '../prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';
import { parseSlug } from '../common/utils/validate.utils';
import { createSlug } from '../common/utils/slugify.utils';
import { CreateComicDto } from './dto/create-comic.dto';
import { UpdateComicDto } from './dto/update-comic.dto';
import { CreateComicGenreDto } from './dto/create-comic-genre.dto';
import { CreateComicSeriesDto } from './dto/create-comic-series.dto';

const COMIC_INCLUDE = {
  images: { orderBy: { order: 'asc' as const }, include: { file: true } },
  genres: { select: { genre: true } },
  series: true,
} satisfies Prisma.ComicInclude;

@Injectable()
export class ComicsService {
  constructor(
    private prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  async findAll(paginationQuery: PaginationQueryDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search = '',
      genres = [],
      seriesId,
      ageMax,
      yearFrom,
      yearTo,
    } = paginationQuery;

    const skip = (page - 1) * limit;

    let genreIds: string[] = [];
    if (typeof genres === 'string') {
      genreIds = [genres];
    } else if (typeof genres === 'object') {
      genreIds = [...genres];
    }

    const where = this.buildWhere({
      search,
      genreIds,
      seriesId,
      ageMax,
      yearFrom,
      yearTo,
    });

    const [comics, total] = await Promise.all([
      this.prismaService.comic.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: +limit,
        include: COMIC_INCLUDE,
      }),
      this.prismaService.comic.count({ where }),
    ]);

    return this.responseService.paginated(comics, total, page, limit);
  }

  async findOne(idOrSlug: string) {
    const comic = await this.prismaService.comic.findUnique({
      where: { ...parseSlug(idOrSlug) },
      include: COMIC_INCLUDE,
    });

    if (!comic) {
      return { message: `Комикс по slug или id '${idOrSlug}' не найден` };
    }

    return comic;
  }

  findAllGenres() {
    return this.prismaService.comicGenre.findMany({
      orderBy: { title: 'asc' },
    });
  }

  findAllSeries() {
    return this.prismaService.comicSeries.findMany({
      orderBy: { title: 'asc' },
    });
  }

  async create(dto: CreateComicDto) {
    const { imageFileIds = [], genreIds = [], ...rest } = dto;

    if (imageFileIds.length > 3) {
      throw new BadRequestException(
        'У комикса может быть не более 3 изображений',
      );
    }

    const slug = createSlug(dto.title, dto.slug);
    const comic = await this.prismaService.comic.create({
      data: {
        id: v4(),
        ...rest,
        slug,
      },
    });

    await this.syncImages(comic.id, imageFileIds);
    await this.syncGenres(comic.id, genreIds);

    return this.findOne(comic.id);
  }

  async update(id: string, dto: UpdateComicDto) {
    const { imageFileIds, genreIds, ...rest } = dto;

    if (imageFileIds && imageFileIds.length > 3) {
      throw new BadRequestException(
        'У комикса может быть не более 3 изображений',
      );
    }

    if (rest.title && !rest.slug) {
      rest.slug = createSlug(rest.title);
    }

    await this.prismaService.comic.update({
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

  createGenre(dto: CreateComicGenreDto) {
    return this.prismaService.comicGenre.create({
      data: { id: v4(), ...dto },
    });
  }

  updateGenre(id: string, dto: Partial<CreateComicGenreDto>) {
    return this.prismaService.comicGenre.update({
      where: { id },
      data: dto,
    });
  }

  createSeries(dto: CreateComicSeriesDto) {
    return this.prismaService.comicSeries.create({
      data: { id: v4(), slug: createSlug(dto.title), ...dto },
    });
  }

  updateSeries(id: string, dto: Partial<CreateComicSeriesDto>) {
    return this.prismaService.comicSeries.update({
      where: { id },
      data: dto,
    });
  }

  private async syncImages(comicId: string, fileIds: string[]) {
    await this.prismaService.comicImage.deleteMany({ where: { comicId } });

    for (let order = 0; order < fileIds.length; order++) {
      await this.prismaService.comicImage.create({
        data: { id: v4(), comicId, fileId: fileIds[order], order },
      });
    }
  }

  private async syncGenres(comicId: string, genreIds: string[]) {
    await this.prismaService.genresOnComics.deleteMany({ where: { comicId } });

    for (const genreId of genreIds) {
      await this.prismaService.genresOnComics.create({
        data: { comicId, genreId },
      });
    }
  }

  private buildWhere(filters: {
    search?: string;
    genreIds: string[];
    seriesId?: string;
    ageMax?: number;
    yearFrom?: number;
    yearTo?: number;
  }): Prisma.ComicWhereInput {
    const { search, genreIds, seriesId, ageMax, yearFrom, yearTo } = filters;

    return {
      isDeleted: false,
      seriesId: seriesId || undefined,
      title: search ? { contains: search } : undefined,
      ageRating: ageMax !== undefined ? { lte: +ageMax } : undefined,
      year: {
        gte: yearFrom !== undefined ? +yearFrom : undefined,
        lte: yearTo !== undefined ? +yearTo : undefined,
      },
      AND: genreIds.map((genreId) => ({
        genres: { some: { genreId } },
      })),
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import sharp from 'sharp';
import { v4 } from 'uuid';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '../prisma.service';
import { MinioService } from '../common/services/minio.service';
import { ResponseService } from '../common/services/response.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

/** Имя папки пакета — оно же адрес страницы на сайте: /page/exhibition/<slug> */
const SLUG_PATTERN = /^[\w-]{2,100}$/;
const MAX_ZIP_SIZE = 500 * 1024 * 1024;

export interface UpdateExhibitionDto {
  title?: string | null;
  isHidden?: boolean;
}

/**
 * Виртуальные выставки — HTML-пакеты iSpring (File с type=EXHIBITION).
 * Пакеты лежат в двух местах: загруженные через CMS — `/dev/exhibitions/<slug>/`,
 * перенесённые со старого сайта — `/site/exhibition/<uuid>/<slug>/` (только чтение).
 */
@Injectable()
export class ExhibitionsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly minioService: MinioService,
    private readonly responseService: ResponseService,
  ) {}

  /** Для сайта: только не скрытые */
  findAll(paginationQuery: PaginationQueryDto) {
    return this.list(paginationQuery, { isHidden: false });
  }

  /** Для админки: все, со скрытыми */
  findAllAdmin(paginationQuery: PaginationQueryDto, status?: string) {
    const extra: Prisma.FileWhereInput =
      status === 'visible' ? { isHidden: false } : status === 'hidden' ? { isHidden: true } : {};
    return this.list(paginationQuery, extra);
  }

  async findOne(id: string) {
    const exhibition = await this.prismaService.file.findFirst({
      where: { id, type: 'EXHIBITION' },
    });
    if (!exhibition) {
      throw new NotFoundException(`Выставка с id ${id} не найдена`);
    }
    return exhibition;
  }

  async update(id: string, dto: UpdateExhibitionDto) {
    await this.findOne(id);
    return this.prismaService.file.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && {
          title: dto.title?.trim().slice(0, 300) || null,
        }),
        ...(dto.isHidden !== undefined && { isHidden: !!dto.isHidden }),
      },
    });
  }

  /**
   * Загружает ZIP из iSpring. Имя архива становится адресом выставки
   * (`v_bulgakov_135.zip` → /page/exhibition/v_bulgakov_135), поэтому
   * занятые имена не перезаписываются. Обложку можно приложить отдельно,
   * если в пакете нет cover.jpg.
   */
  async upload(
    zip: Express.Multer.File | undefined,
    cover: Express.Multer.File | undefined,
    title: string | undefined,
  ) {
    if (!zip) {
      throw new BadRequestException('Приложите ZIP-архив выставки');
    }
    if (zip.size > MAX_ZIP_SIZE) {
      throw new BadRequestException('Архив больше 500 МБ');
    }

    const archiveName = Buffer.from(zip.originalname, 'latin1').toString(
      'utf8',
    );
    const slug = archiveName.replace(/\.zip$/i, '').trim();
    if (!/\.zip$/i.test(archiveName) || !SLUG_PATTERN.test(slug)) {
      throw new BadRequestException(
        'Имя архива станет адресом выставки: латиница, цифры, «_» и «-», например v_bulgakov_135.zip',
      );
    }
    if (await this.findBySlug(slug)) {
      throw new ConflictException(
        `Выставка «${slug}» уже есть. Переименуйте архив`,
      );
    }

    let files: ReturnType<MinioService['readExhibitionZip']>;
    try {
      files = this.minioService.readExhibitionZip(zip.buffer);
    } catch {
      throw new BadRequestException(
        'Не удалось распаковать архив — это точно ZIP?',
      );
    }
    const index = files.find((file) => file.path === 'index.html');
    if (!index) {
      throw new BadRequestException(
        'В корне архива нет index.html — это не пакет iSpring',
      );
    }

    const basePath = `/exhibitions/${slug}`;
    const { mainHtmlPath } = await this.minioService.uploadExhibition(
      files,
      basePath,
    );

    if (cover) {
      await this.putCover(basePath, cover);
    }

    return this.prismaService.file.create({
      data: {
        id: v4(),
        originalName: archiveName,
        mimeType: 'text/html',
        path: mainHtmlPath,
        type: 'EXHIBITION',
        size: zip.size,
        width: 0,
        height: 0,
        title:
          title?.trim().slice(0, 300) ||
          this.readTitle(index.getData()) ||
          null,
      },
    });
  }

  /** Заменяет обложку (cover.jpg рядом с index.html) */
  async replaceCover(id: string, cover: Express.Multer.File | undefined) {
    if (!cover) {
      throw new BadRequestException('Приложите картинку обложки');
    }
    const exhibition = await this.findOne(id);
    if (!this.minioService.isOwnPath(exhibition.path)) {
      throw new BadRequestException(
        'Это выставка со старого сайта — её файлы только для чтения, обложку заменить нельзя',
      );
    }
    // `/dev/exhibitions/<slug>/index.html` → ключ `/exhibitions/<slug>`
    const basePath = exhibition.path
      .replace(/^\/[^/]+/, '')
      .replace(/\/index\.html$/, '');
    await this.putCover(basePath, cover);
    // Время изменения — чтобы админка сбросила кеш картинки
    return { ...exhibition, coverUpdatedAt: new Date().toISOString() };
  }

  private async list(
    paginationQuery: PaginationQueryDto,
    extra: Prisma.FileWhereInput,
  ) {
    const {
      page = 1,
      limit = 10,
      search,
      sortOrder = 'desc',
    } = paginationQuery;
    const query = search?.trim();
    const where: Prisma.FileWhereInput = {
      type: 'EXHIBITION',
      ...extra,
      ...(query && {
        OR: [
          { title: { contains: query } },
          { originalName: { contains: query } },
          { path: { contains: query } },
        ],
      }),
    };

    const [exhibitions, total] = await Promise.all([
      this.prismaService.file.findMany({
        where,
        orderBy: { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' },
        skip: (+page - 1) * +limit,
        take: +limit,
      }),
      this.prismaService.file.count({ where }),
    ]);

    return this.responseService.paginated(exhibitions, total, +page, +limit);
  }

  private findBySlug(slug: string) {
    return this.prismaService.file.findFirst({
      where: { type: 'EXHIBITION', path: { endsWith: `/${slug}/index.html` } },
      select: { id: true },
    });
  }

  private async putCover(basePath: string, cover: Express.Multer.File) {
    if (!/^image\//.test(cover.mimetype)) {
      throw new BadRequestException('Обложка должна быть картинкой');
    }
    const jpeg = await sharp(cover.buffer)
      .rotate()
      .resize({ width: 1280, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    await this.minioService.putObjectAt(
      `${basePath}/cover.jpg`,
      jpeg,
      'image/jpeg',
    );
  }

  /** iSpring пишет название в <title>; бывает, что там имя папки — его не берём */
  private readTitle(html: Buffer) {
    const title = html
      .toString('utf8')
      .match(/<title>([^<]*)<\/title>/i)?.[1]
      ?.trim();
    if (!title || /^v_[\w-]+$/.test(title)) return undefined;
    return title
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');
  }
}

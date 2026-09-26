import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { MinioService } from '../common/services/minio.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { v4 } from 'uuid';
import { Prisma } from 'generated/prisma';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';

export interface BackfillStats {
  processed: number;
  /** Сколько копий (файлов) создано */
  created: number;
  failed: number;
  errors: Array<{ id: string; path: string; error: string }>;
}

export interface UploadImageResult {
  url: string;
  key: string;
  size: number;
  width?: number;
  height?: number;
  etag: string;
}

export interface UploadZipResult {
  totalFiles: number;
  uploadedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  results: Array<{
    originalPath: string;
    minioKey: string;
    url: string;
    size: number;
    success: boolean;
    skipped?: boolean;
    error?: string;
  }>;
}

@Injectable()
export class FilesService {
  constructor(
    @InjectDataSource('sourceDB')
    private readonly sourceDB: DataSource,
    private prismaService: PrismaService,
    private imageProcessing: ImageProcessingService,
    private minioService: MinioService,
    private configServices: ConfigService,
    private responseService: ResponseService,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
    options: {
      quality?: number;
      maxWidth?: number;
    } = {},
  ) {
    const { quality = 80, maxWidth = 1920 } = options;
    const decodedOriginalName = this.decodeFileName(file.originalname);

    this.imageProcessing.validateImage(file);

    try {
      const fileHash = this.generateHash(file.buffer);

      const existingFile = await this.prismaService.file.findUnique({
        where: { hash: fileHash },
      });

      if (existingFile) {
        return existingFile;
      }

      const processedImage = await this.imageProcessing.processImage(
        { ...file, originalname: decodedOriginalName },
        {
          quality,
          maxWidth,
        },
      );

      const uploadResult = await this.minioService.uploadFile(
        processedImage.buffer,
        processedImage.originalName,
        processedImage.mimeType,
      );

      const resultWithDimensions = {
        ...uploadResult,
        url: uploadResult.url.split('10001')[1],
        width: processedImage.width,
        height: processedImage.height,
      };

      const savedFile = await this.saveFileToDatabase(
        {
          ...file,
          originalname: decodedOriginalName,
        },
        resultWithDimensions,
      );

      // Копии для srcset. Ошибка нарезки не должна ломать саму загрузку —
      // такие файлы потом догонит backfillVariants()
      try {
        return await this.createVariants(savedFile, processedImage.buffer);
      } catch (error) {
        console.error('[files] не удалось создать копии картинки', error);
        return savedFile;
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Создаёт уменьшенные копии картинки (400/800px, WebP) и сохраняет их пути в File.variants.
   * Копии всегда пишутся в бакет сервиса под префиксом `variants/` — исходный файл
   * (в т.ч. из бакета старого сайта) только читается и не изменяется.
   */
  async createVariants(
    file: { id: string; path: string; width: number | null },
    source?: Buffer,
  ) {
    const buffer =
      source ?? (await this.minioService.getObjectByPath(file.path));
    const variants = await this.imageProcessing.createVariants(buffer);

    const paths: Record<string, string> = {};
    for (const variant of variants) {
      paths[variant.width] = await this.minioService.putObjectAt(
        this.variantKey(file.path, variant.width),
        variant.buffer,
        'image/webp',
      );
    }

    // У перенесённых со старой БД файлов размеры не сохранены (0) — заполняем заодно
    const dimensions = file.width
      ? {}
      : await this.imageProcessing.getDimensions(buffer);

    return this.prismaService.file.update({
      where: { id: file.id },
      data: { variants: paths, ...dimensions },
    });
  }

  /**
   * Догоняет копии для уже загруженных картинок, которые используются как превью/обложки
   * (посты, книги, подборки, игры, комиксы, слайды, клубы, отделы).
   * Идёт одним проходом по id, поэтому ошибочные файлы не зацикливают обработку;
   * повторный запуск подхватит только файлы без копий (variants = null).
   */
  async backfillVariants(
    options: {
      batchSize?: number;
      concurrency?: number;
      limit?: number;
      /** Пересоздать копии и для уже обработанных файлов (например, после смены набора ширин) */
      force?: boolean;
      onProgress?: (stats: BackfillStats) => void;
    } = {},
  ): Promise<BackfillStats> {
    const { batchSize = 100, concurrency = 4, limit = Infinity } = options;
    const stats: BackfillStats = {
      processed: 0,
      created: 0,
      failed: 0,
      errors: [],
    };
    let cursor: string | undefined;

    while (stats.processed < limit) {
      const files = await this.prismaService.file.findMany({
        where: {
          type: 'IMAGE',
          ...(options.force ? {} : { variants: { equals: Prisma.DbNull } }),
          mimeType: { in: ['image/jpeg', 'image/png', 'image/webp'] },
          OR: [
            { posts: { some: {} } },
            { books: { some: {} } },
            { BookCollection: { some: {} } },
            { gameImages: { some: {} } },
            { comicImages: { some: {} } },
            { slide: { some: {} } },
            { club: { some: {} } },
            { departments: { some: {} } },
          ],
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        select: { id: true, path: true, width: true },
        orderBy: { id: 'asc' },
        take: Math.min(batchSize, limit - stats.processed),
      });
      if (!files.length) break;
      cursor = files[files.length - 1].id;

      for (let i = 0; i < files.length; i += concurrency) {
        await Promise.all(
          files.slice(i, i + concurrency).map(async (file) => {
            try {
              const updated = await this.createVariants(file);
              stats.created += Object.keys(
                (updated.variants as Record<string, string>) ?? {},
              ).length;
            } catch (error) {
              stats.failed++;
              stats.errors.push({
                id: file.id,
                path: file.path,
                error: error instanceof Error ? error.message : String(error),
              });
            } finally {
              stats.processed++;
            }
          }),
        );
      }

      options.onProgress?.(stats);
    }

    return stats;
  }

  /** `/site/image/2024/.../uuid.jpeg` → `variants/site/image/2024/.../uuid-w400.webp` */
  private variantKey(originalPath: string, width: number) {
    const withoutExt = originalPath
      .replace(/^\/+/, '')
      .replace(/\.[^./]+$/, '');
    return `variants/${withoutExt}-w${width}.webp`;
  }

  async uploadExhibition(file: Express.Multer.File) {
    const id = v4();
    const fileName = file.originalname.split('.')[0];
    const baseMinioPath = `/exhibitions/${fileName}`;

    try {
      const result = await this.minioService.uploadExhibition(
        file.buffer,
        baseMinioPath,
      );

      if (result && result.mainHtmlPath) {
        return await this.prismaService.file.create({
          data: {
            id: id,
            originalName: file.originalname,
            mimeType: 'text/html',
            path: result.mainHtmlPath,
            type: 'EXHIBITION',
            size: file.size,
            width: 0,
            height: 0,
          },
        });
      }
    } catch (error) {
      throw new Error(error);
    }
  }

  async findAllExhibitions(paginationQuery: PaginationQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      sortOrder = 'desc',
    } = paginationQuery;
    const where: Prisma.FileWhereInput = {
      type: 'EXHIBITION',
      ...(search && { originalName: { contains: search } }),
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

  async findOneExhibition(id: string) {
    const exhibition = await this.prismaService.file.findFirst({
      where: { id, type: 'EXHIBITION' },
    });

    if (!exhibition) {
      throw new NotFoundException(`Выставка с id ${id} не найдена`);
    }

    return exhibition;
  }

  async uploadDocument(file: Express.Multer.File) {
    const hash = this.generateHash(file.buffer);

    const findCopy = await this.prismaService.file.findUnique({
      where: {
        hash: hash,
      },
    });

    if (findCopy) {
      return findCopy;
    }

    const result = await this.minioService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      'documents',
    );

    const decodeName = this.decodeFileName(file.originalname);

    const resultWithDimensions = {
      ...result,
      url: result.url.split('10001')[1],
    };

    return this.saveFileToDatabase(
      { ...file, originalname: decodeName },
      resultWithDimensions,
      'DOCUMENT',
    );
  }

  private saveFileToDatabase(
    originalFile: Express.Multer.File,
    result: UploadImageResult,
    type: 'IMAGE' | 'DOCUMENT' = 'IMAGE',
  ) {
    return this.prismaService.file.create({
      data: {
        originalName: originalFile.originalname,
        mimeType: 'image/webp',
        hash: this.generateHash(originalFile.buffer),
        type: type,
        path: result.url,
        size: result.size,
        width: result.width,
        height: result.height,
      },
    });
  }

  private generateHash(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  private decodeFileName(filename: string) {
    const decoded = Buffer.from(filename, 'latin1').toString('utf8');
    const hasGarbage = /Ð|Ñ||/.test(filename);

    if (hasGarbage && decoded !== filename) {
      return decoded;
    } else {
      return filename;
    }
  }

  async migrate() {
    const oldFiles: Array<{
      id: string;
      originalName: string;
      mimeType: string;
      hash: string | null;
      type: 'IMAGE' | 'DOCUMENT' | 'ARCHIVE' | 'EXHIBITION';
      path: string;
      createdAt: Date;
    }> = await this.sourceDB.query('SELECT * from File ORDER BY createdAt');

    let migrated = 0;
    let skipped = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const file of oldFiles) {
      try {
        const existing = await this.prismaService.file.findUnique({
          where: { id: file.id },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await this.prismaService.file.create({
          data: {
            id: file.id,
            originalName: file.originalName,
            mimeType: file.mimeType,
            hash: file.hash,
            type: file.type,
            path: file.path,
            createdAt: file.createdAt,
            size: 0,
            height: 0,
            width: 0,
          },
        });
        migrated++;
      } catch (error) {
        errors.push({
          id: file.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      total: oldFiles.length,
      migrated,
      skipped,
      failed: errors.length,
      errors,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { CreateMainSliderDto } from './dto/create-main-slider.dto';
import { UpdateMainSliderDto } from './dto/update-main-slider.dto';
import { PrismaService } from '../prisma.service';
import { v4 } from 'uuid';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ResponseService } from '../common/services/response.service';
import { PaginationQuery } from '../common/interfaces/api-response.interface';
import { OldSlide } from '../migration/models/old-slide.type';

@Injectable()
export class MainSliderService {
  constructor(
    @InjectDataSource('sourceDB')
    private readonly sourceDB: DataSource,
    private prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}
  create(createMainSliderDto: CreateMainSliderDto) {
    return this.prismaService.mainSliderSlide.create({
      data: {
        id: v4(),
        ...createMainSliderDto,
      },
    });
  }

  async findAll(paginationQuery: PaginationQuery) {
    const {
      page = 1,
      limit = 10,
      isDeleted,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = paginationQuery;

    const skip = (page - 1) * limit;

    const [slides, total] = await Promise.all([
      this.prismaService.mainSliderSlide.findMany({
        where: { isDeleted: isDeleted ? undefined : false },
        skip,
        take: +limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          image: true,
          post: true,
        },
      }),

      this.prismaService.mainSliderSlide.count({
        where: { isDeleted: isDeleted ? undefined : false },
      }),
    ]);

    return this.responseService.paginated(
      slides,
      total,
      page,
      limit,
      'Slides retrieved successfully',
    );
  }

  findOne(id: number) {
    return `This action returns a #${id} mainSlider`;
  }

  update(id: string, updateMainSliderDto: UpdateMainSliderDto) {
    return this.prismaService.mainSliderSlide.update({
      where: {
        id: id,
      },
      data: {
        ...updateMainSliderDto,
      },
    });
  }

  // imageFileId по умолчанию, если у слайда нет своего файла. Должен существовать
  // в таблице files целевой БД (иначе — нарушение внешнего ключа).
  private static readonly DEFAULT_IMAGE_FILE_ID =
    'aa8c3d9e-f7de-44cc-8391-b6e7f8782ce3';

  async migrate() {
    const slides: OldSlide[] = await this.sourceDB.query(
      'SELECT * FROM MainSlider ORDER BY createdAt',
    );

    let migrated = 0;
    let skipped = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const slide of slides) {
      try {
        const existing = await this.prismaService.mainSliderSlide.findUnique({
          where: { id: slide.id },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const imageFileExists =
          !!slide.fileId &&
          !!(await this.prismaService.file.findUnique({
            where: { id: slide.fileId },
          }));
        const postExists =
          !!slide.entryId &&
          !!(await this.prismaService.post.findUnique({
            where: { id: slide.entryId },
          }));

        await this.prismaService.mainSliderSlide.create({
          data: {
            id: slide.id,
            imageFileId: imageFileExists
              ? slide.fileId
              : MainSliderService.DEFAULT_IMAGE_FILE_ID,
            postId: postExists ? slide.entryId : null,
            createdAt: slide.createdAt,
            url: slide.url,
            slideOrder: slide.position || 0,
            isDeleted: !!slide.isDeleted,
          },
        });
        migrated++;
      } catch (error) {
        errors.push({
          id: slide.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      total: slides.length,
      migrated,
      skipped,
      failed: errors.length,
      errors,
    };
  }
}

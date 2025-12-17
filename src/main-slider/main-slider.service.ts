import { Injectable } from '@nestjs/common';
import { CreateMainSliderDto } from './dto/create-main-slider.dto';
import { UpdateMainSliderDto } from './dto/update-main-slider.dto';
import { PrismaService } from '../prisma.service';
import { v4 } from 'uuid';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ResponseService } from '../common/services/response.service';
import { PaginationQuery } from '../common/interfaces/api-response.interface';

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

  async migrate() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const slides = await this.sourceDB.query('SELECT * FROM MainSlider');
    try {
      for (const slide of slides) {
        const copy = await this.prismaService.mainSliderSlide.findUnique({
          where: {
            id: slide.id,
          },
        });

        if (copy) {
          break;
        }

        await this.prismaService.mainSliderSlide.create({
          data: {
            id: slide.id,
            imageFileId: slide.fileId || '123ec8e5-650c-47b6-a898-203b40987a29',
            createdAt: slide.createdAt,
            url: slide.url,
            postId: slide.entryId,
            isDeleted: !!slide.isDeleted,
          },
        });
      }
    } catch (error) {
      console.log(error);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { CreateMapPointDto } from './dto/create-map-point.dto';
import { UpdateMapPointDto } from './dto/update-map-point.dto';
import { PrismaService } from '../prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';
import { v4 } from 'uuid';

@Injectable()
export class MapPointService {
  constructor(
    private readonly prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  create(createMapPointDto: CreateMapPointDto) {
    return this.prismaService.mapPoint.create({
      data: {
        id: v4(),
        ...createMapPointDto,
      },
    });
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10, isDeleted } = paginationQuery;

    const skip = (page - 1) * limit;
    const where = { isDeleted: isDeleted ? undefined : false };

    const [mapPoints, total] = await Promise.all([
      this.prismaService.mapPoint.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        include: {
          image: true,
        },
      }),
      this.prismaService.mapPoint.count({ where }),
    ]);

    return this.responseService.paginated(
      mapPoints,
      total,
      page,
      limit,
      'Точки карты успешно найдены',
    );
  }

  async findOne(id: string) {
    const mapPoint = await this.prismaService.mapPoint.findUnique({
      where: { id },
      include: {
        image: true,
      },
    });

    if (mapPoint) {
      return {
        status: 200,
        data: mapPoint,
      };
    } else {
      return {
        status: 404,
        message: 'Точка карты не найдена',
      };
    }
  }

  update(id: string, updateMapPointDto: UpdateMapPointDto) {
    return this.prismaService.mapPoint.update({
      where: { id },
      data: { ...updateMapPointDto },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { ResponseService } from '../common/services/response.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma.service';
import { v4 } from 'uuid';

@Injectable()
export class NotificationService {
  constructor(
    private prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  create(createNotificationDto: CreateNotificationDto) {
    return this.prismaService.notification.create({
      data: {
        id: v4(),
        ...createNotificationDto,
      },
    });
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10, isDeleted } = paginationQuery;

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prismaService.notification.findMany({
        where: {
          isDeleted: isDeleted ? undefined : false,
          startTime: {
            lte: new Date().toISOString(),
          },

          endTime: {
            gte: new Date().toISOString(),
          },
        },
        skip: skip,
        take: +limit,
      }),
      this.prismaService.notification.count({
        where: {
          isDeleted: isDeleted ? undefined : false,
          startTime: {
            lte: new Date().toISOString(),
          },

          endTime: {
            gte: new Date().toISOString(),
          },
        },
      }),
    ]);

    if (notifications.length < 1) {
      return {
        title: 'Актуальных оповещений нет',
        status: 'empty',
      };
    }

    return this.responseService.paginated(
      notifications,
      total,
      page,
      limit,
      'Уведомления успешно найдены',
    );
  }

  update(id: string, updateNotificationDto: UpdateNotificationDto) {
    return this.prismaService.notification.update({
      where: {
        id: id,
      },
      data: {
        ...updateNotificationDto,
      },
    });
  }

  remove(id: string) {
    return this.prismaService.notification.delete({
      where: {
        id: id,
      },
    });
  }
}

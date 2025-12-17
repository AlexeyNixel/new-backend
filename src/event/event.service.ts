import { Injectable } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PrismaService } from '../prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';
import { v4 } from 'uuid';

@Injectable()
export class EventService {
  constructor(
    @InjectDataSource('sourceDB')
    private readonly sourceDB: DataSource,
    private prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  create(createEventDto: CreateEventDto) {
    return this.prismaService.event.create({
      data: {
        id: v4(),
        ...createEventDto,
      },
    });
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const {
      page = 1,
      limit = 10,
      isDeleted,
      sortBy = 'eventTime',
      sortOrder = 'desc',
      startDate,
      endDate,
    } = paginationQuery;

    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      this.prismaService.event.findMany({
        where: {
          isDeleted: isDeleted ? undefined : false,
          eventTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        skip,
        take: +limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prismaService.event.count({
        where: {
          isDeleted: isDeleted ? undefined : false,
          eventTime: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    return this.responseService.paginated(
      events,
      total,
      page,
      limit,
      'События успешно найдены',
    );
  }

  async findOne(id: string) {
    const event = await this.prismaService.event.findUnique({
      where: {
        id: id,
      },
    });
    if (event) {
      return {
        status: 200,
        data: event,
      };
    } else {
      return {
        status: 404,
        message: 'Пост не найден',
      };
    }
  }

  update(id: string, updateEventDto: UpdateEventDto) {
    return this.prismaService.event.update({
      where: {
        id: id,
      },
      data: {
        ...updateEventDto,
      },
    });
  }

  remove(id: number) {
    return `This action removes a #${id} event`;
  }

  async migrate() {
    const events = await this.sourceDB.query('SELECT * FROM Affiche');
    for (const event of events) {
      const { title, age } = this.findAge(event.title);
      const now =
        event.eventDate.toISOString().slice(0, 11) + event.eventTime + '.000Z';
      await this.prismaService.event.create({
        data: {
          id: event.id,
          title: title,
          content: event.desc,
          phone: event.phone || '123',
          place: event.eventPlace || 'guest',
          eventTime: now,
          createdAt: now,
          age: age ? +age : undefined,
          isDeleted: !!event.IsDeleted,
        },
      });
    }

    return 'Миграция проведена';
  }

  private findAge(text: string) {
    const match = text.match(/\((\d+)/);
    const cleanTitle = text.replace(/\s*\([^)]+\)\s*$/, '').trim();
    const age = match ? match[1] : null;
    return {
      title: cleanTitle,
      age: age,
    };
  }
}

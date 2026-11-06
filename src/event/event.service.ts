import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PrismaService } from '../prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';
import { v4 } from 'uuid';
import { assertEventCategory } from './utils/event-category.utils';
import { normalizeTicketUrl } from './utils/event-ticket-url.utils';
import { syncTicketBlock } from './utils/event-ticket-block.utils';

@Injectable()
export class EventService {
  constructor(
    @InjectDataSource('sourceDB')
    private readonly sourceDB: DataSource,
    private prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  create(createEventDto: CreateEventDto) {
    assertEventCategory(createEventDto.category);
    const { ticketUrl, ...rest } = createEventDto;
    const normalizedTicketUrl = normalizeTicketUrl(ticketUrl) ?? null;
    return this.prismaService.event.create({
      data: {
        id: v4(),
        ...rest,
        ticketUrl: normalizedTicketUrl,
        // ссылка дублируется блоком «Купить билет» в описании — как редакторы делали вручную
        content: syncTicketBlock(
          createEventDto.content,
          normalizedTicketUrl,
          !!createEventDto.isPushkin,
        ),
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
      search = '',
    } = paginationQuery;

    const skip = (page - 1) * limit;
    const query = search.trim();
    const where: Prisma.EventWhereInput = {
      isDeleted: isDeleted ? undefined : false,
      eventTime: {
        gte: startDate,
        lte: endDate,
      },
      // Событий немного, поэтому без полнотекстового индекса — подстрока
      // в заголовке (коллация MySQL регистронезависимая)
      title: query ? { contains: query } : undefined,
    };
    const [events, total] = await Promise.all([
      this.prismaService.event.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prismaService.event.count({ where }),
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

  async update(id: string, updateEventDto: UpdateEventDto) {
    assertEventCategory(updateEventDto.category);
    const { ticketUrl, ...rest } = updateEventDto;
    const normalizedTicketUrl = normalizeTicketUrl(ticketUrl);

    const current = await this.prismaService.event.findUnique({
      where: { id },
      select: { content: true, ticketUrl: true, isPushkin: true },
    });

    // Описание переписываем, только если меняется ссылка, признак карты или сам текст
    const touchesTicket =
      normalizedTicketUrl !== undefined ||
      updateEventDto.isPushkin !== undefined ||
      updateEventDto.content !== undefined;

    const contentData =
      current && touchesTicket
        ? {
            content: syncTicketBlock(
              updateEventDto.content ?? current.content,
              normalizedTicketUrl === undefined
                ? current.ticketUrl
                : normalizedTicketUrl,
              updateEventDto.isPushkin ?? current.isPushkin,
            ),
          }
        : {};

    return this.prismaService.event.update({
      where: {
        id: id,
      },
      data: {
        ...rest,
        ...contentData,
        // undefined — поле не трогаем, null — очищаем ссылку
        ...(normalizedTicketUrl === undefined
          ? {}
          : { ticketUrl: normalizedTicketUrl }),
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
      const data = {
        title: title,
        content: event.desc,
        phone: event.phone || '123',
        place: event.eventPlace || 'guest',
        eventTime: now,
        createdAt: now,
        age: age ? +age : undefined,
        isDeleted: !!event.IsDeleted,
      };
      await this.prismaService.event.upsert({
        where: { id: event.id },
        create: { id: event.id, ...data },
        update: data,
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

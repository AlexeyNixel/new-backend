import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackType, Prisma } from 'generated/prisma';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { FeedbackQueryDto } from './dto/feedback-query.dto';
import { PrismaService } from '../prisma.service';
import { ResponseService } from '../common/services/response.service';
import { v4 } from 'uuid';

export interface FeedbackUser {
  id: string;
  username: string;
  name?: string | null;
}

const TYPES = Object.values(FeedbackType);

const INCLUDE = {
  author: { select: { id: true, name: true, username: true } },
  screenshot: { select: { id: true, path: true } },
} satisfies Prisma.FeedbackInclude;

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  /**
   * Разработчики — логины из FEEDBACK_MANAGERS через запятую: они отмечают
   * выполненное и отвечают. Пока переменная не задана — может любой.
   */
  canManage(user: FeedbackUser) {
    const managers = (process.env.FEEDBACK_MANAGERS ?? '')
      .split(',')
      .map((login) => login.trim().toLowerCase())
      .filter(Boolean);
    return !managers.length || managers.includes(user.username.toLowerCase());
  }

  create(createFeedbackDto: CreateFeedbackDto, user: FeedbackUser) {
    const { type, title, ...rest } = this.contentFields(createFeedbackDto);
    if (!type || !title) {
      throw new BadRequestException('Укажите тип и суть обращения');
    }
    return this.prismaService.feedback.create({
      data: { id: v4(), type, title, ...rest, authorId: user.id },
      include: INCLUDE,
    });
  }

  async findAll(query: FeedbackQueryDto, user: FeedbackUser) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const status = query.status ?? 'open';
    const search = query.search?.trim();

    const where: Prisma.FeedbackWhereInput = {
      isDeleted: false,
      ...(status !== 'all' && { isDone: status === 'done' }),
      ...(query.type && TYPES.includes(query.type) && { type: query.type }),
      ...(query.mine !== undefined && { authorId: user.id }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prismaService.feedback.findMany({
        where,
        include: INCLUDE,
        // Выполненные — свежие сверху по дате выполнения, иначе — открытые выше
        orderBy:
          status === 'done'
            ? [{ doneAt: 'desc' }, { createdAt: 'desc' }]
            : [{ isDone: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.feedback.count({ where }),
    ]);

    return this.responseService.paginated(items, total, page, limit);
  }

  async findOne(id: string) {
    const feedback = await this.prismaService.feedback.findFirst({
      where: { id, isDeleted: false },
      include: INCLUDE,
    });
    if (!feedback) throw new NotFoundException('Обращение не найдено');
    return { status: 200, data: feedback };
  }

  async summary(user: FeedbackUser, since?: string) {
    const sinceDate =
      since && !isNaN(Date.parse(since)) ? new Date(since) : null;

    const [open, newSince, doneForMe] = await Promise.all([
      this.prismaService.feedback.count({
        where: { isDone: false, isDeleted: false },
      }),
      // Новые обращения от других — повод разработчику заглянуть в список
      sinceDate
        ? this.prismaService.feedback.count({
            where: {
              isDeleted: false,
              createdAt: { gt: sinceDate },
              OR: [{ authorId: null }, { authorId: { not: user.id } }],
            },
          })
        : 0,
      // Мои обращения, которые успели выполнить, — сказать автору «готово»
      sinceDate
        ? this.prismaService.feedback.findMany({
            where: {
              authorId: user.id,
              isDone: true,
              isDeleted: false,
              doneAt: { gt: sinceDate },
            },
            select: { id: true, title: true, response: true, doneAt: true },
            orderBy: { doneAt: 'desc' },
            take: 10,
          })
        : [],
    ]);

    return { open, newSince, doneForMe, canManage: this.canManage(user) };
  }

  async update(
    id: string,
    updateFeedbackDto: UpdateFeedbackDto,
    user: FeedbackUser,
  ) {
    const feedback = await this.prismaService.feedback.findFirst({
      where: { id, isDeleted: false },
    });
    if (!feedback) throw new NotFoundException('Обращение не найдено');

    const { isDone, response, isDeleted } = updateFeedbackDto;

    if (!this.canManage(user)) {
      if (feedback.authorId !== user.id) {
        throw new ForbiddenException('Изменять можно только свои обращения');
      }
      if (isDone !== undefined || response !== undefined) {
        throw new ForbiddenException(
          'Отмечать выполнение может только разработчик',
        );
      }
      if (feedback.isDone) {
        throw new ForbiddenException('Выполненное обращение уже не изменить');
      }
    }

    return this.prismaService.feedback.update({
      where: { id },
      data: {
        ...this.contentFields(updateFeedbackDto),
        ...(isDone !== undefined &&
          isDone !== feedback.isDone && {
            isDone,
            doneAt: isDone ? new Date() : null,
          }),
        ...(response !== undefined && { response: response?.trim() || null }),
        ...(isDeleted !== undefined && { isDeleted }),
      },
      include: INCLUDE,
    });
  }

  /** Поля, которые заполняет автор; отсутствующие в dto не трогаем */
  private contentFields(dto: Partial<CreateFeedbackDto>) {
    const data: {
      type?: FeedbackType;
      title?: string;
      description?: string | null;
      pageUrl?: string | null;
      screenshotId?: string | null;
    } = {};

    if (dto.type !== undefined) {
      if (!TYPES.includes(dto.type)) {
        throw new BadRequestException('Неизвестный тип обращения');
      }
      data.type = dto.type;
    }
    if (dto.title !== undefined) {
      const title = dto.title?.trim() ?? '';
      if (!title || title.length > 200) {
        throw new BadRequestException('Кратко опишите суть — до 200 символов');
      }
      data.title = title;
    }
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.pageUrl !== undefined) {
      data.pageUrl = dto.pageUrl?.trim().slice(0, 500) || null;
    }
    if (dto.screenshotId !== undefined) {
      data.screenshotId = dto.screenshotId || null;
    }
    return data;
  }
}

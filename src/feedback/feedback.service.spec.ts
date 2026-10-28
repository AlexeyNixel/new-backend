// Prisma подменяем заглушкой: update возвращает переданные данные, их и проверяем
/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock(
  'generated/prisma',
  () => ({ FeedbackType: { BUG: 'BUG', CHANGE: 'CHANGE', IDEA: 'IDEA' } }),
  { virtual: true },
);

import { ForbiddenException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';

const author = { id: 'u1', username: 'librarian' };
const developer = { id: 'u2', username: 'Dev' };

const setup = (existing: Record<string, unknown>) => {
  const prisma = {
    feedback: {
      findFirst: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockImplementation(({ data }) => data),
    },
  };
  return { prisma, service: new FeedbackService(prisma as any, {} as any) };
};

describe('FeedbackService', () => {
  const env = process.env.FEEDBACK_MANAGERS;
  afterEach(() => {
    process.env.FEEDBACK_MANAGERS = env;
  });

  it('без FEEDBACK_MANAGERS отмечать выполнение может любой', () => {
    delete process.env.FEEDBACK_MANAGERS;
    const { service } = setup({});
    expect(service.canManage(author)).toBe(true);
  });

  it('разработчик из FEEDBACK_MANAGERS отмечает выполнение, doneAt ставится', async () => {
    process.env.FEEDBACK_MANAGERS = 'admin, dev';
    const { service } = setup({ authorId: author.id, isDone: false });
    const data: any = await service.update('f1', { isDone: true }, developer);
    expect(data.isDone).toBe(true);
    expect(data.doneAt).toBeInstanceOf(Date);
  });

  it('автор не может отметить своё обращение выполненным', async () => {
    process.env.FEEDBACK_MANAGERS = 'dev';
    const { service } = setup({ authorId: author.id, isDone: false });
    await expect(
      service.update('f1', { isDone: true }, author),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('автор правит текст открытого обращения, чужое — нельзя', async () => {
    process.env.FEEDBACK_MANAGERS = 'dev';
    const { service } = setup({ authorId: author.id, isDone: false });
    const data: any = await service.update('f1', { title: ' Новое ' }, author);
    expect(data.title).toBe('Новое');
    await expect(
      service.update('f1', { title: 'x' }, { id: 'u3', username: 'other' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

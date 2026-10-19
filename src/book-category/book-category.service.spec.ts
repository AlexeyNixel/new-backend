jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookCategoryService } from './book-category.service';

const COLLECTION_ID = '85804298-0000-4000-8000-000000000000';

const makePrisma = (current: Record<string, unknown> | null = null) => {
  const prisma = {
    bookCollection: {
      findUnique: jest.fn().mockResolvedValue(current),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest
        .fn()
        .mockImplementation(
          ({ data }: { data: Record<string, unknown> }) => data,
        ),
    },
    book: { count: jest.fn() },
    bookOnCollection: {
      deleteMany: jest.fn().mockReturnValue('delete'),
      createMany: jest.fn().mockReturnValue('create'),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  return prisma;
};

const makeService = (prisma: ReturnType<typeof makePrisma>) =>
  new BookCategoryService({} as never, prisma as never);

describe('BookCategoryService.setBooks', () => {
  it('сохраняет книги с позициями по порядку списка и без дублей', async () => {
    const prisma = makePrisma({ id: COLLECTION_ID });
    prisma.book.count.mockResolvedValue(2);
    const service = makeService(prisma);
    jest.spyOn(service, 'findOne').mockResolvedValue({} as never);

    await service.setBooks(COLLECTION_ID, { bookIds: ['b', 'a', 'b'] });

    expect(prisma.bookOnCollection.createMany).toHaveBeenCalledWith({
      data: [
        { bookId: 'b', collectionsId: COLLECTION_ID, position: 0 },
        { bookId: 'a', collectionsId: COLLECTION_ID, position: 1 },
      ],
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('отклоняет запрос без массива bookIds', async () => {
    const service = makeService(makePrisma({ id: COLLECTION_ID }));
    await expect(
      service.setBooks(COLLECTION_ID, { bookIds: 'a' as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('отклоняет, если часть книг не существует', async () => {
    const prisma = makePrisma({ id: COLLECTION_ID });
    prisma.book.count.mockResolvedValue(1);
    await expect(
      makeService(prisma).setBooks(COLLECTION_ID, { bookIds: ['a', 'x'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404 для несуществующей подборки', async () => {
    await expect(
      makeService(makePrisma(null)).setBooks(COLLECTION_ID, { bookIds: [] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('BookCategoryService.update — адрес подборки', () => {
  it('временный адрес (= id после миграции) заменяет адресом из названия', async () => {
    const prisma = makePrisma({
      id: COLLECTION_ID,
      slug: COLLECTION_ID,
      label: 'Советуем почитать',
    });
    const result = await makeService(prisma).update(COLLECTION_ID, {});
    expect(result.slug).toBe('sovetuem-pochitat');
  });

  it('не трогает уже заданный адрес, если редактор его не менял', async () => {
    const prisma = makePrisma({
      id: COLLECTION_ID,
      slug: 'nashi-sovety',
      label: 'Советуем почитать',
    });
    const result = await makeService(prisma).update(COLLECTION_ID, {
      label: 'Новое название',
    });
    expect(result.slug).toBeUndefined();
  });

  it('занятый адрес получает суффикс -2', async () => {
    const prisma = makePrisma({
      id: COLLECTION_ID,
      slug: COLLECTION_ID,
      label: 'Фэнтези',
    });
    prisma.bookCollection.findFirst
      .mockResolvedValueOnce({ id: 'other' })
      .mockResolvedValueOnce(null);
    const result = await makeService(prisma).update(COLLECTION_ID, {});
    expect(result.slug).toBe('fentezi-2');
  });
});

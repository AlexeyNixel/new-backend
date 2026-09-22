// Спек читает Reflector-метадату с методов на прототипе контроллера (не вызывая их) — намеренный паттерн для метадата-тестов, а не баг.
/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { Reflector } from '@nestjs/core';
import { BookCategoryController } from './book-category.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('BookCategoryController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает create() как Audited("BookCollection")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      BookCategoryController.prototype.create,
    );
    expect(metadata).toBe('BookCollection');
  });

  it('помечает update() как Audited("BookCollection")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      BookCategoryController.prototype.update,
    );
    expect(metadata).toBe('BookCollection');
  });
});

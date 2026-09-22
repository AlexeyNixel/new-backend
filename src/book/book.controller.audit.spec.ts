jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { Reflector } from '@nestjs/core';
import { BookController } from './book.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('BookController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает create() как Audited("Book")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      BookController.prototype.create,
    );
    expect(metadata).toBe('Book');
  });

  it('помечает update() как Audited("Book")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      BookController.prototype.update,
    );
    expect(metadata).toBe('Book');
  });
});

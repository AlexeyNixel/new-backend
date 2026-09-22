// Спек читает Reflector-метадату с методов на прототипе контроллера (не вызывая их) — намеренный паттерн для метадата-тестов, а не баг.
/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { Reflector } from '@nestjs/core';
import { TagsController } from './tags.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('TagsController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает create() как Audited("Tag")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      TagsController.prototype.create,
    );
    expect(metadata).toBe('Tag');
  });

  it('помечает update() как Audited("Tag")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      TagsController.prototype.update,
    );
    expect(metadata).toBe('Tag');
  });
});

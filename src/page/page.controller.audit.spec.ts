// Спек читает Reflector-метадату с методов на прототипе контроллера (не вызывая их) — намеренный паттерн для метадата-тестов, а не баг.
/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { Reflector } from '@nestjs/core';
import { PageController } from './page.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('PageController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает create() как Audited("Page")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      PageController.prototype.create,
    );
    expect(metadata).toBe('Page');
  });

  it('помечает update() как Audited("Page")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      PageController.prototype.update,
    );
    expect(metadata).toBe('Page');
  });
});

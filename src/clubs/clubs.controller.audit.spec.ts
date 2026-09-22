// Спек читает Reflector-метадату с методов на прототипе контроллера (не вызывая их) — намеренный паттерн для метадата-тестов, а не баг.
/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { Reflector } from '@nestjs/core';
import { ClubsController } from './clubs.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('ClubsController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает create() как Audited("Club")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      ClubsController.prototype.create,
    );
    expect(metadata).toBe('Club');
  });

  it('помечает update() как Audited("Club")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      ClubsController.prototype.update,
    );
    expect(metadata).toBe('Club');
  });
});

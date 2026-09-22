// Спек читает Reflector-метадату с методов на прототипе контроллера (не вызывая их) — намеренный паттерн для метадата-тестов, а не баг.
/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { Reflector } from '@nestjs/core';
import { MapPointController } from './map-point.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('MapPointController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает create() как Audited("MapPoint")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      MapPointController.prototype.create,
    );
    expect(metadata).toBe('MapPoint');
  });

  it('помечает update() как Audited("MapPoint")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      MapPointController.prototype.update,
    );
    expect(metadata).toBe('MapPoint');
  });
});

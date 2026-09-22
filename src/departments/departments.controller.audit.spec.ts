// Спек читает Reflector-метадату с методов на прототипе контроллера (не вызывая их) — намеренный паттерн для метадата-тестов, а не баг.
/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
// AuditInterceptor (импортируется контроллером вместе с @Audited) сам тянет
// generated/prisma для AuditAction — мокаем оба модуля, как в posts.
jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { Reflector } from '@nestjs/core';
import { DepartmentsController } from './departments.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('DepartmentsController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает create() как Audited("Department")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      DepartmentsController.prototype.create,
    );
    expect(metadata).toBe('Department');
  });

  it('помечает update() как Audited("Department")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      DepartmentsController.prototype.update,
    );
    expect(metadata).toBe('Department');
  });
});

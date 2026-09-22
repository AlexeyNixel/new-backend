// achievements.service.ts импортирует PrismaService через bare-путь
// 'src/prisma.service' (не '../prisma.service', как остальные) — тот же
// bare-путь-не-резолвится-в-jest эффект, мокаем оба варианта специфики пути.
jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('src/prisma.service', () => ({ PrismaService: class {} }), {
  virtual: true,
});
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { Reflector } from '@nestjs/core';
import { AchievementsController } from './achievements.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('AchievementsController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает create() как Audited("Achievement")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      AchievementsController.prototype.create,
    );
    expect(metadata).toBe('Achievement');
  });

  it('помечает update() как Audited("Achievement")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      AchievementsController.prototype.update,
    );
    expect(metadata).toBe('Achievement');
  });
});

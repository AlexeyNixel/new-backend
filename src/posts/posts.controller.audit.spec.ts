// PostsController тянет PostsService -> PrismaService и Prisma напрямую из
// generated/prisma — bare-путь не резолвится в jest. Подменяем заглушками.
// uuid@13 — ESM-only пакет, ts-jest не умеет его парсить без транспиляции — тоже мокаем.
jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });
jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

import { Reflector } from '@nestjs/core';
import { PostsController } from './posts.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('PostsController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает create() как Audited("Post")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      PostsController.prototype.create,
    );
    expect(metadata).toBe('Post');
  });

  it('помечает update() как Audited("Post")', () => {
    const metadata = reflector.get(
      AUDITED_ENTITY_KEY,
      PostsController.prototype.update,
    );
    expect(metadata).toBe('Post');
  });
});

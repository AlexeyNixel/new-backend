// Спек читает Reflector-метадату с методов на прототипе контроллера (не вызывая их) — намеренный паттерн для метадата-тестов, а не баг.
/* eslint-disable @typescript-eslint/unbound-method */
jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { Reflector } from '@nestjs/core';
import { ComicsController } from './comics.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('ComicsController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает createGenre() как Audited("ComicGenre")', () => {
    expect(
      reflector.get(AUDITED_ENTITY_KEY, ComicsController.prototype.createGenre),
    ).toBe('ComicGenre');
  });

  it('помечает updateGenre() как Audited("ComicGenre")', () => {
    expect(
      reflector.get(AUDITED_ENTITY_KEY, ComicsController.prototype.updateGenre),
    ).toBe('ComicGenre');
  });

  it('помечает createSeries() как Audited("ComicSeries")', () => {
    expect(
      reflector.get(
        AUDITED_ENTITY_KEY,
        ComicsController.prototype.createSeries,
      ),
    ).toBe('ComicSeries');
  });

  it('помечает updateSeries() как Audited("ComicSeries")', () => {
    expect(
      reflector.get(
        AUDITED_ENTITY_KEY,
        ComicsController.prototype.updateSeries,
      ),
    ).toBe('ComicSeries');
  });

  it('помечает create() как Audited("Comic")', () => {
    expect(
      reflector.get(AUDITED_ENTITY_KEY, ComicsController.prototype.create),
    ).toBe('Comic');
  });

  it('помечает update() как Audited("Comic")', () => {
    expect(
      reflector.get(AUDITED_ENTITY_KEY, ComicsController.prototype.update),
    ).toBe('Comic');
  });
});

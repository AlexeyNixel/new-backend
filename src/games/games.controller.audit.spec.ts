jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('generated/prisma', () => ({}), { virtual: true });

import { Reflector } from '@nestjs/core';
import { GamesController } from './games.controller';
import { AUDITED_ENTITY_KEY } from '../common/decorators/audited.decorator';

describe('GamesController audit metadata', () => {
  const reflector = new Reflector();

  it('помечает createGenre() как Audited("GameGenre")', () => {
    expect(
      reflector.get(AUDITED_ENTITY_KEY, GamesController.prototype.createGenre),
    ).toBe('GameGenre');
  });

  it('помечает updateGenre() как Audited("GameGenre")', () => {
    expect(
      reflector.get(AUDITED_ENTITY_KEY, GamesController.prototype.updateGenre),
    ).toBe('GameGenre');
  });

  it('помечает createSeries() как Audited("GameSeries")', () => {
    expect(
      reflector.get(AUDITED_ENTITY_KEY, GamesController.prototype.createSeries),
    ).toBe('GameSeries');
  });

  it('помечает updateSeries() как Audited("GameSeries")', () => {
    expect(
      reflector.get(AUDITED_ENTITY_KEY, GamesController.prototype.updateSeries),
    ).toBe('GameSeries');
  });

  it('помечает create() как Audited("Game")', () => {
    expect(
      reflector.get(AUDITED_ENTITY_KEY, GamesController.prototype.create),
    ).toBe('Game');
  });

  it('помечает update() как Audited("Game")', () => {
    expect(
      reflector.get(AUDITED_ENTITY_KEY, GamesController.prototype.update),
    ).toBe('Game');
  });
});

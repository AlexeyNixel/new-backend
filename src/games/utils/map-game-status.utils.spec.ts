import { mapGameStatus } from './map-game-status.utils';

describe('mapGameStatus', () => {
  it('маппит коды статуса из g_status', () => {
    expect(mapGameStatus(0)).toBe('IN_STOCK');
    expect(mapGameStatus(1)).toBe('ON_HANDS');
    expect(mapGameStatus(-1)).toBe('TEMPORARILY_UNAVAILABLE');
    expect(mapGameStatus(-2)).toBe('WRITTEN_OFF');
    expect(mapGameStatus(-3)).toBe('LOST');
    expect(mapGameStatus(-4)).toBe('DAMAGED');
  });

  it('возвращает IN_STOCK для неизвестного/пустого значения', () => {
    expect(mapGameStatus(999)).toBe('IN_STOCK');
    expect(mapGameStatus(null)).toBe('IN_STOCK');
    expect(mapGameStatus(undefined)).toBe('IN_STOCK');
  });
});

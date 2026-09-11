import {
  parseAgeWithPlus,
  parseDuration,
  parsePlayerRange,
  parseYear,
} from './parse-game-fields.utils';

describe('parseDuration', () => {
  it('парсит диапазон "15-60 минут"', () => {
    expect(parseDuration('15-60 минут')).toEqual({ min: 15, max: 60 });
  });

  it('парсит "20+ минут" как открытый диапазон', () => {
    expect(parseDuration('20+ минут')).toEqual({ min: 20, max: null });
  });

  it('парсит одно число "45 минут" как min=max', () => {
    expect(parseDuration('45 минут')).toEqual({ min: 45, max: 45 });
  });

  it('возвращает null/null для пустого значения', () => {
    expect(parseDuration(null)).toEqual({ min: null, max: null });
    expect(parseDuration('')).toEqual({ min: null, max: null });
    expect(parseDuration(undefined)).toEqual({ min: null, max: null });
  });

  it('парсит большие диапазоны "240-480 минут"', () => {
    expect(parseDuration('240-480 минут')).toEqual({ min: 240, max: 480 });
  });
});

describe('parseYear', () => {
  it('парсит 4-значный год', () => {
    expect(parseYear('2021')).toBe(2021);
    expect(parseYear(' 2025 ')).toBe(2025);
  });

  it('возвращает null для "-", пустой строки, мусора и null', () => {
    expect(parseYear('-')).toBeNull();
    expect(parseYear('')).toBeNull();
    expect(parseYear(null)).toBeNull();
    expect(parseYear('abc')).toBeNull();
  });
});

describe('parsePlayerRange', () => {
  it('парсит диапазон "3-9"', () => {
    expect(parsePlayerRange('3-9')).toEqual({ min: 3, max: 9 });
  });

  it('парсит одно число "4" как min=max', () => {
    expect(parsePlayerRange('4')).toEqual({ min: 4, max: 4 });
  });

  it('возвращает null/null для пустого значения', () => {
    expect(parsePlayerRange(null)).toEqual({ min: null, max: null });
    expect(parsePlayerRange('')).toEqual({ min: null, max: null });
  });
});

describe('parseAgeWithPlus', () => {
  it('парсит "12+" как 12', () => {
    expect(parseAgeWithPlus('12+')).toBe(12);
  });

  it('парсит "0" как 0', () => {
    expect(parseAgeWithPlus('0')).toBe(0);
  });

  it('возвращает null для пустого значения', () => {
    expect(parseAgeWithPlus(null)).toBeNull();
    expect(parseAgeWithPlus('')).toBeNull();
  });
});

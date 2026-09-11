import { extractSeriesBaseTitle } from './extract-series-base-title.utils';

describe('extractSeriesBaseTitle', () => {
  it('берёт часть названия до двоеточия', () => {
    expect(extractSeriesBaseTitle('Дюна: Приключения в Империи')).toBe(
      'Дюна',
    );
    expect(
      extractSeriesBaseTitle('Warhammer Fantasy Roleplay: Книга правил'),
    ).toBe('Warhammer Fantasy Roleplay');
  });

  it('возвращает null, если двоеточия нет', () => {
    expect(extractSeriesBaseTitle('Классики')).toBeNull();
  });

  it('возвращает null, если база короче 2 символов', () => {
    expect(extractSeriesBaseTitle(': пустая база')).toBeNull();
    expect(extractSeriesBaseTitle('A: b')).toBeNull();
  });
});

import { extractSeriesBaseTitle } from './extract-series-base-title.utils';

describe('extractSeriesBaseTitle', () => {
  it('берёт часть названия до двоеточия', () => {
    expect(extractSeriesBaseTitle('Дюна: Приключения в Империи')).toBe('Дюна');
    expect(
      extractSeriesBaseTitle('Warhammer Fantasy Roleplay: Книга правил'),
    ).toBe('Warhammer Fantasy Roleplay');
  });

  it('берёт часть названия до точки с пробелом ("AZUL. Витражи Синтры")', () => {
    expect(extractSeriesBaseTitle('AZUL. Витражи Синтры')).toBe('AZUL');
    expect(extractSeriesBaseTitle('AZUL. Летний дворец')).toBe('AZUL');
    expect(extractSeriesBaseTitle('Pathfinder. Бестиарий')).toBe('Pathfinder');
  });

  it('берёт часть названия до тире/дефиса с пробелами по бокам', () => {
    expect(extractSeriesBaseTitle('Вся жизнь - игра')).toBe('Вся жизнь');
    expect(extractSeriesBaseTitle('Вся жизнь — игра!')).toBe('Вся жизнь');
  });

  it('останавливается на первом встреченном разделителе, если их несколько', () => {
    // двоеточие раньше точки — база должна быть по двоеточию
    expect(extractSeriesBaseTitle('Unmatched: Битва Легенд. Том второй')).toBe(
      'Unmatched',
    );
  });

  it('не путает точку внутри аббревиатуры/без пробела с разделителем серии', () => {
    expect(extractSeriesBaseTitle('т.д. что-то там')).toBeNull();
    expect(extractSeriesBaseTitle('V.I.P.')).toBeNull();
  });

  it('возвращает null, если разделителя нет', () => {
    expect(extractSeriesBaseTitle('Классики')).toBeNull();
  });

  it('возвращает null, если база короче 2 символов', () => {
    expect(extractSeriesBaseTitle(': пустая база')).toBeNull();
    expect(extractSeriesBaseTitle('A: b')).toBeNull();
    expect(extractSeriesBaseTitle('A. b')).toBeNull();
  });
});

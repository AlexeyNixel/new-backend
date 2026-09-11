import { normalizeGameTitle } from './normalize-game-title.utils';

describe('normalizeGameTitle', () => {
  it('приводит к одному виду при разнице в пунктуации', () => {
    expect(normalizeGameTitle('"Цивилизация" Сида Мейера: Новый рассвет')).toBe(
      normalizeGameTitle('"Цивилизация" Сида Мейера: Новый рассвет.'),
    );
    expect(normalizeGameTitle('Catan: Колонизаторы')).toBe(
      normalizeGameTitle('Catan. Колонизаторы'),
    );
    expect(normalizeGameTitle('Это факт! (Зоопарк)')).toBe(
      normalizeGameTitle('Это факт! Зоопарк'),
    );
  });

  it('не совпадает у действительно разных названий', () => {
    expect(normalizeGameTitle('Нет слов')).not.toBe(
      normalizeGameTitle('Нет слов: Учим английский'),
    );
  });

  it('схлопывает лишние пробелы и приводит к нижнему регистру', () => {
    expect(normalizeGameTitle('  Azul   ')).toBe('azul');
    expect(normalizeGameTitle('AZUL')).toBe('azul');
  });
});

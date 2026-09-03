import { toBooleanFulltextQuery } from './fulltext-query';

describe('toBooleanFulltextQuery', () => {
  it('превращает одно слово в обязательный префиксный терм', () => {
    expect(toBooleanFulltextQuery('библиотека')).toBe('+библиотека*');
  });

  it('каждое слово многословного запроса делает обязательным', () => {
    expect(toBooleanFulltextQuery('молодёжная библиотека')).toBe(
      '+молодёжная* +библиотека*',
    );
  });

  it('схлопывает лишние пробелы', () => {
    expect(toBooleanFulltextQuery('  кино   фестиваль ')).toBe(
      '+кино* +фестиваль*',
    );
  });

  it('вырезает спецсимволы boolean-режима из слов', () => {
    expect(toBooleanFulltextQuery('+биб* -"кино" (наука)')).toBe(
      '+биб* +кино* +наука*',
    );
  });

  it('отбрасывает слова короче 3 символов (ft_min_token_size)', () => {
    expect(toBooleanFulltextQuery('в библиотеке')).toBe('+библиотеке*');
    expect(toBooleanFulltextQuery('a b')).toBeNull();
  });

  it('возвращает null для пустого/мусорного ввода', () => {
    expect(toBooleanFulltextQuery('')).toBeNull();
    expect(toBooleanFulltextQuery('   ')).toBeNull();
    expect(toBooleanFulltextQuery(undefined)).toBeNull();
    expect(toBooleanFulltextQuery('+++ --- ***')).toBeNull();
  });

  it('ограничивает число термов', () => {
    const many = Array.from({ length: 20 }, (_, i) => `слово${i}`).join(' ');
    const result = toBooleanFulltextQuery(many);
    expect(result).not.toBeNull();
    expect((result as string).split(' ')).toHaveLength(10);
  });

  it('не ломается на цифрах и дефисах внутри слова', () => {
    expect(toBooleanFulltextQuery('800-летие')).toBe('+800* +летие*');
  });
});

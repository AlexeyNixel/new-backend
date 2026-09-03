/**
 * Готовит пользовательский поисковый запрос для MySQL/MariaDB
 * `MATCH(...) AGAINST(? IN BOOLEAN MODE)`.
 *
 * - разбивает строку на слова (любой не буквенно-цифровой символ — разделитель,
 *   заодно вычищаются операторы boolean-режима: + - > < ( ) ~ * " @);
 * - каждое слово делает обязательным и префиксным: `+слово*`
 *   (префикс ловит словоформы: «библиотек*» → библиотека/библиотеке/библиотечный);
 * - отбрасывает слова короче `MIN_TOKEN_LEN` — движок их всё равно не индексирует
 *   (`innodb_ft_min_token_size` = 3), а с `+` они обнулили бы выдачу;
 * - ограничивает число термов.
 *
 * Возвращает `null`, если осмысленных слов не осталось — вызывающий код в этом
 * случае не применяет полнотекстовый фильтр.
 */
const MIN_TOKEN_LEN = 3;
const MAX_TERMS = 10;

export function toBooleanFulltextQuery(
  search: string | null | undefined,
): string | null {
  if (!search) {
    return null;
  }

  const tokens = search
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0 && [...token].length >= MIN_TOKEN_LEN)
    .slice(0, MAX_TERMS);

  if (tokens.length === 0) {
    return null;
  }

  return tokens.map((token) => `+${token}*`).join(' ');
}

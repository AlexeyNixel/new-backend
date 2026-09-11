/**
 * Эвристика для группировки игр в серии при миграции: часть названия до
 * первого двоеточия («Дюна: Приключения в Империи» -> «Дюна»). Не находит
 * серию (null), если двоеточия нет или базовая часть слишком короткая —
 * такие случаи в основном шум (не признак серии).
 */
export function extractSeriesBaseTitle(title: string): string | null {
  const colonIndex = title.indexOf(':');
  if (colonIndex === -1) {
    return null;
  }

  const base = title.slice(0, colonIndex).trim();
  return base.length >= 2 ? base : null;
}

import { extractSeriesBaseTitle } from './extract-series-base-title.utils';

/**
 * Группирует игры в серии по эвристике {@link extractSeriesBaseTitle}.
 * Базовая игра серии без подзаголовка (например, «AZUL» рядом с
 * «AZUL. Витражи Синтры» и «AZUL. Летний дворец») присоединяется к своей
 * серии, если её точное название совпадает с базовой частью уже найденной
 * группы. Группы из одной игры отбрасываются — это шум, не серия.
 */
export function groupBySeriesTitle<T extends { title: string }>(
  rows: T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const row of rows) {
    const base = extractSeriesBaseTitle(row.title);
    if (!base) {
      continue;
    }

    const key = base.toLowerCase();
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  for (const row of rows) {
    const key = row.title.trim().toLowerCase();
    const group = groups.get(key);
    if (group && !group.includes(row)) {
      group.push(row);
    }
  }

  for (const [key, group] of groups) {
    if (group.length < 2) {
      groups.delete(key);
    }
  }

  return groups;
}

/**
 * Старая БД хранит длительность партии свободным текстом
 * («20+ минут», «15-60 минут», «45 минут»). Разбираем в минуты.
 */
export function parseDuration(text: string | null | undefined): {
  min: number | null;
  max: number | null;
} {
  if (!text) {
    return { min: null, max: null };
  }

  const range = text.match(/(\d+)\s*-\s*(\d+)/);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }

  const plus = text.match(/(\d+)\s*\+/);
  if (plus) {
    return { min: Number(plus[1]), max: null };
  }

  const single = text.match(/(\d+)/);
  if (single) {
    return { min: Number(single[1]), max: Number(single[1]) };
  }

  return { min: null, max: null };
}

/** "2021" -> 2021; "-", "", мусор -> null. */
export function parseYear(text: string | null | undefined): number | null {
  if (!text) {
    return null;
  }

  const match = text.match(/^\s*(\d{4})\s*$/);
  return match ? Number(match[1]) : null;
}

/** gl_list.count_gamers: "3-9" -> {min:3,max:9}, "4" -> {min:4,max:4}. */
export function parsePlayerRange(text: string | null | undefined): {
  min: number | null;
  max: number | null;
} {
  if (!text) {
    return { min: null, max: null };
  }

  const range = text.match(/(\d+)\s*-\s*(\d+)/);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }

  const single = text.match(/(\d+)/);
  if (single) {
    return { min: Number(single[1]), max: Number(single[1]) };
  }

  return { min: null, max: null };
}

/** gl_list.age: "12+" -> 12. */
export function parseAgeWithPlus(
  text: string | null | undefined,
): number | null {
  if (!text) {
    return null;
  }

  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

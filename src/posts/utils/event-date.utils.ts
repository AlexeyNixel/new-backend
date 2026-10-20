import { BadRequestException } from '@nestjs/common';

/**
 * Дата мероприятия новости-анонса — только дата (колонка DATE).
 * Админка шлёт «2026-10-25», а Prisma для DateTime ждёт полный ISO —
 * приводим к полуночи UTC. Пустое значение / null — убрать дату.
 * undefined — поле не прислали, не трогаем.
 */
export const normalizeEventDate = (
  value: string | null | undefined,
): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === '') return null;

  const day = value.trim().slice(0, 10);
  const date = new Date(`${day}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Некорректная дата мероприятия: '${value}'`);
  }
  return date;
};

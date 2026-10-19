import { BadRequestException } from '@nestjs/common';

export const EVENT_CATEGORIES = ['MASTER', 'MUSIC', 'GAME', 'TALK'] as const;

export type EventCategoryValue = (typeof EVENT_CATEGORIES)[number];

/**
 * Проверяет тип события из запроса админки.
 * Глобальной валидации DTO в проекте нет — без проверки неизвестное значение
 * дошло бы до Prisma и вернуло 500 вместо понятной ошибки.
 */
export function assertEventCategory(value: unknown): void {
  if (value === undefined || value === null) return;
  if (!EVENT_CATEGORIES.includes(value as EventCategoryValue)) {
    throw new BadRequestException(
      `Неизвестный тип события ${JSON.stringify(value)}. Допустимые: ${EVENT_CATEGORIES.join(', ')}`,
    );
  }
}

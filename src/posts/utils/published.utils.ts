import { Prisma } from 'generated/prisma';

/**
 * Отложенная публикация: новость с `publishedAt` в будущем не попадает в
 * публичные выдачи (лента, поиск, закреплённая, архивы на страницах), пока
 * не наступит это время. Админка запрашивает список с `isDeleted` и видит всё.
 */
export const publishedByNow = (
  now: Date = new Date(),
): Prisma.PostWhereInput => ({
  publishedAt: { lte: now },
});

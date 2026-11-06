import { BadRequestException } from '@nestjs/common';

/**
 * Проверяет ссылку на покупку билета: допускается только http(s) или пустое значение.
 * Пустая строка и null — «ссылки нет». Возвращает нормализованное значение:
 * пустую строку превращает в null, чтобы в БД не копились '' вместо NULL.
 */
export function normalizeTicketUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException('Ссылка на билет должна быть строкой');
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new BadRequestException(
      `Ссылка на билет ${JSON.stringify(value)} не является корректным URL`,
    );
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException(
      'Ссылка на билет должна начинаться с http:// или https://',
    );
  }

  return trimmed;
}

/**
 * Декодирует HTML-сущности в тексте старой БД (описания игр и т.п.).
 * Набор сущностей — тот же, что раньше чистился на клиенте во фронтенде
 * (useStringCleaner.removeHtmlEntities), перенесено на сервер, чтобы
 * фронт получал уже чистый текст.
 */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) {
    return '';
  }

  return text
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/**
 * Блок «Купить билет» в описании события — тот же формат, что редакторы ставили вручную:
 * <p>На это событие можно <a target="_blank" rel="noopener noreferrer nofollow" href="...">купить билет</a>
 * по Пушкинской карте.</p>
 *
 * Ссылка хранится в поле ticketUrl; при сохранении события блок добавляется в начало описания
 * (или обновляется, если уже есть), чтобы старые новости и шаблоны продолжали работать.
 */
// Только наш блок «На это событие можно <a>купить билет</a> …», чужие «можно <a>купить</a> билет» не трогаем
const TICKET_BLOCK = /<p[^>]*>\s*На это событие\s+можно\s+<a[^>]*href\s*=\s*"[^"]*"[^>]*>\s*купить билет\s*<\/a>[^<]*<\/p>/gi;

const blockHtml = (url: string, isPushkin: boolean) =>
  `<p>На это событие можно <a target="_blank" rel="noopener noreferrer nofollow" href="${url}">купить билет</a>`
  + `${isPushkin ? ' по Пушкинской карте' : ''}.</p>`;

/**
 * Приводит описание к согласованному виду с полем ticketUrl.
 * - ссылка есть: существующий блок заменяется (или добавляется в начало) с актуальной ссылкой;
 * - ссылки нет: ручной блок «На это событие можно <a>…</p>» удаляется.
 */
export function syncTicketBlock(
  content: string | null | undefined,
  ticketUrl: string | null | undefined,
  isPushkin: boolean,
): string {
  const html = content ?? '';
  const withoutBlocks = html.replace(TICKET_BLOCK, '').trimStart();

  if (!ticketUrl) return withoutBlocks;
  const block = blockHtml(ticketUrl, isPushkin);
  return withoutBlocks ? `${block}${withoutBlocks}` : block;
}

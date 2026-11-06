import { syncTicketBlock } from './event-ticket-block.utils';

const BLOCK = 'https://nsk.kassir.ru/obrazovanie/test';

describe('syncTicketBlock', () => {
  it('добавляет блок «Купить билет» в начало описания', () => {
    const result = syncTicketBlock('<p>Описание</p>', BLOCK, false);
    expect(result).toBe(
      `<p>На это событие можно <a target="_blank" rel="noopener noreferrer nofollow" href="${BLOCK}">купить билет</a>.</p><p>Описание</p>`,
    );
  });

  it('дописывает «по Пушкинской карте» для события по карте', () => {
    const result = syncTicketBlock('<p>Описание</p>', BLOCK, true);
    expect(result).toContain('купить билет</a> по Пушкинской карте.</p>');
  });

  it('заменяет существующий блок, а не дублирует его', () => {
    const old = '<p>На это событие можно <a href="https://old.example">купить билет</a> по Пушкинской карте.</p><p>Текст</p>';
    const result = syncTicketBlock(old, BLOCK, true);
    expect(result.match(/На это событие/g)).toHaveLength(1);
    expect(result).toContain(`href="${BLOCK}"`);
    expect(result).toContain('<p>Текст</p>');
  });

  it('без ссылки убирает ручной блок', () => {
    expect(syncTicketBlock('<p>На это событие можно <a href="https://x.example">купить билет</a>.</p><p>Текст</p>', null, false))
      .toBe('<p>Текст</p>');

    // Оформленный иначе текст («можно <a>купить</a> билет») не трогаем — это уже авторский текст
    const custom = '<p>На это событие можно <a href="https://x.example">купить</a> билет.</p>';
    expect(syncTicketBlock(custom, null, false)).toBe(custom);
  });

  it('без описания оставляет только блок', () => {
    expect(syncTicketBlock('', BLOCK, false)).toContain(`href="${BLOCK}"`);
  });
});

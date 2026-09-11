import { decodeHtmlEntities } from './decode-html-entities.utils';

describe('decodeHtmlEntities', () => {
  it('декодирует базовые HTML-сущности', () => {
    expect(decodeHtmlEntities('&quot;Классики&quot;')).toBe('"Классики"');
    expect(decodeHtmlEntities('A &amp; B')).toBe('A & B');
    expect(decodeHtmlEntities('77.563&lt;br&gt;W260')).toBe('77.563<br>W260');
    expect(decodeHtmlEntities('It&apos;s &#39;fine&#39;')).toBe("It's 'fine'");
    expect(decodeHtmlEntities('a&nbsp;b')).toBe('a b');
  });

  it('не трогает обычный текст без сущностей', () => {
    expect(decodeHtmlEntities('Обычное описание игры')).toBe(
      'Обычное описание игры',
    );
  });

  it('возвращает пустую строку для null/undefined/пустой строки', () => {
    expect(decodeHtmlEntities(null)).toBe('');
    expect(decodeHtmlEntities(undefined)).toBe('');
    expect(decodeHtmlEntities('')).toBe('');
  });
});

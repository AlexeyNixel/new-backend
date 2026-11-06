import { BadRequestException } from '@nestjs/common';
import { normalizeTicketUrl } from './event-ticket-url.utils';

describe('normalizeTicketUrl', () => {
  it('пропускает http и https', () => {
    expect(normalizeTicketUrl('https://kassir.ru/event/1')).toBe(
      'https://kassir.ru/event/1',
    );
    expect(normalizeTicketUrl('http://culture.ru/a')).toBe('http://culture.ru/a');
  });

  it('пустую строку и null превращает в null', () => {
    expect(normalizeTicketUrl('')).toBeNull();
    expect(normalizeTicketUrl('   ')).toBeNull();
    expect(normalizeTicketUrl(null)).toBeNull();
  });

  it('undefined оставляет undefined (поле не меняется)', () => {
    expect(normalizeTicketUrl(undefined)).toBeUndefined();
  });

  it('отклоняет другие схемы и мусор', () => {
    expect(() => normalizeTicketUrl('javascript:alert(1)')).toThrow(
      BadRequestException,
    );
    expect(() => normalizeTicketUrl('kassir.ru/event')).toThrow(
      BadRequestException,
    );
    expect(() => normalizeTicketUrl(123 as unknown)).toThrow(
      BadRequestException,
    );
  });
});

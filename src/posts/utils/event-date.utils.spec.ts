import { normalizeEventDate } from './event-date.utils';

describe('normalizeEventDate', () => {
  it('дата → полночь UTC', () => {
    expect(normalizeEventDate('2026-10-25')).toEqual(
      new Date('2026-10-25T00:00:00.000Z'),
    );
    // полный ISO тоже принимаем — берём только дату
    expect(normalizeEventDate('2026-10-25T18:30:00.000Z')).toEqual(
      new Date('2026-10-25T00:00:00.000Z'),
    );
  });

  it('пусто / null — убрать дату, undefined — не трогать', () => {
    expect(normalizeEventDate('')).toBeNull();
    expect(normalizeEventDate(null)).toBeNull();
    expect(normalizeEventDate(undefined)).toBeUndefined();
  });

  it('мусор — ошибка', () => {
    expect(() => normalizeEventDate('завтра')).toThrow();
  });
});

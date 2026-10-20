import { publishedByNow } from './published.utils';

describe('publishedByNow', () => {
  it('отбирает новости с датой публикации не позже переданного момента', () => {
    const now = new Date('2026-10-20T09:00:00.000Z');
    expect(publishedByNow(now)).toEqual({ publishedAt: { lte: now } });
  });

  it('по умолчанию берёт текущее время', () => {
    const before = Date.now();
    const { publishedAt } = publishedByNow() as { publishedAt: { lte: Date } };
    expect(publishedAt.lte.getTime()).toBeGreaterThanOrEqual(before);
    expect(publishedAt.lte.getTime()).toBeLessThanOrEqual(Date.now());
  });
});

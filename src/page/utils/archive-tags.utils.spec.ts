import {
  getArchiveTagIds,
  stripArchiveTagItems,
  toArchiveItem,
} from './archive-tags.utils';

describe('archive-tags.utils', () => {
  it('getArchiveTagIds: только у архива, без пустых и повторов', () => {
    expect(
      getArchiveTagIds({
        type: 'archive',
        title: '',
        items: [],
        tagIds: ['a', '', 'b', 'a'],
      }),
    ).toEqual(['a', 'b']);
    expect(getArchiveTagIds({ type: 'tags', tagIds: ['a'] })).toEqual([]);
    expect(getArchiveTagIds({ type: 'archive', items: [] })).toEqual([]);
    expect(getArchiveTagIds(null)).toEqual([]);
  });

  it('stripArchiveTagItems: убирает tagItems только у архивов', () => {
    const blocks = [
      { type: 'archive', title: 'А', items: [], tagIds: ['a'], tagItems: [{}] },
      { type: 'tags', items: [], tagItems: 'не трогаем' },
    ];
    expect(stripArchiveTagItems(blocks)).toEqual([
      { type: 'archive', title: 'А', items: [], tagIds: ['a'] },
      { type: 'tags', items: [], tagItems: 'не трогаем' },
    ]);
    expect(stripArchiveTagItems(undefined)).toBeUndefined();
  });

  it('toArchiveItem: дата по Новосибирску и ссылка на пост', () => {
    expect(
      toArchiveItem({
        title: 'Концерт',
        slug: 'koncert',
        // 20:00 UTC 31 августа = 03:00 1 сентября в Новосибирске
        publishedAt: new Date('2026-08-31T20:00:00Z'),
      }),
    ).toEqual({ date: '01.09.2026', text: 'Концерт', url: '/post/koncert' });
  });
});

import { ADMIN_ONLY, hasSection } from './sections';

describe('hasSection', () => {
  it('администраторам доступно всё, даже служебное', () => {
    expect(hasSection({ username: 'slip', sections: [] }, 'books')).toBe(true);
    expect(hasSection({ username: 'MGairat', sections: [] }, ADMIN_ONLY)).toBe(
      true,
    );
  });

  it('null — все разделы, кроме служебных', () => {
    expect(hasSection({ username: 'editor', sections: null }, 'posts')).toBe(
      true,
    );
    expect(hasSection({ username: 'editor', sections: null }, ADMIN_ONLY)).toBe(
      false,
    );
  });

  it('библиотекарь видит только выданные разделы', () => {
    const librarian = { username: 'lib', sections: ['books', 'collections'] };
    expect(hasSection(librarian, 'books')).toBe(true);
    expect(hasSection(librarian, 'posts')).toBe(false);
  });

  it('без пользователя — нет доступа', () => {
    expect(hasSection(undefined, 'books')).toBe(false);
  });
});

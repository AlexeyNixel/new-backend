jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

import { LinkCheckService } from './link-check.service';

describe('LinkCheckService: разбор ссылок', () => {
  const service = new LinkCheckService({} as never) as unknown as {
    extractLinks: (html: string) => string[];
    normalize: (raw: string) => string | null;
  };

  it('достаёт href и src из HTML', () => {
    const html =
      '<p><a href="https://example.com/a?x=1&amp;y=2">a</a><img src=\'/dev/images/p.webp\'></p>';

    expect(service.extractLinks(html)).toEqual([
      'https://example.com/a?x=1&y=2',
      '/dev/images/p.webp',
    ]);
  });

  it('делает относительные адреса абсолютными и убирает якорь', () => {
    expect(service.normalize('/page/clubs#top')).toBe(
      'https://infomania.ru/page/clubs',
    );
    expect(service.normalize('//vk.com/nomb')).toBe('https://vk.com/nomb');
  });

  it('пропускает служебные ссылки', () => {
    for (const raw of [
      '#anchor',
      'mailto:a@b.ru',
      'tel:+7383',
      'javascript:void(0)',
      '',
    ]) {
      expect(service.normalize(raw)).toBeNull();
    }
  });
});

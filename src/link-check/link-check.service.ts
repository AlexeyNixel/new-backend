import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma.service';

/** Где найден адрес: страница из sitemap или запись, в тексте которой он стоит */
export interface LinkSource {
  type: string;
  id?: string;
  title: string;
}

export interface BrokenLink {
  url: string;
  /** HTTP-статус; null — сайт не ответил (DNS, таймаут, отказ соединения) */
  status: number | null;
  error?: string;
  /** broken — точно не открывается; warning — сайт не пускает робота (401/403/429), стоит проверить руками */
  severity: 'broken' | 'warning';
  sources: LinkSource[];
}

const SITE_URL = (process.env.SITE_URL || 'https://infomania.ru').replace(
  /\/+$/,
  '',
);
const LIBRARY_ZONE = 'Asia/Novosibirsk';
const CONCURRENCY = 6;
const TIMEOUT_MS = 15_000;
/** Сколько мест-источников хранить на один адрес — остальное только счётчиком */
const MAX_SOURCES = 10;
/** Автопроверка — раз в неделю ночью */
const AUTO_INTERVAL_DAYS = 7;
const AUTO_HOUR = 3;
/** Дольше этого проверка не идёт — значит, её прервал перезапуск */
const STALE_AFTER_MS = 3 * 60 * 60 * 1000;
const USER_AGENT = 'InfomaniaLinkChecker/1.0 (+https://infomania.ru)';

/** Понятные причины для сетевых ошибок Node */
const NETWORK_ERRORS: Record<string, string> = {
  ENOTFOUND: 'Такого домена нет',
  EAI_AGAIN: 'Домен не удалось найти (DNS)',
  ECONNREFUSED: 'Сервер отказал в соединении',
  ECONNRESET: 'Сервер оборвал соединение',
  CERT_HAS_EXPIRED: 'Сертификат сайта просрочен',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'Ошибка сертификата сайта',
  ERR_TLS_CERT_ALTNAME_INVALID: 'Сертификат выдан для другого домена',
};

/** Ответы, по которым сайт явно закрыт от роботов, а не сломан */
const BOT_BLOCK_STATUSES = new Set([401, 403, 429]);

@Injectable()
export class LinkCheckService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LinkCheckService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    // Проверка, прерванная перезапуском сервера, уже не закончится. Берём только
    // давние: локальный бэкенд смотрит в ту же БД и не должен «ронять» идущую на проде
    await this.prismaService.linkCheckReport
      .updateMany({
        where: {
          status: 'RUNNING',
          startedAt: { lt: new Date(Date.now() - STALE_AFTER_MS) },
        },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          error: 'Сервер перезапустился во время проверки',
        },
      })
      .catch(() => undefined);

    // Автопроверка только на проде: локальный бэкенд смотрит в ту же БД
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.LINK_CHECK_AUTO !== 'false'
    ) {
      this.timer = setInterval(() => void this.autoRun(), 60 * 60 * 1000);
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  latest() {
    return this.prismaService.linkCheckReport.findFirst({
      orderBy: { startedAt: 'desc' },
    });
  }

  history() {
    return this.prismaService.linkCheckReport.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        total: true,
        checked: true,
        brokenCount: true,
        error: true,
      },
    });
  }

  /** Запускает проверку в фоне и сразу возвращает отчёт со статусом RUNNING */
  async start() {
    if (this.running) {
      throw new ConflictException('Проверка уже идёт');
    }
    this.running = true;
    const report = await this.prismaService.linkCheckReport
      .create({ data: { status: 'RUNNING' } })
      .catch((error) => {
        this.running = false;
        throw error;
      });

    void this.execute(report.id).finally(() => {
      this.running = false;
    });
    return report;
  }

  private async autoRun() {
    if (this.running) return;
    const now = DateTime.now().setZone(LIBRARY_ZONE);
    if (now.hour !== AUTO_HOUR) return;
    const last = await this.latest();
    if (
      last &&
      now.diff(DateTime.fromJSDate(last.startedAt), 'days').days <
        AUTO_INTERVAL_DAYS - 0.5
    ) {
      return;
    }
    this.logger.log('Плановая проверка ссылок');
    await this.start().catch(() => undefined);
  }

  private async execute(reportId: string) {
    try {
      const targets = await this.collect();
      await this.prismaService.linkCheckReport.update({
        where: { id: reportId },
        data: { total: targets.size },
      });

      const broken: BrokenLink[] = [];
      const urls = [...targets.keys()];
      let checked = 0;

      for (let i = 0; i < urls.length; i += CONCURRENCY) {
        const batch = urls.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map((url) => this.check(url)));
        results.forEach((result, index) => {
          if (!result) return;
          const url = batch[index];
          const sources = targets.get(url)!;
          broken.push({
            url,
            ...result,
            sources: sources.slice(0, MAX_SOURCES),
          });
        });

        checked += batch.length;
        // Прогресс — не чаще раза в ~60 адресов, чтобы не долбить БД
        if (checked % (CONCURRENCY * 10) === 0 || checked === urls.length) {
          await this.prismaService.linkCheckReport.update({
            where: { id: reportId },
            data: {
              checked,
              brokenCount: broken.filter((b) => b.severity === 'broken').length,
            },
          });
        }
      }

      broken.sort((a, b) =>
        a.severity === b.severity
          ? a.url.localeCompare(b.url)
          : a.severity === 'broken'
            ? -1
            : 1,
      );
      await this.prismaService.linkCheckReport.update({
        where: { id: reportId },
        data: {
          status: 'DONE',
          finishedAt: new Date(),
          checked,
          brokenCount: broken.filter((b) => b.severity === 'broken').length,
          results: broken as never,
        },
      });
      this.logger.log(
        `Проверка ссылок завершена: ${checked} адресов, проблем ${broken.length}`,
      );
    } catch (error) {
      this.logger.error('Проверка ссылок упала', error as Error);
      await this.prismaService.linkCheckReport
        .update({
          where: { id: reportId },
          data: {
            status: 'FAILED',
            finishedAt: new Date(),
            error: String((error as Error)?.message ?? error),
          },
        })
        .catch(() => undefined);
    }
  }

  /** null — адрес в порядке */
  private async check(
    url: string,
  ): Promise<Omit<BrokenLink, 'url' | 'sources'> | null> {
    const request = (method: 'HEAD' | 'GET') =>
      fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'user-agent': USER_AGENT, accept: '*/*' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

    try {
      let response = await request('HEAD');
      // Не все серверы умеют HEAD — переспрашиваем обычным GET
      if (response.status >= 400) {
        response = await request('GET');
        void response.body?.cancel().catch(() => undefined);
      }
      if (response.status < 400) return null;
      return {
        status: response.status,
        severity: BOT_BLOCK_STATUSES.has(response.status)
          ? 'warning'
          : 'broken',
      };
    } catch (error) {
      const cause = (error as { cause?: { code?: string } })?.cause?.code;
      const name = (error as Error)?.name;
      return {
        status: null,
        severity: 'broken',
        error:
          name === 'TimeoutError'
            ? 'Сайт не ответил за 15 секунд'
            : (cause && NETWORK_ERRORS[cause]) ||
              cause ||
              (error as Error)?.message ||
              'Ошибка соединения',
      };
    }
  }

  /** Собирает адреса: все страницы из sitemap и все ссылки/картинки из текстов */
  private async collect() {
    const targets = new Map<string, LinkSource[]>();
    const add = (raw: string | null | undefined, source: LinkSource) => {
      const url = this.normalize(raw);
      if (!url) return;
      const sources = targets.get(url) ?? [];
      if (sources.length < MAX_SOURCES) sources.push(source);
      targets.set(url, sources);
    };

    for (const loc of await this.sitemapUrls()) {
      add(loc, { type: 'Sitemap', title: loc.replace(SITE_URL, '') || '/' });
    }

    const p = this.prismaService;
    const fromHtml = (
      type: string,
      id: string,
      title: string | null,
      ...html: Array<string | null | undefined>
    ) => {
      for (const url of html.flatMap((chunk) => this.extractLinks(chunk))) {
        add(url, { type, id, title: title || 'Без названия' });
      }
    };

    const [
      posts,
      pages,
      events,
      books,
      comics,
      games,
      mapPoints,
      navItems,
      slides,
      shortLinks,
    ] = await Promise.all([
      p.post.findMany({
        where: { isDeleted: false, isPublished: true },
        select: { id: true, title: true, content: true, description: true },
      }),
      p.page.findMany({ select: { id: true, title: true, content: true } }),
      p.event.findMany({
        where: { isDeleted: false },
        select: { id: true, title: true, content: true },
      }),
      p.book.findMany({
        select: { id: true, title: true, content: true, description: true },
      }),
      p.comic.findMany({
        select: { id: true, title: true, content: true, description: true },
      }),
      p.game.findMany({ select: { id: true, title: true, description: true } }),
      p.mapPoint.findMany({
        where: { isDeleted: false },
        select: { id: true, title: true, content: true },
      }),
      p.navigationItem.findMany({
        select: { id: true, title: true, to: true },
      }),
      p.mainSliderSlide.findMany({
        where: { isDeleted: false },
        select: { id: true, url: true, post: { select: { title: true } } },
      }),
      p.shortLink.findMany({
        where: { isDeleted: false },
        select: { id: true, title: true, slug: true, url: true },
      }),
    ]);

    posts.forEach((x) =>
      fromHtml('Post', x.id, x.title, x.content, x.description),
    );
    pages.forEach((x) => fromHtml('Page', x.id, x.title, x.content));
    events.forEach((x) => fromHtml('Event', x.id, x.title, x.content));
    books.forEach((x) =>
      fromHtml('Book', x.id, x.title, x.content, x.description),
    );
    comics.forEach((x) =>
      fromHtml('Comic', x.id, x.title, x.content, x.description),
    );
    games.forEach((x) => fromHtml('Game', x.id, x.title, x.description));
    mapPoints.forEach((x) => fromHtml('MapPoint', x.id, x.title, x.content));
    navItems.forEach((x) =>
      add(x.to, { type: 'NavigationItem', id: x.id, title: x.title }),
    );
    slides.forEach((x) =>
      add(x.url, {
        type: 'MainSliderSlide',
        id: x.id,
        title: x.post?.title ?? 'Слайд',
      }),
    );
    shortLinks.forEach((x) =>
      add(x.url, {
        type: 'ShortLink',
        id: x.id,
        title: x.title || `/go/${x.slug}`,
      }),
    );

    return targets;
  }

  private async sitemapUrls(): Promise<string[]> {
    const fetchLocs = async (url: string) => {
      const xml = await fetch(url, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(60_000),
      }).then((r) => (r.ok ? r.text() : ''));
      return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) =>
        this.decode(m[1]),
      );
    };

    const locs = await fetchLocs(`${SITE_URL}/sitemap.xml`);
    // Индекс sitemap ссылается на вложенные *.xml
    const nested = locs.filter((loc) => /\.xml(\?|$)/.test(loc));
    if (!nested.length) return locs;
    const pages = await Promise.all(
      nested.map((loc) => fetchLocs(loc).catch(() => [])),
    );
    return [...locs.filter((loc) => !nested.includes(loc)), ...pages.flat()];
  }

  private extractLinks(html: string | null | undefined): string[] {
    if (!html) return [];
    return [...html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)].map(
      (m) => this.decode(m[1]),
    );
  }

  /** Приводит адрес к абсолютному http(s); служебные ссылки (mailto, якоря) — null */
  private normalize(raw: string | null | undefined): string | null {
    const value = raw?.trim();
    if (
      !value ||
      value.startsWith('#') ||
      /^(mailto|tel|javascript|data|blob):/i.test(value)
    )
      return null;
    try {
      const url = new URL(
        value.startsWith('//') ? `https:${value}` : value,
        `${SITE_URL}/`,
      );
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      url.hash = '';
      return url.toString();
    } catch {
      return null;
    }
  }

  private decode(value: string) {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
}

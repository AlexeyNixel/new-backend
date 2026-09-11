# Модель и админка игр — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить Prisma-вьюхи `games`/`genres` (читающие внешнюю БД `nomb_games`) на настоящую модель в основной БД, перенести все данные (594 игры из `g_data` + 74 уникальных из `gl_list`), добавить админку (CRUD), поиск по серии, глубокую фильтрацию и до 3 изображений + 1 видео на игру.

**Architecture:** Пять новых Prisma-моделей (`Game`, `GameImage`, `GameGenre`, `GenresOnGames`, `GameSeries`) в основной БД, с FULLTEXT-поиском (как у постов). Одноразовая идемпотентная миграция данных читает `nomb_games` кросс-database SQL через тот же коннекшн Prisma (без нового TypeORM-датасорса), скачивает обложки/PDF со старого сервера и заливает их через существующий `FilesService` (переиспользует пайплайн ресайза/webp/дедупликации). Публичный API — чтение с фильтрами; админские роуты — под `JwtAuthGuard`, зеркалят паттерн `posts`/`book`.

**Tech Stack:** NestJS 11, Prisma 6 (MySQL/MariaDB), Jest, встроенный `fetch` (Node 22) для скачивания файлов со старого сервера.

**Spec:** `docs/superpowers/specs/2026-09-11-games-admin-design.md`

## Global Constraints

- Комментарии и коммит-сообщения — на русском (CLAUDE.md).
- `@typescript-eslint/no-explicit-any` отключён, `no-floating-promises` — warning (CLAUDE.md); тем не менее новый код должен проходить `npx eslint` без **новых** ошибок сверх уже существующих в затронутых файлах.
- Каждая правка проверяется `npx tsc --noEmit` и `npm run build` перед коммитом.
- Slug — через существующий `createSlug` (`src/common/utils/slugify.utils.ts`).
- id — через существующий `parseSlug` (`src/common/utils/validate.utils.ts`) для поддержки uuid-или-slug в `:id`/`:slug` роутах.
- Миграция должна быть идемпотентной: пропуск уже перенесённых по `externalId`, ошибка одной строки не должна прерывать остальные (см. память проекта `migration-logic-duplicated` — три однотипных бага уже находили и чинили в `files`/`posts`/`main-slider`).
- Перед реальным запуском `GET /games/migrate` на боевых данных — прогнать логику в Prisma-транзакции с принудительным откатом (как делалось для постов/файлов), чтобы доказать корректность без побочных эффектов.

---

## Справочные данные (для исполнителя, не нужно перепроверять)

Источник — БД `nomb_games` на том же MySQL-сервере, что и основная (`DATABASE_URL`), тот же пользователь имеет доступ (кросс-database запросы подтверждены).

**Таблица `nomb_games.g_data`** (594 строки, PK `g_id` varchar(20)):
`g_id, g_name, g_p_min, g_p_max, g_age, g_desc, g_content, g_cover, g_rules_file, g_tags, g_duration, g_year`

**Таблица `nomb_games.g_service`** (594 строки, PK `id` = `g_data.g_id`):
`id, g_status, g_place, g_comment`

**Таблица `nomb_games.g_status`** (6 строк): `status` (int, PK), `status_desc` — маппинг: `-4`→«Пришла в негодность», `-3`→«Утеряна», `-2`→«Списана», `-1`→«Временно недоступна», `0`→«В фонде», `1`→«На руках».

**Таблица `nomb_games.g_genre`** (29 строк): `tag` (varchar(20), PK), `desc` (varchar(32)).

**Таблица `nomb_games.gl_list`** (232 строки, PK `id` int): `id, title, description, img, category, count_gamers, gametime, age, create_year, date_include, pdf_file, place1, place2`. Проверено: `img`/`pdf_file` всегда `NULL`/пустые во всех 232 строках — медиа мигрировать неоткуда.

Обложки: `http://infomania.ru/gamelibrary/img/game-cover/<g_cover>` (200 OK, подтверждено).
Правила: `http://infomania.ru/gamelibrary/files/rules/<g_rules_file>` (200 OK, подтверждено, есть у 485/594).

---

### Task 1: Утилита декодирования HTML-сущностей

**Files:**
- Create: `src/common/utils/decode-html-entities.utils.ts`
- Test: `src/common/utils/decode-html-entities.utils.spec.ts`

**Interfaces:**
- Produces: `decodeHtmlEntities(text: string | null | undefined): string`

- [ ] **Step 1: Написать падающий тест**

```ts
// src/common/utils/decode-html-entities.utils.spec.ts
import { decodeHtmlEntities } from './decode-html-entities.utils';

describe('decodeHtmlEntities', () => {
  it('декодирует базовые HTML-сущности', () => {
    expect(decodeHtmlEntities('&quot;Классики&quot;')).toBe('"Классики"');
    expect(decodeHtmlEntities('A &amp; B')).toBe('A & B');
    expect(decodeHtmlEntities('77.563&lt;br&gt;W260')).toBe('77.563<br>W260');
    expect(decodeHtmlEntities('It&apos;s &#39;fine&#39;')).toBe(
      "It's 'fine'",
    );
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
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx jest src/common/utils/decode-html-entities.utils.spec.ts`
Expected: FAIL — `Cannot find module './decode-html-entities.utils'`

- [ ] **Step 3: Реализовать**

```ts
// src/common/utils/decode-html-entities.utils.ts

/**
 * Декодирует HTML-сущности в тексте старой БД (описания игр и т.п.).
 * Набор сущностей — тот же, что раньше чистился на клиенте во фронтенде
 * (useStringCleaner.removeHtmlEntities), перенесено на сервер, чтобы
 * фронт получал уже чистый текст.
 */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) {
    return '';
  }

  return text
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `npx jest src/common/utils/decode-html-entities.utils.spec.ts`
Expected: PASS (5 тестов)

- [ ] **Step 5: Коммит**

```bash
git add src/common/utils/decode-html-entities.utils.ts src/common/utils/decode-html-entities.utils.spec.ts
git commit -m "Утилита decodeHtmlEntities для очистки текста старой БД"
```

---

### Task 2: Утилиты парсинга числовых полей игр

**Files:**
- Create: `src/games/utils/parse-game-fields.utils.ts`
- Test: `src/games/utils/parse-game-fields.utils.spec.ts`

**Interfaces:**
- Produces:
  - `parseDuration(text: string | null | undefined): { min: number | null; max: number | null }`
  - `parseYear(text: string | null | undefined): number | null`
  - `parsePlayerRange(text: string | null | undefined): { min: number | null; max: number | null }`
  - `parseAgeWithPlus(text: string | null | undefined): number | null`

- [ ] **Step 1: Написать падающий тест**

```ts
// src/games/utils/parse-game-fields.utils.spec.ts
import {
  parseAgeWithPlus,
  parseDuration,
  parsePlayerRange,
  parseYear,
} from './parse-game-fields.utils';

describe('parseDuration', () => {
  it('парсит диапазон "15-60 минут"', () => {
    expect(parseDuration('15-60 минут')).toEqual({ min: 15, max: 60 });
  });

  it('парсит "20+ минут" как открытый диапазон', () => {
    expect(parseDuration('20+ минут')).toEqual({ min: 20, max: null });
  });

  it('парсит одно число "45 минут" как min=max', () => {
    expect(parseDuration('45 минут')).toEqual({ min: 45, max: 45 });
  });

  it('возвращает null/null для пустого значения', () => {
    expect(parseDuration(null)).toEqual({ min: null, max: null });
    expect(parseDuration('')).toEqual({ min: null, max: null });
    expect(parseDuration(undefined)).toEqual({ min: null, max: null });
  });

  it('парсит большие диапазоны "240-480 минут"', () => {
    expect(parseDuration('240-480 минут')).toEqual({ min: 240, max: 480 });
  });
});

describe('parseYear', () => {
  it('парсит 4-значный год', () => {
    expect(parseYear('2021')).toBe(2021);
    expect(parseYear(' 2025 ')).toBe(2025);
  });

  it('возвращает null для "-", пустой строки, мусора и null', () => {
    expect(parseYear('-')).toBeNull();
    expect(parseYear('')).toBeNull();
    expect(parseYear(null)).toBeNull();
    expect(parseYear('abc')).toBeNull();
  });
});

describe('parsePlayerRange', () => {
  it('парсит диапазон "3-9"', () => {
    expect(parsePlayerRange('3-9')).toEqual({ min: 3, max: 9 });
  });

  it('парсит одно число "4" как min=max', () => {
    expect(parsePlayerRange('4')).toEqual({ min: 4, max: 4 });
  });

  it('возвращает null/null для пустого значения', () => {
    expect(parsePlayerRange(null)).toEqual({ min: null, max: null });
    expect(parsePlayerRange('')).toEqual({ min: null, max: null });
  });
});

describe('parseAgeWithPlus', () => {
  it('парсит "12+" как 12', () => {
    expect(parseAgeWithPlus('12+')).toBe(12);
  });

  it('парсит "0" как 0', () => {
    expect(parseAgeWithPlus('0')).toBe(0);
  });

  it('возвращает null для пустого значения', () => {
    expect(parseAgeWithPlus(null)).toBeNull();
    expect(parseAgeWithPlus('')).toBeNull();
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx jest src/games/utils/parse-game-fields.utils.spec.ts`
Expected: FAIL — `Cannot find module './parse-game-fields.utils'`

- [ ] **Step 3: Реализовать**

```ts
// src/games/utils/parse-game-fields.utils.ts

/**
 * Старая БД хранит длительность партии свободным текстом
 * («20+ минут», «15-60 минут», «45 минут»). Разбираем в минуты.
 */
export function parseDuration(
  text: string | null | undefined,
): { min: number | null; max: number | null } {
  if (!text) {
    return { min: null, max: null };
  }

  const range = text.match(/(\d+)\s*-\s*(\d+)/);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }

  const plus = text.match(/(\d+)\s*\+/);
  if (plus) {
    return { min: Number(plus[1]), max: null };
  }

  const single = text.match(/(\d+)/);
  if (single) {
    return { min: Number(single[1]), max: Number(single[1]) };
  }

  return { min: null, max: null };
}

/** "2021" -> 2021; "-", "", мусор -> null. */
export function parseYear(text: string | null | undefined): number | null {
  if (!text) {
    return null;
  }

  const match = text.match(/^\s*(\d{4})\s*$/);
  return match ? Number(match[1]) : null;
}

/** gl_list.count_gamers: "3-9" -> {min:3,max:9}, "4" -> {min:4,max:4}. */
export function parsePlayerRange(
  text: string | null | undefined,
): { min: number | null; max: number | null } {
  if (!text) {
    return { min: null, max: null };
  }

  const range = text.match(/(\d+)\s*-\s*(\d+)/);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }

  const single = text.match(/(\d+)/);
  if (single) {
    return { min: Number(single[1]), max: Number(single[1]) };
  }

  return { min: null, max: null };
}

/** gl_list.age: "12+" -> 12. */
export function parseAgeWithPlus(
  text: string | null | undefined,
): number | null {
  if (!text) {
    return null;
  }

  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `npx jest src/games/utils/parse-game-fields.utils.spec.ts`
Expected: PASS (13 тестов)

- [ ] **Step 5: Коммит**

```bash
git add src/games/utils/parse-game-fields.utils.ts src/games/utils/parse-game-fields.utils.spec.ts
git commit -m "Утилиты парсинга длительности/года/кол-ва игроков из старой БД"
```

---

### Task 3: Утилиты маппинга статуса и определения базового названия серии

**Files:**
- Create: `src/games/utils/map-game-status.utils.ts`
- Create: `src/games/utils/extract-series-base-title.utils.ts`
- Test: `src/games/utils/map-game-status.utils.spec.ts`
- Test: `src/games/utils/extract-series-base-title.utils.spec.ts`

**Interfaces:**
- Produces:
  - `type GameStatusValue = 'IN_STOCK' | 'ON_HANDS' | 'TEMPORARILY_UNAVAILABLE' | 'WRITTEN_OFF' | 'LOST' | 'DAMAGED'`
  - `mapGameStatus(status: number | null | undefined): GameStatusValue`
  - `extractSeriesBaseTitle(title: string): string | null`

Примечание: `GameStatusValue` — обычный строковый union, а не импорт enum из
`generated/prisma` — в generated-клиенте Prisma enum компилируется в такой же
строковый union рантайм-значений, так что литералы структурно совместимы с
`Prisma.GameCreateInput['status']` без импорта (который к тому же не резолвится
в jest, см. `src/auth/auth.service.spec.ts` для прецедента с этой проблемой).

- [ ] **Step 1: Написать падающие тесты**

```ts
// src/games/utils/map-game-status.utils.spec.ts
import { mapGameStatus } from './map-game-status.utils';

describe('mapGameStatus', () => {
  it('маппит коды статуса из g_status', () => {
    expect(mapGameStatus(0)).toBe('IN_STOCK');
    expect(mapGameStatus(1)).toBe('ON_HANDS');
    expect(mapGameStatus(-1)).toBe('TEMPORARILY_UNAVAILABLE');
    expect(mapGameStatus(-2)).toBe('WRITTEN_OFF');
    expect(mapGameStatus(-3)).toBe('LOST');
    expect(mapGameStatus(-4)).toBe('DAMAGED');
  });

  it('возвращает IN_STOCK для неизвестного/пустого значения', () => {
    expect(mapGameStatus(999)).toBe('IN_STOCK');
    expect(mapGameStatus(null)).toBe('IN_STOCK');
    expect(mapGameStatus(undefined)).toBe('IN_STOCK');
  });
});
```

```ts
// src/games/utils/extract-series-base-title.utils.spec.ts
import { extractSeriesBaseTitle } from './extract-series-base-title.utils';

describe('extractSeriesBaseTitle', () => {
  it('берёт часть названия до двоеточия', () => {
    expect(extractSeriesBaseTitle('Дюна: Приключения в Империи')).toBe(
      'Дюна',
    );
    expect(
      extractSeriesBaseTitle(
        'Warhammer Fantasy Roleplay: Книга правил',
      ),
    ).toBe('Warhammer Fantasy Roleplay');
  });

  it('возвращает null, если двоеточия нет', () => {
    expect(extractSeriesBaseTitle('Классики')).toBeNull();
  });

  it('возвращает null, если база короче 2 символов', () => {
    expect(extractSeriesBaseTitle(': пустая база')).toBeNull();
    expect(extractSeriesBaseTitle('A: b')).toBeNull();
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx jest src/games/utils/map-game-status.utils.spec.ts src/games/utils/extract-series-base-title.utils.spec.ts`
Expected: FAIL — модули не найдены

- [ ] **Step 3: Реализовать**

```ts
// src/games/utils/map-game-status.utils.ts
export type GameStatusValue =
  | 'IN_STOCK'
  | 'ON_HANDS'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'WRITTEN_OFF'
  | 'LOST'
  | 'DAMAGED';

const STATUS_BY_OLD_CODE: Record<number, GameStatusValue> = {
  [-4]: 'DAMAGED',
  [-3]: 'LOST',
  [-2]: 'WRITTEN_OFF',
  [-1]: 'TEMPORARILY_UNAVAILABLE',
  0: 'IN_STOCK',
  1: 'ON_HANDS',
};

/** Маппинг числового статуса из nomb_games.g_status в enum GameStatus. */
export function mapGameStatus(
  status: number | null | undefined,
): GameStatusValue {
  if (status == null) {
    return 'IN_STOCK';
  }

  return STATUS_BY_OLD_CODE[status] ?? 'IN_STOCK';
}
```

```ts
// src/games/utils/extract-series-base-title.utils.ts

/**
 * Эвристика для группировки игр в серии при миграции: часть названия до
 * первого двоеточия («Дюна: Приключения в Империи» -> «Дюна»). Не находит
 * серию (null), если двоеточия нет или базовая часть слишком короткая —
 * такие случаи в основном шум (не признак серии).
 */
export function extractSeriesBaseTitle(title: string): string | null {
  const colonIndex = title.indexOf(':');
  if (colonIndex === -1) {
    return null;
  }

  const base = title.slice(0, colonIndex).trim();
  return base.length >= 2 ? base : null;
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx jest src/games/utils/map-game-status.utils.spec.ts src/games/utils/extract-series-base-title.utils.spec.ts`
Expected: PASS (8 тестов)

- [ ] **Step 5: Коммит**

```bash
git add src/games/utils/map-game-status.utils.ts src/games/utils/map-game-status.utils.spec.ts src/games/utils/extract-series-base-title.utils.ts src/games/utils/extract-series-base-title.utils.spec.ts
git commit -m "Утилиты маппинга статуса игры и эвристики определения серии"
```

---

### Task 4: Общая утилита полнотекстового поиска (вынос из posts)

`toBooleanFulltextQuery` уже существует в `src/posts/utils/fulltext-query.ts`
(добавлена при доработке поиска постов) — переносим в `common/utils`, чтобы
переиспользовать для игр без дублирования.

**Files:**
- Create: `src/common/utils/fulltext-query.ts` (копия содержимого из `src/posts/utils/fulltext-query.ts`, без изменений в логике)
- Create: `src/common/utils/fulltext-query.spec.ts` (копия `src/posts/utils/fulltext-query.spec.ts`)
- Delete: `src/posts/utils/fulltext-query.ts`
- Delete: `src/posts/utils/fulltext-query.spec.ts`
- Modify: `src/posts/posts.service.ts` — импорт `toBooleanFulltextQuery`

**Interfaces:**
- Produces: `toBooleanFulltextQuery(search: string | null | undefined): string | null` (сигнатура и поведение не меняются — см. текущий файл)

- [ ] **Step 1: Скопировать файлы**

```bash
git mv src/posts/utils/fulltext-query.ts src/common/utils/fulltext-query.ts
git mv src/posts/utils/fulltext-query.spec.ts src/common/utils/fulltext-query.spec.ts
```

(В скопированном `.spec.ts` путь импорта `from './fulltext-query'` менять не нужно — он относительный и остаётся корректным на новом месте.)

- [ ] **Step 2: Обновить импорт в posts.service.ts**

Найти строку:
```ts
import { toBooleanFulltextQuery } from './utils/fulltext-query';
```
Заменить на:
```ts
import { toBooleanFulltextQuery } from '../common/utils/fulltext-query';
```

- [ ] **Step 3: Проверить, что тесты и сборка не сломались**

Run: `npx jest src/common/utils/fulltext-query.spec.ts`
Expected: PASS (8 тестов, те же, что были)

Run: `npx tsc --noEmit`
Expected: без ошибок

- [ ] **Step 4: Коммит**

```bash
git add -A
git commit -m "Перенести toBooleanFulltextQuery в common/utils для переиспользования играми"
```

---

### Task 5: Prisma-схема — новые модели игр

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: Prisma-модели `Game`, `GameImage`, `GameGenre`, `GenresOnGames`, `GameSeries`, enum `GameStatus`; поля `File.gameImages`, `File.gameRulesFor`.
- Consumes: ничего (следующие задачи — на этой схеме).

- [ ] **Step 1: Удалить старые view-модели**

Удалить из `prisma/schema.prisma` блоки:

```prisma
view games {
  id                String  @unique @db.VarChar(20)
  name              String? @db.VarChar(256)
  player_min        Int?
  player_max        Int?
  player_age        Int?
  short_description String? @db.VarChar(512)
  full_description  String? @db.VarChar(4192)
  cover_file        String? @db.VarChar(32)
  rules_file        String? @db.VarChar(32)
  genres            String? @db.VarChar(128)
  game_duration     String? @db.VarChar(64)
  game_year         String? @db.VarChar(32)
  status            Int?    @default(0)
  place             String? @db.VarChar(512)
  comment           String? @db.VarChar(1024)
  status_desc       String  @db.VarChar(64)
}

view genres {
  tag  String  @default("") @db.VarChar(20)
  desc String? @db.VarChar(32)
}
```

- [ ] **Step 2: Добавить File-релейшны**

В модели `File` (`prisma/schema.prisma`) добавить две строки после `mapPoints MapPoint[]`:

```prisma
  mapPoints      MapPoint[]
  gameImages     GameImage[]
  gameRulesFor   Game[]            @relation("GameRulesFile")
```

- [ ] **Step 3: Добавить новые модели**

Добавить в конец `prisma/schema.prisma` (после последнего enum):

```prisma
enum GameStatus {
  IN_STOCK
  ON_HANDS
  TEMPORARILY_UNAVAILABLE
  WRITTEN_OFF
  LOST
  DAMAGED
}

model Game {
  id               String          @id @default(uuid())
  slug             String          @unique @db.VarChar(300)
  externalId       String?         @unique @db.VarChar(32)
  title            String          @db.VarChar(256)
  shortDescription String?         @db.VarChar(512)
  description      String?         @db.LongText
  playerMin        Int?
  playerMax        Int?
  playerAge        Int?
  durationMin      Int?
  durationMax      Int?
  year             Int?
  status           GameStatus      @default(IN_STOCK)
  place            String?         @db.VarChar(512)
  comment          String?         @db.VarChar(1024)
  isDeleted        Boolean         @default(false)
  videoUrl         String?         @db.VarChar(500)
  seriesId         String?
  series           GameSeries?     @relation(fields: [seriesId], references: [id])
  rulesFileId      String?
  rulesFile        File?           @relation("GameRulesFile", fields: [rulesFileId], references: [id])
  images           GameImage[]
  genres           GenresOnGames[]
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  @@index([seriesId])
  @@index([rulesFileId])
  @@fulltext([title, shortDescription, description])
  @@map("games")
}

model GameImage {
  id      String @id @default(uuid())
  gameId  String
  fileId  String
  order   Int    @default(0)
  game    Game   @relation(fields: [gameId], references: [id], onDelete: Cascade)
  file    File   @relation(fields: [fileId], references: [id])

  @@unique([gameId, fileId])
  @@index([gameId])
  @@index([fileId], map: "game_images_fileId_fkey")
  @@map("game_images")
}

model GameGenre {
  id    String          @id @default(uuid())
  tag   String          @unique @db.VarChar(32)
  title String          @db.VarChar(64)
  games GenresOnGames[]

  @@map("game_genres")
}

model GenresOnGames {
  gameId  String
  genreId String
  game    Game      @relation(fields: [gameId], references: [id])
  genre   GameGenre @relation(fields: [genreId], references: [id])

  @@id([gameId, genreId])
  @@index([genreId], map: "genres_on_games_genreId_fkey")
  @@map("genres_on_games")
}

model GameSeries {
  id          String   @id @default(uuid())
  slug        String   @unique @db.VarChar(300)
  title       String   @db.VarChar(256)
  description String?  @db.VarChar(1024)
  createdAt   DateTime @default(now())
  games       Game[]

  @@map("game_series")
}
```

Обратите внимание: `GameImage.file` — связь без именованного `@relation("...")`
(в отличие от `rulesFile`), потому что это единственная связь `GameImage -> File`;
именованные relation-теги в Prisma нужны только когда между двумя моделями
больше одной связи.

- [ ] **Step 4: Проверить схему**

Run: `npx prisma validate`
Expected: `The schema at prisma\schema.prisma is valid`

- [ ] **Step 5: Коммит**

```bash
git add prisma/schema.prisma
git commit -m "Prisma-схема: модели Game/GameImage/GameGenre/GameSeries вместо вьюх"
```

---

### Task 6: Prisma-миграция

**Files:**
- Create: `prisma/migrations/<timestamp>_games_model/migration.sql` (создаётся командой Prisma, путь получит точный timestamp)
- Delete: `prisma/views/nomb_dev/games.sql`
- Delete: `prisma/views/nomb_dev/genres.sql`

**Interfaces:**
- Consumes: схему из Task 5.
- Produces: применённую к БД `nomb_dev` схему — таблицы `games`, `game_images`, `game_genres`, `genres_on_games`, `game_series`, FULLTEXT-индекс, снятые вьюхи `games`/`genres`.

- [ ] **Step 1: Сгенерировать черновик миграции**

Run: `npx prisma migrate dev --create-only --name games_model --skip-generate`

Это создаст `prisma/migrations/<timestamp>_games_model/migration.sql` с
`DROP VIEW` для `games`/`genres` (Prisma сам увидит, что view-блоки исчезли
из схемы) и `CREATE TABLE` для пяти новых таблиц.

- [ ] **Step 2: Проверить и почистить сгенерированный SQL**

Открыть свежесозданный `migration.sql`. **Важно** (см. прецедент в
миграции `20260903092556_posts_fulltext_search`): в файле может оказаться
посторонний DDL от несвязанного дрейфа схемы (в прошлый раз это была
`navigation_items`/`pages`/`clubs`) — такие строки удалить, в миграции должны
остаться только объекты, относящиеся к играм: `DROP VIEW games`,
`DROP VIEW genres`, `CREATE TABLE games`, `CREATE TABLE game_images`,
`CREATE TABLE game_genres`, `CREATE TABLE genres_on_games`,
`CREATE TABLE game_series`, `CREATE FULLTEXT INDEX` на `games`, внешние ключи.
Если что-то относящееся к другим таблицам всё же затесалось — убрать.

Проверить командой:
Run: `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script`
Expected после применения миграции (Step 3): вывод содержит только
уже известный, не относящийся к играм дрейф (`navigation_items`, `pages`,
`clubs` — существовавший до этой задачи), никаких строк с `game`/`Game`.

- [ ] **Step 3: Применить миграцию**

Run: `npx prisma migrate deploy`
Expected: `All migrations have been successfully applied.`

- [ ] **Step 4: Удалить снимки старых вьюх**

```bash
git rm prisma/views/nomb_dev/games.sql prisma/views/nomb_dev/genres.sql
```

- [ ] **Step 5: Перегенерировать Prisma Client**

Run: `npx prisma generate`

Если команда падает с `EPERM: operation not permitted, rename ... query_engine-windows.dll.node` —
значит `npm run start:dev` держит файл открытым; это некритично для
дальнейших шагов (raw-запросы и типы, которых ещё нет в клиенте, в
последующих тасках не используются до перегенерации) — сделать `prisma generate`
ещё раз после остановки dev-сервера, отметить это в финальном отчёте (Task 12).

- [ ] **Step 6: Коммит**

```bash
git add prisma/migrations prisma/views
git commit -m "Миграция БД: таблицы игр вместо вьюх nomb_games"
```

---

### Task 7: DTO и расширение PaginationQueryDto

**Files:**
- Create: `src/games/dto/create-game.dto.ts`
- Create: `src/games/dto/update-game.dto.ts`
- Modify: `src/common/dto/pagination-query.dto.ts`

**Interfaces:**
- Produces: `CreateGameDto`, `UpdateGameDto`, расширенный `PaginationQueryDto`.

- [ ] **Step 1: Создать CreateGameDto**

```ts
// src/games/dto/create-game.dto.ts
import { GameStatusValue } from '../utils/map-game-status.utils';

export class CreateGameDto {
  title: string;
  slug?: string;
  externalId?: string;
  shortDescription?: string;
  description?: string;
  playerMin?: number;
  playerMax?: number;
  playerAge?: number;
  durationMin?: number;
  durationMax?: number;
  year?: number;
  status?: GameStatusValue;
  place?: string;
  comment?: string;
  videoUrl?: string;
  seriesId?: string;
  rulesFileId?: string;
  imageFileIds?: string[];
  genreIds?: string[];
}
```

- [ ] **Step 2: Создать UpdateGameDto**

```ts
// src/games/dto/update-game.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateGameDto } from './create-game.dto';

export class UpdateGameDto extends PartialType(CreateGameDto) {
  isDeleted?: boolean;
}
```

- [ ] **Step 3: Расширить PaginationQueryDto**

Открыть `src/common/dto/pagination-query.dto.ts`, добавить поля (существующие
не трогать — используются другими модулями):

```ts
export class PaginationQueryDto {
  page?: number = 1;
  limit?: number = 10;
  isDeleted?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' = 'desc';
  search?: string;
  include?: string;
  startDate: string;
  endDate: string;
  department?: string;
  genres?: Array<string>;
  age?: number;
  tags?: string | Array<string>;
  // Фильтры игр (src/games)
  players?: number;
  ageMin?: number;
  ageMax?: number;
  maxDuration?: number;
  yearFrom?: number;
  yearTo?: number;
  seriesId?: string;
  availableOnly?: boolean;
}
```

- [ ] **Step 4: Проверить компиляцию**

Run: `npx tsc --noEmit`
Expected: без ошибок (импорт `GameStatusValue` из Task 3 уже существует)

- [ ] **Step 5: Коммит**

```bash
git add src/games/dto src/common/dto/pagination-query.dto.ts
git commit -m "DTO для создания/обновления игры, фильтры игр в PaginationQueryDto"
```

---

### Task 8: Связка модулей — FilesModule экспортирует FilesService, GamesModule его импортирует

Нужно для переиспользования пайплайна загрузки файлов (ресайз/webp/hash-дедуп)
при миграции обложек/PDF, вместо повторной реализации загрузки в MinIO.

**Files:**
- Modify: `src/files/files.module.ts`
- Modify: `src/games/games.module.ts`

**Interfaces:**
- Consumes: `FilesService.uploadImage(file: Express.Multer.File, options?): Promise<File | undefined>`, `FilesService.uploadDocument(file: Express.Multer.File): Promise<File | undefined>` (оба существуют, см. `src/files/files.service.ts`; оба могут вернуть `undefined`, если внутри поймали ошибку — это существующее поведение, не менять).

- [ ] **Step 1: Экспортировать FilesService**

В `src/files/files.module.ts` добавить `exports`:

```ts
import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { MinioService } from '../common/services/minio.service';
import { ConfigService } from '@nestjs/config';
import { FilesController } from './files.controller';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    ImageProcessingService,
    MinioService,
    ConfigService,
  ],
  exports: [FilesService],
})
export class FilesModule {}
```

- [ ] **Step 2: Импортировать FilesModule в GamesModule**

```ts
// src/games/games.module.ts
import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { ResponseService } from '../common/services/response.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [GamesController],
  providers: [GamesService, ResponseService],
})
export class GamesModule {}
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: без ошибок

- [ ] **Step 4: Коммит**

```bash
git add src/files/files.module.ts src/games/games.module.ts
git commit -m "GamesModule импортирует FilesModule для переиспользования загрузки файлов"
```

---

### Task 9: GamesService — чтение (findAll/findOne/findAllGenres/findAllSeries)

**Files:**
- Modify: `src/games/games.service.ts` (полная замена существующего содержимого)
- Modify: `src/games/games.controller.ts`

**Interfaces:**
- Consumes: `toBooleanFulltextQuery` из `../common/utils/fulltext-query` (Task 4), `parseSlug` из `../common/utils/validate.utils` (существует).
- Produces:
  - `GamesService.findAll(query: PaginationQueryDto): Promise<ApiResponse<Game[]>>`
  - `GamesService.findOne(idOrSlug: string): Promise<Game | { message: string }>`
  - `GamesService.findAllGenres(): Promise<GameGenre[]>`
  - `GamesService.findAllSeries(): Promise<GameSeries[]>`
  - (методы `create`/`update`/`migrate` добавляются в Task 10/11 — в этой задаче временно НЕ объявлены, класс компилируется без них)

Общий include, переиспользуемый во всех read-методах:

```ts
const GAME_INCLUDE = {
  images: { orderBy: { order: 'asc' as const }, include: { file: true } },
  genres: { select: { genre: true } },
  series: true,
  rulesFile: true,
};
```

- [ ] **Step 1: Написать GamesService (read-часть)**

```ts
// src/games/games.service.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '../prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';
import { parseSlug } from '../common/utils/validate.utils';
import { toBooleanFulltextQuery } from '../common/utils/fulltext-query';

const GAME_INCLUDE = {
  images: { orderBy: { order: 'asc' as const }, include: { file: true } },
  genres: { select: { genre: true } },
  series: true,
  rulesFile: true,
} satisfies Prisma.GameInclude;

@Injectable()
export class GamesService {
  constructor(
    private prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  async findAll(paginationQuery: PaginationQueryDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'title',
      sortOrder = 'asc',
      search = '',
      genres = [],
      players,
      ageMin,
      ageMax,
      maxDuration,
      yearFrom,
      yearTo,
      seriesId,
      availableOnly,
    } = paginationQuery;

    const skip = (page - 1) * limit;

    let genreIds: string[] = [];
    if (typeof genres === 'string') {
      genreIds = [genres];
    } else if (typeof genres === 'object') {
      genreIds = [...genres];
    }

    const booleanQuery = toBooleanFulltextQuery(search);

    if (booleanQuery) {
      const { ids, total } = await this.searchGameIds({
        booleanQuery,
        genreIds,
        players,
        ageMin,
        ageMax,
        maxDuration,
        yearFrom,
        yearTo,
        seriesId,
        availableOnly,
        skip,
        take: +limit,
      });

      if (ids.length === 0) {
        return this.responseService.paginated([], total, page, limit);
      }

      const rows = await this.prismaService.game.findMany({
        where: { id: { in: ids } },
        include: GAME_INCLUDE,
      });
      const byId = new Map(rows.map((game) => [game.id, game]));
      const games = ids
        .map((id) => byId.get(id))
        .filter((game): game is (typeof rows)[number] => Boolean(game));

      return this.responseService.paginated(games, total, page, limit);
    }

    const where = this.buildWhere({
      genreIds,
      players,
      ageMin,
      ageMax,
      maxDuration,
      yearFrom,
      yearTo,
      seriesId,
      availableOnly,
    });

    const [games, total] = await Promise.all([
      this.prismaService.game.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: +limit,
        include: GAME_INCLUDE,
      }),
      this.prismaService.game.count({ where }),
    ]);

    return this.responseService.paginated(games, total, page, limit);
  }

  async findOne(idOrSlug: string) {
    const game = await this.prismaService.game.findUnique({
      where: { ...parseSlug(idOrSlug) },
      include: GAME_INCLUDE,
    });

    if (!game) {
      return { message: `Игра по slug или id '${idOrSlug}' не найдена` };
    }

    return game;
  }

  findAllGenres() {
    return this.prismaService.gameGenre.findMany({
      orderBy: { title: 'asc' },
    });
  }

  findAllSeries() {
    return this.prismaService.gameSeries.findMany({
      orderBy: { title: 'asc' },
    });
  }

  private buildWhere(filters: {
    genreIds: string[];
    players?: number;
    ageMin?: number;
    ageMax?: number;
    maxDuration?: number;
    yearFrom?: number;
    yearTo?: number;
    seriesId?: string;
    availableOnly?: boolean;
  }): Prisma.GameWhereInput {
    const {
      genreIds,
      players,
      ageMin,
      ageMax,
      maxDuration,
      yearFrom,
      yearTo,
      seriesId,
      availableOnly,
    } = filters;

    return {
      isDeleted: false,
      seriesId: seriesId || undefined,
      playerMin: players !== undefined ? { lte: players } : undefined,
      playerMax: players !== undefined ? { gte: players } : undefined,
      playerAge: {
        gte: ageMin !== undefined ? +ageMin : undefined,
        lte: ageMax !== undefined ? +ageMax : undefined,
      },
      durationMin:
        maxDuration !== undefined ? { lte: +maxDuration } : undefined,
      year: {
        gte: yearFrom !== undefined ? +yearFrom : undefined,
        lte: yearTo !== undefined ? +yearTo : undefined,
      },
      status: availableOnly
        ? { notIn: ['WRITTEN_OFF', 'LOST', 'DAMAGED'] }
        : undefined,
      AND: genreIds.map((genreId) => ({
        genres: { some: { genreId } },
      })),
    };
  }

  private async searchGameIds(params: {
    booleanQuery: string;
    genreIds: string[];
    players?: number;
    ageMin?: number;
    ageMax?: number;
    maxDuration?: number;
    yearFrom?: number;
    yearTo?: number;
    seriesId?: string;
    availableOnly?: boolean;
    skip: number;
    take: number;
  }): Promise<{ ids: string[]; total: number }> {
    const {
      booleanQuery,
      genreIds,
      players,
      ageMin,
      ageMax,
      maxDuration,
      yearFrom,
      yearTo,
      seriesId,
      availableOnly,
      skip,
      take,
    } = params;

    const conditions: string[] = ['g.isDeleted = false'];
    const conditionParams: unknown[] = [];

    if (players !== undefined) {
      conditions.push('g.playerMin <= ? AND g.playerMax >= ?');
      conditionParams.push(+players, +players);
    }
    if (ageMin !== undefined) {
      conditions.push('g.playerAge >= ?');
      conditionParams.push(+ageMin);
    }
    if (ageMax !== undefined) {
      conditions.push('g.playerAge <= ?');
      conditionParams.push(+ageMax);
    }
    if (maxDuration !== undefined) {
      conditions.push('g.durationMin <= ?');
      conditionParams.push(+maxDuration);
    }
    if (yearFrom !== undefined) {
      conditions.push('g.year >= ?');
      conditionParams.push(+yearFrom);
    }
    if (yearTo !== undefined) {
      conditions.push('g.year <= ?');
      conditionParams.push(+yearTo);
    }
    if (seriesId) {
      conditions.push('g.seriesId = ?');
      conditionParams.push(seriesId);
    }
    if (availableOnly) {
      conditions.push(
        "g.status NOT IN ('WRITTEN_OFF', 'LOST', 'DAMAGED')",
      );
    }
    for (const genreId of genreIds) {
      conditions.push(
        'EXISTS (SELECT 1 FROM genres_on_games go WHERE go.gameId = g.id AND go.genreId = ?)',
      );
      conditionParams.push(genreId);
    }

    const whereExtra = ` AND ${conditions.join(' AND ')}`;
    const matchExpr =
      'MATCH(g.title, g.shortDescription, g.description) AGAINST(? IN BOOLEAN MODE)';

    const rows = await this.prismaService.$queryRawUnsafe<
      Array<{ id: string }>
    >(
      `SELECT g.id
         FROM games g
        WHERE ${matchExpr}${whereExtra}
        ORDER BY g.title ASC
        LIMIT ? OFFSET ?`,
      booleanQuery,
      ...conditionParams,
      take,
      skip,
    );

    const countRows = await this.prismaService.$queryRawUnsafe<
      Array<{ total: bigint }>
    >(
      `SELECT COUNT(*) AS total FROM games g WHERE ${matchExpr}${whereExtra}`,
      booleanQuery,
      ...conditionParams,
    );

    return {
      ids: rows.map((row) => row.id),
      total: Number(countRows[0]?.total ?? 0),
    };
  }
}
```

- [ ] **Step 2: Написать контроллер (read-роуты)**

```ts
// src/games/games.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { GamesService } from './games.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('genres')
  findAllGenres() {
    return this.gamesService.findAllGenres();
  }

  @Get('series')
  findAllSeries() {
    return this.gamesService.findAllSeries();
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.gamesService.findAll(paginationQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gamesService.findOne(id);
  }
}
```

Важно: роуты `genres` и `series` объявлены ДО `:id` — иначе Nest примет
`genres`/`series` за значение параметра `:id` (тот же паттерн, что уже
используется в `posts.controller.ts` для `migrate`/`migrate/tag` до `:id`).

- [ ] **Step 3: Проверить сборку**

Run: `npx tsc --noEmit`
Expected: без ошибок (если `generated/prisma` ещё не перегенерирован после
Task 6 Step 5 из-за EPERM — тип `Prisma.GameInclude`/`Prisma.GameWhereInput`
не найдётся; в этом случае временно остановить `npm run start:dev`,
выполнить `npx prisma generate`, затем перезапустить dev-сервер, и повторить
проверку)

Run: `npm run build`
Expected: без ошибок

- [ ] **Step 4: Коммит**

```bash
git add src/games/games.service.ts src/games/games.controller.ts
git commit -m "GamesService/Controller: чтение игр с фильтрами и полнотекстовым поиском"
```

---

### Task 10: GamesService — запись (create/update) и роуты жанров/серий

**Files:**
- Modify: `src/games/games.service.ts`
- Modify: `src/games/games.controller.ts`
- Create: `src/games/dto/create-game-genre.dto.ts`
- Create: `src/games/dto/create-game-series.dto.ts`

**Interfaces:**
- Consumes: `createSlug` из `../common/utils/slugify.utils` (существует), `v4` из `uuid` (используется в проекте повсеместно, например `src/posts/posts.service.ts`).
- Produces:
  - `GamesService.create(dto: CreateGameDto): Promise<Game>`
  - `GamesService.update(id: string, dto: UpdateGameDto): Promise<Game>`
  - `GamesService.createGenre(dto: { tag: string; title: string }): Promise<GameGenre>`
  - `GamesService.updateGenre(id: string, dto: { tag?: string; title?: string }): Promise<GameGenre>`
  - `GamesService.createSeries(dto: { title: string; description?: string }): Promise<GameSeries>`
  - `GamesService.updateSeries(id: string, dto: { title?: string; description?: string }): Promise<GameSeries>`

- [ ] **Step 1: Добавить DTO жанра и серии**

```ts
// src/games/dto/create-game-genre.dto.ts
export class CreateGameGenreDto {
  tag: string;
  title: string;
}
```

```ts
// src/games/dto/create-game-series.dto.ts
export class CreateGameSeriesDto {
  title: string;
  description?: string;
}
```

- [ ] **Step 2: Добавить методы записи в GamesService**

Добавить импорты в начало `src/games/games.service.ts`:

```ts
import { v4 } from 'uuid';
import { createSlug } from '../common/utils/slugify.utils';
```

Добавить в класс `GamesService` (после `findAllSeries`, до `private buildWhere`):

```ts
  async create(dto: CreateGameDto) {
    const { imageFileIds = [], genreIds = [], ...rest } = dto;

    if (imageFileIds.length > 3) {
      throw new BadRequestException('У игры может быть не более 3 изображений');
    }

    const slug = createSlug(dto.title, dto.slug);
    const game = await this.prismaService.game.create({
      data: {
        id: v4(),
        ...rest,
        slug,
      },
    });

    await this.syncImages(game.id, imageFileIds);
    await this.syncGenres(game.id, genreIds);

    return this.findOne(game.id);
  }

  async update(id: string, dto: UpdateGameDto) {
    const { imageFileIds, genreIds, ...rest } = dto;

    if (imageFileIds && imageFileIds.length > 3) {
      throw new BadRequestException('У игры может быть не более 3 изображений');
    }

    if (rest.title && !rest.slug) {
      rest.slug = createSlug(rest.title);
    }

    await this.prismaService.game.update({
      where: { id },
      data: { ...rest },
    });

    if (imageFileIds) {
      await this.syncImages(id, imageFileIds);
    }
    if (genreIds) {
      await this.syncGenres(id, genreIds);
    }

    return this.findOne(id);
  }

  createGenre(dto: CreateGameGenreDto) {
    return this.prismaService.gameGenre.create({
      data: { id: v4(), ...dto },
    });
  }

  updateGenre(id: string, dto: Partial<CreateGameGenreDto>) {
    return this.prismaService.gameGenre.update({
      where: { id },
      data: dto,
    });
  }

  createSeries(dto: CreateGameSeriesDto) {
    return this.prismaService.gameSeries.create({
      data: { id: v4(), slug: createSlug(dto.title), ...dto },
    });
  }

  updateSeries(id: string, dto: Partial<CreateGameSeriesDto>) {
    return this.prismaService.gameSeries.update({
      where: { id },
      data: dto,
    });
  }

  private async syncImages(gameId: string, fileIds: string[]) {
    await this.prismaService.gameImage.deleteMany({ where: { gameId } });

    for (let order = 0; order < fileIds.length; order++) {
      await this.prismaService.gameImage.create({
        data: { id: v4(), gameId, fileId: fileIds[order], order },
      });
    }
  }

  private async syncGenres(gameId: string, genreIds: string[]) {
    await this.prismaService.genresOnGames.deleteMany({ where: { gameId } });

    for (const genreId of genreIds) {
      await this.prismaService.genresOnGames.create({
        data: { gameId, genreId },
      });
    }
  }
```

Добавить импорт `BadRequestException` и DTO в шапку файла:

```ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { CreateGameGenreDto } from './dto/create-game-genre.dto';
import { CreateGameSeriesDto } from './dto/create-game-series.dto';
```

- [ ] **Step 3: Добавить admin-роуты в контроллер**

```ts
// src/games/games.controller.ts — добавить импорты и роуты
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { CreateGameGenreDto } from './dto/create-game-genre.dto';
import { CreateGameSeriesDto } from './dto/create-game-series.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('genres')
  findAllGenres() {
    return this.gamesService.findAllGenres();
  }

  @UseGuards(JwtAuthGuard)
  @Post('genres')
  createGenre(@Body() dto: CreateGameGenreDto) {
    return this.gamesService.createGenre(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('genres/:id')
  updateGenre(@Param('id') id: string, @Body() dto: Partial<CreateGameGenreDto>) {
    return this.gamesService.updateGenre(id, dto);
  }

  @Get('series')
  findAllSeries() {
    return this.gamesService.findAllSeries();
  }

  @UseGuards(JwtAuthGuard)
  @Post('series')
  createSeries(@Body() dto: CreateGameSeriesDto) {
    return this.gamesService.createSeries(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('series/:id')
  updateSeries(@Param('id') id: string, @Body() dto: Partial<CreateGameSeriesDto>) {
    return this.gamesService.updateSeries(id, dto);
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.gamesService.findAll(paginationQuery);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateGameDto) {
    return this.gamesService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gamesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGameDto) {
    return this.gamesService.update(id, dto);
  }
}
```

- [ ] **Step 4: Проверить сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок

- [ ] **Step 5: Ручная проверка на dev-сервере**

С валидным JWT (см. пример получения токена в
`reports/2026-09-10-1200-auth-me-logout-endpoints.md` или через `POST /auth/login`):

```bash
curl -s -X POST http://localhost:3300/api/games \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Тестовая игра","playerMin":2,"playerMax":4}'
```

Expected: `200`/`201` и JSON с созданной игрой, `images: []`, `genres: []`.

- [ ] **Step 6: Коммит**

```bash
git add src/games
git commit -m "GamesService/Controller: создание и обновление игр, CRUD жанров и серий"
```

---

### Task 11: Миграция данных `migrate()`

**Files:**
- Modify: `src/games/games.service.ts`
- Modify: `src/games/games.controller.ts`

**Interfaces:**
- Consumes: `decodeHtmlEntities` (Task 1), `parseDuration`/`parseYear`/`parsePlayerRange`/`parseAgeWithPlus` (Task 2), `mapGameStatus` (Task 3), `extractSeriesBaseTitle` (Task 3), `FilesService.uploadImage`/`uploadDocument` (существуют, доступны через DI после Task 8).
- Produces: `GamesService.migrate(): Promise<{ total, migrated, skipped, failed, errors, seriesCreated }>`, роут `GET /games/migrate`.

- [ ] **Step 1: Добавить FilesService в конструктор**

```ts
// src/games/games.service.ts
import { FilesService } from '../files/files.service';

@Injectable()
export class GamesService {
  constructor(
    private prismaService: PrismaService,
    private responseService: ResponseService,
    private filesService: FilesService,
  ) {}
```

- [ ] **Step 2: Реализовать migrate()**

Добавить в конец класса `GamesService`:

```ts
  private static readonly COVER_BASE_URL =
    'http://infomania.ru/gamelibrary/img/game-cover/';
  private static readonly RULES_BASE_URL =
    'http://infomania.ru/gamelibrary/files/rules/';

  async migrate() {
    let migrated = 0;
    let skipped = 0;
    let seriesCreated = 0;
    const errors: Array<{ externalId: string; error: string }> = [];

    await this.migrateGenres();

    const gData = await this.prismaService.$queryRawUnsafe<
      Array<{
        g_id: string;
        g_name: string;
        g_p_min: number | null;
        g_p_max: number | null;
        g_age: number | null;
        g_desc: string | null;
        g_content: string | null;
        g_cover: string | null;
        g_rules_file: string | null;
        g_tags: string | null;
        g_duration: string | null;
        g_year: string | null;
        g_status: number | null;
        g_place: string | null;
        g_comment: string | null;
      }>
    >(
      `SELECT d.g_id, d.g_name, d.g_p_min, d.g_p_max, d.g_age, d.g_desc,
              d.g_content, d.g_cover, d.g_rules_file, d.g_tags, d.g_duration,
              d.g_year, s.g_status, s.g_place, s.g_comment
         FROM nomb_games.g_data d
         JOIN nomb_games.g_service s ON s.id = d.g_id
        ORDER BY d.g_id`,
    );

    const glList = await this.prismaService.$queryRawUnsafe<
      Array<{
        id: number;
        title: string;
        description: string | null;
        category: string | null;
        count_gamers: string | null;
        gametime: string | null;
        age: string | null;
        create_year: string | null;
      }>
    >(
      `SELECT id, title, description, category, count_gamers, gametime, age, create_year
         FROM nomb_games.gl_list
        ORDER BY id`,
    );

    const gDataTitles = new Set(
      gData.map((row) => row.g_name.trim().toLowerCase()),
    );
    const glListUnique = glList.filter(
      (row) => !gDataTitles.has(row.title.trim().toLowerCase()),
    );

    type NormalizedRow = {
      externalId: string;
      title: string;
      shortDescription: string | null;
      description: string | null;
      playerMin: number | null;
      playerMax: number | null;
      playerAge: number | null;
      durationMin: number | null;
      durationMax: number | null;
      year: number | null;
      status: ReturnType<typeof mapGameStatus>;
      place: string | null;
      comment: string | null;
      genreTags: string[];
      coverFile: string | null;
      rulesFile: string | null;
    };

    const normalized: NormalizedRow[] = [
      ...gData.map((row): NormalizedRow => {
        const duration = parseDuration(row.g_duration);
        return {
          externalId: row.g_id,
          title: decodeHtmlEntities(row.g_name),
          shortDescription: row.g_desc ? decodeHtmlEntities(row.g_desc) : null,
          description: row.g_content ? decodeHtmlEntities(row.g_content) : null,
          playerMin: row.g_p_min || null,
          playerMax: row.g_p_max || null,
          playerAge: row.g_age,
          durationMin: duration.min,
          durationMax: duration.max,
          year: parseYear(row.g_year),
          status: mapGameStatus(row.g_status),
          place: row.g_place,
          comment: row.g_comment,
          genreTags: (row.g_tags || '')
            .split(';')
            .map((tag) => tag.trim())
            .filter(Boolean),
          coverFile: row.g_cover || null,
          rulesFile: row.g_rules_file || null,
        };
      }),
      ...glListUnique.map((row): NormalizedRow => {
        const players = parsePlayerRange(row.count_gamers);
        const duration = parseDuration(row.gametime);
        return {
          externalId: `gl-${row.id}`,
          title: decodeHtmlEntities(row.title),
          shortDescription: null,
          description: row.description
            ? decodeHtmlEntities(row.description)
            : null,
          playerMin: players.min,
          playerMax: players.max,
          playerAge: parseAgeWithPlus(row.age),
          durationMin: duration.min,
          durationMax: duration.max,
          year: parseYear(row.create_year),
          status: 'IN_STOCK',
          place: null,
          comment: null,
          genreTags: [],
          coverFile: null,
          rulesFile: null,
        };
      }),
    ];

    // Группировка в серии: часть названия до ":" встречается у >= 2 игр.
    const seriesGroups = new Map<string, NormalizedRow[]>();
    for (const row of normalized) {
      const base = extractSeriesBaseTitle(row.title);
      if (!base) continue;
      const key = base.toLowerCase();
      if (!seriesGroups.has(key)) {
        seriesGroups.set(key, []);
      }
      seriesGroups.get(key)!.push(row);
    }

    const seriesIdByKey = new Map<string, string>();
    for (const [key, rows] of seriesGroups) {
      if (rows.length < 2) continue;
      const title = extractSeriesBaseTitle(rows[0].title)!;
      const series = await this.prismaService.gameSeries.create({
        data: { id: v4(), title, slug: createSlug(title, undefined, true) },
      });
      seriesIdByKey.set(key, series.id);
      seriesCreated++;
    }

    const genreByTag = new Map(
      (await this.prismaService.gameGenre.findMany()).map((g) => [g.tag, g.id]),
    );

    for (const row of normalized) {
      try {
        const existing = await this.prismaService.game.findUnique({
          where: { externalId: row.externalId },
        });
        if (existing) {
          skipped++;
          continue;
        }

        const seriesKey = extractSeriesBaseTitle(row.title)?.toLowerCase();
        const seriesId = seriesKey ? seriesIdByKey.get(seriesKey) : undefined;

        const game = await this.prismaService.game.create({
          data: {
            id: v4(),
            externalId: row.externalId,
            title: row.title,
            slug: await this.uniqueSlug(row.title),
            shortDescription: row.shortDescription,
            description: row.description,
            playerMin: row.playerMin,
            playerMax: row.playerMax,
            playerAge: row.playerAge,
            durationMin: row.durationMin,
            durationMax: row.durationMax,
            year: row.year,
            status: row.status,
            place: row.place,
            comment: row.comment,
            seriesId: seriesId || undefined,
          },
        });

        for (const tag of row.genreTags) {
          const genreId = genreByTag.get(tag);
          if (genreId) {
            await this.prismaService.genresOnGames.create({
              data: { gameId: game.id, genreId },
            });
          }
        }

        if (row.coverFile) {
          await this.attachDownloadedImage(game.id, row.coverFile);
        }
        if (row.rulesFile) {
          await this.attachDownloadedRules(game.id, row.rulesFile);
        }

        migrated++;
      } catch (error) {
        errors.push({
          externalId: row.externalId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      total: normalized.length,
      migrated,
      skipped,
      failed: errors.length,
      errors,
      seriesCreated,
    };
  }

  private async migrateGenres() {
    const genres = await this.prismaService.$queryRawUnsafe<
      Array<{ tag: string; desc: string | null }>
    >('SELECT tag, `desc` FROM nomb_games.g_genre');

    for (const genre of genres) {
      const existing = await this.prismaService.gameGenre.findUnique({
        where: { tag: genre.tag },
      });
      if (!existing) {
        await this.prismaService.gameGenre.create({
          data: { id: v4(), tag: genre.tag, title: genre.desc || genre.tag },
        });
      }
    }
  }

  private async uniqueSlug(title: string): Promise<string> {
    const base = createSlug(title);
    let slug = base;
    let suffix = 2;

    while (
      await this.prismaService.game.findUnique({ where: { slug } })
    ) {
      slug = `${base}-${suffix}`;
      suffix++;
    }

    return slug;
  }

  private async attachDownloadedImage(gameId: string, coverFile: string) {
    try {
      const response = await fetch(GamesService.COVER_BASE_URL + coverFile);
      if (!response.ok) return;

      const buffer = Buffer.from(await response.arrayBuffer());
      const extension = coverFile.split('.').pop() || 'jpg';
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

      const file = await this.filesService.uploadImage({
        buffer,
        originalname: coverFile,
        mimetype: mimeType,
        size: buffer.length,
        fieldname: 'file',
        encoding: '7bit',
        stream: undefined as never,
        destination: '',
        filename: coverFile,
        path: '',
      });

      if (file) {
        await this.prismaService.gameImage.create({
          data: { id: v4(), gameId, fileId: file.id, order: 0 },
        });
      }
    } catch {
      // Игра создаётся и без обложки — картинку можно добавить в админке позже.
    }
  }

  private async attachDownloadedRules(gameId: string, rulesFile: string) {
    try {
      const response = await fetch(GamesService.RULES_BASE_URL + rulesFile);
      if (!response.ok) return;

      const buffer = Buffer.from(await response.arrayBuffer());

      const file = await this.filesService.uploadDocument({
        buffer,
        originalname: rulesFile,
        mimetype: 'application/pdf',
        size: buffer.length,
        fieldname: 'file',
        encoding: '7bit',
        stream: undefined as never,
        destination: '',
        filename: rulesFile,
        path: '',
      });

      if (file) {
        await this.prismaService.game.update({
          where: { id: gameId },
          data: { rulesFileId: file.id },
        });
      }
    } catch {
      // Правила можно прикрепить и позже — не блокирует создание игры.
    }
  }
```

Добавить импорты в шапку `src/games/games.service.ts`:

```ts
import { decodeHtmlEntities } from '../common/utils/decode-html-entities.utils';
import {
  parseAgeWithPlus,
  parseDuration,
  parsePlayerRange,
  parseYear,
} from './utils/parse-game-fields.utils';
import { mapGameStatus } from './utils/map-game-status.utils';
import { extractSeriesBaseTitle } from './utils/extract-series-base-title.utils';
```

Примечание: `Express.Multer.File` требует поля `stream`/`destination`/`filename`/`path`
даже когда не используются (Multer их не читает при работе не из middleware) —
`stream: undefined as never` — единственный способ удовлетворить тип без
установки лишней зависимости; `FilesService.uploadImage`/`uploadDocument`
реально используют только `buffer`, `originalname`, `mimetype`, `size`
(проверено по их исходникам в `src/files/files.service.ts`).

- [ ] **Step 3: Добавить роут в контроллер**

```ts
// src/games/games.controller.ts — добавить перед @Get('genres')
@UseGuards(JwtAuthGuard)
@Get('migrate')
migrate() {
  return this.gamesService.migrate();
}
```

- [ ] **Step 4: Проверить сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок

- [ ] **Step 5: Коммит**

```bash
git add src/games
git commit -m "GamesService.migrate(): перенос игр из nomb_games (g_data + gl_list)"
```

---

### Task 12: Проверка на боевых данных и финальный прогон

**Files:** нет новых — только проверка.

- [ ] **Step 1: Полный прогон тестов**

Run: `npx jest`
Expected: все тесты проходят (утилиты из Task 1-3 + существующие `posts`/`auth` спеки)

- [ ] **Step 2: tsc / build / lint**

Run: `npx tsc --noEmit`
Run: `npm run build`
Run: `npx eslint src/games src/common/utils src/files/files.module.ts src/posts/posts.service.ts`
Expected: без ошибок компиляции/сборки; в eslint — не больше ошибок, чем было
в затронутых файлах до этой задачи (сверить, как делалось для предыдущих
похожих задач в этой сессии — `git stash` + `npx eslint <file>` на baseline,
сравнить количество).

- [ ] **Step 3: Dry-run миграции в транзакции с откатом**

Написать одноразовый скрипт в scratch-директории (не коммитить), который
вызывает ту же логику, что `GamesService.migrate()`, внутри
`prisma.$transaction(async (tx) => { ...; throw ROLLBACK; })` — по образцу
`temp/verify-fix.js`/`temp/verify-posts.js`, использовавшихся ранее в этой
сессии для постов/файлов (см. `reports/2026-09-03-*.md`). Проверить на
реальных данных `nomb_games`: сколько игр мигрируется, сколько серий
создаётся, сколько ошибок (`failed` должен быть `0` или объяснимым).

- [ ] **Step 4: Отчёт**

Создать `reports/<YYYY-MM-DD-HHmm>-games-admin.md` (дата — реальная дата
выполнения) с результатами Step 1-3, списком новых эндпоинтов, известными
ограничениями (см. секцию «Мои идеи на будущее» в спеке) и явной пометкой,
что `GET /games/migrate` на боевых данных ещё не вызывался по-настоящему —
дождаться отдельного подтверждения перед реальным запуском (591+ HTTP-скачиваний
файлов — долгая необратимая операция создания данных).

- [ ] **Step 5: Коммит отчёта**

```bash
git add reports
git commit -m "Отчёт: модель и админка игр"
```

## Self-Review (проведён при написании плана)

- **Покрытие спеки:** модель (Task 5-6), нормализация данных (Task 1-3, 11),
  идемпотентность миграции (Task 11 — проверка по `externalId`, `skipped` счётчик),
  публичный API + фильтры (Task 9), админка (Task 10), картинки/видео (Task 5 —
  `GameImage`/`videoUrl`; Task 10 — `imageFileIds` с проверкой лимита 3), серии
  (Task 3, 11), правила PDF → MinIO (Task 11 `attachDownloadedRules`) — все
  пункты спеки покрыты.
- **Плейсхолдеры:** не найдены — весь код в шагах конкретный и рабочий.
- **Согласованность типов:** `GameStatusValue` (Task 3) используется в `CreateGameDto.status`
  (Task 7) и в `migrate()` (Task 11) без расхождений; `GAME_INCLUDE` (Task 9)
  переиспользуется как есть в `findAll`/`findOne`; `PaginationQueryDto` поля
  (Task 7: `players`, `ageMin`, `ageMax`, `maxDuration`, `yearFrom`, `yearTo`,
  `seriesId`, `availableOnly`) один в один совпадают с тем, что читает
  `GamesService.findAll`/`buildWhere`/`searchGameIds` (Task 9).

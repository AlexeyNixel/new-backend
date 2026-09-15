# Сущность «Комиксы» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить модель `Comic` (+ `ComicSeries`, `ComicGenre`, `ComicImage`) в основную БД с публичным API чтения/фильтрации и админским CRUD — без переноса данных (источника нет, ввод только вручную).

**Architecture:** Пять новых Prisma-моделей, зеркалящих паттерн `Game`/`GameSeries`/`GameGenre`/`GameImage`, но проще: без инвентарного статуса, без полнотекстового поиска (только `contains` по названию), без миграции. `ComicsController`/`ComicsService` по структуре повторяют `GamesController`/`GamesService`.

**Tech Stack:** NestJS 11, Prisma 6 (MySQL/MariaDB), Jest.

**Spec:** `docs/superpowers/specs/2026-09-15-comics-entity-design.md`

## Global Constraints

- Комментарии и коммит-сообщения — на русском (CLAUDE.md).
- Каждая правка проверяется `npx tsc --noEmit` и `npm run build` перед коммитом.
- Slug — через `createSlug` (`src/common/utils/slugify.utils.ts`), id — через `parseSlug` (`src/common/utils/validate.utils.ts`).
- Лимит 3 изображения проверяется в сервисе (`BadRequestException`), как у `GamesService`.
- `isDeleted` в публичном списке — всегда `false` (без переключателя через query), как у игр; смена — только через админский `PATCH`.
- Перед применением Prisma-миграции — проверить сгенерированный SQL на посторонний дрейф (см. прецедент с играми: `navigation_items`/`pages`/`clubs` регулярно попадают в автосгенерированную миграцию, их нужно вычищать вручную).

---

### Task 1: Prisma-схема — модели комиксов

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: Prisma-модели `Comic`, `ComicImage`, `ComicGenre`, `GenresOnComics`, `ComicSeries`; поле `File.comicImages`.

- [ ] **Step 1: Добавить File-релейшн**

В модели `File` (`prisma/schema.prisma`) добавить строку рядом с `gameImages`:

```prisma
  gameImages     GameImage[]
  gameRulesFor   Game[]            @relation("GameRulesFile")
  comicImages    ComicImage[]
```

- [ ] **Step 2: Добавить новые модели**

Добавить в конец `prisma/schema.prisma`:

```prisma
model Comic {
  id           String            @id @default(uuid())
  slug         String            @unique @db.VarChar(300)
  title        String            @db.VarChar(256)
  description  String?           @db.LongText
  content      String?           @db.LongText
  author       String?           @db.VarChar(200)
  illustrator  String?           @db.VarChar(200)
  volumeNumber Int?
  year         Int?
  ageRating    Int?
  externalLink String?           @db.VarChar(500)
  isDeleted    Boolean           @default(false)
  seriesId     String?
  series       ComicSeries?      @relation(fields: [seriesId], references: [id])
  images       ComicImage[]
  genres       GenresOnComics[]
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  @@index([seriesId])
  @@map("comics")
}

model ComicImage {
  id      String @id @default(uuid())
  comicId String
  fileId  String
  order   Int    @default(0)
  comic   Comic  @relation(fields: [comicId], references: [id], onDelete: Cascade)
  file    File   @relation(fields: [fileId], references: [id])

  @@unique([comicId, fileId])
  @@index([comicId])
  @@index([fileId], map: "comic_images_fileId_fkey")
  @@map("comic_images")
}

model ComicGenre {
  id     String           @id @default(uuid())
  tag    String           @unique @db.VarChar(32)
  title  String           @db.VarChar(64)
  comics GenresOnComics[]

  @@map("comic_genres")
}

model GenresOnComics {
  comicId String
  genreId String
  comic   Comic      @relation(fields: [comicId], references: [id])
  genre   ComicGenre @relation(fields: [genreId], references: [id])

  @@id([comicId, genreId])
  @@index([genreId], map: "genres_on_comics_genreId_fkey")
  @@map("genres_on_comics")
}

model ComicSeries {
  id          String   @id @default(uuid())
  slug        String   @unique @db.VarChar(300)
  title       String   @db.VarChar(256)
  description String?  @db.VarChar(1024)
  createdAt   DateTime @default(now())
  comics      Comic[]

  @@map("comic_series")
}
```

`ComicImage.file` — без именованного `@relation` (единственная связь `ComicImage -> File`, как `GameImage.file`).

- [ ] **Step 3: Проверить схему**

Run: `npx prisma validate`
Expected: `The schema at prisma\schema.prisma is valid`

- [ ] **Step 4: Коммит**

```bash
git add prisma/schema.prisma
git commit -m "Prisma-схема: модели Comic/ComicSeries/ComicGenre/ComicImage"
```

---

### Task 2: Prisma-миграция

**Files:**
- Create: `prisma/migrations/<timestamp>_comics_model/migration.sql`

**Interfaces:**
- Consumes: схему из Task 1.
- Produces: применённые к БД `nomb_dev` таблицы `comics`, `comic_images`, `comic_genres`, `genres_on_comics`, `comic_series`.

- [ ] **Step 1: Сгенерировать черновик миграции**

Run: `npx prisma migrate dev --create-only --name comics_model --skip-generate`

- [ ] **Step 2: Проверить и почистить сгенерированный SQL**

Открыть `migration.sql`. Оставить только `CREATE TABLE comics`,
`CREATE TABLE comic_images`, `CREATE TABLE comic_genres`,
`CREATE TABLE genres_on_comics`, `CREATE TABLE comic_series`,
`AddForeignKey`-блоки к ним. Если в файле оказались строки про
`navigation_items`/`pages`/`clubs` или любую другую не связанную с комиксами
таблицу (известный пре-экзистинг дрейф схемы, см. прецедент с играми) — удалить их.

Проверить:
Run: `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script`
Expected (после Step 3): в выводе нет ничего про `comic`/`Comic` — только уже
известный pre-existing дрейф (`navigation_items`/`pages`/`clubs`).

- [ ] **Step 3: Применить миграцию**

Run: `npx prisma migrate deploy`
Expected: `All migrations have been successfully applied.`

- [ ] **Step 4: Перегенерировать Prisma Client**

Run: `npx prisma generate`

Если падает с `EPERM ... query_engine-windows.dll.node` — значит
`npm run start:dev` держит файл открытым; остановить dev-сервер и повторить.

- [ ] **Step 5: Коммит**

```bash
git add prisma/migrations
git commit -m "Миграция БД: таблицы комиксов"
```

---

### Task 3: DTO

**Files:**
- Create: `src/comics/dto/create-comic.dto.ts`
- Create: `src/comics/dto/update-comic.dto.ts`
- Create: `src/comics/dto/create-comic-genre.dto.ts`
- Create: `src/comics/dto/create-comic-series.dto.ts`

**Interfaces:**
- Produces: `CreateComicDto`, `UpdateComicDto`, `CreateComicGenreDto`, `CreateComicSeriesDto`.
- Consumes: `PaginationQueryDto` (`src/common/dto/pagination-query.dto.ts`) — **не модифицируется**, у комиксов те же имена query-полей, что уже добавлены для игр (`search`, `genres`, `seriesId`, `sortBy`, `sortOrder`); дополнительно используются уже существующие `age`-подобные поля как `ageMax`/`yearFrom`/`yearTo` (уже есть в DTO из работы над играми).

- [ ] **Step 1: CreateComicDto**

```ts
// src/comics/dto/create-comic.dto.ts
export class CreateComicDto {
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  author?: string;
  illustrator?: string;
  volumeNumber?: number;
  year?: number;
  ageRating?: number;
  externalLink?: string;
  seriesId?: string;
  imageFileIds?: string[];
  genreIds?: string[];
}
```

- [ ] **Step 2: UpdateComicDto**

```ts
// src/comics/dto/update-comic.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateComicDto } from './create-comic.dto';

export class UpdateComicDto extends PartialType(CreateComicDto) {
  isDeleted?: boolean;
}
```

- [ ] **Step 3: CreateComicGenreDto / CreateComicSeriesDto**

```ts
// src/comics/dto/create-comic-genre.dto.ts
export class CreateComicGenreDto {
  tag: string;
  title: string;
}
```

```ts
// src/comics/dto/create-comic-series.dto.ts
export class CreateComicSeriesDto {
  title: string;
  description?: string;
}
```

- [ ] **Step 4: Проверить компиляцию**

Run: `npx tsc --noEmit`
Expected: без ошибок

- [ ] **Step 5: Коммит**

```bash
git add src/comics/dto
git commit -m "DTO для создания/обновления комиксов, жанров и серий"
```

---

### Task 4: ComicsModule + ComicsService (чтение) + ComicsController (чтение)

**Files:**
- Create: `src/comics/comics.module.ts`
- Create: `src/comics/comics.service.ts`
- Create: `src/comics/comics.controller.ts`
- Modify: `src/app.module.ts` — добавить `ComicsModule` в `imports`

**Interfaces:**
- Consumes: `parseSlug` (`src/common/utils/validate.utils.ts`), `PrismaService`, `ResponseService`.
- Produces:
  - `ComicsService.findAll(query: PaginationQueryDto): Promise<ApiResponse<Comic[]>>`
  - `ComicsService.findOne(idOrSlug: string): Promise<Comic | { message: string }>`
  - `ComicsService.findAllGenres(): Promise<ComicGenre[]>`
  - `ComicsService.findAllSeries(): Promise<ComicSeries[]>`

- [ ] **Step 1: ComicsModule**

```ts
// src/comics/comics.module.ts
import { Module } from '@nestjs/common';
import { ComicsService } from './comics.service';
import { ComicsController } from './comics.controller';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [ComicsController],
  providers: [ComicsService, ResponseService],
})
export class ComicsModule {}
```

- [ ] **Step 2: ComicsService (read-часть)**

```ts
// src/comics/comics.service.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '../prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ResponseService } from '../common/services/response.service';
import { parseSlug } from '../common/utils/validate.utils';

const COMIC_INCLUDE = {
  images: { orderBy: { order: 'asc' as const }, include: { file: true } },
  genres: { select: { genre: true } },
  series: true,
} satisfies Prisma.ComicInclude;

@Injectable()
export class ComicsService {
  constructor(
    private prismaService: PrismaService,
    private responseService: ResponseService,
  ) {}

  async findAll(paginationQuery: PaginationQueryDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search = '',
      genres = [],
      seriesId,
      ageMax,
      yearFrom,
      yearTo,
    } = paginationQuery;

    const skip = (page - 1) * limit;

    let genreIds: string[] = [];
    if (typeof genres === 'string') {
      genreIds = [genres];
    } else if (typeof genres === 'object') {
      genreIds = [...genres];
    }

    const where = this.buildWhere({ search, genreIds, seriesId, ageMax, yearFrom, yearTo });

    const [comics, total] = await Promise.all([
      this.prismaService.comic.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: +limit,
        include: COMIC_INCLUDE,
      }),
      this.prismaService.comic.count({ where }),
    ]);

    return this.responseService.paginated(comics, total, page, limit);
  }

  async findOne(idOrSlug: string) {
    const comic = await this.prismaService.comic.findUnique({
      where: { ...parseSlug(idOrSlug) },
      include: COMIC_INCLUDE,
    });

    if (!comic) {
      return { message: `Комикс по slug или id '${idOrSlug}' не найден` };
    }

    return comic;
  }

  findAllGenres() {
    return this.prismaService.comicGenre.findMany({
      orderBy: { title: 'asc' },
    });
  }

  findAllSeries() {
    return this.prismaService.comicSeries.findMany({
      orderBy: { title: 'asc' },
    });
  }

  private buildWhere(filters: {
    search?: string;
    genreIds: string[];
    seriesId?: string;
    ageMax?: number;
    yearFrom?: number;
    yearTo?: number;
  }): Prisma.ComicWhereInput {
    const { search, genreIds, seriesId, ageMax, yearFrom, yearTo } = filters;

    return {
      isDeleted: false,
      seriesId: seriesId || undefined,
      title: search ? { contains: search } : undefined,
      ageRating: ageMax !== undefined ? { lte: +ageMax } : undefined,
      year: {
        gte: yearFrom !== undefined ? +yearFrom : undefined,
        lte: yearTo !== undefined ? +yearTo : undefined,
      },
      AND: genreIds.map((genreId) => ({
        genres: { some: { genreId } },
      })),
    };
  }
}
```

- [ ] **Step 3: ComicsController (read-роуты)**

```ts
// src/comics/comics.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ComicsService } from './comics.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('comics')
export class ComicsController {
  constructor(private readonly comicsService: ComicsService) {}

  @Get('genres')
  findAllGenres() {
    return this.comicsService.findAllGenres();
  }

  @Get('series')
  findAllSeries() {
    return this.comicsService.findAllSeries();
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.comicsService.findAll(paginationQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comicsService.findOne(id);
  }
}
```

Роуты `genres`/`series` объявлены до `:id` — тот же порядок, что у
`GamesController`/`PostsController`, иначе Nest примет их за значение `:id`.

- [ ] **Step 4: Подключить модуль в AppModule**

В `src/app.module.ts` добавить импорт и в массив `imports`:

```ts
import { ComicsModule } from './comics/comics.module';
// ...
    ComicsModule,
```

(рядом с `GamesModule`)

- [ ] **Step 5: Проверить**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок. Если `Prisma.ComicInclude`/`Prisma.ComicWhereInput` не
резолвятся — убедиться, что Task 2 Step 4 (`prisma generate`) выполнен
успешно (dev-сервер не должен держать файл движка открытым).

- [ ] **Step 6: Коммит**

```bash
git add src/comics src/app.module.ts
git commit -m "ComicsService/Controller: чтение комиксов с фильтрами"
```

---

### Task 5: ComicsService (запись) + роуты жанров/серий/комикса

**Files:**
- Modify: `src/comics/comics.service.ts`
- Modify: `src/comics/comics.controller.ts`

**Interfaces:**
- Consumes: `createSlug` (`src/common/utils/slugify.utils.ts`), `v4` из `uuid`, `JwtAuthGuard` (`src/auth/guards/jwt-auth.guard.ts`).
- Produces:
  - `ComicsService.create(dto: CreateComicDto): Promise<Comic>`
  - `ComicsService.update(id: string, dto: UpdateComicDto): Promise<Comic>`
  - `ComicsService.createGenre/updateGenre/createSeries/updateSeries` — как у `GamesService`.

- [ ] **Step 1: Дописать импорты и методы записи в ComicsService**

Добавить в шапку `src/comics/comics.service.ts`:

```ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { v4 } from 'uuid';
import { createSlug } from '../common/utils/slugify.utils';
import { CreateComicDto } from './dto/create-comic.dto';
import { UpdateComicDto } from './dto/update-comic.dto';
import { CreateComicGenreDto } from './dto/create-comic-genre.dto';
import { CreateComicSeriesDto } from './dto/create-comic-series.dto';
```

(объединить с уже существующим `import { Injectable } from '@nestjs/common';` из Task 4 — заменить его на строку выше).

Добавить в класс `ComicsService` (после `findAllSeries`, до `private buildWhere`):

```ts
  async create(dto: CreateComicDto) {
    const { imageFileIds = [], genreIds = [], ...rest } = dto;

    if (imageFileIds.length > 3) {
      throw new BadRequestException(
        'У комикса может быть не более 3 изображений',
      );
    }

    const slug = createSlug(dto.title, dto.slug);
    const comic = await this.prismaService.comic.create({
      data: {
        id: v4(),
        ...rest,
        slug,
      },
    });

    await this.syncImages(comic.id, imageFileIds);
    await this.syncGenres(comic.id, genreIds);

    return this.findOne(comic.id);
  }

  async update(id: string, dto: UpdateComicDto) {
    const { imageFileIds, genreIds, ...rest } = dto;

    if (imageFileIds && imageFileIds.length > 3) {
      throw new BadRequestException(
        'У комикса может быть не более 3 изображений',
      );
    }

    if (rest.title && !rest.slug) {
      rest.slug = createSlug(rest.title);
    }

    await this.prismaService.comic.update({
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

  createGenre(dto: CreateComicGenreDto) {
    return this.prismaService.comicGenre.create({
      data: { id: v4(), ...dto },
    });
  }

  updateGenre(id: string, dto: Partial<CreateComicGenreDto>) {
    return this.prismaService.comicGenre.update({
      where: { id },
      data: dto,
    });
  }

  createSeries(dto: CreateComicSeriesDto) {
    return this.prismaService.comicSeries.create({
      data: { id: v4(), slug: createSlug(dto.title), ...dto },
    });
  }

  updateSeries(id: string, dto: Partial<CreateComicSeriesDto>) {
    return this.prismaService.comicSeries.update({
      where: { id },
      data: dto,
    });
  }

  private async syncImages(comicId: string, fileIds: string[]) {
    await this.prismaService.comicImage.deleteMany({ where: { comicId } });

    for (let order = 0; order < fileIds.length; order++) {
      await this.prismaService.comicImage.create({
        data: { id: v4(), comicId, fileId: fileIds[order], order },
      });
    }
  }

  private async syncGenres(comicId: string, genreIds: string[]) {
    await this.prismaService.genresOnComics.deleteMany({ where: { comicId } });

    for (const genreId of genreIds) {
      await this.prismaService.genresOnComics.create({
        data: { comicId, genreId },
      });
    }
  }
```

- [ ] **Step 2: Admin-роуты в ComicsController**

Заменить содержимое `src/comics/comics.controller.ts` целиком:

```ts
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
import { ComicsService } from './comics.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateComicDto } from './dto/create-comic.dto';
import { UpdateComicDto } from './dto/update-comic.dto';
import { CreateComicGenreDto } from './dto/create-comic-genre.dto';
import { CreateComicSeriesDto } from './dto/create-comic-series.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('comics')
export class ComicsController {
  constructor(private readonly comicsService: ComicsService) {}

  @Get('genres')
  findAllGenres() {
    return this.comicsService.findAllGenres();
  }

  @UseGuards(JwtAuthGuard)
  @Post('genres')
  createGenre(@Body() dto: CreateComicGenreDto) {
    return this.comicsService.createGenre(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('genres/:id')
  updateGenre(
    @Param('id') id: string,
    @Body() dto: Partial<CreateComicGenreDto>,
  ) {
    return this.comicsService.updateGenre(id, dto);
  }

  @Get('series')
  findAllSeries() {
    return this.comicsService.findAllSeries();
  }

  @UseGuards(JwtAuthGuard)
  @Post('series')
  createSeries(@Body() dto: CreateComicSeriesDto) {
    return this.comicsService.createSeries(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('series/:id')
  updateSeries(
    @Param('id') id: string,
    @Body() dto: Partial<CreateComicSeriesDto>,
  ) {
    return this.comicsService.updateSeries(id, dto);
  }

  @Get()
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.comicsService.findAll(paginationQuery);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateComicDto) {
    return this.comicsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comicsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateComicDto) {
    return this.comicsService.update(id, dto);
  }
}
```

- [ ] **Step 3: Проверить**

Run: `npx tsc --noEmit && npm run build`
Expected: без ошибок

- [ ] **Step 4: Коммит**

```bash
git add src/comics
git commit -m "ComicsService/Controller: создание и обновление комиксов, CRUD жанров и серий"
```

---

### Task 6: Проверка на боевой БД и отчёт

**Files:** нет новых — только проверка.

- [ ] **Step 1: Полный прогон**

Run: `npx jest`
Run: `npx eslint src/comics src/app.module.ts`
Expected: без ошибок/новых предупреждений

- [ ] **Step 2: Ручная проверка через dev-сервер**

Поднять `npm run start:dev`, с валидным JWT (см. `reports/2026-09-10-1200-auth-me-logout-endpoints.md` для получения токена) прогнать:
- `POST /api/comics/genres` — создать пробный жанр
- `POST /api/comics/series` — создать пробную серию
- `POST /api/comics` — создать комикс с `seriesId`, `genreIds`, `volumeNumber: 1`
- `POST /api/comics` — второй комикс той же серии, `volumeNumber: 2`
- `GET /api/comics?seriesId=<id>&sortBy=volumeNumber&sortOrder=asc` — убедиться,
  что тома идут по порядку
- `GET /api/comics?search=<часть названия>` — убедиться, что находит по
  названию и не требует точного совпадения
- `PATCH /api/comics/:id` — с 4 `imageFileIds` — убедиться, что вернётся
  `400 Bad Request` (лимит 3 изображения)
- Удалить тестовые данные (`comic`/`comicGenre`/`comicSeries` — через Prisma
  напрямую, как делалось для игр, либо оставить и пометить `isDeleted: true`)

- [ ] **Step 3: Отчёт**

Создать `reports/<YYYY-MM-DD-HHmm>-comics-entity.md` с результатами Step 1-2.

- [ ] **Step 4: Коммит отчёта**

```bash
git add reports
git commit -m "Отчёт: сущность комиксов"
```

## Self-Review (проведён при написании плана)

- **Покрытие спеки:** модель (Task 1-2), DTO (Task 3), публичное чтение +
  фильтры + поиск по названию (Task 4), запись + лимит изображений + CRUD
  жанров/серий (Task 5), сортировка по тому внутри серии — покрыта дефолтным
  механизмом `sortBy`/`sortOrder`, отдельного кода не требует (задокументировано
  в Task 6 Step 2 как явная ручная проверка) — все пункты спеки покрыты.
- **Плейсхолдеры:** не найдены.
- **Согласованность типов:** `COMIC_INCLUDE`/`Prisma.ComicWhereInput` (Task 4)
  используются в `findAll`/`findOne` без расхождений; `CreateComicDto`/
  `UpdateComicDto` (Task 3) поля совпадают с тем, что читает `create`/`update`
  (Task 5) один в один.

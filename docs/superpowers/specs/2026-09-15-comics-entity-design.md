# Сущность «Комиксы» — дизайн

Статус: согласовано в чате (три раунда правок), формализуется здесь.

## Цель

Каталог комиксов/манги в основной БД — по образцу `Game`/`Book`, но со своими
полями (автор/художник, том/выпуск, возрастной рейтинг) и группировкой по
сериям/вселенным («Марвел», «ДС», «Ван Пис» — один уровень, как `GameSeries`).

## Источник данных

В отличие от игр — готового источника для переноса **нет**. Комиксы заводятся
вручную через админку с самого начала. Эта итерация — только модель БД и
базовый CRUD; миграции данных не будет.

## Принятые решения (согласовано в чате)

| Вопрос | Решение |
|---|---|
| Издательство vs серия | Один уровень группировки — `ComicSeries` (как `GameSeries`), без отдельного `Publisher`. «Марвел», «Ван Пис» — равноправные записи. |
| Номер тома/выпуска | Есть, `volumeNumber Int?` — части серии сортируются по нему по порядку чтения (в отличие от игр, где части серии не упорядочены). |
| Инвентарный статус (как у игр — «в фонде»/«на руках») | Нет — просто каталог, как у книг: `externalLink` вместо статуса выдачи. |
| Изображения | До 3 (изменено в последнем раунде с «1 как у книг» на «как у игр») — `ComicImage`, join-таблица с `order`, тот же паттерн, что `GameImage`. |
| Автор/художник | Отдельные поля `author`/`illustrator` — у комиксов сценарист и художник часто разные люди, в отличие от `Book`, где автора нет вообще. |
| Возрастной рейтинг | `ageRating Int?`, необязательное. |
| Поиск | Только по названию (`title: { contains }`), без полнотекстового индекса и без `toBooleanFulltextQuery` — сознательно проще, чем у постов/игр. |
| Жанры | `ComicGenre` + `GenresOnComics` — тот же M2M-паттерн, что `GameGenre`/`GenresOnGames`, отдельная сущность (не переиспользуем `GameGenre` — жанры комиксов концептуально другие: сэйнэн/сёнэн/супергероика и т.п.). |

## Модель (Prisma)

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

`File` получает обратную связь `comicImages ComicImage[]` (без именованного
`@relation` — единственная связь `ComicImage -> File`, как у `GameImage.file`).

## API

Зеркалит `GamesController`/`GamesService`, упрощённо (без миграции, без
полнотекстового поиска):

**Публичные:**
- `GET /comics` — пагинация, фильтры: `search` (по названию), `genres[]`
  (id жанров, все обязательны — как у игр), `seriesId`, `authorContains`?
  (не обсуждали — не включаю, можно добавить позже по запросу), `ageMax`,
  `yearFrom`/`yearTo`. Сортировка — общий механизм `sortBy`/`sortOrder`
  (по умолчанию `createdAt desc`, как у игр); для «другие тома серии» —
  `?seriesId=X&sortBy=volumeNumber&sortOrder=asc`, отдельного эндпоинта не
  нужно.
- `GET /comics/:id` — по uuid или slug (`parseSlug`), с `images`, `genres`,
  `series`.
- `GET /comics/genres`, `GET /comics/series` — справочники.

**Админские** (`JwtAuthGuard`, зеркалит `posts`/`games`):
- `POST /comics`, `PATCH /comics/:id` — создание/обновление, включая
  `imageFileIds[]` (≤3, проверка в сервисе, как у игр), `genreIds[]`,
  `seriesId`.
- `POST /comics/genres`, `PATCH /comics/genres/:id`.
- `POST /comics/series`, `PATCH /comics/series/:id`.

## Поиск: `title: { contains: search }`

Простой `contains` в `WHERE`, без `OR`-ловушки, которая была в старом поиске
постов (там `OR: [{title: contains, content: contains}]` — один объект внутри
`OR` требовал совпадения **в обоих** полях; для комиксов поиск только по
`title`, такой ловушки в принципе нет).

## Вне рамок этой итерации

- Перенос данных — источника нет, комиксы заводятся только вручную.
- Публичный фронтенд и `frontend-admin` — сначала бэкенд-модель и API,
  фронтенд/админка — по отдельному запросу (как это было с играми).
- `authorContains`-фильтр и подобные — не обсуждались, не включаю (YAGNI),
  добавить легко при необходимости.

## Проверка (план)

- TDD на любые чистые утилиты, если появятся (по аналогии с играми — вряд ли
  понадобятся, полей с парсингом свободного текста здесь нет).
- `tsc`/`build`/`eslint`/`jest` на каждом шаге.
- Миграция БД — `prisma migrate dev --create-only`, ручная проверка
  сгенерированного SQL на посторонний дрейф (см. прецедент с играми —
  `navigation_items`/`pages`/`clubs`), `prisma migrate diff` после применения.
- Ручная проверка CRUD через `curl` с JWT (как делалось для игр).

# Админка и модель игр — дизайн

Статус: одобрено (пользователь отклонил уточняющие вопросы вторым раундом —
решения ниже приняты ассистентом самостоятельно, с обоснованием; правки —
по ходу реализации).

## Цель

Сейчас `games`/`genres` — Prisma-вьюхи поверх внешней БД `nomb_games`
(`FROM nomb_games.g_view` / `nomb_games.g_genre`). Формат неудобный,
нет админки, нет картинок/видео, нет серий, фильтрация бедная. Нужно:

1. Настоящая модель игр в основной БД (`nomb_dev`), полный перенос данных.
2. Админка (CRUD), как у постов/книг.
3. Поиск «та же серия» для игр с несколькими частями.
4. Более глубокая фильтрация (кол-во игроков, возраст, длительность, год, жанры, серия).
5. До 3 изображений + 1 видео на игру.

## Источник данных (`nomb_games`, тот же MySQL-сервер)

| Таблица | Строк | Назначение |
|---|---|---|
| `g_data` | 594 | основные данные игры |
| `g_service` | 594 | статус/место/комментарий (инвентарное) |
| `g_status` | 6 | справочник статусов |
| `g_genre` | 29 | справочник жанров |
| `gl_list` | 232 | **отдельный старый каталог**, 158 из 232 дублируют `g_data` по названию, 74 уникальны, без картинок/PDF |

Обложки: `http://infomania.ru/gamelibrary/img/game-cover/<cover_file>` — проверено, отдаёт 200.
Правила (PDF): `http://infomania.ru/gamelibrary/files/rules/<rules_file>` — отдаёт 200, есть у 485/594.

`nomb_games` доступна с тем же пользователем, что и `DATABASE_URL` (кросс-database
запросы на одном сервере) — отдельный TypeORM-коннекшн не нужен, читаем через
`$queryRaw`/`$queryRawUnsafe` с полными именами `nomb_games.<table>`.

## Принятые решения (пользователь отклонил дополнительные уточнения → решает ассистент)

- **PDF правил**: импортировать в MinIO как `File` (тип `DOCUMENT`), не хранить
  ссылку на старый сервер.
- **Формат публичного API**: новый чистый формат (без обратной совместимости
  со старым `Game`-типом фронтенда) — фронт уже частично переписан под
  slug-страницы и новые компоненты (`GameGallery`, `GameSpecs`, `GameRules`,
  `GameAlsoSee`), ждёт более богатую модель.
- **Списанные/утерянные игры**: переносятся все, со статусом. Публичный
  `GET /games` **по умолчанию ничего не фильтрует по статусу** (как сейчас) —
  опциональный `availableOnly=true` прячет `WRITTEN_OFF`/`LOST`/`DAMAGED`.
- **Фильтры**: жанры (несколько, все обязательны — как теги у постов), игроки
  (число → игра подходит, если `playerMin <= n <= playerMax`), возраст (макс.),
  длительность (макс. минут), год (диапазон), серия (`seriesId`), `availableOnly`.
- **gl_list**: мигрируем `g_data` (594) + 74 уникальных строки из `gl_list`
  (не совпавшие по названию). У них нет медиа и нет инвентарного статуса —
  статус по умолчанию `IN_STOCK`.
- **Серии**: модель `GameSeries` + эвристика при миграции — группировка по
  префиксу названия до `:`, серией считается группа из ≥2 игр. Дальше правится
  вручную в админке (это заведомо неточная эвристика, ей не находится лучшая
  альтернатива без ручной разметки, которой не существует в исходных данных).
- **id/slug**: uuid + slug (как посты/книги), старый id сохраняется как
  `externalId` (`gm120`, `393203`, либо `gl-<id>` для строк из `gl_list`) для
  трассируемости и защиты миграции от повторного запуска.

## Модель (Prisma)

Заменяет `view games` / `view genres` (их дропаем вместе с SQL-вьюхами в БД).

```prisma
enum GameStatus {
  IN_STOCK               // 0, "В фонде"
  ON_HANDS                // 1, "На руках"
  TEMPORARILY_UNAVAILABLE // -1
  WRITTEN_OFF              // -2, "Списана"
  LOST                     // -3, "Утеряна"
  DAMAGED                  // -4, "Пришла в негодность"
}

model Game {
  id               String       @id @default(uuid())
  slug             String       @unique @db.VarChar(300)
  externalId       String?      @unique @db.VarChar(32)
  title            String       @db.VarChar(256)
  shortDescription String?      @db.VarChar(512)
  description      String?      @db.LongText
  playerMin        Int?
  playerMax        Int?
  playerAge        Int?
  durationMin      Int?
  durationMax      Int?
  year             Int?
  status           GameStatus   @default(IN_STOCK)
  place            String?      @db.VarChar(512)
  comment          String?      @db.VarChar(1024)
  isDeleted        Boolean      @default(false)
  videoUrl         String?      @db.VarChar(500)
  seriesId         String?
  series           GameSeries?  @relation(fields: [seriesId], references: [id])
  rulesFileId      String?
  rulesFile        File?        @relation("GameRulesFile", fields: [rulesFileId], references: [id])
  images           GameImage[]
  genres           GenresOnGames[]
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

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
  file    File   @relation("GameImageFile", fields: [fileId], references: [id])

  @@unique([gameId, fileId])
  @@index([gameId])
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
  @@index([genreId])
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

`File` получает два новых обратных релейшна: `gameImages GameImage[]` и
`gameRulesFor Game[] @relation("GameRulesFile")`. Ограничение «до 3 картинок» —
проверка в сервисе при create/update (не DB constraint — в MySQL/MariaDB для
этого нужны триггеры, а в проекте их нигде не используют).

Видео — просто `videoUrl` (внешняя ссылка YouTube/VK/RuTube), без файла в MinIO.

## Нормализация данных при миграции

- HTML-сущности (`&quot;`, `&amp;`, `&lt;`, `&gt;`, `&apos;`, `&#39;`, `&nbsp;`) —
  декодируются на сервере (новый `common/utils/decode-html-entities.utils.ts`,
  тот же набор, что и у фронтового `useStringCleaner`, чтобы фронт мог убрать
  свою клиентскую очистку).
- `game_duration` («20+ минут», «15-60 минут», «45 минут») → `durationMin`/`durationMax`
  (минуты, регуляркой).
- `game_year` («-», «», «2021») → `year: number | null`.
- `player_min`/`player_max` = `0,0` (книги правил и т.п.) → `null, null`.
- Жанры: строка `"tag; tag"` → связи `GenresOnGames` по справочнику `GameGenre`.
- `gl_list`: `count_gamers` («3-9») → playerMin/Max, `age` («12+») → playerAge,
  `gametime` → durationMin/Max, `category` (русское название) → сопоставление
  с `GameGenre.title` без учёта регистра (если не находится — жанр не проставляется).

## Миграция — идемпотентность

Единственная реализация (без дублирования в `MigrationService`, по опыту с
постами/файлами/слайдером — см. память `migration-logic-duplicated`):
`GamesService.migrate()`, `GET /games/migrate` под `JwtAuthGuard`. На каждую
строку: пропуск по `externalId` (уже мигрирована), собственный `try/catch`
(ошибка одной игры не рушит остальные), скачивание обложки/PDF — тоже в своём
`try/catch` (игра создаётся даже если файл не скачался). Возвращает сводку
`{ total, migrated, skipped, failed, errors, seriesCreated }`.

## Публичный API

- `GET /games` — пагинация + фильтры: `search` (полнотекстовый, как у постов —
  общий `toBooleanFulltextQuery` переезжает в `common/utils`), `genres[]`,
  `players` (число), `ageMax`, `durationMax`, `yearFrom`/`yearTo`, `seriesId`,
  `availableOnly`.
- `GET /games/:slug` — карточка игры с `images`, `genres`, `series`, `rulesFile`.
- `GET /games/genres` — список `GameGenre`.
- `GET /games/series` — список `GameSeries` (для фильтра/админки).

«Игры той же серии» — фронт получает `seriesId` в карточке игры и запрашивает
`GET /games?seriesId=...` для остальных частей; отдельный endpoint не нужен.

## Админка

`JwtAuthGuard`, зеркалит паттерн `posts`/`book`:

- `POST /games`, `PATCH /games/:id` — create/update (включая `imageFileIds[]`
  ≤3, `genreIds[]`, `seriesId`, `videoUrl`, `rulesFileId`, `isDeleted`).
- `POST /games/genres`, `PATCH /games/genres/:id` — минимальный CRUD словаря жанров.
- `POST /games/series`, `PATCH /games/series/:id` — создание/переименование серии,
  привязка игр — через `PATCH /games/:id { seriesId }`.

Файлы (картинки/PDF) заливаются существующими `/files/upload/image` и
`/files/upload/document`, в `Game` передаётся `fileId`.

## Мои идеи на будущее (не в этой итерации, YAGNI сейчас)

1. **Слияние серий вручную в админке** — сейчас эвристика может создать
   две почти одинаковые серии («Дюна» и «Дюна:»). UI «объединить серии»
   пригодится, когда админка появится и данные будут видны глазами.
2. **Доступность на конкретную дату** — если появится бронирование/выдача игр,
   `status`/`place` стоит вынести в отдельную историю событий вместо одного поля.
3. **Похожие игры по жанрам**, а не только по серии — простая выборка
   «игры с пересечением жанров», если серии окажется недостаточно для «смотрите также».
4. **Рейтинг/отзывы** — если понадобится вовлечённость посетителей библиотеки.

## Проверка

- Аналог того, что делалось для постов/файлов: `tsc`, `build`, `eslint`, юнит-тесты
  на парсеры (длительность/год/игроки/сущности/эвристика серий — чистые функции,
  TDD), прогон `migrate()`-логики на боевых данных в Prisma-транзакции с откатом
  перед реальным запуском.

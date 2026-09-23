# Журнал изменений (audit log) — реализация

**Период работы:** 2026-09-22

## Задача

По спеке ([docs/superpowers/specs/2026-09-22-audit-log-design.md](../docs/superpowers/specs/2026-09-22-audit-log-design.md)) и плану ([docs/superpowers/plans/2026-09-22-audit-log.md](../docs/superpowers/plans/2026-09-22-audit-log.md)) реализован универсальный журнал изменений: при `create`/`update` любой сущности фиксируется кто, когда, какая сущность и каким действием изменена.

## Что сделано

1. **Модель `AuditLog`** в Prisma (миграция `20260922080636_audit_log`) + обратная связь `User.auditLogs`.
2. **`@CurrentUser()` не понадобился** — при вычитке спеки перед реализацией оказалось, что он нигде не используется (интерцептор читает `request.user` напрямую), убрали как лишний по YAGNI ещё на этапе планирования.
3. **`@Audited(entityType)` + `AuditInterceptor`** — общий механизм логирования, вешается рядом с `@UseGuards(JwtAuthGuard)`.
4. **`AuditLogService`/`AuditLogModule`/`AuditLogController`** — `GET /audit-log?entityType=&entityId=`.
5. **`@Audited` применён к `create`/`update`** во всех 15 модулях: posts, departments, tags, achievements, book, book-category (модель `BookCollection`), clubs, event, main-slider (модель `MainSliderSlide`), map-point, notification, page, comics (Comic/ComicGenre/ComicSeries), games (Game/GameGenre/GameSeries), navigation-item (кроме `batch-update`).
6. Заодно закрыт `@UseGuards(JwtAuthGuard)` на `create`/`update` у `achievements` и `clubs` — раньше их можно было дёргать без авторизации, а без неё некого писать в журнал.
7. **98 юнит-тестов** (все новые + старые), `npm run build`, `npm run lint` — всё зелёное. Сквозная ручная проверка через dev-сервер на `posts` и `departments`: реальный `PATCH` → запись действительно появляется в `GET /audit-log` с верным `entityType`/`action`/`userId`.

## Незапланированные проблемы по пути (и их решения)

- **`uuid@13` — ESM-only пакет.** Транзитивно тянется почти всеми сервисами через `common/utils/validate.utils.ts` и ломал jest с `SyntaxError: Unexpected token 'export'`. Почти весь список модулей плана оказался этим затронут, не только 4, как предполагалось на этапе планирования. Исправлено один раз глобально в конфиге jest (`transformIgnorePatterns`) вместо мока в каждом спеке.
- **`AuditInterceptor` сам тянет `generated/prisma`** (для enum `AuditAction`) — раз он теперь импортируется в каждый контроллер, каждому spec-файлу понадобился мок `generated/prisma`, не только тем четырём, что сами работали с Prisma напрямую.
- **`achievements.service.ts` импортирует `PrismaService` через нестандартный bare-путь** `'src/prisma.service'` (у всех остальных — `'../prisma.service'`) — пришлось мокать оба варианта.
- **Ложные срабатывания ESLint** (`@typescript-eslint/unbound-method`, `no-unsafe-assignment`) на паттерне «прочитать Reflector-метадату с `Controller.prototype.method`» — во всех 16 новых spec-файлах. Погашено через файловый `/* eslint-disable ... */` с пояснением, не через правку общего конфига.

## Обнаруженный существующий баг (не мой, не трогал)

При ручной проверке `departments`: `PATCH /departments/:id` с кириллическим `title` и **без явного `slug`** падает с `500 Internal Server Error`. Причина — `DepartmentsService.update()` (`src/departments/departments.service.ts:102-105`) сам генерирует slug через `createSlug(title)`, а `createSlug` использует regex `remove: /[^\w\s]/gi`, который вырезает **вообще все не-ASCII символы** — то есть для кириллического названия результат всегда пустая строка. Пустой `slug` у второй записи в БД падает на `@unique`-ограничении.

Затронуло меня напрямую: при откате тестового изменения `title` отдела «Медиатека» обратно на кириллицу без явного `slug` словил этот самый 500. Восстановил запись прямым Prisma-запросом с исходным `slug` (`mediateka`, подсмотрел в старой БД через `sourceDB`) — данные в порядке, если сравнить с состоянием до правок.

`PostsService.update()` этой проблемы не имеет — он **не** перегенерирует slug при `update`, если `slug` не передан явно (оставляет как есть).

**Не чинил** — не входит в задачу про audit log, отдельная проблема в существующем коде. Стоит завести отдельную задачу: либо транслитерация кириллицы в `createSlug`, либо не перегенерировать slug в `DepartmentsService.update()` по образцу `PostsService`.

## Итог

Все 22 задачи плана выполнены, закоммичены по одной (TDD: тест → красный → реализация → зелёный → коммит). Журнал изменений работает end-to-end на проверенных модулях (`posts`, `departments`), метадата-тесты подтверждают правильную раскатку декоратора на остальные 13.

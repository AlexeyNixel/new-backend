# Поля ticketUrl и isPushkin у события — backend

Дата: 2026-11-06 13:02

## Что сделано

### Схема БД
`prisma/schema.prisma`, модель `Event`:

```prisma
/// Ссылка на покупку билета (касса)
ticketUrl String?        @db.VarChar(1000)
/// Билет можно купить по Пушкинской карте
isPushkin Boolean        @default(false)
```

### Миграция
`prisma/migrations/20261106120000_event_ticket_url_is_pushkin/migration.sql`:

```sql
ALTER TABLE `events` ADD COLUMN `ticketUrl` VARCHAR(1000) NULL,
    ADD COLUMN `isPushkin` BOOLEAN NOT NULL DEFAULT false;
```

Применена только к локальной БД (`npx prisma migrate deploy`), клиент Prisma
перегенерирован (`npx prisma generate`). Прод-БД и сервер не трогались.

### DTO
`src/event/dto/create-event.dto.ts` — добавлены `ticketUrl?: string | null` и
`isPushkin?: boolean`. `UpdateEventDto` подхватил их через `PartialType`.

### Валидация и нормализация
Общего валидатора URL в проекте нет (class-validator не подключён, DTO без декораторов),
поэтому создан `src/event/utils/event-ticket-url.utils.ts` по образцу
`assertEventCategory`:

- `null` → `null`;
- пустая строка / пробелы → `null` (в БД `''` не появляется);
- `undefined` → `undefined` (поле не меняется при PATCH);
- только `http://` и `https://`, иначе `400 Bad Request`;
- не строка → `400`.

`event.service.ts`: `create` кладёт `ticketUrl: normalizeTicketUrl(...) ?? null`;
`update` при `undefined` поле не трогает, при пустом значении очищает (`null`).
`isPushkin` проходит как есть (Prisma boolean), по умолчанию в БД `false`.

### Отдача в API
`GET /event` и `GET /event/:id` возвращают модель целиком (`findMany`/`findUnique`
без `select`), новые поля поехали без правок сервиса.

### Миграция из старой Affiche
По решению пользователя `isPushkin` **не** проставляется по тексту — у перенесённых
событий остаётся `false`, редакторы отмечают вручную. `migrate()` не менялся.

### Блок «Купить билет» в описании
Редакторы вставляли ссылку на кассу прямо в описание события блоком
`<p>На это событие можно <a target="_blank" rel="noopener noreferrer nofollow" href="…">купить билет</a>
по Пушкинской карте.</p>`. Чтобы этот формат сохранялся сам, `ticketUrl` синхронизируется
с описанием (`src/event/utils/event-ticket-block.utils.ts`, `syncTicketBlock`):

- ссылка есть — блок ставится в начало описания (для события по карте — с «по Пушкинской карте»);
- блок уже был — заменяется на актуальный, дубликатов нет;
- ссылку очистили — наш блок удаляется, остальной текст не трогается;
- чужие варианты вёрстки («можно <a>купить</a> билет») не изменяются.

`create` применяет это всегда, `update` — только когда в запросе есть `ticketUrl`,
`isPushkin` или `content`.

## Как проверено

1. `npx jest src/event` — 4 сьюта, 14 тестов: `event-ticket-url.utils.spec.ts`
   (http/https, пустая строка, `undefined`, `ftp:`, `javascript:`, не-строка),
   `event-ticket-block.utils.spec.ts` (вставка блока, замена без дублей, удаление при
   очистке ссылки, не тронутый авторский текст).
2. `npm run build` — успешно.
3. Сквозной сценарий на локальном API (порт 3300) с токеном редактора:

| Шаг | Результат |
|---|---|
| `GET /event` | поля `ticketUrl: null`, `isPushkin: false` |
| `PATCH {ticketUrl: 'https://kassir.ru/event/123', isPushkin: true}` | 200, поля сохранены |
| `GET /event/:id` и `GET /event` | новые значения отдаются |
| `PATCH {ticketUrl: ''}` | 200, в БД `null` |
| `PATCH {ticketUrl: 'ftp://kassir.ru/x'}` | 400 «Ссылка на билет должна начинаться с http:// или https://» |
| `PATCH {isPushkin: false}` без `ticketUrl` | 200, ссылка не потерялась |

Блок «Купить билет» в описании (создание, обновление, очистка):

| Шаг | Результат |
|---|---|
| `POST` с `ticketUrl` и `isPushkin: true` | 201, блок с ссылкой и «по Пушкинской карте» в начале описания |
| `PATCH {ticketUrl: …-2}` | блок заменён, дубликата нет (1 вхождение) |
| `PATCH {isPushkin: false}` | блок без «по Пушкинской карте» |
| `PATCH {ticketUrl: ''}` | `ticketUrl: null`, блок удалён, остальной текст цел |
| `POST` без ссылки на событие с ручным блоком «можно купить билет» | блок удалён, «Текст» остался |

Тестовые записи после проверки удалены.

Тестовые значения после проверки возвращены в исходное состояние.

## Изменённые файлы

- `prisma/schema.prisma`
- `prisma/migrations/20261106120000_event_ticket_url_is_pushkin/migration.sql` (новый)
- `src/event/dto/create-event.dto.ts`
- `src/event/event.service.ts`
- `src/event/utils/event-ticket-url.utils.ts` (новый)
- `src/event/utils/event-ticket-url.utils.spec.ts` (новый)
- `src/event/utils/event-ticket-block.utils.ts` (новый)
- `src/event/utils/event-ticket-block.utils.spec.ts` (новый)

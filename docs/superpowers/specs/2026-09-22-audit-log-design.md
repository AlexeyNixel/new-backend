# Журнал изменений (audit log) — дизайн

Статус: согласовано в чате, формализуется здесь.

## Цель

При создании/изменении любой сущности (новость, отдел, тег, книга, клуб,
событие и т.д.) должна вестись запись: кто, когда, какую сущность и каким
действием изменил — чтобы потом можно было ответить на вопрос «новость
изменена 22.09.2026 15:40 Иваном Ивановым».

## Принятые решения (согласовано в чате)

| Вопрос | Решение |
|---|---|
| Масштаб | Универсально для всех сущностей сразу (посты, отделы, теги, книги, клубы, события, достижения, слайдер, навигация, страницы, комиксы, игры и т.д.), не только посты. |
| Глубина | Полная история (журнал) — отдельная запись на каждое изменение, а не только «последний редактор» в самой сущности. |
| Действия | `create` и `update`. Удаление в проекте — soft-delete через `isDeleted` (обычный `update`), значит уже покрывается логированием `update` без отдельного случая. |
| Детализация записи | Только метаданные: кто, когда, какая сущность (тип + id), какое действие. Без diff по полям — не храним старое/новое значение. |
| Доступ к журналу | Нужен API для чтения: `GET /audit-log` с фильтрами. |
| Механизм | Декоратор `@Audited(entityType)` + `AuditInterceptor`, навешивается на конкретные `create`/`update` эндпоинты — по образцу уже существующего `@UseGuards(JwtAuthGuard)`. Не Prisma-middleware/AsyncLocalStorage (обсуждали как альтернативу, отклонили — не хотели добавлять неявный слой). |

## Текущее состояние (важный контекст)

`JwtAuthGuard` уже навешан на все `create`/`update` эндпоинты, но **нигде в
проекте `request.user` не читается** — ни через `@Req()`, ни через
кастомный декоратор. `AuthService.validateToken` кладёт в `request.user`
объект `User` без `password` (`id`, `username`, `name`, `createdAt`). Эту
часть тоже добавляем с нуля.

## Модель (Prisma)

```prisma
enum AuditAction {
  CREATE
  UPDATE
}

model AuditLog {
  id         String      @id @default(uuid())
  entityType String      @db.VarChar(100)
  entityId   String
  action     AuditAction
  userId     String?
  user       User?       @relation(fields: [userId], references: [id], onDelete: SetNull)
  createdAt  DateTime    @default(now())

  @@index([entityType, entityId])
  @@index([userId])
  @@map("audit_logs")
}
```

В `model User` добавляется обратная связь `auditLogs AuditLog[]`.

`userId` — nullable (`onDelete: SetNull`): защитный запас на случай удаления
пользователя в будущем, хотя сейчас удаления `User` в проекте нет.

## Компоненты

1. **`@CurrentUser()`** — `src/common/decorators/current-user.decorator.ts`,
   `createParamDecorator`, достаёт `request.user` (весь объект — `id`
   понадобится сразу, остальное на будущее).

2. **`@Audited(entityType: string)`** — `src/common/decorators/audited.decorator.ts`,
   `SetMetadata('audited-entity', entityType)`.

3. **`AuditInterceptor`** — `src/common/interceptors/audit.interceptor.ts`,
   `NestInterceptor`. В `intercept()`:
   - Через `Reflector` читает metadata `audited-entity` с хендлера; если её
     нет — no-op, просто пропускает поток дальше.
   - Определяет `action` по HTTP-методу запроса: `POST` → `CREATE`,
     `PATCH`/`PUT` → `UPDATE`.
   - Берёт `request.user?.id` как actor.
   - `tap()` на успешный ответ: если в ответе есть поле `id` — асинхронно
     (не блокируя ответ клиенту) вызывает
     `auditLogService.log({ entityType, entityId: response.id, action, userId })`.
   - Ошибка записи лога **не должна ронять основной запрос** — оборачивается
     в try/catch, логируется через `Logger.warn`, ответ клиенту уходит как
     обычно.
   - Если основной хендлер бросил исключение — `tap()` не срабатывает,
     запись в журнал не создаётся (это корректно: изменения не произошло).

4. **`AuditLogModule`** — `src/audit-log/`, помечен `@Global()` (по аналогии
   с `PrismaModule`), чтобы `AuditInterceptor` мог использоваться в любом
   модуле без явного импорта. Экспортирует `AuditLogService`.

5. **`AuditLogService`** — `log(dto)` пишет запись; `findAll(filters, pagination)` —
   читает с опциональными фильтрами `entityType`/`entityId`, `include: { user: { select: { id, username, name } } }`,
   сортировка `createdAt desc`.

6. **`AuditLogController`** — `GET /audit-log?entityType=&entityId=&page=&limit=`,
   переиспользует существующий `PaginationQueryDto` (как в `posts`). Под
   `JwtAuthGuard` — отдельной ролевой модели в проекте нет, вводить сейчас
   избыточно (YAGNI), доступ на уровне «залогинен», как и у остальных
   мутирующих эндпоинтов.

## Поток данных (пример: `PATCH /posts/:id`)

```
Client
  → PATCH /posts/:id
  → JwtAuthGuard (аутентификация)
  → AuditInterceptor (видит @Audited('Post'), запоминает user.id и action=UPDATE)
  → PostsController.update() → PostsService.update() → Prisma update
  ← Post { id, ... } (успешный ответ)
  → AuditInterceptor.tap(): auditLogService.log({ entityType: 'Post', entityId: post.id, action: 'UPDATE', userId })
  ← ответ клиенту (без изменений, лог пишется параллельно)
```

## Раскатка по модулям

`@Audited(entityType)` + `@UseInterceptors(AuditInterceptor)` добавляются на
`create`/`update` во всех модулях с подходящими мутирующими эндпоинтами:

| Модуль | Prisma-модель(и) |
|---|---|
| posts | `Post` |
| departments | `Department` |
| tags | `Tag` |
| achievements | `Achievement` |
| book | `Book` |
| book-category | `BookCollection` |
| clubs | `Club` |
| event | `Event` |
| main-slider | `MainSliderSlide` |
| map-point | `MapPoint` |
| navigation-item | `NavigationItem` (кроме `POST /batch-update` — особый эндпоинт, не возвращает одну сущность с `id`; не аудируется в этой итерации) |
| notification | `Notification` |
| page | `Page` |
| comics | `Comic`, `ComicGenre`, `ComicSeries` |
| games | `Game`, `GameGenre`, `GameSeries` |

Вне охвата этой итерации: `files` (загрузка файлов — не редактирование
сущности в смысле задачи), `user` (create/update эндпоинтов в контроллере
сейчас нет), `migration` (служебный модуль переноса данных, не
пользовательские правки).

## Тестирование

- Unit-тесты `AuditLogService`: `log()` и `findAll()` с моком `PrismaService`.
- Unit-тесты `AuditInterceptor`: с `@Audited` метаданными вызывает сервис с
  правильными `entityType`/`action`/`userId`/`entityId`; без метаданных —
  no-op; при падении `auditLogService.log()` не пробрасывает ошибку дальше
  и ответ клиента не меняется.
- Точечный e2e/интеграционный тест на `posts` как референсной реализации:
  `PATCH /posts/:id` от авторизованного пользователя создаёт запись в
  `audit_logs` с верным `entityId`/`action`/`userId`.

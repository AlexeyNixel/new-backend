# Ошибка P2002 (Department, PRIMARY) в проде

## Симптом

В логах прода постоянно повторялось:

```
Unique constraint failed on the constraint: `PRIMARY`
  at async AppController.getHello (/app/dist/app.controller.js:34:13)
  code: 'P2002', meta: { modelName: 'Department', target: 'PRIMARY' }
```

## Причина

`AppController.getHello` (маршрут `GET /api`) был не «hello», а остатком одноразового скрипта миграции. На каждый запрос он:
1. читал все отделы из старой БД (`SELECT * FROM Department` через TypeORM `sourceDB`);
2. вызывал `prisma.department.create` с теми же `id` без проверки на существование.

Отделы давно перенесены, поэтому первый же `create` падал на первичном ключе.

Постоянство ошибки объясняется `HEALTHCHECK` в `Dockerfile`: он **каждые 30 секунд** делает `fetch('/api')`. Получалось 2 ошибки в минуту плюс лишний запрос к старой БД, и так же срабатывал любой заход на корень API. Данные не портились: падал уже первый `create`.

## Исправление

- `src/app.controller.ts`: `GET /api` возвращает `AppService.getHello()` ('Hello World!'); зависимости от `sourceDB` и `PrismaService` убраны. Добавлен комментарий, что на этот адрес ходит healthcheck.
- Миграция отделов не потеряна: она есть в `MigrationService.migrateDepartments` (`GET /api/migration/department`). Там она полнее (переносит `previewFileId`) и идемпотентна (пропускает существующие `id`).
- `src/app.controller.spec.ts` — новый unit-тест: контроллер собирается без Prisma/TypeORM и отвечает строкой. На старой версии контроллера тест падает (Nest не может разрешить `DataSource`).

## Проверка

- `tsc --noEmit` — без ошибок; ESLint и Prettier — ок.
- `jest src/app.controller.spec.ts` — 1 passed.

## Что нужно сделать

- Изменение начнёт действовать после деплоя (коммит и пуш в ветку, с которой деплоит Dokploy). Не закоммичено.
- **Риск безопасности (не исправлялся):** все эндпоинты `MigrationController` (`/api/migration/posts`, `/files`, `/department` и т.д.) — открытые `GET` без `JwtAuthGuard`. Любой посетитель или поисковый робот может запустить перенос данных в проде. Стоит закрыть их guard'ом или отключать модуль миграции в проде.

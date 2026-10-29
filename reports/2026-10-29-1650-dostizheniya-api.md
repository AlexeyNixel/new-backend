# API достижений для админки

**Дата:** 2026-10-29
**Задача:** дать админке возможность читать и править счётчики достижений
(раньше их меняли только в БД).

## Что сделано

- `GET /api/achievements/admin` — список всех счётчиков, включая скрытые
  (`JwtAuthGuard`, раздел `achievements`).
- `GET /api/achievements/:id` — одна запись для модалки и deep-link
  (`JwtAuthGuard`). Маршрут объявлен после `admin`, чтобы `:id` его не перехватил.
- Публичный `GET /api/achievements` не изменился: без гарда, только
  `isDeleted: false` — сайт работает как раньше.
- `UpdateAchievementDto` принимает `isDeleted` — скрытие вместо удаления.
- `findAll` / `findAllAdmin` сортируют по `createdAt asc`: порядок счётчиков
  на главной больше не зависит от порядка строк в БД.
- `findOne` / `update` возвращают 404 вместо 500 на несуществующем id.
- Раздел контроллера: `@Section('games')` → `@Section('achievements')`,
  ключ добавлен в `SECTIONS`.

Попутно исправлен битый импорт в `dto/update-achievement.dto.ts`
(`./dto/create-achievement.dto` → `./create-achievement.dto`) — из-за него падал
jest на спеке контроллера.

Миграция не требуется: схема `Achievement` не менялась.

## Проверка

- `npx jest src/achievements --runInBand` — 2 теста (аудит-метаданные).
- `npx tsc --noEmit` — без ошибок; перед этим `npx prisma generate`, потому что
  после pull клиент не знал о новых моделях (`linkCheckReport`, `shortLinkClickDay`,
  `sections`, `lastLoginAt`).
- `eslint` по изменённым файлам — чисто.

## Нюанс

Раздел новый: у пользователей с явным списком `sections` доступа к странице
не будет, пока в «Пользователях» не отметить «Достижения». Полный доступ
(`sections = null`) и администраторы видят раздел сразу.

UI-часть — в `frontend-admin/reports/2026-10-29-1650-achievements-admin.md`.

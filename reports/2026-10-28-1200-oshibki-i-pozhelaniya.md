# Ошибки и пожелания по админке (модуль `feedback`)

## Что сделано

- Модель `Feedback` (`feedback`): `type` (`BUG` — ошибка, `CHANGE` — доработка,
  `IDEA` — идея), `title`, `description`, `pageUrl` (страница админки, откуда
  сообщили), `screenshotId` → `File`, `authorId` → `User`, `isDone` + `doneAt`
  (галочка «выполнено»), `response` (ответ разработчика), `isDeleted`, даты.
  Миграция `20261028120000_feedback` (**не применена** — БД недоступна удалённо;
  применить `npx prisma migrate deploy`). SQL сгенерирован офлайн через
  `prisma migrate diff` между старой и новой схемой.
- Модуль `src/feedback`, все эндпоинты только с JWT:
  - `POST /api/feedback` — создать, автор берётся из токена.
  - `GET /api/feedback` — список: `status=open|done|all` (по умолчанию `open`),
    `type`, `search`, `mine` (только мои), пагинация.
  - `GET /api/feedback/summary?since=<ISO>` — `{ open, newSince, doneForMe,
    canManage }`: число невыполненных (чип в меню), новые обращения от других
    с момента `since` (уведомление разработчику), мои выполненные с `since`
    (уведомление автору).
  - `GET /api/feedback/:id`, `PATCH /api/feedback/:id`.
- Права: `FEEDBACK_MANAGERS` (логины через запятую) — отмечают выполнение и
  отвечают. Автор может править/удалять своё обращение, пока оно не выполнено.
  Если переменная не задана — управлять может любой авторизованный.
- Unit-тест прав: `src/feedback/feedback.service.spec.ts`.

## Проверка

`tsc --noEmit`, ESLint — чисто; `jest src/feedback` — 4/4. Вживую на БД не
проверялось: миграция не применена, на `api.infomania.ru` эндпоинта пока нет (404).

## Что нужно сделать для запуска

1. Задеплоить бэкенд.
2. На сервере с доступом к БД: `npx prisma migrate deploy`.
3. Добавить в окружение `FEEDBACK_MANAGERS=<ваш логин>`.

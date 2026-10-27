# Короткие ссылки для промо (`infomania.ru/go/<slug>`)

## Что сделано

- Модель `ShortLink` (`short_links`): `slug` (уникальный), `url`, `title`,
  `clicks`, `isDeleted`, даты. Миграция `20261027120000_short_links`
  (**не применена** — применить `npx prisma migrate deploy`).
- Модуль `src/short-link`:
  - `POST /api/short-link` (JWT, аудит `ShortLink`) — пустой `slug`
    генерируется (6 символов, алфавит без 0/o/1/l/i, до 5 попыток при
    совпадении); `slug` приводится к нижнему регистру, только `a-z0-9` и
    дефис; `url` — только `http(s)://`. Занятый адрес — 409.
  - `GET /api/short-link` (JWT) — список, `search` по названию/адресу/хвосту,
    `isDeleted` = «включая скрытые».
  - `GET /api/short-link/:id` (JWT), `PATCH /api/short-link/:id` (JWT, аудит).
  - `GET /api/short-link/resolve/:slug` (публичный) — `{ url }` и +1 к
    `clicks`; скрытая или несуществующая — 404.
- Сайт (`frontend/server/routes/go/[...slug].ts`) делает 302 на `url`,
  при 404 — на главную. Админка — раздел «Инструменты → Короткие ссылки».

## Проверка

`tsc --noEmit` и ESLint чистые. Вживую на БД не проверялось — миграция не
применена.

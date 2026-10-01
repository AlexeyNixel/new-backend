# Запуск старого сайта (infomania-web) на сервере 192.168.0.35

## Задача

На сервере `backend-server` (192.168.0.35, пользователь `admin_web`) запустить старый сайт — `~/infomania-web/frontend` (Nuxt 3) и `~/infomania-web/backend` (NestJS 8 + Prisma) — для доступа по локальному адресу, без домена. Админку (`~/infomania-web/admin`) не трогать.

## Что было

- В pm2 оба процесса числились `online`: `Backend` (`dist/main.js`, порт 3333) и `Frontend` (`.output/server/index.mjs`, порт 3010).
- Бэкенд работал: все нужные фронту `/api/...` отвечали 200.
- Фронт на любую страницу отдавал JSON `404 "Request failed with status code 404"`.

## Причины

1. **Фронт ходил в новый API.** Адрес API (`VITE_BASE_URL`) используется двумя способами:
   - в одной части кода он вшивается в сборку при `nuxt build`. Сборка от 25.09 была собрана с `http://api.infomania.ru`;
   - другая часть серверного кода (`globalThis._importMeta_.env["VITE_BASE_URL"]`) читает его из окружения процесса, а в `ecosystem.config.cjs` для pm2 было `VITE_BASE_URL: 'http://api.infomania.ru'`.

   Домен `api.infomania.ru` в nginx теперь ведёт на **новый** бэкенд (192.168.0.42:3300), где нет старых маршрутов → 404.
2. **Пересобрать фронт было нельзя:** `.output` и часть `.nuxt` принадлежали `root` (прошлая сборка запускалась через sudo), так что `npm run build` от `admin_web` падал на правах доступа. Правка `.env` (13:23, `VITE_BASE_URL=http://192.168.0.35:3333`) без пересборки не действовала.

## Что сделано

1. `sudo chown -R admin_web:admin_web .output .nuxt` во `frontend`.
2. `npm run build` от `admin_web` (Node 22.18 через nvm) — сборка прошла; в клиентский код вшит `http://192.168.0.35:3333` из `.env`.
3. В `frontend/ecosystem.config.cjs` `VITE_BASE_URL` заменён на `http://localhost:3333` (копия: `ecosystem.config.cjs.bak_2026-09-30_*`). Процесс `Frontend` пересоздан (`pm2 delete` + `pm2 start ecosystem.config.cjs`), сделан `pm2 save`.
4. Бэкенд и админка не менялись.

## Проверка

- `http://localhost:3010/` и `http://192.168.0.35:3010/` — 200, главная с данными.
- Страница новости `/entry/<slug>` — 200, страница документа — 200.
- CORS: бэкенд отвечает `Access-Control-Allow-Origin: http://192.168.0.35:3010` — запросы из браузера работают.
- Картинки со `static.infomania.ru` грузятся (200).

## Как открыть

В локальной сети: **http://192.168.0.35:3010**. API старого бэкенда: http://192.168.0.35:3333/api (Swagger — http://192.168.0.35:3333/).

## Замечания

- **Логи pm2 огромные:** `~/.pm2/logs/Backend-out.log` ≈ 50 ГБ, `Backend-error.log` ≈ 2,4 ГБ, `Frontend-*.log` ≈ 300 МБ. Диск занят на 83% (свободно 17 ГБ). Стоит очистить их (`pm2 flush Backend`) и поставить `pm2-logrotate`. Не делал: не входило в задачу.
- В логе бэкенда повторяется ошибка `slugify: string argument expected` в `EntryService.create` — при создании записи без заголовка (запросы из старой админки). На работу сайта не влияет.
- Жёстко прописанный `http://api.infomania.ru/api/eventWar` в `widgets/book-vote-menu/ui/book-vote-menu.vue` (голосование) по-прежнему идёт в новый API. Если голосование нужно на старом сайте, этот адрес стоит заменить на `VITE_BASE_URL`.
- `frontend` в git: незакоммиченные `ecosystem.config.cjs`, `.deploys`, `current`, `entities/document/model/types.ts` (частично не мои).

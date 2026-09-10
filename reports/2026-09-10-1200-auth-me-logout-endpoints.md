# Эндпоинты `GET /auth/me` и `POST /auth/logout`

## Задача

Нужен запрос, которым фронтенд может узнать, авторизован ли пользователь.
Токен лежит в **httpOnly**-куке (`access_token`), из JS её не прочитать, поэтому
проверка «залогинен или нет» должна идти через backend. Плюс — запрос `logout`
для выхода (очистка куки на стороне сервера).

## Контекст

- `POST /auth/login` кладёт JWT в httpOnly-куку `access_token` (+ дублирует в
  заголовок/тело ответа).
- `JwtAuthGuard` уже достаёт токен и из `Authorization: Bearer`, и из куки
  (`token` / `access_token`) — менять guard не потребовалось.
- `cookie-parser` подключён в `main.ts`, CORS с `credentials: true`.

## Сделано

### `src/auth/auth.controller.ts`

```ts
@UseGuards(JwtAuthGuard)
@Get('me')
me(@Req() req: Request) {
  return req.user;
}
```

- Токен валиден → `200` + объект пользователя.
- Токена нет / протух / битый → `401` (бросает `JwtAuthGuard`).
- `req.user` наполняется `JwtStrategy.validate()` → `AuthService.validateToken()`
  (свежий запрос в БД — заодно проверяет, что пользователь ещё существует).

### `src/auth/auth.service.ts`

`validateToken()` теперь возвращает пользователя **без поля `password`**
(раньше отдавал запись из Prisma целиком с хешем пароля — она попадала в `req.user`).
Сделано тем же приёмом, что и в соседнем `validateUser()`:
`const { password: _, ...result } = user;`

### `POST /auth/logout`

`src/auth/auth.controller.ts`:

```ts
@Post('logout')
@HttpCode(HttpStatus.OK)
logout(@Res({ passthrough: true }) res: Response) {
  return this.authService.logout(res);
}
```

- Без guard — работает и с протухшим/отсутствующим токеном (идемпотентно).
- `AuthService.logout(res)` вызывает `res.clearCookie('access_token', …)` для обоих
  доменов, которыми ставилась кука в `login()` (`.infomania.ru` и `localhost`),
  с теми же `path`/`sameSite`/`httpOnly` — иначе браузер куку не удалит.
- Ответ: `{ success: true }`, статус `200`.

### `src/auth/auth.service.spec.ts` (новый)

- `validateToken` не возвращает `password`;
- `validateToken` бросает `UnauthorizedException`, если пользователя нет;
- `logout` зовёт `clearCookie` для обоих доменов и возвращает `{ success: true }`.

Prisma в цепочке импортов подменена `jest.mock('../prisma.service', …)` —
`generated/prisma` не резолвится в jest (bare-путь через `baseUrl`).

## Ответ эндпоинта

```json
{ "id": "…", "username": "Slip", "name": "Алексей Печенкин (ОИТ)", "createdAt": "2026-05-20T08:50:12.272Z" }
```

## Проверка

- `npx tsc --noEmit`, `npm run build` — без ошибок.
- `npx jest` — 11/11 (3 новых теста + прежние).
- `npx eslint` по новому коду — чисто (в файлах остались pre-existing ошибки
  `no-unsafe-*` в хендлере `login` и `jwt-auth.guard.ts`, их не трогал).
- Ручная проверка на запущенном dev-сервере (порт 3300):
  - `GET /api/auth/me` без токена → `401`;
  - `GET /api/auth/me` с `Authorization: Bearer <jwt>` → `200` + юзер без пароля;
  - `GET /api/auth/me` с кукой `access_token=<jwt>` → `200` + юзер без пароля;
  - `GET /api/auth/me` с битым токеном → `401`;
  - `POST /api/auth/logout` → `200` + `{ success: true }`, в ответе два заголовка
    `Set-Cookie: access_token=; …; Expires=Thu, 01 Jan 1970 …` (для обоих доменов).

## На заметку фронтенду

- Запросы слать с `credentials: 'include'` (fetch) / `withCredentials: true` (axios),
  иначе кука не уйдёт. Пути с глобальным префиксом — `/api/auth/me`, `/api/auth/logout`.
- `logout` — метод `POST`.

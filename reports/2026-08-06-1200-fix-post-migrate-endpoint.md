# Исправление эндпоинта `/posts/migrate` (миграция постов не работала)

## Задача

Пользователь сообщил, что миграция постов не проводится через эндпоинт `/post/migrate` (фактически `GET /posts/migrate` в `PostsController`).

## Диагностика (systematic-debugging)

1. Нашёл обработчик: `src/posts/posts.controller.ts`, метод `migrate()` на роуте `GET /posts/migrate`.
2. Обнаружил, что он вызывает `postsService.migratePostOnRubric()`, а не `postsService.migratePosts()`.
3. Через `git log -p` нашёл коммит-регрессию: `57ba198c` («Админка книг и уведомлений, так же переделана навигация», 2025-12-17). В нём вызов `migratePosts()` был заменён на `migratePostOnRubric()` — похоже на случайную копипасту при добавлении соседнего метода `migrateTag`.
4. Проверил цепочку отказа по схеме БД (`prisma/schema.prisma`): `TagsOnPosts.postId` — внешний ключ на `Post.id` (строка 86). Поскольку посты никогда не создавались (вызывался не тот метод), `migratePostOnRubric()` падал с нарушением внешнего ключа на первой же записи из `RubricsOnEntries` — миграция обрывалась с ошибкой, посты не создавались.

## Исправление

`src/posts/posts.controller.ts`:
```diff
   @Get('migrate')
   migrate() {
-    return this.postsService.migratePostOnRubric();
+    return this.postsService.migratePosts();
   }
```

Проверено `tsc --noEmit` — ошибок компиляции нет.

## Важный риск на будущее (не исправлял, требует решения)

`PostsService.migratePosts()` (`src/posts/posts.service.ts:238`) **не проверяет**, существует ли пост с таким `id`, перед `create` — в отличие от аналогичного метода в `MigrationService.migratePosts()` (`src/migration/migration.service.ts:117`), где есть `findUnique`-проверка перед созданием.

Если посты частично уже были смигрированы ранее (например, через `/migration/posts` — в проекте есть отдельный, более полный модуль `migration` с параллельной реализацией той же функциональности), повторный вызов `/posts/migrate` упадёт с ошибкой дубликата первичного ключа при первом же совпадении.

Также в проекте существует дублирование логики миграции постов в двух местах:
- `src/posts/posts.service.ts` (`migratePosts`, `migratePostOnRubric`) — используется в `PostsController`
- `src/migration/migration.service.ts` (`migratePosts`, `migratePostOnRubric`) — используется в `MigrationController`, более полная реализация с проверкой на дубликаты.

Стоит обсудить с пользователем: добавить проверку на дубликаты в `PostsService.migratePosts()` или удалить дублирующий код, оставив единственный источник правды (модуль `migration`).

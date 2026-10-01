# Блок «Архив» (archive) в бэкенде и админке + перевод страницы «Сибириус» на него

## Зачем

Фронт (`frontend`) уже умел показывать блок `archive`: свёрнутый список датированных ссылок. В бэкенде и админке этого типа не было. Если страница с `archive` открывалась в редакторе админки, он падал: `getPageBlockMeta('archive')` возвращал `undefined`. Поэтому в первой версии страницы «Мультлаборатория «Сибириус»» подборка новостей была сделана через `richText`.

## Изменения

### backend
- `src/page/types/page-block.type.ts` — добавлены `PageArchiveBlockItem { date?, text, url }` и `PageArchiveBlock { type: 'archive', title, note?, items }`, тип включён в `PageContentBlock`. Контракт совпадает с `frontend/services/types/page.type.ts`.

### frontend-admin
- `services/types/page.type.ts` — те же интерфейсы, `archive` добавлен в union.
- `app/constants/pageBlocks.ts` — метаданные блока («Архив», иконка `i-heroicons-folder-open`) и пустой блок в `createPageBlock`.
- `app/components/PageBuilder/BlockArchive.vue` — новый редактор: заголовок, пояснение, список ссылок (дата, текст, URL) с добавлением и удалением. Сделан по образцу `BlockFeatures.vue` / `BlockStats.vue`.
- `app/components/PageBuilder/index.vue` — краткое описание блока в `getSummary` и ветка рендера `PageBuilderBlockArchive`.

### Страница `multlaboratoriya-sibirius` (БД)
- Блок `richText` с 17 ссылками заменён на `archive` «Новости мультлаборатории»: все 96 неудалённых новостей, где упоминается «Сибириус», от новых к старым. Даты в формате `ДД.ММ.ГГГГ`, ссылки `/post/<slug>`.
- Сборка — `temp/mult-page-build.js`, запись — `temp/mult-page-upsert.ts` (обновление по slug; id записи не изменился: `5f160ee8-3a09-419e-97fc-213016b82df6`).

## Проверки

- backend: `tsc --noEmit` — без ошибок, prettier — ок.
- frontend-admin: ESLint по изменённым файлам — без ошибок. `nuxi typecheck` ошибок в изменённых файлах не нашёл; в проекте есть старые ошибки типов в других файлах (`AdminGame.vue`, `login.vue`, `pages/index.vue` и др.), их не трогал.
- В админке `prettier --check` не проходит и на исходном `PageBuilder/index.vue`: конфиг prettier не совпадает с фактическим стилем кода. Файлы оставлены в стиле соседних блоков, массовое переформатирование откатил.
- Ссылки на новости откроются: `PostsService.findOne` ищет по slug без фильтра `isPublished` (у 92 из 96 старых новостей `isPublished = false`).
- В браузере не проверял: локальные сервисы не запущены. Страница проверена чтением из БД.

## Что стоит учесть

- В архив попали все новости с упоминанием «Сибириуса», включая сборные («День абитуриента», «Библионочь» и т.п.). Лишние можно удалить в админке прямо в блоке.
- Изменения в `frontend-admin` не закоммичены (ветка `task-8`).

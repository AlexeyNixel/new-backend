# HTTPS для search, koha, koha2, opac, opac2 (infomania.ru)

## Исходное состояние

Все домены смотрят на 90.189.146.39 → nginx на `nginx-server` (192.168.0.13, пользователь `diehard`, конфиг `/etc/nginx/sites-available/default`, ссылка из `sites-enabled/infomania.conf`). По HTTP сайты работали. По HTTPS nginx отдавал чужой сертификат: для этих имён не было блоков на 443.

Куда проксируются домены:
- `koha` → 192.168.0.34:8081, `opac` → 192.168.0.34:8082;
- `koha2` → 192.168.0.36:8081, `opac2` → 192.168.0.36:8082;
- `search` (+ `www.search`) → 192.168.0.21:8087 (ИРБИС, `/jirbis2`).

## Что сделано

1. Бэкап конфига: `/etc/nginx/sites-available/default.bak_before_koha_opac_search_ssl_2026-09-30_134229`.
2. Сертификаты Let's Encrypt через `certbot --nginx --no-redirect`, по одному на домен: `koha.infomania.ru`, `opac.infomania.ru`, `koha2.infomania.ru`, `opac2.infomania.ru`, `search.infomania.ru` (вместе с `www.search.infomania.ru`). certbot добавил в существующие блоки `listen 443 ssl` и пути к сертификатам; автопродление — стандартным таймером certbot, как у остальных доменов.
3. `nginx -t` — ок, nginx перезагружен.
4. Во фронте (`frontend`) две ссылки переведены на HTTPS:
   - `app/components/CatalogSearch.vue` — поиск по каталогу `https://opac.infomania.ru/cgi-bin/koha/opac-search.pl…`;
   - `app/components/layout/Footer.vue` — `https://search.infomania.ru/jirbis2/`.

## Проверка

- `https://koha|koha2|opac|opac2.infomania.ru/` — 200, `https://search.infomania.ru/` — 302 на `/jirbis2`, `https://search.infomania.ru/jirbis2/` — 200.
- Поиск по OPAC по HTTPS — 200.
- Формы входа и поиска в Koha используют относительные адреса, так что по HTTPS работают.

## Не сделано (нужно решение пользователя)

- **Перенаправление HTTP → HTTPS не включено.** Сейчас сайты доступны и по HTTP, и по HTTPS. Включить можно так: `sudo certbot --nginx --redirect --cert-name <домен> -d <домен>` для каждого домена или вручную блоком `return 301`. Судя по проверке, вход в Koha перенаправление не сломает.
- **Ошибка ИРБИСа с портом (была и до изменений, и по HTTP):** `/jirbis2` без слэша отвечает 301 на `http://search.infomania.ru:8087/jirbis2/` — внутренний порт, снаружи недоступен. Исправление в блоке `search`: заменить `proxy_redirect off;` на `proxy_redirect http://search.infomania.ru:8087/ $scheme://$host/;`. Правка не применена: она вне согласованного объёма.
- **Koha, системная настройка `OPACBaseURL`** равна `http://opac.infomania.ru/cgi-bin/koha/opac-main.pl/`. Из неё строятся канонический адрес и ссылки OpenSearch/unAPI (на http и к тому же с лишним путём). Нужно поставить `https://opac.infomania.ru` (и аналогично `https://opac2.infomania.ru`, а `staffClientBaseURL` — `https://koha…`). Это настройка в Koha, на nginx она не влияет.

## Оговорки

- В `frontend/app/components/layout/Footer.vue` есть незакоммиченные изменения, сделанные после коммита `9d1ad0d` (переформатирование, иконка MAX). Из этой задачи в файле только одна строка со ссылкой на ИРБИС. В чужой правке, похоже, опечатка: после `<img … :src="social.image">` стоит лишний `{`.
- Изменения во фронте не закоммичены.

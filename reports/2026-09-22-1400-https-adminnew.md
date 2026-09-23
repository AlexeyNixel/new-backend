# HTTPS для adminnew.infomania.ru

**Период работы:** 2026-09-22

## Задача

По уже отработанной схеме ([api2](2026-09-22-1200-nastroyka-https-api2.md), [alt](2026-09-22-1300-nastroyka-https-alt.md), [static](2026-09-22-1330-https-static-i-fix-redirect.md)) перевести на HTTPS ещё один поддомен — `adminnew.infomania.ru` (nginx-блок на `192.168.0.13`, проксирует на `192.168.0.35:3007`, плюс `/site` и `/media` на `static.infomania.ru`).

## Что было сделано

1. Проверено, что на `adminnew.infomania.ru` никто не ходит через внутренний `proxy_pass` из других блоков — форсированный редирект на https безопасен.
2. Бэкап `/etc/nginx/sites-available/default` (`default.bak_before_adminnew_ssl_2026-09-22_130549`).
3. `certbot --nginx -d adminnew.infomania.ru --redirect` — сертификат выпущен и подключён с первого раза, без ручных правок.

## Результат

- `https://adminnew.infomania.ru` — 200 OK, сертификат Let's Encrypt (`CN=adminnew.infomania.ru`, действителен до **21.12.2026**).
- `http://adminnew.infomania.ru` автоматически редиректит на `https://`.
- Бэкенд (`192.168.0.35:3007`) и static (`static.infomania.ru`, уже на https) не менялись.

## Статус переноса поддоменов infomania.ru на HTTPS

| Домен | HTTPS | Редирект http→https |
|---|---|---|
| api2.infomania.ru | ✅ | да |
| alt.infomania.ru | ✅ | да |
| static.infomania.ru | ✅ | нет (нужен http для внутренних proxy_pass) |
| adminnew.infomania.ru | ✅ | да |

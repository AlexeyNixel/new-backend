# Настройка HTTPS для alt.infomania.ru

**Период работы:** 2026-09-22

## Задача

По аналогии с [api2.infomania.ru](2026-09-22-1200-nastroyka-https-api2.md) перевести на HTTPS ещё один поддомен — `alt.infomania.ru` (nginx-блок на `192.168.0.13`, проксирует на `192.168.0.35:3006`).

## Что было сделано

1. Сделан бэкап `/etc/nginx/sites-available/default` (`default.bak_before_alt_ssl_2026-09-22_124217`).
2. Выпущен сертификат Let's Encrypt и настроен nginx: `certbot --nginx -d alt.infomania.ru --redirect`.
3. Порт 443 на границе сети уже был открыт провайдером в рамках предыдущей задачи (api2) — на MikroTik/модеме ничего дополнительно делать не пришлось.

## Результат

- `https://alt.infomania.ru` — 200 OK, валидный сертификат Let's Encrypt (`CN=alt.infomania.ru`, действителен до **21.12.2026**).
- `http://alt.infomania.ru` автоматически редиректит на `https://`.
- Автопродление — через уже существующий общий таймер certbot (`snap.certbot.renew.timer`), отдельно не настраивалось.
- Бэкенд (`192.168.0.35:3006`) не менялся.

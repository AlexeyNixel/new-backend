# Отчёт — Инструкция по деплою на HTTPS (2026-06-18)

## Задача
Подготовить инструкцию по развёртыванию NestJS backend на HTTPS с использованием
Nginx (192.168.0.13) и MikroTik (192.168.1.2). Backend-сервер: 192.168.0.35:3300.

## Стек решения
- **SSL-терминация**: Nginx на 192.168.0.13 (Ubuntu/Debian)
- **Сертификат**: Let's Encrypt через Certbot (домен у пользователя есть)
- **Проброс портов**: MikroTik DST-NAT: внешние 80/443 → 192.168.0.13
- **Процесс-менеджер**: PM2 на 192.168.0.35
- **Схема**: Интернет → MikroTik → Nginx (SSL) → Backend (HTTP внутри сети)

## Что изменено в коде

### `src/main.ts`
CORS обновлён: теперь читает дополнительные origin из переменной окружения
`CORS_ORIGINS` (через запятую). На сервере в `.env` нужно добавить:
```
CORS_ORIGINS=https://api.your-domain.com,https://your-frontend-domain.com
```
Это позволяет не менять код при смене домена.

## Шаги инструкции (кратко)
1. MikroTik DST-NAT: TCP 80/443 → 192.168.0.13
2. Nginx: apt install nginx certbot python3-certbot-nginx
3. Временный HTTP конфиг для Certbot
4. certbot --nginx -d api.your-domain.com
5. Финальный Nginx конфиг: HTTPS + proxy_pass http://192.168.0.35:3300
6. Backend: npm install → npm run build → pm2 start dist/main.js
7. .env на сервере: добавить CORS_ORIGINS
8. pm2 save + pm2 startup для автозапуска

## Что не сделано
- Конкретный домен пользователя не предоставлен — placeholder `api.your-domain.com`
  нужно заменить на реальное значение при выполнении
- Команды MikroTik даны для терминала; через Winbox описаны UI-шаги

# ---------- Сборка ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Prisma нужен OpenSSL — в slim-образе его нет
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Схема Prisma нужна до npm ci: postinstall выполняет `prisma generate` (→ ./generated)
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build \
  && npm prune --omit=dev

# ---------- Запуск ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3300

# Сгенерированный клиент Prisma лежит в ./generated (dist подключает его как ../generated)
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/generated ./generated
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/dist ./dist

# Загрузка выставок распаковывает архивы во временную папку upload/temp (рядом с dist)
RUN mkdir -p upload/temp && chown -R node:node upload

USER node
EXPOSE 3300

# Процесс жив, если отвечает на HTTP вообще: статус не проверяем, чтобы недоступность
# базы не приводила к бесконечным перезапускам контейнера
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api').then(() => process.exit(0)).catch(() => process.exit(1))"

CMD ["node", "dist/main.js"]

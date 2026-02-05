# Fly.io deployment for apps/server (Express + Socket.io)
# Build context: repository root or apps/server; recommended root with -f apps/server/Dockerfile

FROM node:20-slim AS deps
WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json

RUN npm ci

FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/server ./apps/server

RUN npm run build -w apps/server

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/prisma ./apps/server/prisma

# Prisma runtime expects schema at apps/server/prisma/schema.prisma
# SQLite file will live on a Fly Volume (mount to /data)
ENV PORT=5174
EXPOSE 5174

CMD ["node", "apps/server/dist/index.js"]

# Deployment (Vercel + Fly)

## Target
- **Web (Vercel):** `apps/web` (Vite build → static)
- **API (Fly.io):** `apps/server` (Express + Socket.io)

## 0) Environment variables
### Fly (server)
Set secrets:
- `JWT_SECRET` (required)
- `CLIENT_ORIGIN` = `https://<your-vercel-domain>` (or custom domain)
- `DATABASE_URL` = `file:/data/dev.db` (SQLite on volume)

### Vercel (web)
- `VITE_SERVER_URL` = `https://<your-fly-app>.fly.dev`

## 1) Fly.io server deploy
### 1-1) Create app + volume
```bash
fly apps create study-vs-game-api
fly volumes create svgame_data --size 1 --region nrt
```

### 1-2) Set secrets
```bash
fly secrets set JWT_SECRET="<prod-secret>" \
  CLIENT_ORIGIN="https://<vercel-domain>" \
  DATABASE_URL="file:/data/dev.db"
```

### 1-3) Deploy
From repo root:
```bash
fly deploy -c apps/server/fly.toml
```

Health:
- `https://<fly-app>.fly.dev/health`

## 2) Vercel web deploy
- Create a new Vercel project
- **Root Directory**: `apps/web`
- Build Command: `npm run build`
- Output Directory: `dist`

Set env:
- `VITE_SERVER_URL=https://<fly-app>.fly.dev`

## Notes
- WebSockets require a stateful server; that’s why API is on Fly (not Vercel serverless).
- SQLite is stored on Fly volume; scaling beyond 1 instance will require a real DB (Postgres) later.

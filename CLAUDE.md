# CLAUDE.md

## Project Overview

**study-vs-game** is a competitive educational game for Korean elementary school students (방학용 학습 대결 게임). It's an MVP web application with real-time PvP matchmaking where students compete by answering math and English questions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript 5.9 |
| Backend | Node.js, Express 4, Socket.IO 4, TypeScript 5.7 |
| Database | SQLite via Prisma ORM 6 |
| Auth | JWT (jsonwebtoken) + Argon2 password hashing |
| Validation | Zod |
| Monorepo | npm workspaces |

## Repository Structure

```
study-vs-game/
├── apps/
│   ├── server/           # Express + Socket.IO backend
│   │   ├── src/
│   │   │   ├── index.ts          # Main server entry (Express routes, Socket.IO handlers, game logic)
│   │   │   ├── auth.ts           # JWT signing/verification, password hashing
│   │   │   ├── httpAuthRoutes.ts # Auth endpoints (signup, login, logout)
│   │   │   ├── sessionRoutes.ts  # Session management, profile updates
│   │   │   ├── matchRoutes.ts    # Match history endpoints
│   │   │   ├── meRoutes.ts       # User stats/ratings endpoints
│   │   │   ├── db.ts             # Prisma client singleton
│   │   │   ├── ratings.ts        # Leaderboard, match recording, rating updates
│   │   │   ├── badges.ts         # Badge system (seeding, granting, listing)
│   │   │   ├── badgeKit.v1.ts    # Badge definitions with SVG icons
│   │   │   ├── bankLoad.ts       # Loads question bank JSON from disk
│   │   │   ├── bankSchema.ts     # Zod schemas for question bank validation
│   │   │   ├── scripts/          # Utility scripts (gen:bank, qa:bank)
│   │   │   └── data/             # questionBank.v1.json (5000+ questions)
│   │   ├── prisma/
│   │   │   └── schema.prisma     # Database schema
│   │   ├── Dockerfile
│   │   └── fly.toml
│   └── web/              # React SPA frontend
│       ├── src/
│       │   ├── main.tsx          # React entry point
│       │   ├── App.tsx           # Monolithic app component (~1500 lines)
│       │   ├── App.css           # Roblox-ish candy UI styles
│       │   ├── sfx.ts            # Procedural Web Audio API sound effects
│       │   └── robloxish.ts      # Seeded SVG avatar generator
│       ├── eslint.config.js
│       └── vite.config.ts
├── design/               # UI mockups and screenshots
├── README.md             # Project docs (Korean)
└── DEPLOYMENT.md         # Vercel + Fly.io deployment guide
```

## Development Commands

### From project root:

```bash
# Install all dependencies (both apps)
npm install

# Run both server and web concurrently
npm run dev

# Run individually
npm run dev:web        # Vite dev server (apps/web)
npm run dev:server     # tsx watch (apps/server)

# Build both apps
npm run build

# Lint both apps
npm run lint
```

### Server-specific (`apps/server`):

```bash
npm run dev              # tsx watch src/index.ts
npm run build            # tsc -p tsconfig.json
npm run start            # node dist/index.js
npm run prisma:generate  # Generate Prisma client
npm run db:migrate       # Run Prisma migrations
npm run gen:bank         # Generate question bank
npm run qa:bank          # QA question bank
```

### Web-specific (`apps/web`):

```bash
npm run dev       # vite
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run preview   # vite preview
```

## Database

- **ORM:** Prisma with SQLite (production plans for Postgres)
- **Schema location:** `apps/server/prisma/schema.prisma`
- **Models:** User, Rating, Match, Badge, UserBadge, Session
- **After schema changes:** Run `npm run db:migrate -w apps/server` then `npm run prisma:generate -w apps/server`
- **Rating key format:** `{subject}:g{grade}:sem{semester}:q{totalQuestions}` (e.g., `math:g3:sem1:q10`)

## Architecture

### Backend (`apps/server`)

- **Entry point:** `src/index.ts` contains Express setup, Socket.IO handlers, room management, matchmaking, and game logic
- **Game state:** In-memory `Map<roomCode, Room>` — rooms, players, questions, scores are all held in memory
- **Matchmaking:** Queue-based system keyed by `(grade, subject, totalQuestions, semester)` tuple
- **Auth flow:** JWT bearer tokens, sessions tracked in DB, Argon2 password hashing
- **Route modules:** Split by feature — `httpAuthRoutes.ts`, `sessionRoutes.ts`, `matchRoutes.ts`, `meRoutes.ts`
- **Module system:** ES modules (`"type": "module"` in package.json)

### Frontend (`apps/web`)

- **Single component:** `App.tsx` is the main (and only significant) component with 50+ `useState` hooks
- **Navigation:** String-based screen state machine — no router library
  - Screens: `welcome` → `setup` → `menu` → `lobby`/`playing`/`result`
  - Also: `badges`, `account`, `friend`
- **Server communication:** Socket.IO client for real-time game events; fetch for REST API calls
- **No state management library:** All state is local React state in App.tsx
- **Styling:** Plain CSS with Roblox-ish candy aesthetic (gradients, 3D borders, shadows)

### Socket.IO Events

**Client → Server:** `room:create`, `room:join`, `queue:join`, `queue:leave`, `player:ready`, `game:submit`, `game:timeout`

**Server → Client:** `room:state`, `game:countdown`, `game:questions`, `game:answer`, `game:finish`, `queue:matched`, `badge:earned`, `error:toast`

### REST API

```
POST   /auth/signup, /auth/login, /auth/logout
GET    /auth/me
POST   /auth/profile, /auth/password
GET    /auth/sessions
POST   /auth/sessions/revoke
GET    /leaderboard?grade=&subject=&semester=&totalQuestions=
GET    /bank/meta?grade=&subject=&semester=
GET    /badges
GET    /me/stats?modeKey=
GET    /me/matches
GET    /me/badges
GET    /health
```

## Code Style & Conventions

- **TypeScript strict mode** enabled in both apps
- **ESLint** configured for web app only (flat config with `typescript-eslint`, `react-hooks`, `react-refresh`); server lint is a placeholder
- **No Prettier** configured — no auto-formatting tool
- **No test framework** installed — no unit or integration tests exist
- **ES modules** throughout (`"type": "module"` in both apps)
- **Target:** ES2022 for both apps

## Environment Variables

### Server (`apps/server/.env`)
```
DATABASE_URL=file:./dev.db    # SQLite path (or Postgres URL in production)
JWT_SECRET=<secret>           # JWT signing secret
CLIENT_ORIGIN=<url>           # CORS allowed origin (frontend URL)
```

### Web (`apps/web/.env`)
```
VITE_SERVER_URL=<url>         # Backend API/Socket.IO URL
```

## Deployment

- **Web → Vercel:** Built from `apps/web`, output in `dist/`
- **Server → Fly.io:** Docker multi-stage build, SQLite on persistent volume at `/data`
- **Single instance limitation:** SQLite means the server cannot scale beyond one instance without migrating to Postgres

## Key Patterns to Follow

1. **Read before modifying** — `App.tsx` and `index.ts` are large monolithic files; understand the full context before making changes
2. **Game state is in-memory** — Room/matchmaking state lives only in server memory, not in the database
3. **Auth is optional** — Players can play anonymously with generated nicknames; auth adds persistence
4. **Mode key convention** — Ratings and leaderboards are keyed as `{subject}:g{grade}:sem{semester}:q{totalQuestions}`
5. **No external routing** — Frontend uses a `screen` state variable, not React Router
6. **Korean-language UI** — All user-facing strings are in Korean
7. **Zod for validation** — Server uses Zod schemas for request/data validation (see `bankSchema.ts`)

## Common Tasks

### Adding a new REST endpoint
1. Create or update a route file in `apps/server/src/` (e.g., `myRoutes.ts`)
2. Register it on the Express app in `src/index.ts`
3. Auth middleware: use `requireAuth` from auth module for protected routes

### Adding a new Socket.IO event
1. Define handler in the `io.on("connection")` block in `src/index.ts`
2. Update the Room/game state types as needed
3. Emit corresponding client events from `App.tsx`

### Modifying the database schema
1. Edit `apps/server/prisma/schema.prisma`
2. Run `npm run db:migrate -w apps/server`
3. Run `npm run prisma:generate -w apps/server`
4. Import and use from the Prisma client in server code

### Adding a new screen to the frontend
1. Add the screen name to the screen state type in `App.tsx`
2. Add a rendering branch in the main return JSX
3. Add any navigation logic to switch to/from the new screen

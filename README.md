# Cadence

A habit-stacking routine app: stack habits (tick / countdown / count-up) into
routines, run them from a Spotify-style "now playing" session screen, and
track streaks per routine and per habit.

## Stack

- `client/` — React (Vite), no auth, single-user
- `server/` — Node.js (Express) + Prisma
- Neon — serverless Postgres

## Setup

### 1. Database

Create a free project at [neon.tech](https://neon.tech) and copy the
connection string from the dashboard.

### 2. Server

```bash
cd server
npm install
cp .env.example .env
```

Fill in `server/.env`:

```
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://...
```

```bash
npx prisma migrate dev   # creates the tables on Neon
node prisma/seed.js      # optional: seeds two starter routines
npm run dev
```

### 3. Client

```bash
cd client
npm install
cp .env.example .env     # VITE_API_BASE_URL=http://localhost:4000
npm run dev
```

Open http://localhost:5173.

## Data model

- **Routine** — name, color, scheduled weekdays, streak counters
- **Habit** — name, type (`TICK` / `COUNTDOWN` / `COUNTUP`), XP value, streak counters
- **RoutineHabit** — join table: ordering + whether it's required for the routine's streak
- **RoutineSession** — one play-through of a routine on a given calendar day, with an optional note
- **HabitLog** — one habit's result within a session (completed/skipped, duration, note)

A routine's streak only advances on days it's scheduled for, and only when
every *required* habit in it was completed. Habit streaks are simple daily
streaks, independent of which routine(s) the habit belongs to.

## What's built

Home (routine cards + day switcher), Session (timer + complete-with-note
flow + routine summary), Add Routine, Add Habit, All Habits, Progress
(streak + milestone ladder per routine), Profile.

## Still rough / next up

- Milestone tiers and XP/leveling are illustrative — no dedicated "levels" system yet
- No routine-level calendar heatmap (only per-habit)
- No drag-to-reorder for habits in a routine
- No editing/deleting routines or habits after creation yet

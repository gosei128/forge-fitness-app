---
name: forge-app
description: >
  Complete development skill for FORGE — a gamified offline-first fitness tracking app built with React Native + Expo, Drizzle ORM + expo-sqlite, Zustand, MMKV, and NativeWind. Use this skill whenever Roni asks about building, extending, or debugging any part of the FORGE app — including schema design, workout logging, PR detection, XP/leveling, missions, the coach system, archetype programs, UI screens, or backend character library. Also trigger for any Expo/Drizzle/NativeWind setup issues specific to this project.
---

# FORGE App Skill

Gamified fitness tracker. Offline-first. Single user per device. Portfolio project.

---

## App Identity

| Property | Value |
|---|---|
| App name | FORGE |
| Coach name | TBD (placeholder: "Sigma Male") |
| Coach personality | Adaptive + calm. Authoritative, never loud. |
| Primary colors | `#131316` (background), `#fba613` (amber accent) |
| Target platform | React Native + Expo (Android + iOS) |
| Scope | Offline-first, single-user, portfolio-ready |

---

## Full Stack

### Mobile (Primary)
```
React Native + Expo SDK 56
├── expo-sqlite           → local database (on-device)
├── Drizzle ORM           → type-safe SQLite queries + migrations
├── MMKV                  → fast reactive storage (XP, streaks)
├── Zustand               → global app state
├── NativeWind (v4)       → Tailwind styling (pinned to Tailwind v3)
├── Reanimated 3          → animations (XP bars, level-up effects)
├── expo-router           → file-based navigation
└── react-native-worklets → required peer dep for Reanimated
```

### Backend (Online layer — Phase 8)
```
Node.js + Express
├── Prisma ORM            → PostgreSQL queries
├── PostgreSQL            → character library database
└── Supabase Storage      → character images + program pack JSON
```

### AI Layer (Phase 9 — stretch)
```
react-native-executorch   → runs Llama 3.2 1B on-device
```

---

## Project Structure

```
forge/
├── app/                        → expo-router screens
│   ├── _layout.tsx             → root layout, runs migrations + seed
│   ├── index.tsx               → home/dashboard
│   ├── workout/
│   │   ├── active.tsx          → live workout session
│   │   └── exercise-picker.tsx → browse exercises
│   └── profile.tsx             → user profile + PRs + settings
├── db/
│   ├── index.ts                → Drizzle db connection (expo-sqlite)
│   ├── schema.ts               → all table definitions + relations
│   └── seed.ts                 → seeds exercise library on first launch
├── lib/                        → pure business logic (no UI)
│   ├── prDetection.ts          → PR check + update logic
│   ├── xpEngine.ts             → XP calculation + leveling
│   └── missionEngine.ts        → mission generation + progress tracking
├── stores/                     → Zustand stores
│   └── workoutStore.ts         → active session state
├── components/                 → reusable UI components
├── constants/
│   ├── colors.ts               → #131316, #fba613 + scale
│   └── archetypes.ts           → physique archetype definitions
├── assets/
│   └── exercises.json          → 1,324 seeded exercises (from GitHub dataset)
├── drizzle/                    → auto-generated migrations (DO NOT EDIT)
├── drizzle.config.ts
├── metro.config.js             → withNativeWind + sql sourceExt
├── babel.config.js             → inline-import for .sql + nativewind
├── tailwind.config.js          → NativeWind preset, Tailwind v3
├── global.css                  → @tailwind base/components/utilities
└── .npmrc                      → legacy-peer-deps=true
```

---

## Database Schema (SQLite via Drizzle)

### Tables

```typescript
// Exercise library — seeded from assets/exercises.json (1,324 entries)
exercises: { id, name, muscleGroup, equipment, category, instructions, createdAt }

// One-time user record (online login → cached locally)
user: { id, remoteId, firstName, lastName, email, lastSyncedAt, createdAt }
  → unique index on email

// One row per gym visit
workoutSessions: { id, userId, name, startedAt, completedAt, totalXpEarned }

// One row per logged set
sets: { id, sessionId, exerciseId, setNumber, weight, reps, isPr, createdAt }

// Current best per exercise per user (upserted on PR)
personalRecords: { id, userId, exerciseId, setId, weight, reps, achievedAt }
  → unique index on (userId, exerciseId)

// Single-row stats (created on first session)
userStats: { id, userId, totalXp, currentLevel, currentStreak, longestStreak, lastWorkoutAt }
```

### Key Relations
- `user` → many `workoutSessions`
- `workoutSessions` → many `sets`
- `sets` → one `exercise`
- `personalRecords` → one `user`, one `exercise`, one `set`
- `userStats` → one `user`

---

## Drizzle Setup Notes

**Critical config files — all required:**

`metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');
module.exports = withNativeWind(config, { input: './global.css' });
```

`babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: "nativewind" }], 'nativewind/babel'],
    plugins: [['inline-import', { extensions: ['.sql'] }], 'react-native-worklets/plugin']
  };
};
```

`tailwind.config.js`: must use `presets: [require("nativewind/preset")]` and pin Tailwind to v3 (`tailwindcss@3.4.0`).

**Common errors and fixes:**

| Error | Fix |
|---|---|
| `Unable to resolve .sql from drizzle/migrations.js` | Add `config.resolver.sourceExts.push('sql')` to metro.config.js |
| `Missing semicolon` on SQL parse | Add `babel-plugin-inline-import` with `.sql` extension |
| `Cannot find module react-native-worklets/plugin` | Run `npx expo install react-native-worklets` |
| `NativeWind only supports Tailwind CSS v3` | Run `npm install -D tailwindcss@3.4.0 --legacy-peer-deps` |
| NativeWind classNames not applying | Confirm `import '../global.css'` in `_layout.tsx`, full cache clear with `npx expo start --clear` |
| npm peer dep conflicts | `.npmrc` file at root: `legacy-peer-deps=true` |

---

## Development Phases

### ✅ Phase 0 — Foundation
Expo project, Drizzle + expo-sqlite, NativeWind, routing, folder structure.

### ✅ Phase 1 — Data Layer
Schema designed and migrated. 1,324 exercises seeded from GitHub dataset (`body_part` → `muscleGroup`, `instructions.en` → `instructions`). Seed runs on app boot via `useMigrations` success hook, skips if data exists.

### ✅ Phase 2 — Core Workout Logging
Exercise logging, exercise browser with instructions, rest timers, custom workout templates.

### 🔄 Phase 3 — PR Detection + XP System
Build in `lib/` as pure async TypeScript functions:

**`lib/prDetection.ts`** — `checkAndUpdatePR(userId, exerciseId, setId, weight, reps)`
- Query `personalRecords` for current best
- If new weight > stored OR no record → upsert PR row + set `sets.isPr = true`
- Return `{ isPR: boolean }`

**`lib/xpEngine.ts`** — XP rules:
- +10 XP per set logged
- +50 XP bonus per PR set
- Level formula: Level N requires `N * 500` XP
- `applyXP(userId, xpEarned)` → updates `userStats`, checks level threshold, handles streak

**Streak logic (inside `applyXP`):**
- `lastWorkoutAt` = yesterday → increment streak
- `lastWorkoutAt` = 2+ days ago → reset to 1
- `lastWorkoutAt` = today → no change
- Update `longestStreak` if exceeded

**Session completion flow:**
1. `checkAndUpdatePR` for every set
2. `calculateSessionXP` on all sets
3. `applyXP` → update userStats
4. Write `totalXpEarned` + `completedAt` to session
5. Return `{ totalXP, isPRs[], leveledUp, newLevel }` for UI

### ⬜ Phase 4 — Mission System
Mission types: "Log N sessions this week", "Hit a PR", "Train [muscleGroup] twice".
Generator runs daily/weekly. Progress hooks into workout logging. Rewards XP on completion.

### ✅ Phase 5 — Coach (Rule-Based v1)
Coach line categories: `onPR`, `onMissedDays`, `onSessionComplete`, `onLevelUp`, `onMissionComplete`, `onIdle`.
5–10 lines per category. Calm + adaptive tone. Trigger logic fires contextually, not randomly.

Example lines:
- PR: *"That's a new ceiling. Now we raise the floor."*
- Missed days: *"You're back. That's what matters. Let's not waste it."*
- Level up: *"One session away. You already know what to do."*

### ⬜ Phase 6 — Physique Archetypes
3–4 archetypes hardcoded locally first, then online.

Each archetype:
```json
{
  "character": "Batman",
  "archetype": "Lean + Functional Strength",
  "targets": { "bodyFat": "10-12%", "benchPress": "1.2x BW", "pullUps": 15 },
  "phases": [{ "phase": 1, "name": "Foundation", "weeks": 4, "workouts": [...] }],
  "coachLines": { "onStart": "...", "onPhaseComplete": "...", "onPR": "..." }
}
```

### ⬜ Phase 7 — Polish
Dark theme system tokens, Reanimated transitions (XP fill, level-up, PR glow), onboarding flow (coach intro → pick archetype), empty states, app icon + splash.

### ⬜ Phase 8 — Backend + Character Library
Express + Prisma + PostgreSQL. Two endpoints:
- `GET /characters` → list all archetypes
- `GET /characters/:id` → download full program pack JSON
Supabase Storage for images. Mobile downloads pack → saves to local SQLite.

### ⬜ Phase 9 — AI Coach (Stretch)
`react-native-executorch` + Llama 3.2 1B. Replaces rule-based coach lines. Fallback to rule-based if model not loaded. First-launch model download with progress UI.

---

## Game Design Constants

```typescript
// XP
const XP_PER_SET = 10;
const XP_PR_BONUS = 50;

// Leveling — Level N requires N * 500 XP total
function xpForLevel(level: number) { return level * 500; }

// Level titles (design in progress)
const LEVEL_TITLES = {
  1: "Raw Recruit",
  5: "Iron Disciplined",
  10: "Forged",
  20: "Apex",
};

// Coach line categories
type CoachTrigger = 'onPR' | 'onMissedDays' | 'onSessionComplete' | 'onLevelUp' | 'onMissionComplete' | 'onIdle';
```

---

## UI Design System

Colors:
```
Background:   #131316
Card surface: #1a1a1e
Border:       #2a2a2f
Accent:       #fba613  (amber — interactive elements only)
Text primary: #ffffff
Text muted:   #888888
Danger:       red (end session, reset)
```

Bottom nav tabs (4): Home, Progress (charts), Missions (sword icon), Profile

Design tone: cinematic, game HUD meets fitness tracker. Heavy dark cards, amber-only accents, bold typography. Reanimated for weighty animations — not floaty.

---

## Coach Tone Reference

| Moment | Line |
|---|---|
| PR hit | "That's a new ceiling. Now we raise the floor." |
| Missed 3 days | "You're back. That's what matters. Let's not waste it." |
| Session complete | "Good work. Your future self felt that." |
| Near level up | "One session away. You already know what to do." |
| New goal selected | "Understood. I'll build the path. You just have to walk it." |

Never hype. Never loud. Always intentional.

<div align="center">

# SHIFT ⚡

### Your state changes. Your next move shifts.

**SHIFT is a mood-aware action planner that hands you _one_ next move — chosen from how you feel, your energy, the minutes you have, and what you've done lately.**

No endless to-do list. No decision fatigue. Just the single thing worth doing right now.

<br />

![React](https://img.shields.io/badge/React_19-0B0F14?style=for-the-badge&logo=react&logoColor=3987E5)
![Vite](https://img.shields.io/badge/Vite_8-0B0F14?style=for-the-badge&logo=vite&logoColor=E0982A)
![Node](https://img.shields.io/badge/Express_5-0B0F14?style=for-the-badge&logo=node.js&logoColor=0CA30C)
![MongoDB](https://img.shields.io/badge/MongoDB-0B0F14?style=for-the-badge&logo=mongodb&logoColor=0CA30C)
![PWA](https://img.shields.io/badge/PWA-0B0F14?style=for-the-badge&logo=pwa&logoColor=F5F5F5)

</div>

---

## The idea

Most productivity tools throw the whole backlog at you and let _you_ figure out what matters. That's the hardest part — and it's exactly when a bad mood or a low battery wrecks the choice.

SHIFT flips it. You tell it three things:

- **Where's your head at?** — `low · okay · good · great · angry · overwhelmed`
- **How's the tank?** — `low · medium · high`
- **Got a minute? Or a few?** — `5 · 15 · 30 · 60+`

…and a scoring engine reaches into your task pool and pulls out the one move that fits *this* moment. You do it, tell SHIFT if it helped, and the engine learns.

---

## Features

- ⚡ **One-move recommendations** — a transparent scoring engine, not a black box (see below).
- 🧠 **Learns from feedback** — "better / same / worse" after each move nudges future picks.
- 📊 **Insights** — donuts, a contribution-style heatmap, weekday/time-of-day rhythm, mood→outcome rates, streaks, and an 8-week completion trend, all hand-rolled to match the theme.
- ♾️ **Permanent vs one-off tasks** — habits stay in the pool and count every time; one-offs clear when done.
- 📖 **Read Anything** — a floating reader on the Now page that pulls a random topic from a curated list straight from Wikipedia, for the spare few minutes you'd otherwise scroll away.
- 📱 **Mobile-first PWA** — installable, offline-ready, with a swipeable section shell.
- 🎨 **Semantic color coding** — traffic-light priorities, green completions, red skips — minimal, meaningful.
- 🔐 **JWT auth** — bcrypt-hashed passwords, per-user data scoping.

---

## How the recommendation engine works

Every task in your pool starts at a base score of **50**, then earns or loses points against your current state. Highest score wins.

| Signal | Effect |
| --- | --- |
| **State fit** | Low energy favors short tasks (`+20`) and penalizes long ones (`−15`); high energy rewards deeper work. Low/heavy moods lean toward quick wins. |
| **Time fit** | Fits your window → `+20`. Slightly over → `+5`. Way over → `−25`. |
| **Priority** | `high +20`, `medium +10`. |
| **Variety** | A fresh category → `+10`; repeating a recent one → `−20` each. |
| **Personal feedback** | Tasks that made you feel *better* → `+25`; *worse* → `−25`; skipped → `−10`. |

The logic lives in [`server/services/recommendationEngine.js`](server/services/recommendationEngine.js) and is covered by a Node test suite — pure functions, no framework.

---

## Tech stack

**Frontend** — React 19 · Vite 8 · React Router 7 · Embla Carousel · vite-plugin-pwa · hand-rolled SVG charts (zero chart deps)

**Backend** — Node · Express 5 · MongoDB + Mongoose 9 · JWT · bcrypt

---

## Project structure

```
Shift/
├── client/                 # React + Vite PWA
│   └── src/
│       ├── pages/          # Now · Tasks · History · Insights · Auth
│       ├── components/     # MobileShell · Sidebar · Modal · ReadAnything · ErrorState
│       ├── context/        # AuthContext · ToastContext
│       ├── services/       # api.js (fetch wrapper)
│       └── index.css       # design tokens + all styles
└── server/                 # Express + MongoDB API
    ├── models/             # User · Task · Session · Action
    ├── routes/             # auth · tasks · sessions · recommendation · actions
    ├── services/           # recommendationEngine (+ tests)
    └── middleware/         # JWT auth guard
```

---

## Getting started

### Prerequisites

- Node 18+
- A MongoDB connection string (local or [Atlas](https://www.mongodb.com/atlas))

### 1. Backend

```bash
cd server
npm install
cp .env.example .env      # then fill in the values below
npm run dev               # http://localhost:5000
```

`.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Long random string for signing tokens |
| `PORT` | — | Defaults to `5000` |
| `CLIENT_ORIGIN` | — | Comma-separated allowed origins (prod CORS); allows all if unset |

> Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 2. Frontend

```bash
cd client
npm install
echo "VITE_API_URL=http://localhost:5000/api" > .env   # point at your API (include /api)
npm run dev               # http://localhost:5173
```

The client reads the API base from `VITE_API_URL` — it must include the `/api` prefix (see [`client/src/services/api.js`](client/src/services/api.js)).

---

## API reference

All routes below `/api/auth` require a `Bearer <token>` header. Data is scoped to the authenticated user.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Log in, get a JWT |
| `GET` | `/api/auth/me` | Current user |
| `GET` · `POST` | `/api/tasks` | List / create tasks |
| `PUT` · `DELETE` | `/api/tasks/:id` | Update / soft-delete a task |
| `POST` | `/api/sessions` | Log a check-in (mood · energy · time) |
| `POST` | `/api/recommendation` | Get the next move for a session |
| `GET` · `POST` | `/api/actions` | List / start an action |
| `PUT` | `/api/actions/:id` | Update status, completion, or feedback |

### Data model

- **User** — `name`, `email`, `password` (bcrypt-hashed)
- **Task** — `title`, `category`, `estimatedTime`, `priority`, `status`, `type`, `completionCount`
- **Session** — `mood`, `energy`, `availableTime`
- **Action** — `sessionId`, `taskId`, `status`, `feedback`, `startedAt`, `completedAt`

---

## Design tokens

SHIFT is light-on-dark with color reserved for meaning, not decoration.

| Swatch | Token | Hex | Role |
| --- | --- | --- | --- |
| ![](https://placehold.co/60x22/0B0F14/0B0F14.png) | `--bg` | `#0B0F14` | Background |
| ![](https://placehold.co/60x22/111720/111720.png) | `--surface` | `#111720` | Cards & surfaces |
| ![](https://placehold.co/60x22/F5F5F5/F5F5F5.png) | `--accent` | `#F5F5F5` | Text & primary action |
| ![](https://placehold.co/60x22/3987E5/3987E5.png) | `--viz-blue` | `#3987E5` | Charts / in-progress |
| ![](https://placehold.co/60x22/0CA30C/0CA30C.png) | `--viz-good` | `#0CA30C` | Completed / better |
| ![](https://placehold.co/60x22/E0982A/E0982A.png) | `--viz-warn` | `#E0982A` | Medium priority |
| ![](https://placehold.co/60x22/D03B3B/D03B3B.png) | `--viz-worse` | `#D03B3B` | High priority / worse |

---

## Scripts

**Server**

```bash
npm run dev     # nodemon
npm start       # node server.js
npm test        # node --test (recommendation engine)
```

**Client**

```bash
npm run dev     # vite dev server
npm run build   # production build + PWA assets
npm run preview # preview the build
npm run lint    # oxlint
```

---

<div align="center">

**SHIFT ⚡ — momentum on demand**

Crafted by [Dhruv Solanki](https://dhruv-solanki-about.vercel.app/)

</div>

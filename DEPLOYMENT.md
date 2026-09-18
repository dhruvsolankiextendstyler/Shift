# SHIFT — Deployment Guide

Deploy order matters: **Database → Backend → Frontend**. The frontend
needs the backend URL, and the backend needs the database URL, so we set
them up bottom-up.

- **Database:** MongoDB Atlas
- **Backend:** Render (Express API)
- **Frontend:** Vercel (React/Vite)

Prerequisites: the code is pushed to a GitHub repo, and you have (free)
accounts on MongoDB Atlas, Render, and Vercel.

---

## 1. MongoDB Atlas (database)

1. Create a **free M0 cluster** at https://cloud.mongodb.com.
2. **Database Access** → add a database user with a username and a
   strong password. Save these.
3. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere).
   Render's outbound IPs aren't fixed on the free tier, so this is the
   practical option. (You can tighten it later if you move to a plan
   with static IPs.)
4. **Connect → Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@<cluster>.xxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Insert your password and add a database name before the `?`:
   ```
   mongodb+srv://<user>:<password>@<cluster>.xxxx.mongodb.net/shift?retryWrites=true&w=majority
   ```
   This full string is your `MONGO_URI`.

---

## 2. Render (backend API)

1. At https://render.com → **New → Web Service** → connect your GitHub
   repo.
2. Configure:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
3. Add **Environment Variables** (Environment tab):

   | Key             | Value                                                        |
   | --------------- | ------------------------------------------------------------ |
   | `MONGO_URI`     | the Atlas string from step 1                                 |
   | `JWT_SECRET`    | a long random string (see below)                             |
   | `CLIENT_ORIGIN` | your Vercel URL — **fill this in after step 3**              |

   Generate a `JWT_SECRET` locally:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   > Don't set `PORT` — Render provides it, and the server already reads
   > `process.env.PORT`.

4. Deploy. When it's live, note the URL, e.g.
   `https://shift-api.onrender.com`. Your API base is that URL **+ `/api`**.
5. Sanity check: open `https://shift-api.onrender.com/` in a browser —
   you should see `{"message":"SHIFT backend is running ⚡"}`.

   > Note: the free tier sleeps after inactivity, so the first request
   > after idle can take ~30–60s to wake.

---

## 3. Vercel (frontend)

1. At https://vercel.com → **Add New → Project** → import the same repo.
2. Configure:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite (auto-detected)
   - Build command / output dir: leave defaults (`npm run build`, `dist`)
3. Add an **Environment Variable**:

   | Key            | Value                                          |
   | -------------- | ---------------------------------------------- |
   | `VITE_API_URL` | `https://shift-api.onrender.com/api`           |

   Use your real Render URL, and **include the `/api` suffix**.
   > Vite inlines `VITE_*` vars at build time, so if you change this
   > later you must redeploy.
4. Deploy. Note the resulting URL, e.g. `https://shift.vercel.app`.
   The included `client/vercel.json` adds an SPA rewrite so refreshing
   `/tasks`, `/history`, etc. doesn't 404.

---

## 4. Close the CORS loop

1. Back in **Render → Environment**, set `CLIENT_ORIGIN` to your exact
   Vercel URL (no trailing slash), e.g. `https://shift.vercel.app`.
   For multiple origins (e.g. a preview domain), comma-separate them.
2. Save — Render redeploys automatically. The API now accepts requests
   only from your frontend.

---

## 5. End-to-end verification (on the live site)

Open the Vercel URL and confirm each works:

- [ ] **Sign up** — create a new account.
- [ ] **Log out**, then **log in** with the same credentials.
- [ ] **Tasks** — add, edit, complete, and delete a task.
- [ ] **NOW** — do a check-in (mood/energy/time), press SHIFT, get a
      recommendation, START, then COMPLETE.
- [ ] **Feedback** — submit Better / Same / Worse.
- [ ] **History** — the action appears.
- [ ] **Insights** — stats and category counts render.
- [ ] **Isolation** — sign up as a second user; confirm you see none of
      the first user's tasks or history.
- [ ] Refresh directly on `/tasks` and `/insights` — no 404.

If browser requests fail with a CORS error, re-check that
`CLIENT_ORIGIN` on Render exactly matches the Vercel origin (scheme +
host, no path, no trailing slash).

---

## Environment variables reference

**Backend (Render)** — see `server/.env.example`:
- `MONGO_URI` — Atlas connection string (with password + db name)
- `JWT_SECRET` — long random string for signing tokens
- `CLIENT_ORIGIN` — allowed frontend origin(s), comma-separated
- `PORT` — provided by Render; do not set

**Frontend (Vercel)** — see `client/.env.example`:
- `VITE_API_URL` — backend base URL including `/api`

Never commit real `.env` files — only the `.env.example` templates are
tracked.

# ⚽ Last Man Standing

A full-stack EFL Championship survival game. Pick one team per gameweek — if they win, you survive. Two failures and you're out. Last player standing wins.

\---

## 📦 Project Structure

```
lastmanstanding/
├── backend/          Node.js/Express REST API
├── frontend-web/     React (Vite) web app
├── frontend-mobile/  React Native (Expo) iOS + Android app
└── database/         PostgreSQL schema
```

\---

## 🗄️ Step 1: Database — Supabase (FREE)

**Recommended host:** [**Supabase**](https://supabase.com) — completely free tier.

1. Go to https://supabase.com and create an account
2. Click **New Project**, name it `lastmanstanding`, set a strong database password
3. Wait \~2 minutes for provisioning
4. Go to **SQL Editor** → paste the entire contents of `database/schema.sql` → Run
5. Go to **Project Settings → Database** and copy the **Connection string** (URI format)

   * It looks like: `postgresql://postgres:\\\\\\\\\\\\\\\[PASSWORD]@db.\\\\\\\\\\\\\\\[REF].supabase.co:5432/postgres`
6. Keep this for the backend `.env`

> Supabase free tier: 500MB storage, 2GB bandwidth/month, 50k API requests/day — more than enough.

\---

## ⚽ Step 2: Football API — football-data.org (FREE)

1. Register at https://www.football-data.org/client/register
2. You'll get an API key by email within minutes
3. Free tier: 10 requests/minute — the app caches aggressively, you won't hit this limit

The app uses the **ELC** competition code (EFL Championship).

\---

## 🚀 Step 3: Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in: DATABASE\\\\\\\\\\\\\\\_URL, JWT\\\\\\\\\\\\\\\_SECRET, FOOTBALL\\\\\\\\\\\\\\\_API\\\\\\\\\\\\\\\_KEY
npm run dev       # development
npm start         # production
```

### Deploying the Backend (Free Options)

**Option A: Railway** (recommended, free tier) — https://railway.app

* Push backend to GitHub
* New project → Deploy from GitHub → Select backend folder
* Add environment variables from `.env`
* Done — Railway gives you a public URL

**Option B: Render** — https://render.com

* New Web Service → connect repo → set root to `backend/`
* Build: `npm install` | Start: `npm start`
* Add env vars in the Render dashboard

**Option C: Fly.io** — https://fly.io (generous free tier)

```bash
npm install -g flyctl
flyctl launch
flyctl secrets set DATABASE\\\\\\\\\\\\\\\_URL=... JWT\\\\\\\\\\\\\\\_SECRET=... FOOTBALL\\\\\\\\\\\\\\\_API\\\\\\\\\\\\\\\_KEY=...
flyctl deploy
```

\---

## 🌐 Step 4: Web Frontend

```bash
cd frontend-web
npm install
# Create .env file:
echo "VITE\\\\\\\\\\\\\\\_API\\\\\\\\\\\\\\\_URL=http://localhost:3001/api" > .env
npm run dev       # development at http://localhost:5173
npm run build     # production build in dist/
```

### Deploying the Web App (Free)

**Vercel** (easiest) — https://vercel.com

```bash
npm install -g vercel
cd frontend-web
vercel deploy
# Set environment variable VITE\\\\\\\\\\\\\\\_API\\\\\\\\\\\\\\\_URL to your backend URL
```

**Netlify** — drag \& drop the `dist/` folder at https://netlify.com

\---

## 📱 Step 5: Mobile App (iOS + Android)

```bash
cd frontend-mobile
npm install
```

Edit `src/utils/api.js` — change the production URL:

```js
: 'https://your-backend-url.railway.app/api'
```

```bash
npx expo start          # scan QR with Expo Go app on your phone
npx expo start --ios    # iOS simulator (Mac only)
npx expo start --android # Android emulator
```

### Building for App Stores

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios      # iOS .ipa
eas build --platform android  # Android .apk/.aab
```

EAS Build has a free tier (30 builds/month).

\---

## 🎮 How the Game Works

1. **Creator** makes a room → shares the 6-character code
2. Players join with the code
3. Creator hits **Start Game** — picks open for current Championship gameweek
4. Each player picks ONE team from those playing that weekend
5. Teams you've already picked in previous weeks are **unavailable** — forces variety!
6. After matches finish, creator hits **Resolve Results**

   * ✅ Win → safe, move on
   * ⚠️ Draw/Loss → Yellow Card (1st time)
   * 🟥 Draw/Loss → Red Card (2nd time) = ELIMINATED
7. Creator advances to next gameweek — repeat
8. Last player not eliminated wins 🏆

\---

## 🔧 Environment Variables Reference

### Backend `.env`

|Variable|Description|
|-|-|
|`PORT`|Server port (default 3001)|
|`DATABASE\\\\\\\\\\\\\\\_URL`|PostgreSQL connection string from Supabase|
|`JWT\\\\\\\\\\\\\\\_SECRET`|Random 64-char hex string for signing tokens|
|`JWT\\\\\\\\\\\\\\\_EXPIRES\\\\\\\\\\\\\\\_IN`|Token expiry (e.g. `7d`)|
|`FOOTBALL\\\\\\\\\\\\\\\_API\\\\\\\\\\\\\\\_KEY`|Your football-data.org API key|
|`CHAMPIONSHIP\\\\\\\\\\\\\\\_COMPETITION\\\\\\\\\\\\\\\_ID`|`ELC` (EFL Championship)|
|`FIXTURE\\\\\\\\\\\\\\\_CACHE\\\\\\\\\\\\\\\_TTL`|Minutes before re-fetching fixtures (default 60)|

### Frontend Web `.env`

|Variable|Description|
|-|-|
|`VITE\\\\\\\\\\\\\\\_API\\\\\\\\\\\\\\\_URL`|Backend API URL (e.g. `https://your-api.railway.app/api`)|

\---

## 🏗️ API Summary

|Method|Endpoint|Auth|Description|
|-|-|-|-|
|POST|`/api/auth/register`|❌|Create account|
|POST|`/api/auth/login`|❌|Get JWT token|
|GET|`/api/auth/me`|✅|Current user|
|GET|`/api/rooms`|✅|My rooms|
|POST|`/api/rooms`|✅|Create room|
|POST|`/api/rooms/join`|✅|Join by code|
|GET|`/api/rooms/:id`|✅|Room details|
|POST|`/api/rooms/:id/start`|✅|Start game (creator)|
|POST|`/api/rooms/:id/next-week`|✅|Advance week (creator)|
|GET|`/api/picks/teams`|✅|All Championship teams|
|GET|`/api/picks/room/:id`|✅|My picks + available teams|
|POST|`/api/picks/room/:id`|✅|Submit pick|
|POST|`/api/picks/room/:id/resolve`|✅|Resolve gameweek (creator)|
|GET|`/api/picks/room/:id/all-picks`|✅|Everyone's picks|
|GET|`/api/picks/fixtures/:matchday`|✅|Fixtures for a matchday|

\---

## 📊 API Call Budget

The app is designed to stay well within football-data.org's 10 req/min free limit:

* **Teams**: fetched once per season, cached in DB forever
* **Fixtures**: cached 60 minutes, only refetched if stale
* **Results**: polled every 15 minutes by cron (only on matchdays)
* **Current matchday**: cached 30 minutes in memory

Typical usage: **\~5-10 API calls per matchday weekend**, not per minute.


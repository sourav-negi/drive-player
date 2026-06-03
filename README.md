# drive-pleya

personal video streaming platform — browse and stream your google drive videos from anywhere, with watch progress tracking.

## what it does

google drive is great for storing videos, but its native UI doesn't tell you which videos you've already watched or where you left off. drive-pleya solves this by:

- listing all your videos from google drive in a clean grid
- streaming them directly from your drive with a full-featured video player
- tracking watch progress per video (position, percentage, completed status)
- showing "resume from X:XX" prompts when you come back to a video

everything lives on your google drive — no separate database needed.

## architecture

```
browser ─── vercel (frontend) ─── render (backend) ─── google drive api
  │                                                       │
  └──────────────── video stream ─────────────────────────┘
                              (proxied through backend)
```

| layer | tech | hosting |
|-------|------|---------|
| frontend | next.js 16 + react 19 + tailwind css 4 | vercel (free) |
| backend | fastapi (python) | render (free) |
| storage | google drive api | your google account |

## prerequisites

- **python 3.11+** — for the backend
- **node.js 20+** — for the frontend
- **google cloud account** — to get drive API credentials
- **videos on google drive** — that's the whole point :)

## setup

### 1. google drive API credentials

1. go to [google cloud console](https://console.cloud.google.com/)
2. create a new project (or select an existing one)
3. enable the **google drive API** (search "drive API" in the library)
4. go to **APIs & Services → Credentials**
5. click **Create Credentials → OAuth client ID**
6. choose **Desktop application** as the type
7. note your **client ID** and **client secret**

next, get a refresh token:

8. go to [oauth 2.0 playground](https://developers.google.com/oauthplayground)
9. click the gear icon ⚙ → check **"use your own oauth credentials"** → enter your client ID and secret
10. in step 1, select these scopes:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.file`
11. click **authorize APIs** → sign in with your google account → allow
12. in step 2, click **exchange authorization code for tokens**
13. copy the **refresh token** (you'll only see it here)

keep these three values — you'll need them:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`

### 2. backend setup

```bash
cd backend

# create virtual environment
python -m venv venv

# activate it
# windows:
venv\Scripts\activate
# mac/linux:
source venv/bin/activate

# install dependencies
pip install -r requirements.txt
```

edit `backend/.env` with your google credentials:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REFRESH_TOKEN=your-refresh-token-here
```

start the backend:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

verify it works by opening [http://localhost:8000/api/health](http://localhost:8000/api/health) — you should see `{"status": "ok"}`.

### 3. frontend setup

```bash
cd frontend

# install dependencies
npm install
```

edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

start the frontend:

```bash
npm run dev
```

open [http://localhost:3000](http://localhost:3000) — you should see your videos.

## usage

### browsing

the home page shows your google drive videos in a grid. each card shows:
- video thumbnail (from google drive)
- title
- a thin red progress bar if partially watched
- a green "watched" badge if completed

click any video to open the player.

### video player controls

| control | action |
|---------|--------|
| ▶ / ❚❚ | play / pause |
| ⏮ 10s | skip back 10 seconds |
| ⏭ 10s | skip forward 10 seconds |
| 🔊 | volume slider + mute toggle |
| 1× | playback speed (0.5×, 0.75×, 1×, 1.25×, 1.5×, 2×) |
| ⛶ | toggle fullscreen |
| seek bar | click or drag to jump anywhere in the video |

### keyboard shortcuts

| key | action |
|-----|--------|
| space / k | play / pause |
| ← / j | back 10 seconds |
| → / l | forward 10 seconds |
| ↑ | volume +10% |
| ↓ | volume -10% |
| m | mute / unmute |
| f | fullscreen |
| 0–9 | seek to 0%–90% |
| < / , | slower speed |
| > / . | faster speed |

### watch progress

- progress saves automatically every **10 seconds** while playing
- pressing pause also **saves immediately**
- closing the tab saves your position via `sendBeacon`
- returning to a video shows a **"resume from X:XX?"** prompt
- videos watched past **90%** are marked as completed

## deployment

### backend → render

1. go to [render.com](https://render.com) → new **web service**
2. connect your git repository
3. configure:
   - **root directory:** `backend`
   - **runtime:** python 3
   - **build command:** `pip install -r requirements.txt`
   - **start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. add environment variables (same as your `.env` file)
5. deploy

note: render's free tier puts the server to sleep after 15 minutes of inactivity. the frontend handles this by showing a "waking up server..." message with auto-retry.

### frontend → vercel

1. go to [vercel.com](https://vercel.com) → new project
2. connect your git repository
3. configure:
   - **root directory:** `frontend`
   - **framework preset:** next.js
4. add environment variable:
   - `NEXT_PUBLIC_API_BASE` = your render backend URL
5. deploy

## project structure

```
drive-pleya/
├── README.md
├── .gitignore
├── backend/
│   ├── main.py              # fastapi entry point
│   ├── config.py             # env var loading
│   ├── requirements.txt      # python dependencies
│   ├── .env.example          # env var template
│   ├── services/
│   │   ├── drive_client.py   # google drive API wrapper
│   │   ├── progress_store.py # watch progress read/write
│   │   └── file_cache.py     # in-memory TTL cache
│   ├── routes/
│   │   ├── files.py          # file listing API
│   │   ├── stream.py         # video streaming proxy
│   │   └── progress.py       # progress tracking API
│   └── utils/
│       └── drive_helpers.py  # shared helpers
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx            # root layout
    │   │   ├── page.tsx              # home: video grid
    │   │   ├── globals.css           # tailwind + theme
    │   │   └── watch/[id]/page.tsx   # video player page
    │   ├── components/
    │   │   ├── VideoPlayer.tsx       # video element + controls
    │   │   ├── VideoCard.tsx         # thumbnail card in grid
    │   │   ├── FileGrid.tsx          # responsive grid layout
    │   │   ├── SeekBar.tsx           # clickable/draggable timeline
    │   │   ├── ProgressBadge.tsx     # progress bar on thumbnails
    │   │   ├── SpeedSelector.tsx     # playback speed dropdown
    │   │   ├── VolumeControl.tsx     # volume slider + mute
    │   │   └── UiState.tsx           # loading/error/empty states
    │   ├── lib/
    │   │   ├── api.ts                # typed API client
    │   │   └── types.ts              # typescript interfaces
    │   └── hooks/
    │       ├── useVideoPlayer.ts     # player state management
    │       └── useWatchProgress.ts   # progress tracking + save
    └── public/
```

## tech notes

- **streaming:** the backend proxies video bytes from google drive with proper HTTP range support, so seeking works natively. an optional redirect mode (`USE_DIRECT_REDIRECT=true`) streams directly from google to save backend bandwidth.
- **progress storage:** watch progress is stored as a JSON file (`.watch-progress.json`) on your google drive. writes are debounced to 30-second windows, with immediate writes on pause.
- **caching:** file listings are cached in memory for 5 minutes to stay within drive API rate limits.
- **no database:** everything lives on google drive — no postgres, no redis, no monthly fees.

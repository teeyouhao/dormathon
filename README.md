# ViralReels — AI Trending Reels Generator for SMEs

Help small and medium enterprises (SMEs) get exposure by finding trending short-form video patterns on YouTube, Instagram and TikTok, then adapting them into ready-to-post vertical reels.

## Features

### Trending Feed
- Fetches trending short videos across **YouTube, Instagram and TikTok**.
- Filters: **platform**, **country** (Southeast Asia + other regions), **industry**, free-text **search**, and **sort** (Most Recent / Trending / Most Viewed / Most Liked / Most Shared).
- Each card shows published date, location, duration and a **clickable creator link**.
- Detail modal shows full metadata: platform, title, creator link, published date, location, duration, industry, description, tags and the original video link.

### CapCut-style AI Editor (full-screen overlay)
Opens when you choose a reel — the **Back** button returns to the feed.
- **Edit mode**: multi-track timeline (video / audio / text / filter), playhead, draggable trim handles, playback controls.
- **Tools**: Trim, Text overlays, Audio/music library, Filters (live preview), Stickers, Effects.
- **Properties panel** per tool, plus **undo/redo**, **Save** (persists the project) and **Export**.
- **AI Concept mode**: generates hook, script, structure, hashtags, duration and virality score (LLM when configured, local algorithmic fallback otherwise).
- **AI Remix mode**: upload footage details and get a server-generated scene-by-scene remix plan.
- **Export**: produces 9:16 vertical packages for **YouTube Shorts, Instagram Reels and TikTok**. FFmpeg renders real MP4s when installed; otherwise a render-ready export manifest is generated.

### Projects
- Saved reel projects persist through the backend (`/api/editor/projects`).
- Continue editing, inspect edits, delete, and download the last export package.

### Settings & Profile
- Settings: YouTube API key, Instagram/TikTok scraper toggles, AI provider, Supabase URL/table, and **live backend health** indicators.
- Profile icon (top-right): brand name, industry and email, stored locally for use in AI concept generation.

## Data sources — read this first

The app is honest about where reels come from:

| Source | When it is used | Real reels? |
|---|---|---|
| YouTube Data API v3 | `YOUTUBE_API_KEY` is set | ✅ Yes (official API) |
| Instagram Playwright scraper | `INSTAGRAM_SCRAPING_ENABLED=true` | ✅ Yes (if not blocked) |
| TikTok Playwright scraper | `TIKTOK_SCRAPING_ENABLED=true` | ✅ Yes (if not blocked) |
| Bundled demo dataset | No live source returned data | ❌ No — clearly labelled `source: mock` |

So if you see demo reels, it means **no live provider returned data**. Add a YouTube API key and/or enable the scrapers in Settings (or `server/.env`) to get real reels. The API response always reports its `source` so the UI can show it.

Instagram and TikTok are scraped with a headless browser; both platforms actively block bots, so those sources are best-effort and may need maintenance.

## Persistence (Supabase)

Every fetch is persisted:
- **Supabase** — when `SUPABASE_URL` and a key are configured, reels are upserted into the `reels` table (unique on `platform` + `external_id`), including creator, creator URL, thumbnail, engagement metrics, duration, region, location, industry/category, URL, published date, tags, source and the raw payload.
- **Local fallback** — if Supabase is not configured or the upsert fails, reels are stored in `server/data-store/reels.json` so nothing is silently lost.

Helpful endpoints:
- `GET /api/trending/stored` — read persisted reels (filter by platform/region/industry).
- `GET /api/trending/storage-status` — Supabase status and the `reels` table schema SQL.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS (dark theme)
- **Backend**: Node.js + Express
- **Scraping**: Playwright (Instagram & TikTok), YouTube Data API v3
- **Video processing**: FFmpeg (optional)
- **AI**: OpenAI / Anthropic (optional, with local fallback)
- **Database**: Supabase (with local JSON fallback)

## Quick Start

### 1. Install dependencies

```bash
cd viral-reels
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Configure environment (optional but recommended for real reels)

```bash
cp server/.env.example server/.env
# then edit server/.env with your keys
```

`server/.env` is gitignored — never commit real keys.

### 3. (Optional) Install Playwright for scraping

```bash
cd server
npm install playwright
npx playwright install chromium
```

### 4. Run the app

```bash
# from the viral-reels root
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/api/health

## Environment variables

| Variable | Purpose |
|---|---|
| `YOUTUBE_API_KEY` | Enables real YouTube trending (official API, free tier) |
| `INSTAGRAM_SCRAPING_ENABLED` | `true` enables the Instagram Playwright scraper |
| `TIKTOK_SCRAPING_ENABLED` | `true` enables the TikTok Playwright scraper |
| `AI_PROVIDER` | `local` (default) / `openai` / `anthropic` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | AI concept generation |
| `SUPABASE_URL` | Supabase project URL for reel persistence |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` / `SUPABASE_ANON_KEY` | Supabase auth (server-side only) |
| `SUPABASE_REELS_TABLE` | Table name, defaults to `reels` |
| `PORT` | Backend port (default `3001`) |

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend + service health (incl. Supabase) |
| GET | `/api/trending?platform=&region=&industry=` | Fetch (and persist) trending reels |
| GET | `/api/trending/stored` | Read persisted reels |
| GET | `/api/trending/storage-status` | Supabase status + schema SQL |
| POST | `/api/ai/concept` | Generate AI reel concept |
| GET/POST/DELETE | `/api/editor/projects` | Project persistence |
| POST | `/api/editor/remix` | Generate AI remix plan |
| POST | `/api/editor/edit` | Apply edit config (FFmpeg when available) |
| POST | `/api/editor/export` | Export platform packages |
| GET/POST | `/api/settings` | Read/save settings (keys masked on read) |

## Project Structure

```
viral-reels/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # TrendingFeed, ReelCard, AIEditor, Projects, Settings
│   │   ├── services/        # API client
│   │   ├── data/            # Demo dataset + filter options
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── ...
├── server/                  # Express backend
│   ├── routes/              # trending, ai, editor, settings
│   ├── services/            # youtubeService, instagramScraper, tiktokScraper,
│   │                        # aiService, videoEditor, supabaseStore
│   ├── data/                # Demo dataset
│   ├── data-store/          # Local fallback store (gitignored)
│   ├── outputs/             # Generated export packages (gitignored)
│   ├── .env.example
│   └── index.js
├── .gitignore
├── package.json
└── README.md
```

## Notes & limitations

- Instagram and TikTok scrapers rely on headless browsing and may break when those platforms change markup or tighten anti-bot measures. They are best-effort, not guaranteed.
- Without any live source configured, the trending feed serves the bundled demo dataset and labels it as such.
- FFmpeg is optional: with it, exports can render MP4; without it, export manifests are still produced.
- Supabase credentials stay on the server; only public configuration reaches the browser.

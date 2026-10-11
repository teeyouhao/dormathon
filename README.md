# TrendWise — AI Trending Reels Generator for SMEs

> Dormathon_Ctrl-C-V_77 · Dormathon let's go

Help small and medium enterprises (SMEs) get exposure by finding trending short-form video patterns on YouTube, Instagram and TikTok, then adapting them into ready-to-post vertical reels.

## Features

### Trending Feed
- Fetches short videos across **YouTube, Instagram and TikTok**, with visibly labelled demo data when no live source returns data. Instagram uses a worldwide hashtag sample, not a global most-viewed ranking; the exact hashtag/Reels input returned three playable clips in a small live smoke test.
- Filters: **platform**, **country** (Southeast Asia + other regions), **industry**, free-text **search**, and **sort** (Most Recent / Trending / Most Viewed / Most Liked / Most Shared). These controls do not make Instagram results country-specific or a global ranking.
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
| Instagram via Apify (`apify/instagram-scraper`) | Server `APIFY_TOKEN` is set and `INSTAGRAM_SCRAPING_ENABLED=true` | ✅ Live provider; tested with one result per hashtag |
| TikTok Playwright scraper | `TIKTOK_SCRAPING_ENABLED=true` | ✅ Yes (if not blocked) |
| Bundled demo dataset | No live source returned data | ❌ No — clearly labelled `source: mock` |

If you see demo reels, **no live provider returned data**. The UI visibly indicates demo status, and the API reports its `source`. Configure a YouTube API key, Instagram's server-only Apify token plus enable flag, or TikTok's scraper to request live data; configuration does not guarantee results.

Instagram uses the Apify Actor, not local Playwright. It submits `directUrls` for the `mostviewed`, `trending` and `viral` hashtags with `resultsType: "reels"` via POST `run-sync-get-dataset-items`; it never uses `search` or `searchType`. A live smoke test on 2026-10-10 with `resultsLimit: 1` returned HTTP 201 and three playable clips; ongoing availability depends on the Actor and Instagram. TikTok remains a best-effort Playwright headless-browser scraper.

Instagram keeps only items with `productType: "clips"` and an HTTPS `videoUrl`. It preserves the requested metadata fields, including `likesCount: -1` with `likesHidden: true` (shown as hidden in the UI); unknown metrics remain `null`, not zero. The `apify-instagram` source is preserved in database records and raw payloads.

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
- **Data providers**: Apify `apify/instagram-scraper` (Instagram), Playwright (TikTok), YouTube Data API v3
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

`server/.env` is gitignored — never commit real keys. For Instagram, set both values below in that file; the enable flag defaults to `false`:

```dotenv
APIFY_TOKEN=your-apify-token
INSTAGRAM_SCRAPING_ENABLED=true
```

Keep `APIFY_TOKEN` server-side only; never use a `VITE_` prefix or put it in client configuration. Optional Instagram limits and defaults are listed below. Instagram does not require a local Playwright installation.

### 3. (Optional) Install Playwright for TikTok only

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

### 5. Run offline server tests

```bash
# from the project root; no live Apify calls
npm --prefix server test
```

Offline tests do not validate live Actor hashtag support.

## Environment variables

| Variable | Purpose |
|---|---|
| `YOUTUBE_API_KEY` | Enables real YouTube trending (official API, free tier) |
| `APIFY_TOKEN` | Server-only Apify token required for Instagram |
| `INSTAGRAM_SCRAPING_ENABLED` | `true` enables Instagram via Apify; defaults to `false` and also requires `APIFY_TOKEN` |
| `APIFY_INSTAGRAM_RESULTS_LIMIT` | Default `3`; range `1–30` per each of the three hashtag URLs (9 requested by default); separate from the UI display limit |
| `APIFY_INSTAGRAM_ONLY_POSTS_NEWER_THAN` | Default `7 days`; leave blank to omit the date filter |
| `APIFY_INSTAGRAM_CACHE_MINUTES` | Default `30`; minimum `1`, maximum `1440` minutes |
| `APIFY_INSTAGRAM_MAX_CHARGE_USD` | Default `0.10` USD per run; clamped to `0.01–1` |
| `APIFY_INSTAGRAM_TIMEOUT_SECONDS` | Default `180`; range `10–240` seconds for the remote Actor timeout; HTTP deadline is 15 seconds longer |
| `TIKTOK_SCRAPING_ENABLED` | `true` enables the TikTok Playwright scraper |
| `AI_PROVIDER` | `local` (default) / `openai` / `anthropic` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | AI concept generation |
| `SUPABASE_URL` | Supabase project URL for reel persistence |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` / `SUPABASE_ANON_KEY` | Supabase auth (server-side only) |
| `SUPABASE_REELS_TABLE` | Table name, defaults to `reels` |
| `PORT` | Backend port (default `3001`) |

### Instagram request and billing controls

- A shared in-memory cache stores results, including empty results, and concurrent requests are coalesced into one in-flight run. There is no cross-process cache; separate server processes do not share this protection.
- Errors trigger a cooldown of the greater of 5 minutes and the configured cache duration. There are no automatic retries.
- Each Actor run uses `maxItems`, `maxTotalChargeUsd` and a remote timeout to bound results, charges and runtime. Check your Apify account's current billing and the per-run cap; do not treat example prices or credit-to-result estimates as guarantees.
- Before public deployment, protect endpoints that can trigger paid runs with authentication and rate limits. The cache and per-run cap are not a total spending limit.

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

- Instagram's exact hashtag/Reels mode passed a small live test, but future results still depend on Apify Actor support. TikTok uses Playwright and may break when markup or anti-bot measures change; live results are not guaranteed.
- Instagram samples worldwide `mostviewed`, `trending` and `viral` hashtags. It is neither a global most-viewed ranking nor a country-specific feed; sorting the sample does not change that scope.
- Instagram MP4 links may expire. Obtaining appropriate usage rights remains the user's responsibility.
- When no live source returns data, the trending feed serves the bundled demo dataset and visibly labels demo status.
- FFmpeg is optional: with it, exports can render MP4; without it, export manifests are still produced.
- Supabase credentials and the Apify token stay on the server; only public configuration reaches the browser.

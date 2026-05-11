# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Setup

Two processes must run simultaneously for local development:

```bash
# Terminal 1 — Python API server (port 3001)
cd api && python3 local_server.py

# Terminal 2 — Vite dev server (port 5173)
npm run dev
```

Vite proxies all `/api/*` requests to `localhost:3001` (configured in `vite.config.js`). The Python server must be restarted manually whenever `api/scrape.py` changes.

Other commands:
```bash
npm run build    # production build → dist/
npm run preview  # serve the dist/ build locally
```

## Architecture

**Backend** (`api/scrape.py`) is a single Vercel serverless function that handles all API routes via query params:

| Param | Behavior |
|-------|----------|
| `?code=31888` | Resolves a Fedegolf código → Salesforce ID, then fetches rounds |
| `?sf_id=0035x...` | Skips lookup, fetches rounds directly by Salesforce ID |
| `?round_id=abc123` | Returns hole-by-hole scorecard for a single round |
| `?sf_id=...&full=1` | Also fetches all scorecards in parallel and computes analytics |

Scraping flow: WordPress AJAX endpoint (`action=envio_salesforce`) → Salesforce-backed Fedegolf portal at `servicios.federacioncolombianadegolf.com`. Scorecards are fetched in parallel with `ThreadPoolExecutor(max_workers=5)`.

The scorecard HTML is **column-oriented** (holes across columns, not rows) — `get_scorecard()` pivots by column index, not row.

**Frontend** is React + Vite + Recharts with a dark golf theme (CSS variables in `src/index.css`). No state management library — plain `useState`/`useEffect`.

Data flow:
1. `App.jsx` owns all top-level state (`data`, `loading`, `error`, `activeTab`)
2. On search, fetches `/api/scrape?code=…` → stores full JSON in `data`
3. `Dashboard` renders from `data.rounds`; clicking a row mounts `ScoreCard` which lazy-fetches `/api/scrape?round_id=…`
4. `Analytics` tab mounts independently and fetches `/api/scrape?sf_id=…&full=1` (heavier call — all scorecards)

**Key data shapes:**
- `rounds[]` — each has `{ id, date (DD/MM/YYYY), course, club, marca, score, holes_played, differential }`
- `analytics.hole_stats_by_course` — keyed by course name, each value is an array of hole stats; `analytics.courses_sorted` gives the order
- Scorecard: `{ holes: [{ hole, par, strokes }] }`

## Deployment

Deployed on Vercel. `vercel.json` has no explicit `functions` block — Python is auto-detected. Push to `main` triggers auto-deploy.

Do **not** add a `runtime` field back to `vercel.json`; it causes a build error ("Function Runtimes must have a valid version").

## Theme

CSS variables are defined in `src/index.css` under `:root`. Key tokens: `--gold: #d4af37`, `--bg-main: #071a07`, `--bg-card: #0d1f0d`, `--border: #1a3a1a`. Headings use Playfair Display (loaded via Google Fonts in `index.html`).

# AstroHub live data pipeline

This is the "real" half of AstroHub: a small, free, no-server pipeline that
pulls actual astronomy news on a schedule and hands it to the frontend as a
plain JSON file. No database, no backend process running 24/7 — just a
GitHub Actions job that wakes up, fetches, writes a file, and goes back to
sleep.

## What it pulls, and from where

| Source | Type | Agency |
|---|---|---|
| `nasa.gov/rss/dyn/breaking_news.rss` | RSS | NASA |
| `feeds.feedburner.com/EsoTopNews` | RSS | ESO |
| `feeds.feedburner.com/hubble_news` | RSS | ESA / Hubble |
| `export.arxiv.org` astro-ph query | Atom | arXiv preprints |
| `exoplanetarchive.ipac.caltech.edu/TAP` | TAP / ADQL | NASA Exoplanet Archive |
| `api.nasa.gov/planetary/apod` | REST/JSON | NASA (picture of the day) |

Each item gets normalized into one shape:

```json
{
  "id": "a1b2c3d4e5f6",
  "agency": "eso",
  "source": "ESO press releases",
  "title": "...",
  "summary": "...",
  "url": "https://...",
  "publishedAt": "2026-08-19T10:00:00.000Z",
  "tags": []
}
```

Everything is deduped by URL and sorted newest-first before being written to
`public/data.json`, capped at the 60 most recent items.

## Known limitations (read this before assuming it's complete)

- **JAXA and ISRO aren't wired in.** Neither publishes a clean, stable public
  RSS feed for press releases as of this writing — ISRO's site doesn't expose
  one, and JAXA's English press page isn't consistently feed-friendly either.
  Their entries in the app remain hand-curated for now. If you find a working
  feed for either, add it to `SOURCES` in `scripts/fetch-data.mjs`.
- **This is scheduled, not real-time.** The default cron runs every 6 hours.
  A breaking discovery announced 10 minutes ago won't show up until the next
  run — tighten the cron in `.github/workflows/update-data.yml` if you want
  it more often, but GitHub Actions free tier has monthly minute limits.
- **Feedburner feeds (ESO, Hubble) sometimes lag the agency's own site** by
  minutes to hours, since Feedburner mirrors rather than serves live.
- **Exoplanet Archive links follow a best-guess URL pattern**
  (`/overview/<host-star-name>`) that matches the archive's usual scheme but
  isn't guaranteed for every naming edge case — if a specific link 404s, the
  archive's own search UI at exoplanetarchive.ipac.caltech.edu always works.
- **`DEMO_KEY` for NASA's API is shared and rate-limited** (30 requests/hour,
  50/day, shared across everyone using it who hasn't set their own key). Get
  a free personal key instantly at https://api.nasa.gov and add it as a
  repository secret (see setup below) for reliable use.
- **No full-text search, no dedup across agencies covering the same story**
  (e.g. if NASA and ESA both cover a joint Hubble result, both show up as
  separate items) — that needs fuzzy title matching, which isn't in v1.
- **arXiv items are preprints, not verified discoveries** — they're
  unreviewed submissions, which is normal for the field but worth knowing
  before treating one as settled science.

## Setup

1. **Create a GitHub repo** and push everything in this folder to it.
2. **(Optional but recommended)** Get a free NASA API key at
   https://api.nasa.gov, then in your repo go to
   Settings → Secrets and variables → Actions → New repository secret,
   name it `NASA_API_KEY`, paste the key.
3. **Enable the workflow**: it runs automatically on the schedule once
   pushed, or trigger it manually from the Actions tab
   ("Refresh astronomy data" → Run workflow) to generate the first
   `public/data.json` immediately rather than waiting for the next cron tick.
4. **Serve `public/data.json` somewhere the frontend can fetch it.** Easiest
   options:
   - Raw GitHub URL: `https://raw.githubusercontent.com/<you>/<repo>/main/public/data.json`
     (works immediately, no extra setup, but is rate-limited and not meant
     for high traffic)
   - GitHub Pages: enable Pages on the repo (Settings → Pages → deploy from
     `main` / `public`), then use the Pages URL — more reliable for anything
     beyond personal use.
5. **Point the frontend at it.** In the AstroHub React app, set the
   `LIVE_DATA_URL` constant near the top of the file to whichever URL you
   picked in step 4.

## Running it locally

```bash
npm install
npm run fetch
```

This writes `public/data.json` in the current directory so you can inspect
it before deploying anything.

## Extending it

- Add the NASA Exoplanet Archive's TAP service for a live "newly confirmed
  exoplanets" list — it's a REST endpoint, no key needed, but the query
  syntax (ADQL) is fussier than plain RSS.
- Add fuzzy dedup across agencies (compare normalized titles with a distance
  threshold) if joint NASA/ESA/JAXA missions start showing up twice.
- Swap the cron for a webhook if an agency ever offers push notifications
  instead of polling.

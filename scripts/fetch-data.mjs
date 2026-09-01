// AstroHub data ingestion — pulls real feeds, normalizes them into one schema,
// dedupes, and writes public/data.json. Run manually with `npm run fetch`,
// or on a schedule via .github/workflows/update-data.yml
//
// Known gap: JAXA and ISRO don't publish a clean public RSS/API for press
// releases as of this writing, so they aren't wired in here. Their entries
// in the app remain hand-curated until a workable feed turns up — see
// README.md "Known limitations".

import Parser from "rss-parser";
import { writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";

const NASA_API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";
const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "AstroHub-Ingest/1.0 (+https://github.com/)" },
});

const SOURCES = [
  { agency: "nasa", label: "NASA breaking news", type: "rss", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss" },
  { agency: "eso", label: "ESO press releases", type: "rss", url: "https://feeds.feedburner.com/EsoTopNews" },
  { agency: "esa", label: "ESA/Hubble news", type: "rss", url: "https://feeds.feedburner.com/hubble_news/" },
  { agency: "arxiv", label: "arXiv astro-ph (new submissions)", type: "rss", url: "http://export.arxiv.org/api/query?search_query=cat:astro-ph.*&sortBy=submittedDate&sortOrder=descending&max_results=25" },
];

function hashId(str) {
  return createHash("sha1").update(str).digest("hex").slice(0, 12);
}

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function truncate(str, n) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n).trim() + "…" : str;
}

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items || []).map((item) => {
      const title = stripHtml(item.title || "Untitled");
      const rawSummary = item.contentSnippet || item.content || item.summary || "";
      const summary = truncate(stripHtml(rawSummary), 320);
      const link = item.link || item.id || "";
      const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();
      return {
        id: hashId(link || title),
        agency: source.agency,
        source: source.label,
        title,
        summary,
        url: link,
        publishedAt,
        tags: item.categories || [],
      };
    });
  } catch (err) {
    console.error(`[fetch-data] Failed to fetch ${source.label} (${source.url}): ${err.message}`);
    return { __error: source.label, __message: err.message };
  }
}

async function fetchApod() {
  try {
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[fetch-data] Failed to fetch APOD: ${err.message}`);
    return null;
  }
}

// NASA Exoplanet Archive TAP service — no key needed, but it's ADQL (SQL-like),
// not RSS, so it gets its own fetch function instead of going through
// fetchFeed(). Table docs: https://exoplanetarchive.ipac.caltech.edu/docs/pscp_about.html
//
// Caveat: the per-planet "overview" URL below follows the archive's usual
// /overview/<host-star-name> pattern, but that pattern isn't guaranteed for
// every naming edge case — if a link 404s, the archive's own search page
// (linked as a fallback in the app) always works.
async function fetchExoplanets() {
  const query = "SELECT+TOP+15+pl_name,hostname,disc_year,discoverymethod,pl_orbper,pl_rade,pl_bmasse,rowupdate+FROM+pscomppars+ORDER+BY+rowupdate+DESC";
  const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${query}&format=json`;

  try {
    const res = await fetch(url, { headers: { "User-Agent": "AstroHub-Ingest/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();

    return rows.map((row) => {
      const facts = [
        row.discoverymethod ? `discovered via ${row.discoverymethod}` : null,
        row.disc_year ? `${row.disc_year}` : null,
        row.pl_rade ? `${row.pl_rade.toFixed(2)}x Earth radius` : null,
        row.pl_bmasse ? `${row.pl_bmasse.toFixed(2)}x Earth mass` : null,
        row.pl_orbper ? `${row.pl_orbper.toFixed(1)}-day orbit` : null,
      ].filter(Boolean);

      const hostSlug = (row.hostname || "").trim().replace(/\s+/g, "_");
      const publishedAt = row.rowupdate ? new Date(row.rowupdate).toISOString() : new Date().toISOString();

      return {
        id: hashId(`exo:${row.pl_name}:${row.rowupdate}`),
        agency: "exo",
        source: "NASA Exoplanet Archive",
        title: `${row.pl_name} — catalog entry updated`,
        summary: `Orbits ${row.hostname}${facts.length ? ": " + facts.join(", ") : ""}.`,
        url: hostSlug ? `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(hostSlug)}` : "https://exoplanetarchive.ipac.caltech.edu/",
        publishedAt,
        tags: [row.discoverymethod].filter(Boolean),
      };
    });
  } catch (err) {
    console.error(`[fetch-data] Failed to fetch NASA Exoplanet Archive: ${err.message}`);
    return { __error: "NASA Exoplanet Archive", __message: err.message };
  }
}

async function main() {
  const [feedResults, exoResult] = await Promise.all([
    Promise.all(SOURCES.map(fetchFeed)),
    fetchExoplanets(),
  ]);

  const errors = [];
  const items = [];
  for (const r of feedResults) {
    if (Array.isArray(r)) items.push(...r);
    else errors.push(r);
  }
  if (Array.isArray(exoResult)) items.push(...exoResult);
  else errors.push(exoResult);

  // Dedupe by id (hash of URL), keep the newest occurrence
  const byId = new Map();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing || new Date(item.publishedAt) > new Date(existing.publishedAt)) {
      byId.set(item.id, item);
    }
  }

  const deduped = [...byId.values()].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );

  const apod = await fetchApod();
  const totalSources = SOURCES.length + 1; // +1 for the Exoplanet Archive

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceCount: totalSources,
    itemCount: deduped.length,
    errors: errors.map((e) => ({ source: e.__error, message: e.__message })),
    apod,
    items: deduped.slice(0, 60),
  };

  await mkdir("public", { recursive: true });
  await writeFile("public/data.json", JSON.stringify(payload, null, 2));

  console.log(`[fetch-data] Wrote ${deduped.length} items from ${totalSources - errors.length}/${totalSources} sources.`);
  if (errors.length) {
    console.log(`[fetch-data] ${errors.length} source(s) failed:`, errors.map((e) => e.source).join(", "));
  }
}

main().catch((err) => {
  console.error("[fetch-data] Fatal error:", err);
  process.exit(1);
});

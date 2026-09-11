// AstroHub data ingestion — pulls real feeds, normalizes them into one schema,
// dedupes, and writes public/data.json. Run manually with `npm run fetch`,
// or on a schedule via .github/workflows/update-data.yml
//
// Known gap: JAXA and ISRO don't publish a clean public RSS/API for press
// releases as of this writing, so they aren't wired in here. Their entries
// in the app remain hand-curated until a workable feed turns up — see
// README.md "Known limitations".

import Parser from "rss-parser";
import { writeFile, mkdir, readFile } from "node:fs/promises";
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
    const res = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`,
      { headers: { "User-Agent": "AstroHub-Ingest/1.0" } }
    );
    if (res.ok) {
      return await res.json();
    }
    console.warn(`[fetch-data] APOD API returned HTTP ${res.status}; trying NASA's official APOD page.`);
  } catch (err) {
    console.warn(`[fetch-data] APOD API failed: ${err.message}; trying NASA's official APOD page.`);
  }

  try {
    const res = await fetch("https://apod.nasa.gov/apod/ap.html", {
      headers: { "User-Agent": "AstroHub-Ingest/1.0" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();

    const titleMatch = html.match(/<b>\s*([^<]+?)\s*<\/b>/i);
    const imageMatch = html.match(/<a href="([^"]+\.(?:jpg|jpeg|png|gif))"/i);
    const dateMatch = html.match(/(\d{4})\s+([A-Za-z]+)\s+(\d{1,2})/);

    const title = titleMatch?.[1]?.trim();
    const imagePath = imageMatch?.[1];
    const dateParts = dateMatch?.slice(1);

    if (!title || !imagePath || !dateParts) {
      throw new Error("Could not parse NASA APOD page");
    }

    const [, monthName, day] = dateParts;
    const monthMap = {
      January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
      July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
    };

    const month = String(monthMap[monthName]).padStart(2, "0");
    const date = `${dateParts[0]}-${month}-${String(day).padStart(2, "0")}`;

    const imageUrl = new URL(imagePath, "https://apod.nasa.gov/apod/").href;

    return {
      title,
      date,
      url: imageUrl,
      hdurl: imageUrl,
      media_type: "image",
      explanation: "Today's Astronomy Picture of the Day from NASA.",
      copyright: ""
    };
  } catch (err) {
    console.error(`[fetch-data] Failed to fetch APOD from API and official page: ${err.message}`);
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
  const query = "SELECT+TOP+15+pl_name,hostname,disc_year,discoverymethod,pl_orbper,pl_rade,pl_bmasse,ra,dec+FROM+pscomppars+ORDER+BY+disc_year+DESC";
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
      ra: row.ra,
      dec: row.dec,
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

  const previousPayload = await readFile("public/data.json", "utf8").then(JSON.parse).catch(() => null);
  const apod = await fetchApod() || previousPayload?.apod || null;
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

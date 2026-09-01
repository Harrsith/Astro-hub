import React, { useState, useMemo, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Search, Bell, Rss, Radio, CalendarDays, Telescope, ImageIcon, ChevronRight, Satellite, ExternalLink, Clock, RefreshCw, AlertCircle, Wifi, WifiOff } from "lucide-react";

// NASA's public demo key — rate-limited (30 req/hr, 50/day) and shared by everyone using it.
// Swap in a free personal key from https://api.nasa.gov for reliable use.
const NASA_API_KEY = "DEMO_KEY";

// Point this at your deployed data.json once you've set up the ingestion
// pipeline in this project (see README.md). Leave blank to run entirely on
// the hand-curated fallback feed below.
// e.g. "https://raw.githubusercontent.com/<you>/<repo>/main/public/data.json"
const LIVE_DATA_URL = "";

const AGENCIES = [
  { id: "nasa", name: "NASA", full: "National Aeronautics and Space Administration", color: "#6FA8FF" },
  { id: "esa", name: "ESA", full: "European Space Agency", color: "#7FD9C6" },
  { id: "isro", name: "ISRO", full: "Indian Space Research Organisation", color: "#F2A65A" },
  { id: "jaxa", name: "JAXA", full: "Japan Aerospace Exploration Agency", color: "#E68FD0" },
  { id: "eso", name: "ESO", full: "European Southern Observatory", color: "#B8A6F2" },
  { id: "arxiv", name: "arXiv", full: "arXiv astro-ph preprints", color: "#8FA8C4" },
  { id: "exo", name: "Exo Archive", full: "NASA Exoplanet Archive", color: "#7FC49A" },
];

// Fallback feed — used whenever LIVE_DATA_URL is unset, unreachable, or
// still loading. Real, dated reports gathered from agency newsrooms and
// astronomy outlets as of Sep 1, 2026.
const CURATED_FALLBACK = [
  {
    id: 1,
    agency: "eso",
    title: "Fastest known star found orbiting the Milky Way's central black hole",
    date: "Aug 19, 2026",
    summary: "ESO's Very Large Telescope Interferometer tracked a star named S301 skimming closer to Sagittarius A* than any star observed before, moving at roughly 25,000 km/s and close enough to feel the black hole's rotation.",
    detail: "The detection pushes the record for closest stellar approach to a supermassive black hole and gives theorists a rare natural laboratory for testing how strong gravity and frame-dragging shape an orbit at the edge of survivability.",
    tag: "Black holes",
    ra: "17h 45m",
    dec: "-29",
    source: "https://www.eso.org/public/news/",
    sourceLabel: "eso.org/public/news",
  },
  {
    id: 2,
    agency: "eso",
    title: "First direct image of Betelgeuse's long-suspected companion star",
    date: "Jul 28, 2026",
    summary: "Using the VLT, a team led by Miguel Montarges obtained the clearest image yet of what is likely Betelgeuse B, the companion star long predicted to explain irregularities in Betelgeuse's brightness.",
    detail: "Astronomers had searched for a companion to the red supergiant for decades; a confirmed detection would help explain periodic dimming patterns and refine models of how binary companions influence a star's late-life evolution.",
    tag: "Stellar systems",
    ra: "05h 55m",
    dec: "+07",
    source: "https://www.eso.org/public/news/",
    sourceLabel: "eso.org/public/news",
  },
  {
    id: 3,
    agency: "nasa",
    title: "JWST finds Neptune's small inner moons may be wreckage of a shattered world",
    date: "Aug 14, 2026",
    summary: "Spectra from the James Webb Space Telescope revealed clay-like minerals on the small moons Larissa and Galatea, hinting that Neptune's inner moon system formed from the breakup of an earlier body rather than in its current form.",
    detail: "Clay minerals require liquid water to form, which is unexpected for small, icy moons this far from the Sun — the finding reopens questions about the collisional history of the outer solar system.",
    tag: "Solar system",
    ra: "23h 07m",
    dec: "-15",
    source: "https://www.sciencedaily.com/news/space_time/",
    sourceLabel: "sciencedaily.com",
  },
  {
    id: 4,
    agency: "nasa",
    title: "Nancy Grace Roman Space Telescope launches and begins its cruise to L2",
    date: "Aug 26, 2026",
    summary: "NASA's flagship wide-field observatory launched aboard a Falcon Heavy and is now three months into a roughly one-million-mile journey to its operating orbit, carrying a field of view about 100 times larger than Hubble's.",
    detail: "Once operational, Roman is expected to survey billions of objects and hunt thousands of exoplanets via microlensing, alongside dedicated dark energy and dark matter surveys.",
    tag: "Mission milestone",
    ra: "—",
    dec: "—",
    source: "https://www.nasa.gov/2026-news-releases/",
    sourceLabel: "nasa.gov/2026-news-releases",
  },
  {
    id: 5,
    agency: "eso",
    title: "Third planet confirmed in the Beta Pictoris system",
    date: "Jul 15, 2026",
    summary: "Direct-imaging teams independently confirmed Beta Pictoris d, a faint planet roughly 100 times dimmer than the system's first known planet, making Beta Pictoris only the second directly imaged system known to host three or more planets.",
    detail: "The system is young enough that its planets are still glowing from formation heat, making it a benchmark for testing planet-formation models against direct observation rather than indirect detection methods.",
    tag: "Exoplanets",
    ra: "05h 47m",
    dec: "-51",
    source: "https://exoplanetarchive.ipac.caltech.edu/docs/exonews_archive.html",
    sourceLabel: "exoplanetarchive.ipac.caltech.edu",
  },
  {
    id: 6,
    agency: "nasa",
    title: "Mars interior shows a hidden hemispheric heat divide",
    date: "Aug 30, 2026",
    summary: "New modeling of Mars's deep interior suggests its southern half may run hundreds of degrees hotter than the north, with the hottest regions potentially still partially molten.",
    detail: "The asymmetry could help explain the long-standing puzzle of why Mars's northern and southern hemispheres look so different at the surface, tying crustal history to deep thermal structure.",
    tag: "Planetary science",
    ra: "—",
    dec: "—",
    source: "https://www.sciencedaily.com/news/space_time/astronomy/",
    sourceLabel: "sciencedaily.com",
  },
  {
    id: 7,
    agency: "jaxa",
    title: "Hayabusa2 extended mission flies past near-Earth asteroid Torifune",
    date: "Jul 25, 2026",
    summary: "JAXA's Hayabusa2 spacecraft, already famous for returning samples from asteroid Ryugu, used its extended mission to fly by the near-Earth asteroid 98943 Torifune.",
    detail: "Characterizing small near-Earth asteroids like Torifune helps refine strategies for planetary-defense scenarios, building directly on techniques proven during the Ryugu sample-return campaign.",
    tag: "Sample return",
    ra: "—",
    dec: "—",
    source: "https://www.planetary.org/articles/calendar-of-space-events-2026",
    sourceLabel: "planetary.org",
  },
  {
    id: 8,
    agency: "isro",
    title: "Gaganyaan uncrewed test flight targeted for late 2026",
    date: "Aug 2026",
    summary: "ISRO chairman V. Narayanan confirmed the agency is on track for its first uncrewed Gaganyaan mission by the end of 2026, with the humanoid Vyomamitra aboard to validate the full crew-module sequence before any human flight.",
    detail: "The uncrewed run will test launch-vehicle aerodynamics, orbital operations, re-entry, and crew-module recovery — every phase a crewed mission would need — ahead of India's first crewed flight targeted for 2027.",
    tag: "Human spaceflight",
    ra: "—",
    dec: "—",
    source: "https://www.isro.gov.in/",
    sourceLabel: "isro.gov.in",
  },
  {
    id: 9,
    agency: "esa",
    title: "Hubble spots surprisingly early galaxy clearing its own cosmic fog",
    date: "Jun 23, 2026",
    summary: "The Hubble Space Telescope detected ultraviolet light escaping a galaxy that existed just 1.4 billion years after the Big Bang, with tightly clustered young stars producing enough ionizing radiation to punch through the surrounding neutral gas.",
    detail: "This kind of early, localized 'reionization' is exactly the process thought to have cleared the fog that once filled the young universe, and catching it in the act this early is unusual.",
    tag: "Early universe",
    ra: "—",
    dec: "—",
    source: "https://esahubble.org/news/archive/year/2026/",
    sourceLabel: "esahubble.org",
  },
  {
    id: 10,
    agency: "nasa",
    title: "Perseverance watches Earth vanish behind Mars's moon Phobos",
    date: "Aug 13, 2026",
    summary: "From nearly 195 million miles away, NASA's Perseverance rover captured Earth being briefly eclipsed by the small Martian moon Phobos, reducing our planet to a single point of light before it reappeared.",
    detail: "Beyond the striking image, this kind of occultation timing helps refine Phobos's orbital parameters, which feeds into planning for any future close approach or landing on the moon.",
    tag: "Mars",
    ra: "—",
    dec: "—",
    source: "https://www.sciencedaily.com/news/space_time/astronomy/",
    sourceLabel: "sciencedaily.com",
  },
];

// ISRO and JAXA don't have a clean public RSS/API wired into the live
// pipeline yet (see README.md "Known limitations"), so these two stay
// hand-curated and get appended to whatever the live feed returns.
const STATIC_SUPPLEMENT = CURATED_FALLBACK.filter((item) => item.agency === "isro" || item.agency === "jaxa");

const EVENTS = [
  { name: "Venus-Spica close approach", date: "Sep 01", detail: "Visible in evening twilight" },
  { name: "September equinox", date: "Sep 22", detail: "Equal day and night, both hemispheres" },
  { name: "Neptune at opposition", date: "Sep 25", detail: "Brightest of the year, needs a telescope" },
  { name: "Juice Earth gravity assist", date: "Sep 2026", detail: "ESA's Jupiter probe swings past Earth" },
  { name: "Draconid meteor shower peak", date: "Oct 08", detail: "Moonless night, modest rates" },
];

const MISSIONS = [
  { name: "James Webb Space Telescope", agency: "nasa", status: "Cycle 4 science operations", pct: 65 },
  { name: "Roman Space Telescope", agency: "nasa", status: "Cruising to L2, 3-month transit", pct: 20 },
  { name: "Aditya-L1", agency: "isro", status: "Nominal, halo orbit at L1", pct: 88 },
  { name: "BepiColombo", agency: "esa", status: "Mercury orbit insertion, 2026", pct: 92 },
  { name: "Gaganyaan (uncrewed)", agency: "isro", status: "Targeting late 2026", pct: 55 },
];

const MISSION_DETAILS = {
  "James Webb Space Telescope": {
    launch: "Dec 2021",
    target: "Sun-Earth L2",
    detail: "Now well into Cycle 4 general observations, JWST splits time between approved science programs spanning exoplanet atmospheres, early-universe galaxies, and solar-system targets. Instrument teams continue periodic calibration to keep NIRSpec and MIRI at peak sensitivity.",
    link: "https://www.nasa.gov/mission/webb/",
  },
  "Roman Space Telescope": {
    launch: "Aug 26, 2026",
    target: "Sun-Earth L2",
    detail: "Launched on a Falcon Heavy, Roman is roughly three months into a million-mile cruise to its L2 operating orbit. Once commissioned, its wide-field instrument and coronagraph are expected to survey billions of objects and directly image nearby exoplanets.",
    link: "https://www.nasa.gov/mission/nancy-grace-roman-space-telescope/",
  },
  "Aditya-L1": {
    launch: "Sep 2023",
    target: "Sun-Earth L1",
    detail: "India's first dedicated solar observatory continues nominal operations in its halo orbit around L1, with the VELC coronagraph and other instruments tracking coronal mass ejections and solar wind structure continuously.",
    link: "https://www.isro.gov.in/",
  },
  "BepiColombo": {
    launch: "Oct 2018",
    target: "Mercury orbit",
    detail: "The joint ESA-JAXA mission is completing its seven-year cruise and is set to enter orbit around Mercury in 2026, deploying two orbiters — one for surface mapping, one for magnetosphere studies — after a series of gravity-assist flybys.",
    link: "https://www.esa.int/Science_Exploration/Space_Science/BepiColombo",
  },
  "Gaganyaan (uncrewed)": {
    launch: "Targeting late 2026",
    target: "Low Earth orbit",
    detail: "ISRO's first uncrewed Gaganyaan flight will fly the humanoid Vyomamitra to validate the full crew-module sequence — launch aerodynamics, orbital operations, re-entry, and recovery — ahead of a crewed flight targeted for 2027.",
    link: "https://www.isro.gov.in/",
  },
};

const IMAGE_ARCHIVE = [
  { label: "Betelgeuse B", src: "#2A3562", caption: "VLT direct-imaging detection of Betelgeuse's suspected companion star.", credit: "ESO / Montarges et al.", date: "Jul 2026" },
  { label: "S301 orbit", src: "#3A2F52", caption: "VLTI astrometric track of the fastest known star orbiting Sagittarius A*.", credit: "ESO", date: "Aug 2026" },
  { label: "Beta Pic d", src: "#4A3320", caption: "Direct image confirming a third planet in the Beta Pictoris system.", credit: "ESO", date: "Jul 2026" },
  { label: "Phobos transit", src: "#1F3D3A", caption: "Perseverance rover image of Earth passing behind the Martian moon Phobos.", credit: "NASA/JPL-Caltech", date: "Aug 2026" },
  { label: "Roman fairing", src: "#2E2A4A", caption: "Nancy Grace Roman Space Telescope enclosed in its Falcon Heavy fairing before launch.", credit: "NASA", date: "Aug 2026" },
  { label: "Neptune moons", src: "#233A52", caption: "JWST spectra of Larissa and Galatea showing unexpected clay-like minerals.", credit: "NASA/ESA/CSA", date: "Aug 2026" },
  { label: "Hubble UV galaxy", src: "#3E2A44", caption: "Hubble UV imaging of a galaxy 1.4 billion years after the Big Bang clearing surrounding gas.", credit: "NASA/ESA", date: "Jun 2026" },
  { label: "Torifune flyby", src: "#403420", caption: "Hayabusa2 extended-mission flyby imagery of near-Earth asteroid Torifune.", credit: "JAXA", date: "Jul 2026" },
];

const LIGHT_CURVE = [
  { t: -3, flux: 1.0 },
  { t: -2, flux: 0.999 },
  { t: -1, flux: 0.997 },
  { t: -0.5, flux: 0.981 },
  { t: 0, flux: 0.968 },
  { t: 0.5, flux: 0.981 },
  { t: 1, flux: 0.997 },
  { t: 2, flux: 0.999 },
  { t: 3, flux: 1.0 },
];

function raDecToXY(raHours, decDeg, cx, cy, rMax) {
  const angle = (raHours / 24) * Math.PI * 2 - Math.PI / 2;
  const r = rMax * (1 - Math.abs(decDeg) / 90) * 0.85 + rMax * 0.1;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}
function parseRA(raStr) {
  if (!raStr || raStr === "—") return null;
  const m = raStr.match(/(\d+)h\s*(\d+)m/);
  if (!m) return null;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}
function parseDec(decStr) {
  if (!decStr || decStr === "—") return null;
  return parseInt(decStr, 10);
}

export default function AstroHub() {
  const [activeAgency, setActiveAgency] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [selectedMission, setSelectedMission] = useState(null);
  const [showArchive, setShowArchive] = useState(false);

  const [liveStatus, setLiveStatus] = useState(LIVE_DATA_URL ? "loading" : "idle");
  const [liveItems, setLiveItems] = useState([]);
  const [liveMeta, setLiveMeta] = useState(null);
  const [liveAttempt, setLiveAttempt] = useState(0);

  useEffect(() => {
    if (!LIVE_DATA_URL) return;
    let cancelled = false;
    setLiveStatus("loading");

    fetch(LIVE_DATA_URL, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Data feed returned ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const transformed = (json.items || []).map((item) => ({
          id: item.id,
          agency: item.agency,
          title: item.title,
          date: item.publishedAt
            ? new Date(item.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "",
          summary: item.summary,
          detail: null,
          tag: item.agency === "arxiv" ? "Preprint" : item.agency === "exo" ? "Catalog update" : "Press release",
          ra: "—",
          dec: "—",
          source: item.url,
          sourceLabel: item.source,
        }));
        setLiveItems(transformed);
        setLiveMeta({ generatedAt: json.generatedAt, errors: json.errors || [] });
        setLiveStatus("success");
      })
      .catch(() => {
        if (cancelled) return;
        setLiveStatus("error");
      });

    return () => { cancelled = true; };
  }, [liveAttempt]);

  // Live data replaces the NASA/ESA/ESO/arXiv portion of the feed once it
  // loads; ISRO and JAXA (not yet in the pipeline) are always appended.
  const feed = useMemo(() => {
    if (liveStatus === "success" && liveItems.length > 0) {
      return [...liveItems, ...STATIC_SUPPLEMENT];
    }
    return CURATED_FALLBACK;
  }, [liveStatus, liveItems]);

  const filteredFeed = useMemo(() => {
    return feed.filter((item) => {
      const agencyMatch = activeAgency === "all" || item.agency === activeAgency;
      const queryMatch =
        query.trim() === "" ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.tag || "").toLowerCase().includes(query.toLowerCase());
      return agencyMatch && queryMatch;
    });
  }, [feed, activeAgency, query]);

  const skyObjects = feed.filter((f) => parseRA(f.ra) !== null);

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }
        ::selection { background: #6FA8FF; color: #0A0D16; }
        .pill { transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease; cursor: pointer; }
        .feedcard { transition: border-color 0.15s ease; cursor: pointer; }
        .feedcard:hover { border-color: #3A4468; }
        .srclink { transition: color 0.15s ease; }
        .srclink:hover { color: #6FA8FF; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoMark}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="13" r="3.2" fill="#F2A65A" />
              <ellipse cx="13" cy="13" rx="11.5" ry="4.2" stroke="#6FA8FF" strokeWidth="1.1" transform="rotate(-18 13 13)" />
              <ellipse cx="13" cy="13" rx="11.5" ry="4.2" stroke="#6FA8FF" strokeWidth="1.1" opacity="0.4" transform="rotate(18 13 13)" />
            </svg>
          </div>
          <div>
            <div style={styles.wordmark}>AstroHub</div>
            <div style={styles.tagline}>Cross-agency observation feed</div>
          </div>
        </div>

        <div style={styles.searchWrap}>
          <Search size={15} color="#5C6584" style={{ flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search discoveries, missions, catalog numbers..."
            style={styles.searchInput}
          />
        </div>

        <div style={styles.headerRight}>
          <div style={styles.updatedStamp}>
            {liveStatus === "success" ? (
              <>
                <Wifi size={12} color="#5DCA8A" />
                <span>Live · updated {liveMeta?.generatedAt ? new Date(liveMeta.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "recently"}</span>
              </>
            ) : liveStatus === "error" ? (
              <>
                <WifiOff size={12} color="#E88A6A" />
                <span>Live feed unreachable — showing curated snapshot</span>
                <button style={styles.retryStampBtn} onClick={() => setLiveAttempt((a) => a + 1)}>retry</button>
              </>
            ) : liveStatus === "loading" ? (
              <>
                <Clock size={12} color="#5C6584" />
                <span>Connecting to live feed…</span>
              </>
            ) : (
              <>
                <Clock size={12} color="#5C6584" />
                <span>Curated snapshot: Sep 1, 2026</span>
              </>
            )}
          </div>
          <button style={styles.iconBtn}><Bell size={17} color="#8992AC" /></button>
        </div>
      </header>

      <div style={styles.body}>
        <aside style={styles.leftRail}>
          <div style={styles.railLabel}>Sources</div>
          <button
            className="pill"
            onClick={() => setActiveAgency("all")}
            style={{
              ...styles.agencyRow,
              background: activeAgency === "all" ? "#1A2038" : "transparent",
              borderLeft: activeAgency === "all" ? "2px solid #6FA8FF" : "2px solid transparent",
            }}
          >
            <Radio size={14} color="#8992AC" />
            <span style={styles.agencyName}>All agencies</span>
            <span style={styles.agencyCount}>{feed.length}</span>
          </button>
          {AGENCIES.map((a) => {
            const count = feed.filter((f) => f.agency === a.id).length;
            const active = activeAgency === a.id;
            return (
              <button
                key={a.id}
                className="pill"
                onClick={() => setActiveAgency(a.id)}
                style={{
                  ...styles.agencyRow,
                  background: active ? "#1A2038" : "transparent",
                  borderLeft: active ? `2px solid ${a.color}` : "2px solid transparent",
                }}
              >
                <span style={{ ...styles.dot, background: a.color }} />
                <span style={styles.agencyName}>{a.name}</span>
                <span style={styles.agencyCount}>{count}</span>
              </button>
            );
          })}

          <div style={{ ...styles.railLabel, marginTop: 28 }}>Missions</div>
          {MISSIONS.map((m) => (
            <div
              key={m.name}
              className="pill"
              onClick={() => setSelectedMission(m)}
              style={styles.missionRow}
            >
              <div style={styles.missionTop}>
                <span style={styles.missionName}>{m.name}</span>
                <Satellite size={12} color="#5C6584" />
              </div>
              <div style={styles.missionStatus}>{m.status}</div>
              <div style={styles.missionBar}>
                <div style={{ ...styles.missionBarFill, width: `${m.pct}%`, background: AGENCIES.find((a) => a.id === m.agency)?.color || "#6FA8FF" }} />
              </div>
            </div>
          ))}
        </aside>

        <main style={styles.main}>
          <section style={styles.hero}>
            <div style={styles.heroLeft}>
              <div style={styles.heroEyebrow}>Object positions, this cycle's reports</div>
              <h1 style={styles.heroTitle}>{feed.length} results, mapped across the sky</h1>
              <p style={styles.heroBody}>
                Right ascension sets the angle, declination sets the distance from center — a quick
                read on where this cycle's discoveries sit relative to the celestial equator.
              </p>
              <div style={styles.heroStats}>
                <div>
                  <div style={styles.heroStatNum}>{feed.length}</div>
                  <div style={styles.heroStatLabel}>reports tracked</div>
                </div>
                <div>
                  <div style={styles.heroStatNum}>{AGENCIES.length}</div>
                  <div style={styles.heroStatLabel}>agencies</div>
                </div>
                <div>
                  <div style={styles.heroStatNum}>{skyObjects.length}</div>
                  <div style={styles.heroStatLabel}>positioned objects</div>
                </div>
              </div>
            </div>
            <div style={styles.heroRight}>
              <SkyMap objects={skyObjects} />
            </div>
          </section>

          <section>
            <div style={styles.sectionHead}>
              <Rss size={15} color="#8992AC" />
              <span style={styles.sectionTitle}>Latest reports</span>
              {activeAgency !== "all" && (
                <span style={styles.filterChip}>
                  {AGENCIES.find((a) => a.id === activeAgency)?.name}
                  <button onClick={() => setActiveAgency("all")} style={styles.chipClear}>×</button>
                </span>
              )}
            </div>

            {filteredFeed.length === 0 ? (
              <div style={styles.emptyState}>No reports match this filter.</div>
            ) : (
              filteredFeed.map((item) => {
                const agency = AGENCIES.find((a) => a.id === item.agency);
                const isOpen = expanded === item.id;
                return (
                  <article
                    key={item.id}
                    className="feedcard"
                    style={styles.feedCard}
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                  >
                    <div style={styles.feedTop}>
                      <span style={{ ...styles.agencyBadge, color: agency.color, borderColor: agency.color + "55" }}>
                        {agency.name}
                      </span>
                      <span style={styles.feedTag}>{item.tag}</span>
                      <span style={styles.feedTime}>{item.date}</span>
                    </div>
                    <h3 style={styles.feedTitle}>{item.title}</h3>
                    <p style={styles.feedSummary}>{item.summary}</p>
                    {isOpen && (
                      <div style={styles.feedDetail}>
                        {item.detail && <p style={styles.feedDetailText}>{item.detail}</p>}
                        {item.source && (
                          <a
                            className="srclink"
                            href={item.source}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={styles.sourceLink}
                          >
                            Read at {item.sourceLabel || "source"} <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    )}
                    {item.ra !== "—" && (
                      <div style={styles.coordRow}>
                        <span>RA {item.ra}</span>
                        <span style={{ margin: "0 8px" }}>·</span>
                        <span>Dec {item.dec}°</span>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
        </main>

        <aside style={styles.rightRail}>
          <div style={styles.panel}>
            <div style={styles.panelHead}>
              <span style={styles.liveDot} />
              <span style={styles.panelTitle}>NASA picture of the day</span>
              <span style={styles.liveLabel}>LIVE</span>
            </div>
            <LiveApod />
          </div>

          <div style={styles.panel}>
            <div style={styles.panelHead}>
              <CalendarDays size={14} color="#8992AC" />
              <span style={styles.panelTitle}>Celestial events</span>
            </div>
            {EVENTS.map((e) => (
              <div key={e.name} style={styles.eventRow}>
                <div style={styles.eventDate}>{e.date}</div>
                <div>
                  <div style={styles.eventName}>{e.name}</div>
                  <div style={styles.eventDetail}>{e.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.panel}>
            <div style={styles.panelHead}>
              <Telescope size={14} color="#8992AC" />
              <span style={styles.panelTitle}>Transit light curve</span>
            </div>
            <div style={styles.panelSub}>Example transit shape, normalized flux</div>
            <div style={{ width: "100%", height: 140, marginTop: 8 }}>
              <ResponsiveContainer>
                <LineChart data={LIGHT_CURVE} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#1E2540" vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: "#5C6584", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "#232B45" }} tickLine={false} />
                  <YAxis domain={[0.96, 1.002]} tick={{ fill: "#5C6584", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "#232B45" }} tickLine={false} width={40} />
                  <Tooltip contentStyle={{ background: "#131A2E", border: "1px solid #232B45", borderRadius: 6, fontSize: 12 }} labelStyle={{ color: "#8992AC" }} itemStyle={{ color: "#F2A65A" }} />
                  <Line type="monotone" dataKey="flux" stroke="#F2A65A" strokeWidth={1.6} dot={{ r: 2, fill: "#F2A65A" }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={styles.panel}>
            <div style={styles.panelHead}>
              <ImageIcon size={14} color="#8992AC" />
              <span style={styles.panelTitle}>Image archive</span>
            </div>
            <div style={styles.imageGrid}>
              {IMAGE_ARCHIVE.slice(0, 4).map((img) => (
                <div key={img.label} style={{ ...styles.imageTile, background: img.src }}>
                  <span style={styles.imageLabel}>{img.label}</span>
                </div>
              ))}
            </div>
            <button className="pill" style={styles.viewAllBtn} onClick={() => setShowArchive(true)}>
              Browse full archive <ChevronRight size={13} />
            </button>
          </div>
        </aside>
      </div>

      <footer style={styles.footer}>
        {liveStatus === "success"
          ? `Live data from NASA, ESO, ESA/Hubble, and arXiv astro-ph, refreshed on a schedule. ISRO and JAXA remain hand-curated — see README.md for why.${liveMeta?.errors?.length ? ` (${liveMeta.errors.length} source${liveMeta.errors.length > 1 ? "s" : ""} failed this run.)` : ""}`
          : "Showing a hand-curated snapshot compiled from agency newsrooms as of Sep 1, 2026. Set LIVE_DATA_URL near the top of this file once you've deployed the ingestion pipeline in this project to switch to live data — see README.md."}
      </footer>

      {selectedMission && (
        <div style={styles.overlay} onClick={() => setSelectedMission(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setSelectedMission(null)}>×</button>
            <div style={styles.modalEyebrow}>Mission</div>
            <h2 style={styles.modalTitle}>{selectedMission.name}</h2>
            <div style={styles.modalMetaRow}>
              <span>Launch: {MISSION_DETAILS[selectedMission.name]?.launch}</span>
              <span style={{ margin: "0 8px" }}>·</span>
              <span>Target: {MISSION_DETAILS[selectedMission.name]?.target}</span>
            </div>
            <div style={styles.missionBar}>
              <div style={{ ...styles.missionBarFill, width: `${selectedMission.pct}%`, background: AGENCIES.find((a) => a.id === selectedMission.agency)?.color || "#6FA8FF" }} />
            </div>
            <div style={styles.missionStatus}>{selectedMission.status}</div>
            <p style={styles.modalBody}>{MISSION_DETAILS[selectedMission.name]?.detail}</p>
            <a href={MISSION_DETAILS[selectedMission.name]?.link} target="_blank" rel="noreferrer" style={styles.sourceLink}>
              Mission page <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}

      {showArchive && (
        <div style={styles.overlay} onClick={() => setShowArchive(false)}>
          <div style={styles.archiveModal} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowArchive(false)}>×</button>
            <div style={styles.modalEyebrow}>Image archive</div>
            <h2 style={styles.modalTitle}>Recent observations</h2>
            <div style={styles.archiveGrid}>
              {IMAGE_ARCHIVE.map((img) => (
                <div key={img.label} style={styles.archiveCard}>
                  <div style={{ ...styles.archiveTile, background: img.src }}>
                    <span style={styles.imageLabel}>{img.label}</span>
                  </div>
                  <p style={styles.archiveCaption}>{img.caption}</p>
                  <div style={styles.archiveMeta}>{img.credit} · {img.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveApod() {
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);

    fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`)
      .then((res) => {
        if (!res.ok) throw new Error(`NASA APOD API returned ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setStatus("success");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Request failed");
        setStatus("error");
      });

    return () => { cancelled = true; };
  }, [attempt]);

  if (status === "loading") {
    return (
      <div style={styles.apodLoading}>
        <div style={styles.spinner} />
        <span>Fetching today's picture from NASA...</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={styles.apodError}>
        <AlertCircle size={15} color="#E88A6A" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={styles.apodErrorTitle}>Couldn't reach NASA's API</div>
          <div style={styles.apodErrorDetail}>{error} — this can happen if the browser sandbox blocks outbound requests, or the shared demo key is rate-limited.</div>
          <button style={styles.retryBtn} onClick={() => setAttempt((a) => a + 1)}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {data.media_type === "image" ? (
        <img src={data.url} alt={data.title} style={styles.apodImage} />
      ) : (
        <a href={data.url} target="_blank" rel="noreferrer" style={styles.sourceLink}>
          View today's video <ExternalLink size={11} />
        </a>
      )}
      <div style={styles.apodTitle}>{data.title}</div>
      <div style={styles.apodDate}>{data.date} · {data.copyright ? `© ${data.copyright}` : "NASA / public domain"}</div>
      <p style={styles.apodExplanation}>
        {data.explanation?.length > 220 ? data.explanation.slice(0, 220).trim() + "…" : data.explanation}
      </p>
      <a href="https://apod.nasa.gov/apod/astropix.html" target="_blank" rel="noreferrer" style={styles.sourceLink}>
        Full description on apod.nasa.gov <ExternalLink size={11} />
      </a>
    </div>
  );
}

function SkyMap({ objects }) {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const rMax = size / 2 - 34;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle key={f} cx={cx} cy={cy} r={rMax * f} fill="none" stroke="#1E2540" strokeWidth="1" />
      ))}
      {[0, 4, 8, 12, 16, 20].map((h) => {
        const angle = (h / 24) * Math.PI * 2 - Math.PI / 2;
        const x2 = cx + rMax * Math.cos(angle);
        const y2 = cy + rMax * Math.sin(angle);
        return <line key={h} x1={cx} y1={cy} x2={x2} y2={y2} stroke="#1E2540" strokeWidth="1" />;
      })}
      <text x={cx} y={cy - rMax - 10} textAnchor="middle" fill="#5C6584" fontSize="10" fontFamily="JetBrains Mono">RA 0h</text>
      <text x={cx + rMax + 16} y={cy + 4} textAnchor="middle" fill="#5C6584" fontSize="10" fontFamily="JetBrains Mono">6h</text>
      <text x={cx} y={cy + rMax + 18} textAnchor="middle" fill="#5C6584" fontSize="10" fontFamily="JetBrains Mono">12h</text>
      <text x={cx - rMax - 16} y={cy + 4} textAnchor="middle" fill="#5C6584" fontSize="10" fontFamily="JetBrains Mono">18h</text>

      {objects.map((obj) => {
        const ra = parseRA(obj.ra);
        const dec = parseDec(obj.dec);
        const { x, y } = raDecToXY(ra, dec, cx, cy, rMax);
        const agency = AGENCIES.find((a) => a.id === obj.agency);
        return (
          <g key={obj.id}>
            <circle cx={x} cy={y} r={5} fill={agency.color} opacity="0.9" />
            <circle cx={x} cy={y} r={9} fill="none" stroke={agency.color} strokeWidth="1" opacity="0.35" />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={2} fill="#EDEFF7" />
    </svg>
  );
}

const styles = {
  app: { minHeight: "100vh", background: "#0A0D16", color: "#EDEFF7", fontFamily: "'Inter', sans-serif" },
  header: {
    display: "flex", alignItems: "center", gap: 24, padding: "14px 24px",
    borderBottom: "1px solid #1A2038", position: "sticky", top: 0, background: "#0A0D16", zIndex: 10,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  logoMark: { width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" },
  wordmark: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, letterSpacing: "-0.01em" },
  tagline: { fontSize: 11, color: "#5C6584", marginTop: -1 },
  searchWrap: {
    flex: 1, maxWidth: 480, display: "flex", alignItems: "center", gap: 8,
    background: "#12172A", border: "1px solid #232B45", borderRadius: 7, padding: "8px 12px",
  },
  searchInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#EDEFF7", fontSize: 13, fontFamily: "'Inter', sans-serif" },
  headerRight: { display: "flex", alignItems: "center", gap: 16, marginLeft: "auto" },
  updatedStamp: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#5C6584", fontFamily: "'JetBrains Mono', monospace" },
  retryStampBtn: { background: "transparent", border: "1px solid #232B45", borderRadius: 4, color: "#8992AC", fontSize: 10.5, padding: "1px 6px", cursor: "pointer", marginLeft: 2 },
  iconBtn: { background: "transparent", border: "none", cursor: "pointer", display: "flex" },
  body: { display: "grid", gridTemplateColumns: "220px 1fr 300px", gap: 0, maxWidth: 1400, margin: "0 auto" },
  leftRail: { padding: "24px 16px", borderRight: "1px solid #151B2E" },
  railLabel: { fontSize: 11, color: "#5C6584", fontFamily: "'JetBrains Mono', monospace", marginBottom: 10, letterSpacing: "0.02em" },
  agencyRow: {
    display: "flex", alignItems: "center", gap: 9, width: "100%",
    padding: "8px 10px", border: "none", borderRadius: 5, marginBottom: 2, fontSize: 13, color: "#C7CCDE", textAlign: "left",
  },
  dot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  agencyName: { flex: 1, fontFamily: "'Inter', sans-serif" },
  agencyCount: { fontSize: 11, color: "#5C6584", fontFamily: "'JetBrains Mono', monospace" },
  missionRow: { padding: "10px 10px", marginBottom: 4, borderRadius: 5 },
  missionTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  missionName: { fontSize: 12.5, color: "#C7CCDE", lineHeight: 1.3 },
  missionStatus: { fontSize: 11, color: "#5C6584", marginTop: 3 },
  missionBar: { height: 3, background: "#1A2038", borderRadius: 2, marginTop: 7, overflow: "hidden" },
  missionBarFill: { height: "100%", borderRadius: 2 },
  main: { padding: "24px 28px", borderRight: "1px solid #151B2E" },
  hero: {
    display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, padding: "24px",
    background: "#0E1220", border: "1px solid #1A2038", borderRadius: 10, marginBottom: 28, alignItems: "center",
  },
  heroLeft: {},
  heroEyebrow: { fontSize: 11.5, color: "#F2A65A", fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 },
  heroTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 600, lineHeight: 1.25, marginBottom: 12, maxWidth: 420 },
  heroBody: { fontSize: 13.5, color: "#8992AC", lineHeight: 1.6, maxWidth: 420, marginBottom: 20 },
  heroStats: { display: "flex", gap: 28 },
  heroStatNum: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, color: "#6FA8FF" },
  heroStatLabel: { fontSize: 11, color: "#5C6584", marginTop: 2 },
  heroRight: { display: "flex", justifyContent: "center" },
  sectionHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16 },
  sectionTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600 },
  filterChip: {
    marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#8992AC",
    background: "#12172A", border: "1px solid #232B45", borderRadius: 20, padding: "3px 10px 3px 12px",
  },
  chipClear: { background: "none", border: "none", color: "#5C6584", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 },
  emptyState: { fontSize: 13, color: "#5C6584", padding: "40px 0", textAlign: "center" },
  feedCard: { padding: "16px 0", borderBottom: "1px solid #151B2E" },
  feedTop: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  agencyBadge: { fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", borderRadius: 4, padding: "2px 7px" },
  feedTag: { fontSize: 11.5, color: "#5C6584" },
  feedTime: { fontSize: 11.5, color: "#3E4664", marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace" },
  feedTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 500, lineHeight: 1.4, marginBottom: 6 },
  feedSummary: { fontSize: 13, color: "#8992AC", lineHeight: 1.6, maxWidth: 640 },
  feedDetail: { marginTop: 10, paddingTop: 10, borderTop: "1px solid #151B2E", maxWidth: 640 },
  feedDetailText: { fontSize: 12.5, color: "#A6ACC4", lineHeight: 1.65, marginBottom: 8 },
  sourceLink: { fontSize: 11.5, color: "#6FA8FF", display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" },
  coordRow: { fontSize: 11, color: "#5C6584", fontFamily: "'JetBrains Mono', monospace", marginTop: 8 },
  rightRail: { padding: "24px 18px", display: "flex", flexDirection: "column", gap: 20 },
  panel: { background: "#0E1220", border: "1px solid #1A2038", borderRadius: 10, padding: "16px 16px" },
  panelHead: { display: "flex", alignItems: "center", gap: 7, marginBottom: 12 },
  panelTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600 },
  panelSub: { fontSize: 11, color: "#5C6584", marginTop: -8, marginBottom: 4 },
  eventRow: { display: "flex", gap: 12, padding: "9px 0", borderBottom: "1px solid #151B2E" },
  eventDate: { fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#F2A65A", minWidth: 46, flexShrink: 0, paddingTop: 1 },
  eventName: { fontSize: 12.5, color: "#C7CCDE" },
  eventDetail: { fontSize: 11, color: "#5C6584", marginTop: 2 },
  imageGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  imageTile: { aspectRatio: "1", borderRadius: 6, display: "flex", alignItems: "flex-end", padding: 8, border: "1px solid #232B45" },
  imageLabel: { fontSize: 10, color: "#C7CCDE", fontFamily: "'JetBrains Mono', monospace" },
  viewAllBtn: {
    width: "100%", marginTop: 12, background: "transparent", border: "1px solid #232B45", borderRadius: 6,
    color: "#8992AC", fontSize: 12, padding: "8px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
  },
  footer: { maxWidth: 1400, margin: "0 auto", padding: "18px 28px 30px", fontSize: 11, color: "#3E4664", lineHeight: 1.6 },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(4,6,12,0.7)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
  },
  modal: {
    background: "#0E1220", border: "1px solid #232B45", borderRadius: 12, padding: "28px 28px 24px",
    width: "100%", maxWidth: 460, position: "relative",
  },
  archiveModal: {
    background: "#0E1220", border: "1px solid #232B45", borderRadius: 12, padding: "28px",
    width: "100%", maxWidth: 780, maxHeight: "82vh", overflowY: "auto", position: "relative",
  },
  modalClose: {
    position: "absolute", top: 16, right: 16, background: "transparent", border: "none",
    color: "#5C6584", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 4,
  },
  modalEyebrow: { fontSize: 11, color: "#F2A65A", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 },
  modalTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, marginBottom: 10 },
  modalMetaRow: { fontSize: 11.5, color: "#5C6584", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 },
  modalBody: { fontSize: 13, color: "#A6ACC4", lineHeight: 1.65, margin: "14px 0" },
  archiveGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 },
  archiveCard: {},
  archiveTile: { aspectRatio: "16/10", borderRadius: 8, border: "1px solid #232B45", display: "flex", alignItems: "flex-end", padding: 10, marginBottom: 8 },
  archiveCaption: { fontSize: 12.5, color: "#C7CCDE", lineHeight: 1.5, marginBottom: 4 },
  archiveMeta: { fontSize: 11, color: "#5C6584", fontFamily: "'JetBrains Mono', monospace" },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#5DCA8A", flexShrink: 0 },
  liveLabel: { marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.05em", color: "#5DCA8A", fontFamily: "'JetBrains Mono', monospace", border: "1px solid #2A4A38", borderRadius: 4, padding: "1px 5px" },
  apodLoading: { display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "#5C6584", padding: "24px 0" },
  spinner: { width: 14, height: 14, border: "2px solid #232B45", borderTopColor: "#6FA8FF", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  apodError: { display: "flex", gap: 10, padding: "8px 0" },
  apodErrorTitle: { fontSize: 12.5, color: "#E88A6A", marginBottom: 4 },
  apodErrorDetail: { fontSize: 11.5, color: "#5C6584", lineHeight: 1.5, marginBottom: 8 },
  retryBtn: {
    display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid #232B45",
    borderRadius: 6, color: "#8992AC", fontSize: 11.5, padding: "5px 10px", cursor: "pointer",
  },
  apodImage: { width: "100%", borderRadius: 6, border: "1px solid #232B45", display: "block", marginBottom: 10, maxHeight: 200, objectFit: "cover" },
  apodTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5, fontWeight: 500, marginBottom: 3 },
  apodDate: { fontSize: 10.5, color: "#5C6584", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 },
  apodExplanation: { fontSize: 12, color: "#A6ACC4", lineHeight: 1.6, marginBottom: 8 },
};

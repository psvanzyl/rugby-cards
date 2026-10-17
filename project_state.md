# rugby-cards — project state

**Site:** https://rugby.laserraptorai.duckdns.org — "Rugbydex", a card catalogue of every rugby
player in the world (union, league, sevens; men and women).
**Home:** dev LXC CT141 (`ssh root@192.168.178.20`) → `/root/projects/rugby-cards/`
**Repo:** github.com/psvanzyl/rugby-cards (public)
**Deploy:** Coolify (192.168.178.132:8000, UI/API) → dockerfile build pack, base dir `/app`,
port 3000, FQDN `https://rugby.laserraptorai.duckdns.org` (DuckDNS already resolves → 83.85.185.61).

## What exists

- `data/catalogue.json.gz` — the shipped snapshot: **49,344 players / 1,924 teams / 106 countries /
  14 positions**, ~2.0 MB gzipped, built 2026-10-17.
- `data/stats.json` — headline counts (also read by the app layout).
- `data/raw/*.tsv` — per-step query cache (43 MB, gitignored), resumable harvest.
- `scripts/harvest.py` — QLever Wikidata harvest (`all` / `fetch <step> [--force]` / `build`).
- `scripts/run_harvest.sh` — detached launcher (`setsid python3 -u`).
- `app/` — Next.js 16.4.2 (App Router, React 19, Tailwind v4, `output: "standalone"`, Dockerfile).
  Routes: `/` catalogue, `/player/[id]`, `/team/[id]`, `/teams`, `/about`, `/api/players`.
- `app/public/data/` — snapshot baked into the image (a runtime volume at `/app/data` wins).

## Data facts (verified)

- Source: Wikidata CC0 via the **QLever** mirror `https://qlever.dev/api/wikidata`
  (public WDQS times out on class-wide queries). UA `RugbyCardsHarvest/1.0`, throttle 1.5 s,
  6 retries, meta lookups in 400-QID chunks with bisect-on-failure.
- Occupation QIDs: union **Q14089670**, league **Q14373094**, sevens **Q26237722**.
- Coverage: DOB 38,850 · country 28,252 · team 25,255 · position 15,887 · photo 8,911 ·
  height 3,200 · mass 3,067 · Wikipedia article 29,910 · women 2,745 · open stint 20,892.
- Positions (14 canonical): Prop, Hooker, Lock, Flanker, Number 8 (forwards); Scrum-half, Fly-half,
  Centre, Wing, Fullback, Utility back, Forward, Back, Ruck (backs). Non-rugby P413 labels dropped.
- Career: 61,833 stints, ~11,700 players with a start year, ~10,400 with an end year.

## Bugs found & fixed (2026-10-17)

1. **Career years were empty for every player.** The teams query read P580/P582 off the *team item*
   (`?team wdt:P580`) instead of the P54 statement qualifiers. Fixed with
   `?p p:P54 ?st . ?st ps:P54 ?team . OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?st pq:P582 ?end }`
   and re-fetched with `fetch teams --force` (67,754 rows).
2. **Height/weight coverage was 8% of what Wikidata holds** (257 vs 3,201). The build only accepted
   metres (`1.2 < v < 2.6`); Wikidata also stores centimetres (185). Now normalised: metres → ×100,
   cm kept, pounds → kg above 200.
3. `open` (still-playing) flag added: an open P54 stint is the only proxy Wikidata offers. It
   over-reports, so the UI says "Most recent club" unless the stint is genuinely open.
4. **"155 yrs" for 19th-century players.** `age()` returned years-since-birth whether or not the
   player is alive. `ageLabel()` now prints `N yrs` only up to 100, otherwise `born 1871`.
5. **Rugby-ball glyph on country-less cards** (the fallback read as a stray dot). `flag()` now
   returns an empty string and the card hides the span.
6. **Junk names at the head of the A–Z list** — "'JOCK' TRADD", "(ALEXANDER) CAMERON MACLEOD",
   "A ALLEN", "A R LEWIS", "A-J TOWSE". `clean_name()` normalises whitespace, the Japanese
   full-width separator (`・` → space) and typographic apostrophes; `is_junk_name()` drops the 121
   stub items whose first token is a bare initial or opens with punctuation. Count is recorded as
   `droppedNames` in `stats.json`.
7. **Search dropped non-Latin names.** `norm()` stripped everything outside `[a-z0-9]`, so Japanese
   and Korean names normalised to an empty string. It now keeps `\p{L}\p{N}`.

## Deploy notes

- Coolify app: build pack `dockerfile`, base directory `/app`, Dockerfile `/Dockerfile`,
  port 3000, FQDN `https://rugby.laserraptorai.duckdns.org`.
- Coolify API token: `/root/.hermes/credentials/.coolify_api_token` (never print it).
- Reference app for settings: pokemon-tcg → `dpjl3npkr7pxq4xkcwu78tio` (destination `localhost`,
  StandaloneDocker `rmtbopdo7cnqg5pwnbgrpji9`, project pokemon-tcg `8rit1jscgztegqxaivwsdgkr`).
- Refreshing data only: copy the two files into the container's `/app/data` — no rebuild needed
  (see `src/lib/data.ts`).

## Open / next

- Self-QA on the live URL (screenshot `/`, `/player`, `/teams`, `/about`, mobile viewport).
- Optional: add per-competition filters (Six Nations, Super Rugby) once a competition source exists;
  Wikidata has no caps/points, so no stats can be shown.

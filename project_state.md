# rugby-cards — project state

**Site:** https://rugby.laserraptorai.duckdns.org — "Rugbydex", a card catalogue of every rugby
player in the world (union, league, sevens; men and women).
**Home:** dev LXC CT141 (`ssh root@192.168.178.20`) → `/root/projects/rugby-cards/`
**Repo:** github.com/psvanzyl/rugby-cards (public)
**Deploy:** Coolify (192.168.178.132:8000, UI/API) → dockerfile build pack, base dir `/app`,
port 3000, FQDN `https://rugby.laserraptorai.duckdns.org` (DuckDNS resolves → 83.85.185.61).
**Status: LIVE and QA'd** (2026-10-17). Coolify app uuid `82uqthtrhi18babz2v1pxxld`,
project `pfujkv71hts41sqb7exs3qt9`.

## What exists

- `data/catalogue.json.gz` — the shipped snapshot: **49,465 players / 1,928 teams / 106 countries /
  14 positions**, 1,983,794 bytes gzipped, built 2026-10-17.
- `data/stats.json` — headline counts (also read by the app layout).
- `data/raw/*.tsv` — per-step query cache (43 MB, gitignored), resumable harvest.
- `scripts/harvest.py` — QLever Wikidata harvest (`all` / `fetch <step> [--force]` / `build`).
- `scripts/run_harvest.sh` — detached launcher (`setsid python3 -u`).
- `scripts/verify_build.py`, `scripts/list_junk.py`, `scripts/analyze_names.py` — build auditors.
- `app/` — Next.js 16.4.2 (App Router, React 19, Tailwind v4, `output: "standalone"`, Dockerfile).
  Routes: `/` catalogue, `/player/[id]`, `/team/[id]`, `/teams`, `/about`, `/api/players`.
- `app/public/data/` — snapshot baked into the image (a runtime volume at `/app/data` wins).

## Data facts (verified)

- Source: Wikidata CC0 via the **QLever** mirror `https://qlever.dev/api/wikidata`
  (public WDQS times out on class-wide queries). UA `RugbyCardsHarvest/1.0`, throttle 1.5 s,
  6 retries, meta lookups in 400-QID chunks with bisect-on-failure.
- Occupation QIDs: union **Q14089670**, league **Q14373094**, sevens **Q26237722**.
- Coverage (latest build): DOB 38,893 · country 28,314 · team 25,315 · position 15,897 · photo 8,917 ·
  height 3,201 · mass 3,068 · women 2,745 · union 27,567 · league 21,713 · sevens 185.
- Positions (14 canonical): Prop, Hooker, Lock, Flanker, Number 8 (forwards); Scrum-half, Fly-half,
  Centre, Wing, Fullback, Utility back, Forward, Back, Ruck (backs). Non-rugby P413 labels dropped.
- Career: 61,833 stints, ~11,700 players with a start year, ~10,400 with an end year.
- `droppedNames` is **0** — every harvested player ships.

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
6. **Names, take 2 — clean, don't drop.** First attempt dropped 121 labels whose first token looked
   like a bare initial ("A ALLEN", "C. B. FRY", "J. P. R. WILLIAMS"). Those are real, sometimes
   famous, players and Wikidata simply holds no fuller name, so the drop was reverted: `clean_name()`
   now strips wrapping quotes, a leading parenthesised given name ("(Alexander) Cameron MacLeod")
   and a trailing disambiguator ("A. Nicholson (rugby league)"), and only labels with no letters at
   all are dropped (`droppedNames: 0`). 49,344 → 49,465 players.
7. **Search dropped non-Latin names.** `norm()` stripped everything outside `[a-z0-9]`, so Japanese
   and Korean names normalised to an empty string. It now keeps `\p{L}\p{N}`.
8. **Stale snapshot after a re-harvest.** `/api/players` answered `max-age=600,
   stale-while-revalidate=86400`, so a browser kept rendering the previous catalogue (the counter
   read 49,344 while the image held 49,465). The catalogue browser now stamps its request with the
   server-rendered player count (`/api/players?v=49465`), which misses the cache whenever the
   harvest changes, and the route dropped to `max-age=60, swr=300`.

## Deploy notes

- Coolify app: build pack `dockerfile`, base directory `/app`, Dockerfile `/Dockerfile`,
  port 3000, FQDN `https://rugby.laserraptorai.duckdns.org`.
- Deploy: `POST /api/v1/deploy {"uuid":"82uqthtrhi18babz2v1pxxld"}` (GET is 405). Build + roll takes
  ~50 s; poll `GET /api/v1/deployments/{deployment_uuid}` until `status` is `finished`.
- Coolify API token: `/root/.hermes/credentials/.coolify_api_token` (never print it).
- Reference app for settings: pokemon-tcg → `dpjl3npkr7pxq4xkcwu78tio` (destination `localhost`,
  StandaloneDocker `rmtbopdo7cnqg5pwnbgrpji9`, project pokemon-tcg `8rit1jscgztegxqxaivwsdgkr`).
- Refreshing data only: copy the two files into the container's `/app/data` — no rebuild needed
  (see `src/lib/data.ts`).
- **Hairpin NAT:** from inside the LAN the public FQDN does not resolve back in, so test with
  `curl -sk --resolve rugby.laserraptorai.duckdns.org:443:192.168.178.132 https://…` (or add the
  same line to `/etc/hosts` while browser-QA'ing, then remove it). The certificate is a real
  Let's Encrypt cert (`ssl_verify_result=0`), so `-k` is only needed when the name is not on the
  cert path.

## QA (live, 2026-10-17)

- HTTPS 200 with a valid Let's Encrypt cert; `/` renders 96 cards on the first page with no console
  errors and no horizontal overflow; `/teams` lists 764 club and national sides; `/about` coverage
  bars match `stats.json`; `/player/Q136815186` renders the full card; mobile 390×844 has no
  overflow. Screenshots inspected for every route.

## Open / next

- Optional: per-competition filters (Six Nations, Super Rugby) once a competition source exists;
  Wikidata has no caps/points, so no match stats can be shown.
- Optional: a GitHub push webhook for auto-deploy (Coolify cannot be reached from GitHub; a runner
  like `dev-ct141-zvg` would be needed) — until then, deploy via the API.

## Navigation stall — "cannot get back to the landing page" (2026-10-17, fixed in bec8695)

Boss: from `/team/Q822877` he could not get back to `/` — "it's like it's stuck".

Diagnosis (measured, not guessed):
- The app was never the slow part: direct to the container, `/` renders in 10–46 ms,
  `/player/*` in 20–40 ms, `/team/*` in 0.14–0.48 s (1.3 MB HTML, 240 cards). Through Traefik
  from the LAN, 40 concurrent player requests all finish in <=1.3 s. gzip is on (41 KB for a
  team page, 6 KB for `/`), conntrack is nowhere near its limit (279/262144).
- Every `<Link>` in the app prefetched. Landing on `/` fired 9 RSC prefetches and the grids
  prefetched every visible card (30–40 requests within ~3 s). They all hit one single-threaded
  SSR process, so they queue: the Traefik log shows boss's own navigation requests taking
  10–31 s with `OriginDuration` 10–31 s and `Overhead` <0.1 s — the queue, not the network.
- GPTBot (74.7.242.17) walked the `?_rsc=` URLs embedded in the flight payload: 20,042
  requests in 3 h at ~2 req/s, median 22 s each — enough to keep that queue permanently full.
- CrowdSec had banned the homelab's own egress IP (83.85.185.61) at 18:07Z for
  `http-crawl-non_statics`, triggered by the same prefetch storm. A ban is a silent packet
  drop, i.e. literally "stuck". The whitelist parser `psvanzyl-whitelist.yaml` (egress IP +
  100.64.0.0/10) is loaded and there is no decision for that IP now.

Fix (commit bec8695, pushed + deployed):
- `prefetch={false}` on every `<Link>` (19 link sites across layout/page/about/teams/team/player).
- `export const revalidate = 600` replaces `dynamic = "force-dynamic"` in the layout and pages.
  `/`, `/teams`, `/about` are prerendered and served `x-nextjs-cache: HIT` in 22–46 ms.
- `app/robots.ts` disallows `/*?_rsc=`, `/api/`, `/data/` for all agents — the RSC URLs are the
  same pages in flight encoding and were 20k of the crawler's requests.
- `/player/[id]` and `/team/[id]` were left dynamic (no `generateStaticParams`), so they re-rendered
  per request. Cheap at 0.02–0.5 s; `revalidate` alone does not cache dynamic segments in Next 16.
  Superseded for `/team/[id]` by 3ae54e4 (section at the end).

Verified live after the deploy: cold cache (`Network.setCacheDisabled`) `/team/Q822877` -> `/` in
0.56 s; warm 0.46–0.54 s; mobile 390x844 logo/breadcrumb -> `/` in 0.57 s; exactly one RSC request
per navigation; zero prefetches on the landing page; screenshots of `/`, `/player/*`, `/team/*`
and `/teams` on desktop and mobile all inspected. No CrowdSec decision for the egress IP.

Harness caveat: `click_at_xy` and raw-CDP `Input.dispatchMouseEvent` do not reliably reach the
tab (the injected click listener logs nothing), which fakes "stuck" results. Drive navigation
tests with an in-page `element.click()` and time the path change instead.

## Team pages cached on demand (2026-10-18, commit 3ae54e4)

Follow-up to the stall. `/team/[id]` carried `revalidate = 600` but no `generateStaticParams`, and
in Next 16 a dynamic segment is only cacheable when the route declares static params — so every hit
was a fresh render of up to 240 cards. Measured on a local build (`next start` on port 3007, one
request per probe so the transition is visible):

| request | old behaviour | with `generateStaticParams` |
|---|---|---|
| 1st, heavy team (1.3 MB) | render, 0.14–0.48 s every time | `x-nextjs-cache: MISS`, 0.59 s |
| 2nd | render again | `HIT`, 0.050 s |
| 3rd | render again | `HIT`, 0.050 s |

Hits carry `Cache-Control: s-maxage=600, stale-while-revalidate=…`; the entry is persisted under
`.next/server/route-cache` and survives a restart (verified: kill the server, restart, the first
request is already `HIT`). `dynamicParams` stays true — nothing has to be enumerated, every team
page renders on first request and is then cached, and unknown ids still 404 (the 404 is cached too).

`generateStaticParams` returns the **ten** largest teams. Prerendering the 200 busiest was tried
first and measured at 179 MB of HTML / 470 MB of build output for pages read once; the ten cost
33 MB and exist only to keep the route explicitly in static-with-fallback mode — the caching comes
from the fallback, not from them. Re-check the count only if a future Next release stops treating an
unlisted dynamic param as cacheable: two curls and `x-nextjs-cache` settle it.

Deployed `3ae54e4` (Coolify deployment `axfoqgv5zltnmrrku6ulmnlp`, build + roll ~110 s, image label
carries the commit sha). Verified live: `/team/Q3067834` MISS 0.59 s → HIT 0.050 s → HIT 0.050 s
(1,298,651 bytes); `/team/Q5566952` MISS 0.062 s → HIT 0.026 s; the ten prerendered pages HIT
immediately; `/` 48 ms, `/teams` 77 ms, `/about` 33 ms (all HIT); bogus id still 404; `/player/[id]`
deliberately unchanged (`private, no-cache`, 0.11 s). Team page and `/` re-screenshotted at 1400 and
390 px — 240 cards, breadcrumb intact, no overflow.

Disk: ~50 KB per mid-size cache entry, up to ~4 MB for the heaviest, so a worst-case full crawl of
all 1,928 team pages is roughly 1 GB in the container's writable layer; cleared on every redeploy.
`/player/[id]` was left alone on purpose: 22 ms median renders, and caching 49,465 of them would
cost ~1–2 GB of container disk without removing any bottleneck.

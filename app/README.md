# Rugbydex — rugby player cards

A searchable, filterable, sortable card catalogue of **every rugby player in the world** as
recorded in Wikidata: rugby union, rugby league and rugby sevens, men and women, 19th century to
today. Live at **https://rugby.laserraptorai.duckdns.org**.

## What's in it

- **49,465 players** / 1,928 clubs & national teams / 106 countries / 14 canonical positions.
- Search across name, club, national team, country and place of birth.
- Filters: code (union / league / sevens), men / women, forwards / backs, individual position,
  country, team, decade of birth, plus "has a photo", "still active" and "played for a national
  team".
- Sorts: name A–Z/Z–A, youngest, oldest, tallest, heaviest, most teams, country A–Z.
- Player card pages with the full career (team, years), vitals and links to Wikipedia/Wikidata.
- Team pages with squads, and a country-grouped team index.
- Filters are mirrored into the URL (`/?grp=forward&sport=league`), so any view is shareable.

## Layout

```
rugby-cards/
├── app/                     # Next.js 16 app (App Router, Tailwind v4, standalone output)
│   ├── src/app/             # /, /player/[id], /team/[id], /teams, /about, /api/players
│   ├── src/components/      # Catalogue (client), FilterPanel, CardTile, RugbyBall
│   ├── src/lib/             # types, data resolution, formatting
│   └── public/data/         # baked-in snapshot: catalogue.json.gz + stats.json
├── data/
│   ├── catalogue.json.gz    # the built snapshot (~1.9 MB gzipped)
│   ├── stats.json           # headline counts used by the layout
│   └── raw/                 # per-step query cache (resumable harvest)
└── scripts/
    ├── harvest.py           # fetch + build the catalogue
    └── run_harvest.sh       # detached launcher (setsid, unbuffered)
```

## Data pipeline

Source: **Wikidata (CC0)**, queried through the **QLever** Wikidata mirror
(`https://qlever.dev/api/wikidata`) — a full mirror that answers whole-class queries in under a
second, where the public WDQS endpoint times out. Polite custom User-Agent, 1.5 s throttle, six
retries, and 400-QID chunks with bisect-on-failure for the label/meta lookups.

Players = items whose occupation (P106) is rugby union player (Q14089670), rugby league player
(Q14373094) or rugby sevens player (Q26237722).
Fields: P54 member of sports team (+P580/P582 dates), P413 position played on team / speciality
(mapped to 14 canonical positions, non-rugby labels dropped), P569 date of birth, P2048 height,
P2067 mass, P18 image, P27 country of citizenship, P19 place of birth, sitelink → Wikipedia.

```bash
# on the build host (dev LXC)
python3 harvest.py all        # fetch every step, then build
python3 harvest.py build      # rebuild the snapshot from cached raw TSVs
python3 harvest.py fetch <step> --force
```

Each step caches to `data/raw/<step>.tsv`, so the harvest is resumable and a re-build costs
seconds. Images are hot-linked from Wikimedia Commons (`Special:FilePath/<file>?width=420`).

## Running locally

```bash
cd app
npm install
npm run dev            # http://localhost:3000
npm run build && npm start
```

Data resolution order at runtime: `RUGBY_DATA_DIR` → `/app/data` (Coolify volume) →
`public/data` (image snapshot). Dropping a fresh `catalogue.json.gz` into the volume updates the
site without a rebuild.

## Deploy

Coolify application (dockerfile build pack, `Dockerfile` at repo root of `app/`), FQDN
`https://rugby.laserraptorai.duckdns.org`, port 3000, repo `psvanzyl/rugby-cards`. Coolify's
Traefik picks the domain up from the app's `domains` field; DNS is the DuckDNS wildcard.

## Attribution

Data: Wikidata contributors (CC0). Photos: Wikimedia Commons, respective authors. Not affiliated
with World Rugby, any union, league or club. No caps/points/match statistics — Wikidata does not
carry them.

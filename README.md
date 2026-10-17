# Rugbydex

A card catalogue of **every rugby player in the world** — rugby union, rugby league and rugby
sevens, men and women — with their teams, positions, nationality, physicals and career stints.
Searchable, filterable and sortable.

**Live:** https://rugby.laserraptorai.duckdns.org
**Data:** Wikidata (CC0) harvested through the [QLever](https://qlever.dev/api/wikidata) mirror.

## What is in the box

| Path | What it is |
| --- | --- |
| `scripts/harvest.py` | The harvest. `all` (full run), `fetch <step> [--force]`, `build` (assemble the snapshot from the raw cache) |
| `scripts/run_harvest.sh` | Detached launcher (`setsid python3 -u`) so a long run survives an SSH drop |
| `data/raw/*.tsv` | Per-step query cache — the harvest is resumable and re-buildable without re-querying |
| `data/catalogue.json.gz` | The shipped snapshot (gzipped JSON) |
| `data/stats.json` | Headline coverage counts, also read by the app layout |
| `app/` | Next.js 16 app (App Router, React 19, Tailwind v4, `output: "standalone"`, multi-stage Dockerfile) |

## Routes

`/` catalogue (search · filters · sort) · `/player/[id]` · `/team/[id]` · `/teams` · `/about` ·
`/api/players` (serves the snapshot straight out of the image).

## Refreshing the data

```bash
python3 scripts/harvest.py all                 # or: fetch <step> --force, then: build
python3 scripts/harvest.py build
cp data/catalogue.json.gz data/stats.json app/public/data/
```

A rebuild is only needed when the app changes; a pure data refresh can be dropped straight into
the running container's `/app/data` volume (`src/lib/data.ts` prefers that path).

## Method notes

* The public WDQS endpoint times out on class-wide queries, so everything goes through QLever with a
  polite User-Agent (`RugbyCardsHarvest/1.0`), a 1.5 s throttle and 6 retries.
* Occupations: union `Q14089670`, league `Q14373094`, sevens `Q26237722`.
* Career stints read the **P54 statement qualifiers** (`pq:P580`/`pq:P582`), not the team item's
  inception/dissolution dates.
* Heights and masses arrive in metres, centimetres and pounds depending on the editor, so the build
  normalises all three.
* Labels that are a bare initial or start with punctuation (~121 stub items) are dropped at build
  time; the count is recorded in `stats.json` as `droppedNames`.
* Wikidata carries no caps, points or match statistics, so the site deliberately shows none.

Licence: the underlying data is CC0 (Wikidata).

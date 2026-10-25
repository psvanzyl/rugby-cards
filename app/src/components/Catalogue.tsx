"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { Catalogue, Player, Sport, Team } from "@/lib/types";
import { SPORT_LABEL, norm, yearOf } from "@/lib/format";
import { CardLink } from "./CardTile";
import { EMPTY_FILTERS, FilterPanel, type Filters } from "./FilterPanel";
import { RugbyBall } from "./RugbyBall";

const PAGE = 96;

type SortKey =
  | "name-asc"
  | "name-desc"
  | "age-asc"
  | "age-desc"
  | "height-desc"
  | "weight-desc"
  | "teams-desc"
  | "country-asc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "name-asc", label: "Name A–Z" },
  { key: "name-desc", label: "Name Z–A" },
  { key: "age-asc", label: "Youngest first" },
  { key: "age-desc", label: "Oldest first" },
  { key: "height-desc", label: "Tallest first" },
  { key: "weight-desc", label: "Heaviest first" },
  { key: "teams-desc", label: "Most teams" },
  { key: "country-asc", label: "Country A–Z" },
];

// nk / ck hold pre-normalised sort keys. Sorting 49,465 rows with String.localeCompare built a
// fresh ICU collator for every comparison and blocked the main thread for seconds on slower
// machines; plain compares on precomputed keys bring the same sort down to tens of milliseconds.
type Indexed = {
  p: Player;
  hay: string;
  team: string | null;
  year: number | null;
  nk: string;
  ck: string;
};

function readFiltersFromUrl(): Filters {
  if (typeof window === "undefined") return EMPTY_FILTERS;
  const sp = new URLSearchParams(window.location.search);
  const list = (k: string) => (sp.get(k) ? sp.get(k)!.split(",").filter(Boolean) : []);
  return {
    q: sp.get("q") ?? "",
    sports: list("sport") as Sport[],
    genders: list("gen") as ("m" | "f")[],
    groups: list("grp") as ("forward" | "back")[],
    positions: list("pos"),
    countries: list("land"),
    teams: list("team"),
    decades: list("dec").map(Number).filter((n) => !Number.isNaN(n)),
    photo: sp.get("photo") === "1",
    active: sp.get("active") === "1",
    nat: sp.get("nat") === "1",
  };
}

export function CatalogueBrowser({ version }: { version?: string | number }) {
  const [data, setData] = useState<Catalogue | null>(null);
  const [failed, setFailed] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("name-asc");
  const [limit, setLimit] = useState(PAGE);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    // The snapshot is served with a long cache lifetime, so stamp the request with the
    // player count from the server-rendered page: a re-harvest changes the URL and every
    // client picks the new catalogue up on its next load instead of serving stale data.
    const url = version != null ? `/api/players?v=${encodeURIComponent(String(version))}` : "/api/players";

    // A fetch that stalls (blocked connection, dead proxy) used to leave the skeleton spinning
    // forever, which reads as "the site is stuck". Time it out, retry once, then say so.
    const load = async (attempt: number): Promise<void> => {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 20000);
      try {
        const r = await fetch(url, { signal: ac.signal });
        if (!r.ok) throw new Error(String(r.status));
        const json = (await r.json()) as Catalogue;
        if (alive) setData(json);
      } catch {
        if (!alive) return;
        if (attempt < 2) {
          await load(attempt + 1);
          return;
        }
        setFailed(true);
      } finally {
        clearTimeout(timer);
      }
    };

    void load(1);
    return () => {
      alive = false;
    };
  }, [version]);

  useEffect(() => {
    const fromUrl = readFiltersFromUrl();
    if (JSON.stringify(fromUrl) !== JSON.stringify(EMPTY_FILTERS)) setFilters(fromUrl);
    const s = new URLSearchParams(window.location.search).get("sort");
    if (s && SORTS.some((x) => x.key === s)) setSort(s as SortKey);
  }, []);

  const players = data?.players ?? [];
  const teams = data?.teams ?? [];
  const countries = data?.countries ?? [];
  const positions = data?.positions ?? [];

  const teamByQ = useMemo(() => {
    const m = new Map<string, Team>();
    for (const t of teams) m.set(t.q, t);
    return m;
  }, [teams]);

  // One pass over the whole catalogue: normalised haystack + current team label.
  const index: Indexed[] = useMemo(() => {
    return players.map((p) => {
      const names = (p.t ?? []).map((s) => teamByQ.get(s[0])?.n ?? "");
      const cur = p.cur ? teamByQ.get(p.cur)?.n ?? "" : "";
      const hay = norm(
        [p.n, p.cn ?? "", p.c ?? "", p.bp ?? "", (p.p ?? []).join(" "), cur, names.join(" ")].join(" ")
      );
      return {
        p,
        hay,
        team: cur || names[0] || null,
        year: yearOf(p.d),
        nk: norm(p.n),
        ck: norm(p.cn ?? "zz"),
      };
    });
  }, [players, teamByQ]);

  const deferredQuery = useDeferredValue(filters.q);

  const filtered = useMemo(() => {
    const q = norm(deferredQuery);
    const terms = q ? q.split(" ").filter(Boolean) : [];
    const out: Indexed[] = [];

    for (const row of index) {
      const p = row.p;
      if (terms.length) {
        let ok = true;
        for (const t of terms) {
          if (!row.hay.includes(t)) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      }
      if (filters.sports.length && !filters.sports.includes(p.s)) continue;
      if (filters.genders.length && !(p.g && filters.genders.includes(p.g))) continue;
      if (filters.groups.length && !(p.pg && filters.groups.includes(p.pg as "forward" | "back"))) continue;
      if (filters.positions.length && !(p.p ?? []).some((x) => filters.positions.includes(x))) continue;
      if (filters.countries.length && !(p.cq && filters.countries.includes(p.cq))) continue;
      if (filters.teams.length && !(p.t ?? []).some((s) => filters.teams.includes(s[0]))) continue;
      if (filters.decades.length) {
        if (row.year == null) continue;
        if (!filters.decades.includes(Math.floor(row.year / 10) * 10)) continue;
      }
      if (filters.photo && !p.img) continue;
      if (filters.active && !p.open) continue;
      if (filters.nat && !p.nat) continue;
      out.push(row);
    }

    const byName = (a: Indexed, b: Indexed) =>
      a.nk < b.nk ? -1 : a.nk > b.nk ? 1 : a.p.id < b.p.id ? -1 : a.p.id > b.p.id ? 1 : 0;

    const cmp: Record<SortKey, (a: Indexed, b: Indexed) => number> = {
      "name-asc": byName,
      "name-desc": (a, b) => -byName(a, b),
      "age-asc": (a, b) => (b.year ?? -9999) - (a.year ?? -9999),
      "age-desc": (a, b) => (a.year ?? 9999) - (b.year ?? 9999),
      "height-desc": (a, b) => (b.p.h ?? 0) - (a.p.h ?? 0),
      "weight-desc": (a, b) => (b.p.w ?? 0) - (a.p.w ?? 0),
      "teams-desc": (a, b) => (b.p.t?.length ?? 0) - (a.p.t?.length ?? 0),
      "country-asc": (a, b) => (a.ck < b.ck ? -1 : a.ck > b.ck ? 1 : byName(a, b)),
    };
    out.sort(cmp[sort]);
    return out;
  }, [index, deferredQuery, filters, sort]);

  useEffect(() => {
    setLimit(PAGE);
  }, [filters, sort]);

  // Keep the URL shareable without adding history entries.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams();
    if (filters.q) sp.set("q", filters.q);
    if (filters.sports.length) sp.set("sport", filters.sports.join(","));
    if (filters.genders.length) sp.set("gen", filters.genders.join(","));
    if (filters.groups.length) sp.set("grp", filters.groups.join(","));
    if (filters.positions.length) sp.set("pos", filters.positions.join(","));
    if (filters.countries.length) sp.set("land", filters.countries.join(","));
    if (filters.teams.length) sp.set("team", filters.teams.join(","));
    if (filters.decades.length) sp.set("dec", filters.decades.join(","));
    if (filters.photo) sp.set("photo", "1");
    if (filters.active) sp.set("active", "1");
    if (filters.nat) sp.set("nat", "1");
    if (sort !== "name-asc") sp.set("sort", sort);
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
  }, [filters, sort]);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const reset = () => setFilters(EMPTY_FILTERS);

  const decades = useMemo(() => {
    const counts = new Map<number, number>();
    for (const row of index) {
      if (row.year == null) continue;
      const d = Math.floor(row.year / 10) * 10;
      if (d < 1870 || d > 2010) continue;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([decade, count]) => ({ decade, count }));
  }, [index]);

  const facets = useMemo(() => {
    const sportCounts = { union: 0, league: 0, sevens: 0 } as Record<Sport, number>;
    const genderCounts = { m: 0, f: 0 };
    const groupCounts = { forward: 0, back: 0 };
    let active = 0;
    let photo = 0;
    let nat = 0;
    for (const p of players) {
      sportCounts[p.s] = (sportCounts[p.s] ?? 0) + 1;
      if (p.g === "m") genderCounts.m++;
      else if (p.g === "f") genderCounts.f++;
      if (p.pg === "forward") groupCounts.forward++;
      else if (p.pg === "back") groupCounts.back++;
      if (p.open) active++;
      if (p.img) photo++;
      if (p.nat) nat++;
    }
    return { sportCounts, genderCounts, groupCounts, active, photo, nat };
  }, [players]);

  const visible = filtered.slice(0, limit);
  const activeN =
    filters.sports.length +
    filters.genders.length +
    filters.groups.length +
    filters.positions.length +
    filters.countries.length +
    filters.teams.length +
    filters.decades.length +
    (filters.photo ? 1 : 0) +
    (filters.active ? 1 : 0) +
    (filters.nat ? 1 : 0);

  if (failed) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-5 py-24 text-center">
        <RugbyBall className="h-16 w-28 text-turf/60" />
        <h2 className="font-display text-3xl uppercase tracking-wide">Catalogue unavailable</h2>
        <p className="text-sm text-muted">
          The player catalogue could not be loaded. Reload the page; if it keeps failing the data
          volume needs a re-harvest.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] gap-4 px-3 pb-16 pt-4 sm:px-5">
      <aside className={`${panelOpen ? "block" : "hidden"} w-full shrink-0 lg:block lg:w-[268px]`}>
        <div className="sticky top-[68px] max-h-[calc(100vh-84px)] overflow-y-auto rounded-xl border border-line/70 bg-pitch-900/70 backdrop-blur">
          <FilterPanel
            filters={filters}
            set={set}
            reset={reset}
            countries={countries}
            positions={positions}
            teams={teams}
            decades={decades}
            sportCounts={facets.sportCounts}
            genderCounts={facets.genderCounts}
            groupCounts={facets.groupCounts}
            activeCount={facets.active}
            photoCount={facets.photo}
            natCount={facets.nat}
          />
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <div className="sticky top-[56px] z-30 -mx-3 mb-3 border-b border-line/60 bg-pitch-950/90 px-3 py-2.5 backdrop-blur sm:-mx-5 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[210px] flex-1">
              <input
                value={filters.q}
                onChange={(e) => set({ q: e.target.value })}
                placeholder="Search every player — name, club, country, birthplace…"
                className="w-full rounded-lg border border-line/70 bg-pitch-900/80 py-2 pl-9 pr-3 text-sm text-fg placeholder:text-muted/70 focus:border-turf/60 focus:outline-none"
              />
              <RugbyBall className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-7 -translate-y-1/2 text-turf/80" />
            </div>

            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              className="rounded-lg border border-line/70 px-3 py-2 text-xs uppercase tracking-wider text-muted transition hover:border-turf/50 hover:text-fg lg:hidden"
            >
              {panelOpen ? "Hide filters" : `Filters${activeN ? ` (${activeN})` : ""}`}
            </button>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-line/70 bg-pitch-900/80 px-2.5 py-2 text-xs text-fg focus:border-turf/60 focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            <span>
              {data ? (
                <>
                  <span className="font-semibold text-fg">
                    {filtered.length.toLocaleString("en-US")}
                  </span>{" "}
                  of {players.length.toLocaleString("en-US")} players
                </>
              ) : (
                "Loading the catalogue…"
              )}
            </span>
            {filters.sports.map((s) => (
              <span key={s} className="rounded-full border border-line/60 px-2 py-0.5">
                {SPORT_LABEL[s]}
              </span>
            ))}
            {filters.teams.map((q) => (
              <span key={q} className="rounded-full border border-line/60 px-2 py-0.5">
                {teamByQ.get(q)?.n ?? q}
              </span>
            ))}
            {filters.countries.map((q) => (
              <span key={q} className="rounded-full border border-line/60 px-2 py-0.5">
                {countries.find((c) => c.q === q)?.n ?? q}
              </span>
            ))}
            {filters.positions.map((n) => (
              <span key={n} className="rounded-full border border-line/60 px-2 py-0.5">
                {n}
              </span>
            ))}
          </div>
        </div>

        {!data ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-[330px] animate-pulse rounded-xl border border-line/50 bg-pitch-850/60"
              />
            ))}
          </div>
        ) : visible.length ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {visible.map((row) => (
                <CardLink key={row.p.id} p={row.p} teamName={row.team} />
              ))}
            </div>

            {limit < filtered.length ? (
              <div className="mt-6 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLimit((l) => l + PAGE)}
                  className="rounded-lg border border-turf/50 bg-turf/15 px-5 py-2.5 font-display text-sm uppercase tracking-widest text-turf transition hover:bg-turf/25"
                >
                  Load {Math.min(PAGE, filtered.length - limit)} more
                </button>
                <span className="text-[11px] text-muted">
                  Showing {visible.length.toLocaleString("en-US")} of{" "}
                  {filtered.length.toLocaleString("en-US")}
                </span>
              </div>
            ) : (
              <p className="mt-6 text-center text-[11px] text-muted">
                End of list — all {filtered.length.toLocaleString("en-US")} players shown.
              </p>
            )}
          </>
        ) : (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <RugbyBall className="h-16 w-28 text-turf/60" />
            <p className="font-display text-2xl uppercase tracking-wide text-fg">No players match</p>
            <p className="max-w-md text-sm text-muted">
              Try a broader search, or clear a filter. Only about a third of all rugby players have
              a recorded position in Wikidata, so stacking a position filter on a team filter
              empties the pitch quickly.
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-turf/50 bg-turf/15 px-4 py-2 text-xs uppercase tracking-widest text-turf transition hover:bg-turf/25"
            >
              Clear all filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

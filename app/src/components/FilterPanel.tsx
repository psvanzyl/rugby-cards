"use client";

import { useMemo, useState } from "react";
import type { Country, Position, Sport, Team } from "@/lib/types";
import { SPORT_LABEL, flag, norm } from "@/lib/format";
import { RugbyBall } from "./RugbyBall";

export type Filters = {
  q: string;
  sports: Sport[];
  genders: ("m" | "f")[];
  groups: ("forward" | "back")[];
  positions: string[];
  countries: string[];
  teams: string[];
  decades: number[];
  photo: boolean;
  active: boolean;
  nat: boolean;
};

export const EMPTY_FILTERS: Filters = {
  q: "",
  sports: [],
  genders: [],
  groups: [],
  positions: [],
  countries: [],
  teams: [],
  decades: [],
  photo: false,
  active: false,
  nat: false,
};

type Props = {
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  reset: () => void;
  countries: Country[];
  positions: Position[];
  teams: Team[];
  decades: { decade: number; count: number }[];
  sportCounts: Record<Sport, number>;
  genderCounts: { m: number; f: number };
  groupCounts: { forward: number; back: number };
  activeCount: number;
  photoCount: number;
  natCount: number;
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line/50 px-3 py-3 last:border-b-0">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-display text-sm uppercase tracking-widest text-fg/90">{title}</h3>
        {hint ? <span className="text-[10px] text-muted">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
  count,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
        on
          ? "border-turf/70 bg-turf/20 text-turf"
          : "border-line/70 bg-pitch-850/60 text-muted hover:border-turf/40 hover:text-fg"
      }`}
    >
      {children}
      {count != null ? <span className="ml-1 text-[9px] opacity-70">{count.toLocaleString("en-US")}</span> : null}
    </button>
  );
}

export function FilterPanel({
  filters,
  set,
  reset,
  countries,
  positions,
  teams,
  decades,
  sportCounts,
  genderCounts,
  groupCounts,
  activeCount,
  photoCount,
  natCount,
}: Props) {
  const [countryQuery, setCountryQuery] = useState("");
  const [teamQuery, setTeamQuery] = useState("");
  const [allCountries, setAllCountries] = useState(false);

  const visibleCountries = useMemo(() => {
    const q = norm(countryQuery);
    const list = q ? countries.filter((c) => norm(c.n).includes(q)) : countries;
    return allCountries || q ? list.slice(0, 60) : list.slice(0, 14);
  }, [countries, countryQuery, allCountries]);

  const teamMatches = useMemo(() => {
    const q = norm(teamQuery);
    if (q.length < 2) return [];
    return teams.filter((t) => norm(t.n).includes(q)).slice(0, 8);
  }, [teams, teamQuery]);

  const activeCountN =
    filters.sports.length +
    filters.genders.length +
    filters.groups.length +
    filters.positions.length +
    filters.countries.length +
    filters.teams.length +
    filters.decades.length +
    (filters.photo ? 1 : 0) +
    (filters.active ? 1 : 0) +
    (filters.nat ? 1 : 0) +
    (filters.q ? 1 : 0);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line/50 px-3 py-2.5">
        <span className="flex items-center gap-2 font-display text-sm uppercase tracking-widest text-fg">
          <RugbyBall className="h-4 w-6 text-turf" />
          Filters
        </span>
        {activeCountN > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-line/70 px-2 py-1 text-[10px] uppercase tracking-wider text-muted transition hover:border-flash/50 hover:text-flash"
          >
            Clear {activeCountN}
          </button>
        ) : null}
      </div>

      <Section title="Sport">
        <div className="flex flex-wrap gap-1.5">
          {(["union", "league", "sevens"] as Sport[]).map((s) => (
            <Chip
              key={s}
              on={filters.sports.includes(s)}
              count={sportCounts[s]}
              onClick={() => set({ sports: toggle(filters.sports, s) })}
            >
              {SPORT_LABEL[s]}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Category">
        <div className="flex flex-wrap gap-1.5">
          <Chip
            on={filters.genders.includes("m")}
            count={genderCounts.m}
            onClick={() => set({ genders: toggle(filters.genders, "m") })}
          >
            Men
          </Chip>
          <Chip
            on={filters.genders.includes("f")}
            count={genderCounts.f}
            onClick={() => set({ genders: toggle(filters.genders, "f") })}
          >
            Women
          </Chip>
        </div>
      </Section>

      <Section title="Position" hint={`${positions.length} positions`}>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Chip
            on={filters.groups.includes("forward")}
            count={groupCounts.forward}
            onClick={() => set({ groups: toggle(filters.groups, "forward") })}
          >
            Forwards
          </Chip>
          <Chip
            on={filters.groups.includes("back")}
            count={groupCounts.back}
            onClick={() => set({ groups: toggle(filters.groups, "back") })}
          >
            Backs
          </Chip>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {positions.map((p) => (
            <Chip
              key={p.n}
              on={filters.positions.includes(p.n)}
              count={p.c}
              onClick={() => set({ positions: toggle(filters.positions, p.n) })}
            >
              {p.n}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Country" hint={`${countries.length} countries`}>
        <input
          value={countryQuery}
          onChange={(e) => setCountryQuery(e.target.value)}
          placeholder="Search country…"
          className="mb-2 w-full rounded-md border border-line/70 bg-pitch-900/80 px-2.5 py-1.5 text-xs text-fg placeholder:text-muted/70 focus:border-turf/60 focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-1.5">
          {visibleCountries.map((c) => {
            const on = filters.countries.includes(c.q);
            return (
              <button
                key={c.q}
                type="button"
                onClick={() => set({ countries: toggle(filters.countries, c.q) })}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-left text-[11px] transition ${
                  on
                    ? "border-turf/70 bg-turf/15 text-turf"
                    : "border-line/60 bg-pitch-850/50 text-muted hover:border-turf/40 hover:text-fg"
                }`}
              >
                <span className="text-sm leading-none">{flag(c.i)}</span>
                <span className="flex-1 truncate">{c.n}</span>
                <span className="text-[9px] opacity-70">{c.c.toLocaleString("en-US")}</span>
              </button>
            );
          })}
        </div>
        {!countryQuery && countries.length > 14 ? (
          <button
            type="button"
            onClick={() => setAllCountries((v) => !v)}
            className="mt-2 text-[10px] uppercase tracking-wider text-turf/80 hover:text-turf"
          >
            {allCountries ? "Show fewer" : `Show more (${countries.length})`}
          </button>
        ) : null}
      </Section>

      <Section title="Team" hint={`${teams.length.toLocaleString("en-US")} teams`}>
        {filters.teams.length ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {filters.teams.map((q) => {
              const t = teams.find((x) => x.q === q);
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => set({ teams: filters.teams.filter((x) => x !== q) })}
                  className="flex items-center gap-1 rounded-full border border-turf/60 bg-turf/15 px-2 py-0.5 text-[11px] text-turf"
                >
                  {t?.n ?? q}
                  <span className="text-[10px] opacity-70">✕</span>
                </button>
              );
            })}
          </div>
        ) : null}
        <input
          value={teamQuery}
          onChange={(e) => setTeamQuery(e.target.value)}
          placeholder="Search club or national team…"
          className="w-full rounded-md border border-line/70 bg-pitch-900/80 px-2.5 py-1.5 text-xs text-fg placeholder:text-muted/70 focus:border-turf/60 focus:outline-none"
        />
        {teamMatches.length ? (
          <div className="mt-1.5 flex flex-col gap-1">
            {teamMatches.map((t) => (
              <button
                key={t.q}
                type="button"
                onClick={() => {
                  set({ teams: toggle(filters.teams, t.q) });
                  setTeamQuery("");
                }}
                className="flex items-center gap-2 rounded-md border border-line/60 bg-pitch-850/50 px-2 py-1 text-left text-[11px] text-muted transition hover:border-turf/40 hover:text-fg"
              >
                <span className="text-sm leading-none">{flag(t.c)}</span>
                <span className="flex-1 truncate">
                  {t.n}
                  {t.nat ? <span className="ml-1 text-[9px] uppercase tracking-wider text-turf/70">national</span> : null}
                </span>
                <span className="text-[9px] opacity-70">{t.c0.toLocaleString("en-US")}</span>
              </button>
            ))}
          </div>
        ) : null}
      </Section>

      <Section title="Born">
        <div className="flex flex-wrap gap-1.5">
          {decades.map((d) => (
            <Chip
              key={d.decade}
              on={filters.decades.includes(d.decade)}
              count={d.count}
              onClick={() => set({ decades: toggle(filters.decades, d.decade) })}
            >
              {d.decade}s
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Data quality">
        <div className="flex flex-col gap-1.5">
          <Chip on={filters.photo} count={photoCount} onClick={() => set({ photo: !filters.photo })}>
            Has a photo
          </Chip>
          <Chip on={filters.active} count={activeCount} onClick={() => set({ active: !filters.active })}>
            Still active
          </Chip>
          <Chip on={filters.nat} count={natCount} onClick={() => set({ nat: !filters.nat })}>
            Played for a national team
          </Chip>
        </div>
      </Section>
    </div>
  );
}

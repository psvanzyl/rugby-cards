import Link from "next/link";
import type { Metadata } from "next";
import { getCatalogue } from "@/lib/data";
import { flag } from "@/lib/format";

// Cache each page for 10 minutes instead of re-rendering it on every request.
// Every route is a read-only render of the static catalogue, and a team page with 240
// cards costs the single Node thread real CPU. Uncached, ~2 requests/second of crawler
// traffic built a queue that ran into minutes and made the site feel frozen.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Teams",
  description:
    "Every rugby club and national team in the catalogue, grouped by country, with the number of players linked to each side.",
};

export default function TeamsPage() {
  const teams = getCatalogue().teams;
  const byCountry = new Map<string, typeof teams>();
  for (const t of teams) {
    const key = t.cn ?? "Unknown country";
    if (!byCountry.has(key)) byCountry.set(key, []);
    byCountry.get(key)!.push(t);
  }
  const groups = [...byCountry.entries()]
    .map(([country, list]) => ({
      country,
      flag: flag(list[0]?.c ?? null),
      players: list.reduce((n, t) => n + t.c0, 0),
      teams: list.sort((a, b) => b.c0 - a.c0 || a.n.localeCompare(b.n, "en")),
    }))
    .sort((a, b) => b.players - a.players);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 py-8 sm:px-5">
      <h1 className="font-display text-4xl uppercase tracking-wide sm:text-5xl">Teams</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        {teams.length.toLocaleString("en-US")} clubs and national sides from{" "}
        {groups.length.toLocaleString("en-US")} countries, ordered by how many catalogue players are
        linked to them. Open a team for its squad; the number in brackets is the player count.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <section key={g.country} className="rounded-xl border border-line/60 bg-pitch-900/50 p-4">
            <h2 className="mb-2 flex items-center gap-2 font-display text-lg uppercase tracking-widest text-fg/90">
              <span className="text-xl leading-none">{g.flag}</span>
              {g.country}
              <span className="ml-auto text-[11px] font-normal tracking-normal text-muted">
                {g.players.toLocaleString("en-US")} players
              </span>
            </h2>
            <ul className="flex flex-col gap-0.5">
              {g.teams.slice(0, 40).map((t) => (
                <li key={t.q}>
                  <Link
                    href={`/team/${t.q}`}
                    prefetch={false}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px] text-muted transition hover:bg-pitch-800 hover:text-fg"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {t.n}
                      {t.nat ? <span className="ml-1.5 text-[9px] uppercase tracking-wider text-turf/80">nat</span> : null}
                    </span>
                    <span className="text-[10px] tabular-nums text-muted/80">{t.c0.toLocaleString("en-US")}</span>
                  </Link>
                </li>
              ))}
              {g.teams.length > 40 ? (
                <li className="px-1.5 pt-1 text-[11px] text-muted">
                  + {(g.teams.length - 40).toLocaleString("en-US")} more — search them in the{" "}
                  <Link prefetch={false} href="/" className="text-turf/90 hover:text-turf">
                    team filter
                  </Link>
                </li>
              ) : null}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

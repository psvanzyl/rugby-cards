import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalogue, getPlayer, getTeamMap } from "@/lib/data";
import { CardLink, CardTile } from "@/components/CardTile";
import { RugbyBall } from "@/components/RugbyBall";
import {
  SPORT_BG,
  SPORT_LABEL,
  SPORT_LONG,
  ageLabel,
  dateLabel,
  flag,
  heightLabel,
  stintLabel,
  weightLabel,
  wdUrl,
} from "@/lib/format";

// Cache each page for 10 minutes instead of re-rendering it on every request.
// Every route is a read-only render of the static catalogue, and a team page with 240
// cards costs the single Node thread real CPU. Uncached, ~2 requests/second of crawler
// traffic built a queue that ran into minutes and made the site feel frozen.
export const revalidate = 600;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = getPlayer(decodeURIComponent(id));
  if (!p) return { title: "Player not found" };
  const bits = [
    p.p?.[0],
    p.cn,
    p.cur ? getTeamMap().get(p.cur)?.n : undefined,
    SPORT_LONG[p.s],
  ].filter(Boolean);
  return {
    title: p.n,
    description: `${p.n} — ${bits.join(" · ")}. Rugby player card from Wikidata: career, positions, teams, date of birth, height and weight.`,
  };
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const p = getPlayer(decodeURIComponent(id));
  if (!p) notFound();

  const teams = getTeamMap();
  const cur = p.cur ? teams.get(p.cur) : undefined;
  const nat = p.nat ? teams.get(p.nat) : undefined;
  const a = ageLabel(p.d);
  const h = heightLabel(p.h);
  const w = weightLabel(p.w);

  const career = (p.t ?? [])
    .map((s) => ({ team: teams.get(s[0]), start: s[1], end: s[2] }))
    .filter((s) => s.team)
    .sort((x, y) => (x.start ?? 9999) - (y.start ?? 9999));

  // A short "more like this" strip: same primary position, preferably with a photo.
  const same = p.p?.[0]
    ? getCatalogue()
        .players.filter((x) => x.id !== p.id && x.p?.includes(p.p![0]) && x.img)
        .slice(0, 6)
    : [];

  const facts: { k: string; v: React.ReactNode }[] = [
    { k: "Born", v: dateLabel(p.d) ?? "unknown" },
    { k: "Age", v: a ?? "—" },
    { k: "Place of birth", v: p.bp ?? "unknown" },
    { k: "Height", v: h ?? "unknown" },
    { k: "Weight", v: w ?? "unknown" },
    { k: "Position", v: p.p?.length ? p.p.join(", ") : "unknown" },
    { k: "Shirt number", v: p.num ?? "unknown" },
    { k: "Code", v: SPORT_LONG[p.s] },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 py-6 sm:px-5">
      <nav className="mb-4 flex items-center gap-2 text-[11px] text-muted">
        <Link prefetch={false} href="/" className="hover:text-fg">
          Players
        </Link>
        <span>/</span>
        <span className="text-fg/80">{p.n}</span>
      </nav>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex flex-col items-center gap-3 lg:w-[400px] lg:shrink-0">
          <CardTile p={p} teamName={cur?.n ?? career[career.length - 1]?.team?.n ?? null} variant="hero" />
          <div className="flex flex-wrap justify-center gap-2">
            {p.wiki ? (
              <a
                href={p.wiki}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-line/70 px-3 py-1.5 text-[11px] text-muted transition hover:border-turf/50 hover:text-fg"
              >
                Wikipedia ↗
              </a>
            ) : null}
            <a
              href={wdUrl(p.id)}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-line/70 px-3 py-1.5 text-[11px] text-muted transition hover:border-turf/50 hover:text-fg"
            >
              Wikidata ↗
            </a>
            <a
              href={`https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(p.n)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-line/70 px-3 py-1.5 text-[11px] text-muted transition hover:border-turf/50 hover:text-fg"
            >
              Commons photos ↗
            </a>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${SPORT_BG[p.s]}`}>
              {SPORT_LABEL[p.s]}
            </span>
            {p.sa?.length ? (
              <span className="text-[11px] text-muted">also {p.sa.map((s) => SPORT_LABEL[s]).join(" · ")}</span>
            ) : null}
          </div>

          <h1 className="mt-2 font-display text-4xl uppercase leading-none tracking-wide sm:text-5xl">
            {p.n}
          </h1>

          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span className="text-base leading-none">{flag(p.c)}</span>
            <span className="text-fg/85">{p.cn ?? "country unknown"}</span>
            {p.p?.[0] ? (
              <>
                <span className="text-muted/60">·</span>
                <Link prefetch={false} href={`/?pos=${encodeURIComponent(p.p[0])}`} className="hover:text-turf">
                  {p.p[0]}
                </Link>
              </>
            ) : null}
            {cur ? (
              <>
                <span className="text-muted/60">·</span>
                <Link prefetch={false} href={`/team/${cur.q}`} className="hover:text-turf">
                  {cur.n}
                </Link>
              </>
            ) : null}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.k} className="rounded-lg border border-line/60 bg-pitch-900/60 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-widest text-muted">{f.k}</dt>
                <dd className="text-sm text-fg/90">{f.v}</dd>
              </div>
            ))}
          </dl>

          {nat || cur ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {nat ? (
                <Link prefetch={false}
                  href={`/team/${nat.q}`}
                  className="flex items-center gap-2 rounded-lg border border-turf/40 bg-turf/10 px-3 py-2 text-xs text-turf transition hover:bg-turf/20"
                >
                  <span className="text-base leading-none">{flag(nat.c)}</span>
                  National team: {nat.n}
                </Link>
              ) : null}
              {cur ? (
                <Link prefetch={false}
                  href={`/team/${cur.q}`}
                  className="flex items-center gap-2 rounded-lg border border-line/70 px-3 py-2 text-xs text-muted transition hover:border-turf/50 hover:text-fg"
                >
                  <span className="text-base leading-none">{flag(cur.c)}</span>
                  {p.open ? "Current club: " : "Most recent club: "}
                  {cur.n}
                  {cur.nat ? <span className="text-[10px] uppercase tracking-wider">national</span> : null}
                </Link>
              ) : null}
            </div>
          ) : null}

          <section className="mt-8">
            <h2 className="mb-2 flex items-center gap-2 font-display text-lg uppercase tracking-widest text-fg/90">
              <RugbyBall className="h-4 w-7 text-turf" />
              Career
            </h2>
            {career.length ? (
              <ul className="divide-y divide-line/40 overflow-hidden rounded-lg border border-line/60">
                {career.map((s, i) => (
                  <li key={`${s.team!.q}-${i}`} className="flex items-center gap-3 bg-pitch-900/50 px-3 py-2">
                    <span className="text-base leading-none">{flag(s.team!.c)}</span>
                    <Link prefetch={false} href={`/team/${s.team!.q}`} className="min-w-0 flex-1 truncate text-sm text-fg/90 hover:text-turf">
                      {s.team!.n}
                    </Link>
                    {s.team!.nat ? (
                      <span className="rounded-full border border-turf/40 px-2 py-0.5 text-[9px] uppercase tracking-wider text-turf/90">
                        national
                      </span>
                    ) : null}
                    <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted">
                      {stintLabel(s.start, s.end)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-line/60 bg-pitch-900/50 px-3 py-3 text-sm text-muted">
                No team history recorded for this player yet — Wikidata only carries a club list for
                about half of all players.
              </p>
            )}
          </section>

          <p className="mt-6 text-[11px] leading-relaxed text-muted">
            Data from Wikidata (CC0), harvested via the QLever Wikidata mirror. Photos are loaded
            directly from Wikimedia Commons and belong to their respective authors. See the{" "}
            <Link prefetch={false} href="/about" className="text-turf/90 hover:text-turf">
              about page
            </Link>{" "}
            for the method and the coverage of each field.
          </p>
        </div>
      </div>

      {same.length ? (
        <section className="mt-12">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg uppercase tracking-widest text-fg/90">
            <RugbyBall className="h-4 w-7 text-turf" />
            More {p.p![0]}s
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {same.map((x) => (
              <CardLink key={x.id} p={x} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

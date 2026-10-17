import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTeam, squadOf } from "@/lib/data";
import { CardLink } from "@/components/CardTile";
import { RugbyBall } from "@/components/RugbyBall";
import { SPORT_LABEL, flag } from "@/lib/format";
import type { Sport } from "@/lib/types";

// Cache each page for 10 minutes instead of re-rendering it on every request.
// Every route is a read-only render of the static catalogue, and a team page with 240
// cards costs the single Node thread real CPU. Uncached, ~2 requests/second of crawler
// traffic built a queue that ran into minutes and made the site feel frozen.
export const revalidate = 600;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const t = getTeam(decodeURIComponent(id));
  if (!t) return { title: "Team not found" };
  return {
    title: t.n,
    description: `Every rugby player Wikidata links to ${t.n}${t.cn ? ` (${t.cn})` : ""} — positions, career years and player cards.`,
  };
}

export default async function TeamPage({ params }: Props) {
  const { id } = await params;
  const t = getTeam(decodeURIComponent(id));
  if (!t) notFound();

  const squad = squadOf(t.q);
  const LIMIT = 240;
  const shown = squad.slice(0, LIMIT);

  const bySport = new Map<string, number>();
  for (const p of squad) bySport.set(p.s, (bySport.get(p.s) ?? 0) + 1);

  return (
    <div className="mx-auto w-full max-w-[1700px] px-3 py-6 sm:px-5">
      <nav className="mb-4 flex items-center gap-2 text-[11px] text-muted">
        <Link prefetch={false} href="/" className="hover:text-fg">
          Players
        </Link>
        <span>/</span>
        <Link prefetch={false} href="/teams" className="hover:text-fg">
          Teams
        </Link>
        <span>/</span>
        <span className="text-fg/80">{t.n}</span>
      </nav>

      <header className="flex flex-wrap items-end gap-4 border-b border-line/60 pb-5">
        <span className="text-5xl leading-none">{flag(t.c)}</span>
        <div className="min-w-0">
          <h1 className="font-display text-4xl uppercase leading-none tracking-wide sm:text-5xl">
            {t.n}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            {t.nat ? (
              <span className="rounded-full border border-turf/40 bg-turf/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-turf">
                National team
              </span>
            ) : null}
            {t.sp ? <span className="text-fg/80">{SPORT_LABEL[t.sp as Sport] ?? t.sp}</span> : null}
            {t.cn ? <span>{t.cn}</span> : null}
            <span>
              <span className="font-semibold text-fg">{squad.length.toLocaleString("en-US")}</span>{" "}
              players in the catalogue
            </span>
            {bySport.size > 1
              ? [...bySport.entries()].map(([s, c]) => (
                  <span key={s} className="rounded-full border border-line/60 px-2 py-0.5 text-[10px]">
                    {SPORT_LABEL[s as Sport] ?? s} {c}
                  </span>
                ))
              : null}
          </p>
        </div>
      </header>

      {shown.length ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {shown.map((p) => (
              <CardLink key={p.id} p={p} teamName={t.n} />
            ))}
          </div>
          {squad.length > LIMIT ? (
            <p className="mt-6 text-center text-[11px] text-muted">
              Showing the {LIMIT} most recent of {squad.length.toLocaleString("en-US")} players linked
              to {t.n}. Use the{" "}
              <Link prefetch={false} href={`/?team=${t.q}`} className="text-turf/90 hover:text-turf">
                catalogue with this team filtered
              </Link>{" "}
              for the full list.
            </p>
          ) : (
            <p className="mt-6 text-center text-[11px] text-muted">
              All {squad.length.toLocaleString("en-US")} players linked to {t.n} in the catalogue.
            </p>
          )}
        </>
      ) : (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <RugbyBall className="h-16 w-28 text-turf/60" />
          <p className="font-display text-2xl uppercase tracking-wide">No players linked yet</p>
          <p className="max-w-md text-sm text-muted">
            Wikidata knows this team exists but records no player membership for it.
          </p>
        </div>
      )}
    </div>
  );
}

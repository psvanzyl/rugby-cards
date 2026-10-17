import Link from "next/link";
import type { Player } from "@/lib/types";
import {
  SPORT_BAR,
  SPORT_BG,
  SPORT_LABEL,
  ageLabel,
  flag,
  heightLabel,
  initials,
  weightLabel,
} from "@/lib/format";
import { RugbyBall } from "./RugbyBall";

type Props = {
  p: Player;
  teamName?: string | null;
  variant?: "tile" | "hero";
};

/**
 * A player as a trading card: sport accent bar, country + code pill, portrait,
 * shirt number ghosted behind the name, position/team line and a vitals strip.
 */
export function CardTile({ p, teamName, variant = "tile" }: Props) {
  const hero = variant === "hero";
  const sport = p.s;
  const a = ageLabel(p.d);
  const h = heightLabel(p.h);
  const w = weightLabel(p.w);
  const pos = p.p?.[0] ?? null;

  return (
    <article
      className={`card-shadow group relative flex flex-col overflow-hidden rounded-xl border border-line/70 bg-gradient-to-b from-pitch-800 to-pitch-900 transition duration-200 hover:-translate-y-0.5 hover:border-turf/50 ${
        hero ? "w-full max-w-[420px]" : ""
      }`}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${SPORT_BAR[sport]}`} />

      <div className={`flex items-center justify-between gap-2 ${hero ? "px-4 pt-3" : "px-2.5 pt-2"}`}>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
          {flag(p.c) ? <span className="text-base leading-none">{flag(p.c)}</span> : null}
          <span className="uppercase tracking-wide">{p.c ?? p.cn ?? "—"}</span>
        </span>
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${SPORT_BG[sport]}`}
        >
          {SPORT_LABEL[sport]}
        </span>
      </div>

      <div className={`relative ${hero ? "mx-4 mt-3 aspect-[4/5]" : "mx-2.5 mt-2 aspect-[4/5]"} overflow-hidden rounded-lg bg-pitch-850`}>
        {p.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.img}
            alt={p.n}
            loading="lazy"
            className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_30%,rgba(61,220,132,0.16),transparent_65%)]">
            <RugbyBall className={`${hero ? "h-20 w-32" : "h-12 w-20"} text-turf`} />
            <span className={`font-display uppercase text-fg/70 ${hero ? "text-5xl" : "text-3xl"}`}>
              {initials(p.n)}
            </span>
          </div>
        )}
        {p.num ? (
          <span
            className={`pointer-events-none absolute bottom-1 right-2 font-display leading-none text-white/25 ${
              hero ? "text-7xl" : "text-5xl"
            }`}
          >
            {p.num}
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-pitch-950/85 to-transparent" />
      </div>

      <div className={`flex flex-1 flex-col ${hero ? "gap-2 px-4 pb-4 pt-3" : "gap-1.5 px-2.5 pb-3 pt-2"}`}>
        <h3
          className={`font-display uppercase leading-[1.05] tracking-wide text-fg ${
            hero ? "text-3xl" : "text-lg"
          }`}
          title={p.n}
        >
          <span className="line-clamp-2">{p.n}</span>
        </h3>

        <div className={`text-muted ${hero ? "text-sm" : "text-[11px]"}`}>
          <span className={pos ? "text-fg/85" : ""}>{pos ?? "Position unknown"}</span>
          {teamName ? (
            <>
              <span className="px-1 text-muted/60">·</span>
              <span className="line-clamp-1">{teamName}</span>
            </>
          ) : null}
        </div>

        <div
          className={`mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/50 pt-1.5 text-muted ${
            hero ? "text-xs" : "text-[10px]"
          }`}
        >
          <span>{a ?? "age —"}</span>
          {h ? <span>{h}</span> : null}
          {w ? <span>{w}</span> : null}
          {p.nat ? <span className="text-turf/80">national team</span> : null}
        </div>
      </div>
    </article>
  );
}

export function CardLink({ p, teamName }: { p: Player; teamName?: string | null }) {
  return (
    <Link href={`/player/${p.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-turf/60 rounded-xl">
      <CardTile p={p} teamName={teamName} />
    </Link>
  );
}

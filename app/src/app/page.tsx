import Link from "next/link";
import { getStats } from "@/lib/data";
import { CatalogueBrowser } from "@/components/Catalogue";
import { RugbyBall } from "@/components/RugbyBall";

export default function Home() {
  const stats = getStats();
  const n = (v?: number) => (v != null ? v.toLocaleString("en-US") : "—");

  const quick = [
    { href: "/?grp=forward", label: "Forwards" },
    { href: "/?grp=back", label: "Backs" },
    { href: "/?sport=union", label: "Rugby union" },
    { href: "/?sport=league", label: "Rugby league" },
    { href: "/?gen=f", label: "Women" },
    { href: "/?nat=1", label: "National team players" },
    { href: "/?active=1", label: "Still active" },
    { href: "/?photo=1", label: "With a photo" },
  ];

  return (
    <>
      <section className="border-b border-line/70 bg-gradient-to-b from-surface to-canvas">
        <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <RugbyBall className="h-4 w-7" />
                The world&apos;s rugby players, as cards
              </p>
              <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">
                Every rugby player.
                <br />
                <span className="text-turf">Searchable.</span>
              </h1>
              <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">
                {n(stats?.players)} players from {n(stats?.countries)} countries and{" "}
                {n(stats?.teams)} clubs and national sides — rugby union, rugby league and rugby
                sevens. Filter by position, team, country, decade of birth, height and weight, then
                open a card for the full career.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {quick.map((q) => (
                  <Link prefetch={false}
                    key={q.href}
                    href={q.href}
                    className="rounded-md border border-line px-2 py-0.5 text-[11px] text-muted transition hover:border-line-strong hover:text-fg"
                  >
                    {q.label}
                  </Link>
                ))}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              {[
                { k: "Union", v: stats?.union },
                { k: "League", v: stats?.league },
                { k: "Sevens", v: stats?.sevens },
                { k: "Women", v: stats?.women },
                { k: "With a club", v: stats?.withTeam },
                { k: "With a position", v: stats?.withPosition },
                { k: "With a photo", v: stats?.withPhoto },
                { k: "Still active", v: stats?.active },
              ].map((s) => (
                <div
                  key={s.k}
                  className="rounded-lg border border-line/60 bg-pitch-900/70 px-3 py-2 backdrop-blur"
                >
                  <dt className="text-[10px] uppercase tracking-widest text-muted">{s.k}</dt>
                  <dd className="font-display text-2xl leading-tight text-fg">{n(s.v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <CatalogueBrowser version={stats?.players} />
    </>
  );
}

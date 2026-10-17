import Link from "next/link";
import type { Metadata } from "next";
import { getStats } from "@/lib/data";
import { RugbyBall } from "@/components/RugbyBall";

export const metadata: Metadata = {
  title: "About & method",
  description:
    "How the Rugbydex catalogue is built: Wikidata as the source, the properties used, field coverage, and what the data cannot tell you.",
};

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 1000) / 10 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-[12px] text-muted">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-pitch-800">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-turf to-turf-dark"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-24 shrink-0 text-right text-[11px] tabular-nums text-muted">
        {value.toLocaleString("en-US")} · {pct}%
      </span>
    </div>
  );
}

export default function AboutPage() {
  const s = getStats();
  const total = s?.players ?? 0;
  const n = (v?: number) => (v != null ? v.toLocaleString("en-US") : "—");

  return (
    <div className="mx-auto w-full max-w-[1000px] px-3 py-8 sm:px-5">
      <h1 className="font-display text-4xl uppercase tracking-wide sm:text-5xl">About &amp; method</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Rugbydex is a card catalogue of every rugby player who exists as an item in{" "}
        <a href="https://www.wikidata.org" className="text-turf/90 hover:text-turf" target="_blank" rel="noreferrer">
          Wikidata
        </a>
        : union, league and sevens, men and women, from the 19th century to squads named this week.
        It is a browsing tool for open data, not an official register — every number below is what
        Wikidata actually records.
      </p>

      <section className="mt-8 rounded-xl border border-line/60 bg-pitch-900/50 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-xl uppercase tracking-widest text-fg/90">
          <RugbyBall className="h-4 w-7 text-turf" />
          The catalogue in numbers
        </h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { k: "Players", v: s?.players },
            { k: "Teams", v: s?.teams },
            { k: "Countries", v: s?.countries },
            { k: "Positions", v: s?.positions },
            { k: "Union", v: s?.union },
            { k: "League", v: s?.league },
            { k: "Sevens", v: s?.sevens },
            { k: "Women", v: s?.women },
          ].map((x) => (
            <div key={x.k} className="rounded-lg border border-line/60 bg-pitch-850/50 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-widest text-muted">{x.k}</dt>
              <dd className="font-display text-2xl leading-tight">{n(x.v)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl uppercase tracking-widest text-fg/90">
          Field coverage
        </h2>
        <p className="mb-4 text-sm text-muted">
          Wikidata is patchy: it holds a date of birth for almost every player, a club list for about
          half, and a position for about a third. The filters reflect that — a position filter stacked
          on a team filter will often return nothing.
        </p>
        <div className="flex flex-col gap-2 rounded-xl border border-line/60 bg-pitch-900/50 p-4">
          <Bar label="Date of birth" value={s?.withDob ?? 0} total={total} />
          <Bar label="Country" value={s?.withCountry ?? 0} total={total} />
          <Bar label="At least one team" value={s?.withTeam ?? 0} total={total} />
          <Bar label="Position" value={s?.withPosition ?? 0} total={total} />
          <Bar label="Height" value={s?.withHeight ?? 0} total={total} />
          <Bar label="Photo on Commons" value={s?.withPhoto ?? 0} total={total} />
          <Bar label="Wikipedia article" value={s?.withWiki ?? 0} total={total} />
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-line/60 bg-pitch-900/50 p-5">
          <h2 className="mb-2 font-display text-xl uppercase tracking-widest text-fg/90">Source</h2>
          <ul className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-muted">
            <li>
              All records come from <strong className="text-fg/85">Wikidata</strong> (CC0, no
              attribution required — given anyway).
            </li>
            <li>
              Queried through the <strong className="text-fg/85">QLever</strong> Wikidata mirror
              (<span className="text-fg/80">qlever.dev/api/wikidata</span>), which answers whole-class
              queries in under a second where the public endpoint would time out.
            </li>
            <li>
              Players are the items whose <em>occupation</em> (P106) is rugby union player
              (Q14089670), rugby league player (Q14373094) or rugby sevens player (Q26237722).
            </li>
            <li>
              Teams come from <em>member of sports team</em> (P54) with start (P580) and end (P582)
              dates; positions from <em>position played on team / speciality</em> (P413), mapped onto
              the canonical rugby position names; plus date of birth (P569), height (P2048), mass
              (P2067), image (P18), country of citizenship (P27) and place of birth (P19).
            </li>
            <li>
              Photos are hot-linked from Wikimedia Commons via{" "}
              <span className="text-fg/80">Special:FilePath</span>, thumbnailed to 420 px. Each photo
              stays under the licence of its Commons page.
            </li>
            <li>Snapshot generated {s?.generated ? new Date(s.generated).toUTCString() : "—"}.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-line/60 bg-pitch-900/50 p-5">
          <h2 className="mb-2 font-display text-xl uppercase tracking-widest text-fg/90">
            What it does not have
          </h2>
          <ul className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-muted">
            <li>
              <strong className="text-fg/85">No caps, points or match statistics.</strong> Wikidata
              does not carry career stats; that data lives in proprietary databases. A card shows who
              a player is, where they played and when — not how well.
            </li>
            <li>
              <strong className="text-fg/85">Squad lists are historical, not current.</strong> A club
              list is every stint Wikidata records; the &ldquo;current&rdquo; badge means a stint
              with no end date, which may simply be unsourced.
            </li>
            <li>
              Coverage is skewed towards men&apos;s internationals and towards players with Wikipedia
              articles; women&apos;s rugby and pre-1950 club players are underrepresented.
            </li>
            <li>
              Position labels are normalised onto {s?.positions ?? 0} canonical positions; the raw
              Wikidata values (including non-rugby positions for multi-sport athletes) are dropped.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-line/60 bg-pitch-900/50 p-5">
        <h2 className="mb-2 font-display text-xl uppercase tracking-widest text-fg/90">
          Refreshing the data
        </h2>
        <p className="text-[13px] leading-relaxed text-muted">
          The catalogue is a single gzipped JSON snapshot, {n(total)} players in about 1.9 MB. It is
          produced by <span className="text-fg/80">scripts/harvest.py</span> on the homelab build host
          (dev LXC): the harvest is resumable, caches each query step under{" "}
          <span className="text-fg/80">data/raw/</span>, and rebuilds the snapshot with{" "}
          <span className="text-fg/80">python3 harvest.py build</span>. Drop the new snapshot into the
          app&apos;s <span className="text-fg/80">/app/data</span> volume and the site picks it up
          without a rebuild.
        </p>
      </section>

      <p className="mt-8 text-[11px] leading-relaxed text-muted">
        Rugbydex is a private homelab project. Not affiliated with World Rugby, any national union,
        league or club. Player photos belong to their respective authors on Wikimedia Commons. Spotted
        a wrong card? The fix belongs upstream in Wikidata —{" "}
        <Link prefetch={false} href="/" className="text-turf/90 hover:text-turf">
          every card links to its Wikidata item
        </Link>
        .
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Bebas_Neue, Inter } from "next/font/google";
import { getStats } from "@/lib/data";
import { Logo } from "@/components/RugbyBall";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bebas = Bebas_Neue({ weight: "400", variable: "--font-bebas", subsets: ["latin"] });

// Cache each page for 10 minutes instead of re-rendering it on every request.
// Every route is a read-only render of the static catalogue, and a team page with 240
// cards costs the single Node thread real CPU. Uncached, ~2 requests/second of crawler
// traffic built a queue that ran into minutes and made the site feel frozen.
export const revalidate = 600;

/**
 * Runs before first paint. Light is the default even when the OS prefers dark;
 * only a stored "dark", or "system" on a dark OS, turns the class on, so the
 * page never flashes the wrong theme. Mirrors paint() in ThemeToggle.
 */
const THEME_INIT = `(function(){try{var m=localStorage.getItem("rugbydex-theme");if(m!=="light"&&m!=="dark"&&m!=="system")m="light";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: "Rugbydex — every rugby player in the world",
    template: "%s · Rugbydex",
  },
  description:
    "A searchable, filterable card catalogue of every rugby union, rugby league and rugby sevens player on Wikidata: teams, positions, birth dates, height, weight and national teams.",
  metadataBase: new URL("https://rugby.laserraptorai.duckdns.org"),
  openGraph: {
    title: "Rugbydex — every rugby player in the world",
    description:
      "49,000+ rugby players as trading cards. Search, filter and sort the whole world of rugby.",
    type: "website",
  },
};

const n = (v?: number) => (v != null ? v.toLocaleString("en-US") : "—");

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const stats = getStats();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${bebas.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b border-line/70 bg-pitch-950/90 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-3 px-3 sm:px-5">
              <Link prefetch={false} href="/" className="group flex items-center gap-2.5">
                <Logo className="h-8 w-8" />
                <span className="font-display text-xl uppercase tracking-wide">
                  Rugby<span className="text-turf">dex</span>
                </span>
              </Link>
              <nav className="ml-2 hidden items-center gap-1 text-sm text-muted sm:flex">
                <Link prefetch={false} href="/" className="rounded-md px-2.5 py-1.5 transition hover:bg-pitch-800 hover:text-fg">
                  Players
                </Link>
                <Link prefetch={false} href="/teams" className="rounded-md px-2.5 py-1.5 transition hover:bg-pitch-800 hover:text-fg">
                  Teams
                </Link>
                <Link prefetch={false} href="/about" className="rounded-md px-2.5 py-1.5 transition hover:bg-pitch-800 hover:text-fg">
                  About
                </Link>
              </nav>
              <div className="ml-auto text-right text-[11px] leading-tight text-muted">
                <div className="font-medium text-fg/90">
                  {stats ? `${n(stats.players)} players · ${n(stats.teams)} teams` : "49,000+ players"}
                </div>
                <div className="hidden sm:block">union · league · sevens</div>
              </div>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-line/70 bg-pitch-900/60">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-1.5 px-3 py-5 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p>
                Built from open Wikidata data (CC0) · player photos from Wikimedia Commons · not
                affiliated with World Rugby, any union, league or club.
              </p>
              <p className="flex gap-3">
                <Link prefetch={false} href="/teams" className="hover:text-fg">
                  Teams
                </Link>
                <Link prefetch={false} href="/about" className="hover:text-fg">
                  About &amp; method
                </Link>
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

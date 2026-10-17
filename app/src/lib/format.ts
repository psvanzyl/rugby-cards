import type { Player, Sport } from "./types";

export const SPORTS: Sport[] = ["union", "league", "sevens"];

export const SPORT_LABEL: Record<Sport, string> = {
  union: "Union",
  league: "League",
  sevens: "Sevens",
};

export const SPORT_LONG: Record<Sport, string> = {
  union: "Rugby union",
  league: "Rugby league",
  sevens: "Rugby sevens",
};

/** Tailwind text colours per code, used for accents on cards and pills. */
export const SPORT_TEXT: Record<Sport, string> = {
  union: "text-turf",
  league: "text-league",
  sevens: "text-sevens",
};

export const SPORT_BG: Record<Sport, string> = {
  union: "bg-turf/15 border-turf/40 text-turf",
  league: "bg-league/15 border-league/40 text-league",
  sevens: "bg-sevens/15 border-sevens/40 text-sevens",
};

export const SPORT_BAR: Record<Sport, string> = {
  union: "from-turf to-turf-dark",
  league: "from-league to-leather",
  sevens: "from-sevens to-turf",
};

/** ISO 3166-1 alpha-2 → regional indicator flag. Empty string when unknown. */
export function flag(iso: string | null | undefined): string {
  if (!iso || iso.length !== 2) return "";
  const cc = iso.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Lowercase, strip diacritics and punctuation so search is forgiving.
 *  Non-Latin letters (Japanese, Korean, Cyrillic…) are kept so those names stay searchable. */
export function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function yearOf(d: string | null | undefined): number | null {
  if (!d) return null;
  const m = /^(\d{4})/.exec(d);
  return m ? Number(m[1]) : null;
}

export function age(d: string | null | undefined, now = new Date()): number | null {
  if (!d || d.length < 10) return null;
  const t = Date.parse(d);
  if (Number.isNaN(t)) return null;
  const diff = now.getTime() - t;
  if (diff < 0) return null;
  return Math.floor(diff / 31557600000);
}

/** "32 yrs" for someone plausibly alive, otherwise "born 1931" — a 1905 birth date
 *  must never be rendered as a 121-year-old. */
export function ageLabel(d: string | null | undefined, now = new Date()): string | null {
  const a = age(d, now);
  if (a != null && a <= 100) return `${a} yrs`;
  const y = yearOf(d);
  return y ? `born ${y}` : null;
}

export function heightLabel(cm: number | undefined | null): string | null {
  if (!cm || cm < 120 || cm > 250) return null;
  return `${(cm / 100).toFixed(2)} m`;
}

export function weightLabel(kg: number | undefined | null): string | null {
  if (!kg || kg < 50 || kg > 200) return null;
  return `${Math.round(kg)} kg`;
}

export function dateLabel(d: string | null | undefined): string | null {
  if (!d) return null;
  const t = Date.parse(d);
  if (Number.isNaN(t)) return d;
  return new Date(t).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function initials(name: string): string {
  const parts = norm(name)
    .split(" ")
    .filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

/** Career stint as a human label, e.g. "2011–2019" or "2022–". */
export function stintLabel(start: number | null, end: number | null): string {
  if (start && end) return start === end ? String(start) : `${start}–${end}`;
  if (start) return `${start}–`;
  if (end) return `–${end}`;
  return "—";
}

export function isActive(p: Player): boolean {
  return Boolean(p.open);
}

export function wikiUrl(p: Player): string | null {
  if (p.wiki) return p.wiki;
  return null;
}

export function wdUrl(id: string): string {
  return `https://www.wikidata.org/wiki/${id}`;
}

export function commonsSearch(name: string): string {
  return `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(name)}`;
}

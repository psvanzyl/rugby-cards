export type Sport = "union" | "league" | "sevens";

/** [team QID, start year, end year] — a career stint. */
export type Stint = [string, number | null, number | null];

export type Player = {
  /** Wikidata QID. */
  id: string;
  /** Display name. */
  n: string;
  /** Primary sport. */
  s: Sport;
  /** Other rugby codes the player also holds. */
  sa?: Sport[];
  /** Date of birth (YYYY-MM-DD, sometimes YYYY-MM or YYYY). */
  d?: string | null;
  /** Gender as recorded by Wikidata. */
  g?: "m" | "f";
  /** Country (ISO 3166-1 alpha-2) + QID + label. */
  c?: string | null;
  cq?: string;
  cn?: string | null;
  c2?: (string | null)[];
  /** Height in cm, weight in kg. */
  h?: number;
  w?: number;
  /** Wikimedia Commons image URL. */
  img?: string;
  /** Place of birth (label). */
  bp?: string | null;
  /** Canonical playing positions. */
  p?: string[];
  /** Position group of the primary position: "forward" | "back". */
  pg?: string | null;
  /** Shirt number. */
  num?: number;
  /** English Wikipedia article. */
  wiki?: string;
  /** Career stints, oldest first. */
  t?: Stint[];
  /** Team QID the player is currently at (open-ended stint). */
  cur?: string;
  /** True when the player has a stint with no end date — i.e. plausibly still playing. */
  open?: boolean;
  /** National team QID. */
  nat?: string;
};

export type Team = {
  q: string;
  n: string;
  c: string | null;
  cn: string | null;
  nat: boolean;
  sp: string | null;
  /** Number of players in the catalogue linked to this team. */
  c0: number;
};

export type Country = {
  q: string;
  n: string;
  /** ISO alpha-2 (used for the flag). */
  i: string | null;
  /** ISO alpha-3. */
  e: string | null;
  c: number;
};

export type Position = {
  n: string;
  g: string | null;
  c: number;
};

export type Stats = {
  players: number;
  teams: number;
  countries: number;
  positions: number;
  union: number;
  league: number;
  sevens: number;
  women: number;
  withTeam: number;
  withPosition: number;
  withPhoto: number;
  withCountry: number;
  withHeight: number;
  withMass: number;
  withDob: number;
  withWiki: number;
  active: number;
  generated: string;
  source: string;
};

export type Catalogue = {
  stats: Stats;
  countries: Country[];
  positions: Position[];
  teams: Team[];
  players: Player[];
};

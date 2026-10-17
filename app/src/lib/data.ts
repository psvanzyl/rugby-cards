import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { Catalogue, Player, Stats, Team } from "./types";

/**
 * Data resolution order:
 *   1. RUGBY_DATA_DIR (explicit override)
 *   2. /app/data       (Coolify persistent volume — a re-harvest lands here, no redeploy)
 *   3. public/data     (snapshot baked into the image, always present)
 */
const DIRS = [
  process.env.RUGBY_DATA_DIR,
  "/app/data",
  path.join(process.cwd(), "public", "data"),
].filter(Boolean) as string[];

export function resolveDataFile(file: string): string | null {
  for (const dir of DIRS) {
    const p = path.join(dir, file);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

let catalogueCache: Catalogue | null = null;
let statsCache: Stats | null = null;
let playerMap: Map<string, Player> | null = null;
let teamMap: Map<string, Team> | null = null;

export function getCatalogue(): Catalogue {
  if (!catalogueCache) {
    const p = resolveDataFile("catalogue.json.gz");
    try {
      catalogueCache = p
        ? (JSON.parse(zlib.gunzipSync(fs.readFileSync(p)).toString("utf-8")) as Catalogue)
        : null;
    } catch {
      catalogueCache = null;
    }
    if (!catalogueCache) {
      catalogueCache = {
        stats: getStats() ?? ({} as Stats),
        countries: [],
        positions: [],
        teams: [],
        players: [],
      };
    }
  }
  return catalogueCache;
}

export function getStats(): Stats | null {
  if (!statsCache) {
    const p = resolveDataFile("stats.json");
    try {
      statsCache = p ? (JSON.parse(fs.readFileSync(p, "utf-8")) as Stats) : null;
    } catch {
      statsCache = null;
    }
  }
  return statsCache ?? getCatalogue().stats ?? null;
}

export function getPlayerMap(): Map<string, Player> {
  if (!playerMap) {
    playerMap = new Map();
    for (const p of getCatalogue().players) playerMap.set(p.id, p);
  }
  return playerMap;
}

export function getTeamMap(): Map<string, Team> {
  if (!teamMap) {
    teamMap = new Map();
    for (const t of getCatalogue().teams) teamMap.set(t.q, t);
  }
  return teamMap;
}

export function getPlayer(id: string): Player | null {
  return getPlayerMap().get(id) ?? null;
}

export function getTeam(id: string): Team | null {
  return getTeamMap().get(id) ?? null;
}

/** Players who ever turned out for a team, most recent stint first. */
export function squadOf(teamId: string): Player[] {
  const out: Player[] = [];
  for (const p of getCatalogue().players) {
    if (p.t?.some((s) => s[0] === teamId)) out.push(p);
  }
  return out.sort((a, b) => {
    const ea = Math.max(...(a.t ?? []).filter((s) => s[0] === teamId).map((s) => s[2] ?? 9999));
    const eb = Math.max(...(b.t ?? []).filter((s) => s[0] === teamId).map((s) => s[2] ?? 9999));
    return eb - ea || a.n.localeCompare(b.n, "en");
  });
}

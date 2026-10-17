#!/usr/bin/env python3
"""One-shot: strip non-label junk (Commons file hashes, filenames) out of country /
birthplace / team-country fields of the built catalogue, then refresh stats.json.

The harvest takes whatever rdfs:label QLever returns; for a handful of entities that
is a Commons file hash (e.g. 45dc37cd9a113c1c53fea88545bf509d), which then renders as
a country badge. scripts/harvest.py now sanitises labels at build time; this repairs
the catalogue that is already built so a full re-harvest is not needed.
"""
import gzip
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, "data", "catalogue.json.gz")
STATS = os.path.join(ROOT, "data", "stats.json")

HASH_RE = re.compile(r"^[0-9a-f]{16,}$", re.I)
FILE_RE = re.compile(r"\.(jpe?g|png|gif|svg|tiff?|webp|pdf|webm|ogv|ogg|mp4|djvu)$", re.I)


def clean_label(v):
    """Mirror of harvest.clean_label: return a usable human label, else None."""
    if not isinstance(v, str):
        return None
    s = v.strip()
    if not s or len(s) > 70:
        return None
    if HASH_RE.match(s) or FILE_RE.search(s):
        return None
    return s


def main():
    with gzip.open(CAT, "rt", encoding="utf-8") as fh:
        c = json.load(fh)

    changed = []

    def fix(container, key, label):
        for rec in container:
            v = rec.get(key)
            if v is not None and clean_label(v) != v:
                changed.append((label, rec.get("n") or rec.get("q"), v))
                rec[key] = clean_label(v)

    fix(c["players"], "cn", "player.country")
    fix(c["players"], "bp", "player.birthplace")
    fix(c["players"], "c", "player.iso")
    fix(c["teams"], "cn", "team.country")
    for rec in c["countries"]:
        rec["n"] = clean_label(rec.get("n"))

    for kind, name, old in changed:
        print(f"  {kind:16} {name!r:34} <- {old!r}")

    # ISO codes must be 2 or 3 letters; a junk value would render as a bogus flag.
    iso_fixed = 0
    for rec in c["players"]:
        v = rec.get("c")
        if v is not None and not re.fullmatch(r"[A-Za-z]{2,3}", str(v)):
            rec["c"] = None
            iso_fixed += 1
    if iso_fixed:
        print(f"  cleared {iso_fixed} bogus ISO country codes")

    with gzip.open(CAT, "wt", encoding="utf-8") as fh:
        json.dump(c, fh, ensure_ascii=False, separators=(",", ":"))

    stats = json.load(open(STATS, encoding="utf-8"))
    # Same definitions the harvest uses: country stats are ISO-code based, so a cleaned
    # label must not shift the headline numbers on the hero ("from N countries").
    stats["countries"] = len({p["c"] for p in c["players"] if p.get("c")})
    stats["withCountry"] = sum(1 for p in c["players"] if p.get("c"))
    with open(STATS, "w", encoding="utf-8") as fh:
        json.dump(stats, fh, indent=1)

    print(f"labels fixed: {len(changed)} | countries now: {stats['countries']} | withCountry: {stats['withCountry']}")
    print("catalogue bytes:", os.path.getsize(CAT))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Add label sanitisation to scripts/harvest.py (idempotent)."""
import io
import os
import sys

P = "/root/projects/rugby-cards/scripts/harvest.py"
src = open(P, encoding="utf-8").read()
if "def clean_label(" in src:
    print("already patched")
    sys.exit(0)

HELPER = '''HASH_RE = re.compile(r"^[0-9a-f]{16,}$", re.I)
FILE_RE = re.compile(r"\\.(jpe?g|png|gif|svg|tiff?|webp|pdf|webm|ogv|ogg|mp4|djvu)$", re.I)


def clean_label(v):
    """A usable human label, else None.

    QLever returns whatever rdfs:label an entity has; for a few entities that is a
    Commons file hash or a filename, which would otherwise render as a country badge
    or birthplace.
    """
    if not isinstance(v, str):
        return None
    s = v.strip()
    if not s or len(s) > 70:
        return None
    if HASH_RE.match(s) or FILE_RE.search(s):
        return None
    return s


def clean_iso(v):
    """ISO 3166 alpha-2/3 only; anything else would render as a bogus flag."""
    s = str(v or "").strip()
    return s.upper() if re.fullmatch(r"[A-Za-z]{2,3}", s) else None


'''

REPL = [
    (
        "def flag_emoji(cc):",
        HELPER + "def flag_emoji(cc):",
    ),
    (
        '        rec = countries.setdefault(q, {"q": q, "name": r[1] or q, "iso2": None, "iso3": None})',
        '        rec = countries.setdefault(q, {"q": q, "name": clean_label(r[1]), "iso2": None, "iso3": None})',
    ),
    (
        '        rec = places.setdefault(q, {"name": r[1] or q, "country": None})',
        '        rec = places.setdefault(q, {"name": clean_label(r[1]), "country": None})',
    ),
    (
        '            rec["countryName"] = r[5] or None',
        '            rec["countryName"] = clean_label(r[5])',
    ),
    (
        '            rec["c"] = countries.get(primary, {}).get("iso2")',
        '            rec["c"] = clean_iso(countries.get(primary, {}).get("iso2"))',
    ),
    (
        '            rec["cn"] = countries.get(primary, {}).get("name")',
        '            rec["cn"] = clean_label(countries.get(primary, {}).get("name"))',
    ),
]

for old, new in REPL:
    if old not in src:
        print("ANCHOR MISSING:", old[:70])
        sys.exit(1)
    if src.count(old) != 1:
        print("ANCHOR NOT UNIQUE (%d):" % src.count(old), old[:70])
        sys.exit(1)
    src = src.replace(old, new)

open(P, "w", encoding="utf-8").write(src)
import py_compile

py_compile.compile(P, doraise=True)
print("patched + compiles OK")

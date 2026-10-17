#!/usr/bin/env python3
"""
Harvest every rugby player in Wikidata, via the public QLever SPARQL endpoint
(https://qlever.cs.uni-freiburg.de/api/wikidata) — full Wikidata mirror, CC0,
no API key, TSV responses.

Steps write raw TSV under data/raw/<step>.tsv and are resumable: an existing
file is reused unless --force is given. `build` assembles the shipped catalogue.

Usage:
  python3 harvest.py all          # fetch every step (skipping existing) + build
  python3 harvest.py fetch <step> # one step
  python3 harvest.py build
"""
import gzip
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(BASE, "data", "raw")
DATA = os.path.join(BASE, "data")
ENDPOINT = "https://qlever.dev/api/wikidata"
UA = "RugbyCardsHarvest/1.0 (homelab catalogue; psvanzyl@gmail.com)"

PREFIX = """PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
"""

OCC = {"Q14089670": "union", "Q14373094": "league", "Q26237722": "sevens"}
RUGBY = "?p wdt:P106 ?occ . VALUES ?occ { wd:Q14089670 wd:Q14373094 wd:Q26237722 }"

LANGS = ("en", "nl", "fr", "de", "af", "it", "es", "pt", "ja", "ru", "mi", "cy",
         "sm", "to", "fj", "ga", "pl", "sv", "no", "da", "fi", "tr", "zh", "ar",
         "ro", "cs", "el", "uk", "ca", "id", "he", "hi", "ko", "sw", "zu")
LANG_FILTER = "FILTER(lang(?label) IN (" + ", ".join('"%s"' % l for l in LANGS) + "))"

QUERIES = {
    "occupations": "SELECT ?p ?occ WHERE { %s }" % RUGBY,
    "labels": "SELECT ?p ?label WHERE { %s ?p rdfs:label ?label . %s }" % (RUGBY, LANG_FILTER),
    "dob": "SELECT ?p ?dob WHERE { %s ?p wdt:P569 ?dob . }" % RUGBY,
    "height": "SELECT ?p ?h WHERE { %s ?p wdt:P2048 ?h . }" % RUGBY,
    "mass": "SELECT ?p ?m WHERE { %s ?p wdt:P2067 ?m . }" % RUGBY,
    "image": "SELECT ?p ?img WHERE { %s ?p wdt:P18 ?img . }" % RUGBY,
    "citizenship": "SELECT ?p ?c WHERE { %s ?p wdt:P27 ?c . }" % RUGBY,
    "sportcountry": "SELECT ?p ?c WHERE { %s ?p wdt:P1532 ?c . }" % RUGBY,
    "birthplace": "SELECT ?p ?bp WHERE { %s ?p wdt:P19 ?bp . }" % RUGBY,
    "position": "SELECT ?p ?pos WHERE { %s ?p wdt:P413 ?pos . }" % RUGBY,
    "gender": "SELECT ?p ?g WHERE { %s ?p wdt:P21 ?g . }" % RUGBY,
    "jersey": "SELECT ?p ?num WHERE { %s ?p wdt:P1618 ?num . }" % RUGBY,
    # Start/end years hang off the P54 *statement* as qualifiers (pq:P580 / pq:P582),
    # not off the team item — reading them from the team gave an empty date for
    # virtually every stint.
    "teams": ("SELECT ?p ?team ?start ?end WHERE { %s ?p p:P54 ?st . ?st ps:P54 ?team ."
              " OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?st pq:P582 ?end } }" % RUGBY),
    "article": ("SELECT ?p ?article WHERE { %s ?article schema:about ?p ;"
                " schema:isPartOf <https://en.wikipedia.org/> . }" % RUGBY),
}

META_QUERIES = {
    "teammeta": ("?e ?label ?type ?typeLabel ?country ?countryLabel ?logo",
                 "OPTIONAL { ?e rdfs:label ?label . FILTER(lang(?label) = \"en\") }"
                 " OPTIONAL { ?e wdt:P31 ?type . OPTIONAL { ?type rdfs:label ?typeLabel ."
                 " FILTER(lang(?typeLabel) = \"en\") } }"
                 " OPTIONAL { ?e wdt:P17 ?country . OPTIONAL { ?country rdfs:label ?countryLabel ."
                 " FILTER(lang(?countryLabel) = \"en\") } }"
                 " OPTIONAL { ?e wdt:P18 ?logo }"),
    "posmeta": ("?e ?label",
                "OPTIONAL { ?e rdfs:label ?label . FILTER(lang(?label) = \"en\") }"),
    "countrymeta": ("?e ?label ?iso2 ?iso3",
                    "OPTIONAL { ?e rdfs:label ?label . FILTER(lang(?label) = \"en\") }"
                    " OPTIONAL { ?e wdt:P297 ?iso2 } OPTIONAL { ?e wdt:P298 ?iso3 }"),
    "placemeta": ("?e ?label ?country",
                  "OPTIONAL { ?e rdfs:label ?label . FILTER(lang(?label) = \"en\") }"
                  " OPTIONAL { ?e wdt:P17 ?country }"),
}


def term(tok):
    """Parse one QLever TSV cell into a plain string (or None when unbound)."""
    if not tok:
        return None
    if tok.startswith("<") and tok.endswith(">"):
        return tok[1:-1]
    if tok.startswith('"'):
        out = []
        i = 1
        while i < len(tok):
            ch = tok[i]
            if ch == "\\" and i + 1 < len(tok):
                nxt = tok[i + 1]
                out.append({"t": "\t", "n": "\n", "r": "\r", '"': '"', "\\": "\\"}.get(nxt, nxt))
                i += 2
                continue
            if ch == '"':
                return "".join(out)
            out.append(ch)
            i += 1
        return "".join(out)
    return tok


_LAST = [0.0]
THROTTLE = 1.5  # qlever.dev rate-limits bursts: keep >=1.5 s between queries


def fetch(query, timeout=600, tries=6):
    body = urllib.parse.urlencode({"query": PREFIX + query}).encode()
    last = None
    for attempt in range(tries):
        wait = THROTTLE - (time.time() - _LAST[0])
        if wait > 0:
            time.sleep(wait)
        try:
            req = urllib.request.Request(
                ENDPOINT, data=body,
                headers={"User-Agent": UA, "Accept": "text/tab-separated-values"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                text = r.read().decode("utf-8", "replace")
            _LAST[0] = time.time()
            rows = []
            for line in text.split("\n")[1:]:
                if not line.strip():
                    continue
                rows.append(tuple(term(c) for c in line.split("\t")))
            return rows
        except Exception as e:  # noqa: BLE001
            last = e
            _LAST[0] = time.time()
            code = getattr(e, "code", None)
            back = [3, 8, 20, 45, 90][min(attempt, 4)]
            sys.stderr.write("  retry %d/%d after %s (HTTP %s)\n" % (attempt + 1, tries, e, code))
            time.sleep(back)
    raise RuntimeError("query failed: %s" % last)


def qid(uri):
    return uri.rsplit("/", 1)[-1] if uri else None


def write_tsv(path, rows):
    with open(path, "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write("\t".join("" if c is None else c for c in r) + "\n")


def read_step(step):
    path = os.path.join(RAW, step + ".tsv")
    if not os.path.exists(path):
        return []
    out = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.rstrip("\n")
            if not line:
                continue
            out.append(tuple(c or None for c in line.split("\t")))
    return out


def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def fetch_step(step, force=False):
    path = os.path.join(RAW, step + ".tsv")
    if os.path.exists(path) and not force and os.path.getsize(path) > 0:
        print("  %-12s cached (%d bytes)" % (step, os.path.getsize(path)))
        return
    t0 = time.time()
    rows = fetch(QUERIES[step])
    write_tsv(path, rows)
    print("  %-12s %7d rows  %5.1fs" % (step, len(rows), time.time() - t0))


def meta(name, qids, force=False):
    """Fetch metadata for a set of QIDs, chunked and bisecting on failure."""
    path = os.path.join(RAW, name + ".tsv")
    if os.path.exists(path) and not force and os.path.getsize(path) > 0:
        print("  %-12s cached" % name)
        return read_step(name)
    qids = sorted(qids)
    rows = []
    failed = []

    def run(chunk):
        if not chunk:
            return
        vars_, body = META_QUERIES[name]
        q = "SELECT %s WHERE { VALUES ?e { %s }\n%s }" % (
            vars_, " ".join("wd:%s" % x for x in chunk), body)
        try:
            rows.extend(fetch(q))
        except Exception as e:  # noqa: BLE001
            if len(chunk) > 1:
                mid = len(chunk) // 2
                sys.stderr.write("  %s: chunk of %d failed (%s) — bisecting\n" % (name, len(chunk), e))
                run(chunk[:mid])
                run(chunk[mid:])
            else:
                sys.stderr.write("  %s: giving up on %s (%s)\n" % (name, chunk[0], e))
                failed.append(chunk[0])

    total = (len(qids) + 399) // 400
    for i, chunk in enumerate(chunks(qids, 400), 1):
        before = len(rows)
        run(chunk)
        print("    %s chunk %d/%d (%d rows)" % (name, i, total, len(rows) - before))
    write_tsv(path, rows)
    if failed:
        print("    %s: %d QIDs unresolved: %s" % (name, len(failed), ", ".join(failed[:10])))
    return rows


# Canonical rugby positions: (regex on the raw Wikidata label, canonical name, group).
# Order matters — the most specific patterns come first, the generic "back"/"forward"
# catch-alls last. Labels that match nothing (goalkeeper, quarterback, batter …) are
# dropped: those players also hold a non-rugby occupation and their P413 points at the
# wrong sport.
POS_RULES = [
    (r"\bprop\b", "Prop", "forward"),
    (r"hooker", "Hooker", "forward"),
    (r"\block\b|second[- ]row", "Lock", "forward"),
    (r"flank|breakaway|blindside|openside", "Flanker", "forward"),
    (r"number (eight|8)|no\.? ?8|eighthman|lock forward", "Number 8", "forward"),
    (r"scrum[- ]?half|scrumhalf|half[- ]back", "Scrum-half", "back"),
    (r"fly[- ]?half|stand[- ]?off|five[- ]eighth|out[- ]half", "Fly-half", "back"),
    (r"cent(re|er)|three[- ]quarter|midfield", "Centre", "back"),
    (r"\bwing(er|s)?\b", "Wing", "back"),
    (r"full[- ]?back|fullback", "Fullback", "back"),
    (r"ruckman|\bruck\b", "Ruck", "forward"),
    (r"loose forward", "Loose forward", "forward"),
    (r"back[- ]row", "Back row", "forward"),
    (r"front[- ]row", "Front row", "forward"),
    (r"utility", "Utility back", "back"),
    (r"^\s*forward", "Forward", "forward"),
    (r"^\s*back", "Back", "back"),
]

POS_CANON = {c: g for _, c, g in POS_RULES}


def canon_position(label):
    """Map a raw Wikidata position label onto a canonical rugby position."""
    if not label:
        return None, None
    l = label.lower().strip()
    for rx, canon, group in POS_RULES:
        if re.search(rx, l):
            return canon, group
    return None, None


def position_group(label):
    return canon_position(label)[1]


# Japanese and Korean labels use the full-width middle dot as a name separator, and
# labels arrive with typographic apostrophes and stray whitespace.
_DOT = "\u30fb"
_LEAD_PAREN = re.compile(r"^\([^)]*\)\s*")
_TRAIL_PAREN = re.compile(r"\s*\([^)]*\)\s*$")
_QUOTES = "'\"\u2018\u2019\u201c\u201d"


def clean_name(raw):
    """Normalise a Wikidata label for display on a card."""
    if not raw:
        return ""
    n = raw.replace(_DOT, " ")
    for a, b in (("\u2019", "'"), ("\u2018", "'"), ("\u201c", '"'), ("\u201d", '"'),
                 ("\u00a0", " ")):
        n = n.replace(a, b)
    n = re.sub(r"\s+", " ", n).strip()
    # "(Alexander) Cameron MacLeod" -> "Cameron MacLeod"
    n = _LEAD_PAREN.sub("", n)
    # "A. Nicholson (rugby league)" -> "A. Nicholson"
    n = _TRAIL_PAREN.sub("", n)
    # "'JOCK' TRADD" -> "JOCK TRADD"
    while n and n[0] in _QUOTES:
        n = n[1:].strip()
    while n and n[-1] in _QUOTES:
        n = n[:-1].strip()
    return re.sub(r"\s+", " ", n).strip()


def is_junk_name(n):
    """True only for labels that carry no name at all (empty or punctuation-only).

    Initial-style labels ("A Allen", "C. B. Fry", "J. P. R. Williams") are real,
    often notable, players — Wikidata simply holds no fuller name for them — so they
    are kept. Only genuinely empty labels are dropped.
    """
    return not any(ch.isalpha() for ch in n)


HASH_RE = re.compile(r"^[0-9a-f]{16,}$", re.I)
FILE_RE = re.compile(r"\.(jpe?g|png|gif|svg|tiff?|webp|pdf|webm|ogv|ogg|mp4|djvu)$", re.I)


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


def flag_emoji(cc):
    if not cc or len(cc) != 2 or not cc.isalpha():
        return None
    return "".join(chr(0x1F1E6 + ord(c.upper()) - 65) for c in cc)


def year_of(iso):
    if not iso or len(iso) < 4 or not iso[:4].isdigit():
        return None
    return int(iso[:4])


def iso_date(v):
    if not v:
        return None
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", v)
    return "%s-%s-%s" % m.groups() if m else None


def num_of(v):
    if v is None:
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def do_fetch(force=False):
    os.makedirs(RAW, exist_ok=True)
    print("== fetch ==")
    for step in QUERIES:
        fetch_step(step, force)

    players = set(qid(r[0]) for r in read_step("occupations") if r and r[0])
    print("  players: %d" % len(players))

    teams = set(qid(r[1]) for r in read_step("teams") if len(r) > 1 and r[1])
    print("  teams: %d" % len(teams))
    meta("teammeta", teams, force)

    pos = set(qid(r[1]) for r in read_step("position") if len(r) > 1 and r[1])
    print("  positions: %d" % len(pos))
    meta("posmeta", pos, force)

    ctry = set()
    for step in ("citizenship", "sportcountry"):
        ctry |= set(qid(r[1]) for r in read_step(step) if len(r) > 1 and r[1])
    for r in read_step("teammeta"):
        if len(r) > 4 and r[4]:
            ctry.add(qid(r[4]))
    print("  countries: %d" % len(ctry))
    meta("countrymeta", ctry, force)

    places = set(qid(r[1]) for r in read_step("birthplace") if len(r) > 1 and r[1])
    print("  birthplaces: %d" % len(places))
    meta("placemeta", places, force)


def do_build():
    print("== build ==")
    sports = defaultdict(set)
    for r in read_step("occupations"):
        if len(r) > 1 and r[0] and r[1]:
            s = OCC.get(qid(r[1]))
            if s:
                sports[qid(r[0])].add(s)

    names = defaultdict(dict)
    with open(os.path.join(RAW, "labels.tsv"), encoding="utf-8") as fh:
        for line in fh:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 2 or not parts[0] or not parts[1]:
                continue
            pid = qid(parts[0])
            m = re.search(r'"@([a-z-]+)$', parts[1])
            lang = m.group(1) if m else "en"
            val = parts[1]
            if val.startswith('"'):
                end = val.rfind('"')
                val = val[1:end] if end > 0 else val[1:]
            names[pid][lang] = val

    def name_of(pid):
        d = names.get(pid)
        if not d:
            return pid
        for l in ("en", "nl", "fr", "de", "af", "it", "es"):
            if l in d:
                return d[l]
        return sorted(d.values(), key=len)[0]

    countries = {}
    for r in read_step("countrymeta"):
        if not r or not r[0]:
            continue
        q = qid(r[0])
        rec = countries.setdefault(q, {"q": q, "name": clean_label(r[1]), "iso2": None, "iso3": None})
        if len(r) > 2 and r[2]:
            rec["iso2"] = r[2]
        if len(r) > 3 and r[3]:
            rec["iso3"] = r[3]
    for rec in countries.values():
        rec["emoji"] = flag_emoji(rec["iso2"])

    positions = {}
    for r in read_step("posmeta"):
        if not r or not r[0]:
            continue
        q = qid(r[0])
        lbl = r[1] or q
        canon, group = canon_position(lbl)
        positions.setdefault(q, {"q": q, "name": lbl, "canon": canon, "group": group})

    places = {}
    for r in read_step("placemeta"):
        if not r or not r[0]:
            continue
        q = qid(r[0])
        rec = places.setdefault(q, {"name": clean_label(r[1]), "country": None})
        if len(r) > 2 and r[2]:
            rec["country"] = qid(r[2])

    teams = {}
    for r in read_step("teammeta"):
        if not r or not r[0]:
            continue
        q = qid(r[0])
        rec = teams.setdefault(q, {"q": q, "name": r[1] or q, "types": [], "country": None,
                                   "countryName": None, "logo": None, "national": False})
        if len(r) > 2 and r[2]:
            rec["types"].append(r[3] or "")
        if len(r) > 4 and r[4]:
            rec["country"] = qid(r[4])
            rec["countryName"] = clean_label(r[5])
        if len(r) > 6 and r[6]:
            rec["logo"] = r[6]
    for rec in teams.values():
        blob = (" ".join(rec["types"]) + " " + rec["name"]).lower()
        nm = rec["name"]
        m = re.match(r"^(.*?) national rugby (union|league|sevens) team$", nm)
        if m:
            base, sport = m.group(1), m.group(2)
            rec["national"] = True
            rec["sport"] = sport
            rec["name"] = "%s (%s)" % (base, sport)
        else:
            rec["national"] = "national rugby" in blob
            rec["sport"] = None
            for suffix in (" national rugby team", " national team"):
                if nm.endswith(suffix):
                    nm = nm[: -len(suffix)]
            rec["name"] = nm

    by = defaultdict(lambda: defaultdict(list))
    for step in ("dob", "height", "mass", "image", "citizenship", "sportcountry",
                 "birthplace", "position", "gender", "jersey", "teams", "article"):
        for r in read_step(step):
            if r and r[0]:
                by[step][qid(r[0])].append(r[1:])

    players = []
    pos_count = defaultdict(int)
    ctry_count = defaultdict(int)
    team_count = defaultdict(int)
    unmatched_pos = set()
    junk_names = 0

    for pid, sp in sports.items():
        nm = clean_name(name_of(pid))
        if is_junk_name(nm):
            junk_names += 1
            continue
        rec = {"id": pid, "n": nm}
        s = sorted(sp, key=lambda x: ("union", "league", "sevens").index(x))
        rec["s"] = s[0]
        if len(s) > 1:
            rec["sa"] = s

        d = by["dob"].get(pid)
        if d:
            rec["d"] = iso_date(d[0][0])
        g = by["gender"].get(pid)
        if g:
            rec["g"] = {"Q6581097": "m", "Q6581072": "f"}.get(qid(g[0][0]))

        ctz = [qid(x[0]) for x in by["citizenship"].get(pid, []) if x[0]]
        cfs = [qid(x[0]) for x in by["sportcountry"].get(pid, []) if x[0]]
        primary = None
        for cand in (cfs + ctz):
            if countries.get(cand, {}).get("iso2"):
                primary = cand
                break
        if not primary and (cfs or ctz):
            primary = (cfs + ctz)[0]
        if primary:
            rec["c"] = clean_iso(countries.get(primary, {}).get("iso2"))
            rec["cq"] = primary
            rec["cn"] = clean_label(countries.get(primary, {}).get("name"))
        extra = [countries[x]["iso2"] for x in ctz[1:] if countries.get(x, {}).get("iso2")]
        if extra:
            rec["c2"] = extra

        h = by["height"].get(pid)
        if h:
            v = num_of(h[0][0])
            if v:
                # Wikidata stores height in metres (1.85) and in centimetres (185).
                # No rugby player is 1.85 cm or 185 m, so the ranges never overlap.
                if 1.2 < v < 2.6:
                    v = v * 100
                if 120 < v < 260:
                    rec["h"] = round(v)
        w = by["mass"].get(pid)
        if w:
            v = num_of(w[0][0])
            if v:
                # A few items record mass in pounds; nothing human weighs 200+ kg.
                if 200 < v < 400:
                    v = v * 0.45359237
                if 50 < v < 200:
                    rec["w"] = round(v)

        img = by["image"].get(pid)
        if img:
            u = img[0][0].replace("http://", "https://", 1)
            rec["img"] = u + ("&" if "?" in u else "?") + "width=420"

        bp = by["birthplace"].get(pid)
        if bp:
            rec["bp"] = places.get(qid(bp[0][0]), {}).get("name")

        pos = []
        groups = []
        for x in by["position"].get(pid, []):
            if not x[0]:
                continue
            p = positions.get(qid(x[0]))
            if not p or not p["canon"]:
                continue
            if p["canon"] not in pos:
                pos.append(p["canon"])
            groups.append(p["group"])
        if pos:
            rec["p"] = pos[:4]
            if groups:
                rec["pg"] = groups[0]
        for p in rec.get("p", []):
            pos_count[p] += 1

        num = by["jersey"].get(pid)
        if num and num[0][0]:
            v = num_of(num[0][0])
            if v and 0 < v < 100:
                rec["num"] = int(v)

        art = by["article"].get(pid)
        if art and art[0][0]:
            rec["wiki"] = art[0][0]

        career = []
        for x in by["teams"].get(pid, []):
            if not x[0]:
                continue
            tq = qid(x[0])
            if tq not in teams:
                continue
            start = year_of(x[1]) if len(x) > 1 and x[1] else None
            end = year_of(x[2]) if len(x) > 2 and x[2] else None
            career.append((tq, start, end))
        seen = set()
        career = [c for c in career if not (c in seen or seen.add(c))]
        career.sort(key=lambda c: (c[1] or 9999, c[2] or 9999))
        if career:
            rec["t"] = [[c[0], c[1], c[2]] for c in career]
            open_teams = [c for c in career if c[2] is None]
            cur = max(open_teams, key=lambda c: (c[1] or 0)) if open_teams else career[-1]
            rec["cur"] = cur[0]
            # An open stint (no end date) is the best available proxy for "still playing".
            if open_teams:
                rec["open"] = True
            nats = [c for c in career if teams[c[0]]["national"]]
            if nats:
                rec["nat"] = max(nats, key=lambda c: (c[2] or 9999, c[1] or 0))[0]
            for c in career:
                team_count[c[0]] += 1

        if rec.get("c"):
            ctry_count[rec["c"]] += 1
        players.append(rec)

    players.sort(key=lambda r: r["n"])
    used_teams = sorted([teams[q] for q in teams if team_count.get(q)],
                        key=lambda t: -team_count[t["q"]])
    used_countries = sorted([c for c in countries.values() if ctry_count.get(c["iso2"])],
                            key=lambda c: -ctry_count[c["iso2"]])
    used_positions = sorted([{"n": k, "g": POS_CANON.get(k), "c": v} for k, v in pos_count.items()],
                            key=lambda p: -p["c"])

    stats = {
        "players": len(players),
        "withTeam": sum(1 for p in players if p.get("t")),
        "withPosition": sum(1 for p in players if p.get("p")),
        "withPhoto": sum(1 for p in players if p.get("img")),
        "withCountry": sum(1 for p in players if p.get("c")),
        "union": sum(1 for p in players if p.get("s") == "union"),
        "league": sum(1 for p in players if p.get("s") == "league"),
        "sevens": sum(1 for p in players if p.get("s") == "sevens"),
        "teams": len(used_teams),
        "countries": len(used_countries),
        "positions": len(used_positions),
        "women": sum(1 for p in players if p.get("g") == "f"),
        "withDob": sum(1 for p in players if p.get("d")),
        "withHeight": sum(1 for p in players if p.get("h")),
        "withMass": sum(1 for p in players if p.get("w")),
        "withWiki": sum(1 for p in players if p.get("wiki")),
        "active": sum(1 for p in players if p.get("open")),
        "source": "Wikidata (CC0) via QLever mirror qlever.dev/api/wikidata",
        "droppedNames": junk_names,
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    catalogue = {
        "stats": stats,
        "countries": [{"q": c["q"], "n": c["name"], "i": c["iso2"], "e": c["emoji"],
                       "c": ctry_count[c["iso2"]]} for c in used_countries],
        "positions": [{"n": p["n"], "g": p["g"], "c": p["c"]} for p in used_positions],
        "teams": [{"q": t["q"], "n": t["name"], "c": t["country"], "cn": t["countryName"],
                   "nat": t["national"], "sp": t.get("sport"), "c0": team_count[t["q"]]}
                  for t in used_teams],
        "players": players,
    }
    os.makedirs(DATA, exist_ok=True)
    with gzip.open(os.path.join(DATA, "catalogue.json.gz"), "wt", encoding="utf-8",
                   compresslevel=9) as fh:
        json.dump(catalogue, fh, separators=(",", ":"), ensure_ascii=False)
    with open(os.path.join(DATA, "stats.json"), "w", encoding="utf-8") as fh:
        json.dump(stats, fh, indent=1)
    print(json.dumps(stats, indent=1))
    print("catalogue size: %.1f MB" % (os.path.getsize(os.path.join(DATA, "catalogue.json.gz")) / 1e6))
    if unmatched_pos:
        print("UNMATCHED POSITIONS:", sorted(unmatched_pos))


def main():
    args = sys.argv[1:] or ["all"]
    if args[0] == "build":
        do_build()
    elif args[0] == "fetch":
        fetch_step(args[1], force="--force" in args)
    else:
        do_fetch(force="--force" in args)
        do_build()


if __name__ == "__main__":
    main()

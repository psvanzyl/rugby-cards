#!/usr/bin/env python3
"""Verify the catalogue has no label junk left and report the key figures."""
import gzip
import json
import re

ROOT = "/root/projects/rugby-cards"
c = json.load(gzip.open(ROOT + "/data/catalogue.json.gz", "rt", encoding="utf-8"))
ps = c["players"]
stats = json.load(open(ROOT + "/data/stats.json", encoding="utf-8"))
h = re.compile(r"^[0-9A-Fa-f]{16,}$")
f = re.compile(r"\.(jpe?g|png|svg|pdf)$", re.I)

print("players:", len(ps))
print("hash-like cn:", len([p for p in ps if h.match(str(p.get("cn") or ""))]))
print("hash-like bp:", len([p for p in ps if h.match(str(p.get("bp") or ""))]))
print("filename-like cn:", len([p for p in ps if f.search(str(p.get("cn") or ""))]))
print("stats.countries:", stats["countries"], "| stats.withCountry:", stats["withCountry"], "| stats.players:", stats["players"])
named = [p for p in ps if p.get("cn")]
named.sort(key=lambda p: (p["cn"].lower(), p["n"]))
print("first three by country:", [(p["cn"], p["n"]) for p in named[:3]])
print("last three by country:", [(p["cn"], p["n"]) for p in named[-3:]])

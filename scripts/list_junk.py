import re
from pathlib import Path

path = Path("/root/projects/rugby-cards/data/raw/labels.tsv")
JUNK = re.compile(r"^[\(\['\"\u201c\u2018]|^\(.*\)$|^[A-Z]\.?$|^[A-Z]\.?-[A-Z]\.?$|^[A-Z]{1,2}\.$")

names = []
for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
    parts = line.rstrip("\n").split("\t")
    if len(parts) >= 2 and parts[1].strip():
        names.append(parts[-1].strip())

junk = [n for n in names if JUNK.match(n) or JUNK.match(n.split()[0] if n.split() else "")]
print("rows:", len(names), "junk-matching:", len(junk))
for n in junk:
    print(" ", n)

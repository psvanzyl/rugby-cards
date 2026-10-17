import gzip
import json

d = json.load(gzip.open("/root/projects/rugby-cards/data/catalogue.json.gz", "rt", encoding="utf-8"))
ps = d["players"]
print("players:", len(ps), "| dropped:", (d.get("meta") or {}).get("droppedNames"))
byid = {p["id"]: p for p in ps}
for qid in ("Q190572", "Q1106175", "Q3520591"):
    print(" ", qid, "->", (byid.get(qid) or {}).get("n"))
names = sorted((p["n"] for p in ps), key=lambda s: s.lower())
print("head:", names[:14])
print("paren left:", sum(1 for n in names if "(" in n),
      "| leading-quote left:", sum(1 for n in names if n[:1] in "'\u201c\u2018"))
print("has Fry:", any("Fry" in n for n in names),
      "| has Hornby:", any("Hornby" in n for n in names),
      "| has J. P. R. Williams:", any("Williams" in n and n.startswith("J. P. R") for n in names))
stats = json.load(open("/root/projects/rugby-cards/data/stats.json"))
print("stats players:", stats.get("players"), "| droppedNames:", stats.get("droppedNames"))

import gzip, json, re
from collections import Counter

c = json.load(gzip.open("data/catalogue.json.gz", "rt", encoding="utf-8"))
ps = c["players"]


def bad(n):
    t = n.split()
    if not t:
        return "empty"
    if re.match(r"^[\(\['\"\u201c]", n):
        return "punct-start"
    if re.match(r"^\(.*\)$", t[0]):
        return "paren-token"
    if re.match(r"^[A-Z]\.?$|^[A-Z]\.?-[A-Z]\.?$|^[A-Z]{1,2}\.$", t[0]):
        return "initial-token"
    if n == n.upper() and len(n) > 3:
        return "all-caps"
    if len(t) == 1 and len(n) <= 3:
        return "short-single"
    return None


cnt = Counter()
ex = {}
for p in ps:
    k = bad(p["n"])
    if k:
        cnt[k] += 1
        ex.setdefault(k, []).append(p["n"])

print("total", len(ps))
for k, v in cnt.most_common():
    print(f"{k:15} {v:6}   e.g. {ex[k][:6]}")

single = [p["n"] for p in ps if len(p["n"].split()) == 1]
print("single-token names:", len(single), "sample:", single[:12])
caps = [p["n"] for p in ps if p["n"] == p["n"].upper() and len(p["n"]) > 3]
print("all-caps:", len(caps), "sample:", caps[:8])
print("bad AND has photo:", sum(1 for p in ps if p.get("img") and bad(p["n"])))
print("bad AND has position:", sum(1 for p in ps if p.get("p") and bad(p["n"])))
print("jersey numbers:", sum(1 for p in ps if p.get("num")))
print("countries sample:", [(x["n"], x["c"]) for x in c["countries"][:8]])
print("teams sample:", [(t["n"], t["cn"], t["nat"]) for t in c["teams"][:8]])
print("women sample:", [p["n"] for p in ps if p.get("g") == "f"][:8])

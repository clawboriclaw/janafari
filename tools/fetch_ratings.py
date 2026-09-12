#!/usr/bin/env python3
"""Snapshot EA's official Madden ratings feed into data/ratings.json.

The page reads this file, never EA directly: the feed sends no browser CORS header, and a
committed snapshot means the iPad gets one cached file instead of 24 API calls. Run daily by
.github/workflows/refresh-ratings.yml (EA posts roster updates weekly in season) or by hand:

    python3 tools/fetch_ratings.py            # writes data/ratings.json, exit 0 when changed
    python3 tools/fetch_ratings.py --check    # print the live iteration and count, write nothing

Exit codes (the workflow keys off them, so they must stay distinct — review finding 2026-09-12):
    0  changed, files written        3  unchanged, nothing written
    2  the fetch or a sanity check failed (any exception lands here too, never on 1)

The feed serves LAST season unless the request carries EA's own feature header; the values below
are exactly what ea.com/games/madden-nfl/ratings sends (captured 2026-09-06)."""
import json, os, sys, time, urllib.request, urllib.parse

API = "https://drop-api.ea.com/rating/madden-nfl"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36",
    "x-feature": "950490070179643400",
    "drop-referrer": "https://www.ea.com/games/madden-nfl/ratings",
    "referer": "https://www.ea.com/",
}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "ratings.json")
HISTORY = os.path.join(os.path.dirname(OUT), "history.json")   # every iteration's {id: ovr}, so a missed week is never lost
SEASON_MARK = "madden-nfl-27"   # the feed has no season field; EA's portrait URLs carry the game name
LIMIT = 100

TEAM_ABBR = {
    "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL", "Buffalo Bills": "BUF",
    "Carolina Panthers": "CAR", "Chicago Bears": "CHI", "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE",
    "Dallas Cowboys": "DAL", "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
    "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX", "Kansas City Chiefs": "KC",
    "Los Angeles Chargers": "LAC", "Los Angeles Rams": "LAR", "Las Vegas Raiders": "LV", "Miami Dolphins": "MIA",
    "Minnesota Vikings": "MIN", "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG",
    "New York Jets": "NYJ", "NY Giants": "NYG", "NY Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT", "Seattle Seahawks": "SEA",
    "San Francisco 49ers": "SF", "Tampa Bay Buccaneers": "TB", "Tennessee Titans": "TEN", "Washington Commanders": "WSH",
}


def get(params):
    url = API + "?" + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as exc:                      # transient 5xx / network: back off, then give up loudly
            if attempt == 3:
                raise
            time.sleep(3 * (attempt + 1))


def compact(p):
    team = p.get("team") or {}
    pos = p.get("position") or {}
    ptype = ((pos.get("positionType") or {}).get("id") or "").lower()
    side = "offense" if ptype == "offense" else ("defense" if ptype == "defense" else "special")
    stats, diffs = {}, {}
    for key, val in (p.get("stats") or {}).items():
        if key == "overall" or not isinstance(val, dict):
            continue
        if isinstance(val.get("value"), (int, float)):
            stats[key] = int(val["value"])
        if val.get("diff"):
            diffs[key] = int(val["diff"])
    full = team.get("label") or ""
    return {
        "id": p["id"],
        "name": ((p.get("firstName") or "") + " " + (p.get("lastName") or "")).strip(),
        "team": TEAM_ABBR.get(full, (full[:3] or "FA").upper()),
        "teamName": full.split(" ")[-1] if full else "Free agent",
        "teamFull": full or "Free agent",
        "pos": pos.get("shortLabel") or pos.get("id") or "ATH",
        "posName": pos.get("label") or "",
        "side": side,
        "ovr": int(p.get("overallRating") or 0),
        "age": p.get("age"), "college": p.get("college"), "jersey": p.get("jerseyNum"),
        "yearsPro": p.get("yearsPro"), "height": p.get("height"), "weight": p.get("weight"),
        "avatar": p.get("avatarUrl"),
        "abilities": [{"label": a.get("label"), "type": ((a.get("type") or {}).get("label") or "")}
                      for a in (p.get("playerAbilities") or []) if a.get("label")],
        "stats": stats,
        "diffs": diffs,
    }


def main(argv):
    first = get({"locale": "en", "limit": 1, "offset": 0})
    it0 = first["items"][0]
    iteration = it0.get("iteration") or {"id": "1-base", "label": "Launch Ratings"}
    iterations = [{"id": x.get("id"), "label": x.get("label")} for x in (it0.get("availableIterations") or [])]
    total = int(first.get("totalItems") or 0)
    if "--check" in argv:
        print("iteration=%s (%s) players=%d" % (iteration.get("id"), iteration.get("label"), total))
        return 0
    players, offset = [], 0
    while offset < total:
        page = get({"locale": "en", "limit": LIMIT, "offset": offset, "iteration": iteration.get("id", "1-base")})
        items = page.get("items") or []
        if not items:
            break
        players.extend(compact(p) for p in items)
        offset += len(items)
    seen, unique = set(), []
    for p in players:
        if p["id"] in seen:
            continue
        seen.add(p["id"]); unique.append(p)
    unique.sort(key=lambda p: (-p["ovr"], p["name"]))
    if len(unique) < total * 0.95:
        print("refusing to write: fetched %d of %d players" % (len(unique), total), file=sys.stderr)
        return 2
    # The feed serves LAST season when EA's feature header stops working. There is no season field,
    # so the portrait URLs (…/madden-nfl-27/portraits/…) are the fingerprint: refuse a wrong-season file.
    marked = sum(1 for p in unique if SEASON_MARK in (p.get("avatar") or ""))
    with_avatar = sum(1 for p in unique if p.get("avatar"))
    if with_avatar and marked < with_avatar * 0.9:
        print("refusing to write: only %d of %d portraits are %s — the feed is serving another season" % (marked, with_avatar, SEASON_MARK), file=sys.stderr)
        return 2
    doc = {
        "game": "Madden NFL 27",
        "source": "https://www.ea.com/games/madden-nfl/ratings",
        "iteration": iteration,
        "iterations": iterations,
        "fetched": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "count": len(unique),
        "players": unique,
    }
    old = None
    try:
        with open(OUT) as fh:
            old = json.load(fh)
    except Exception:
        pass
    # data/history.json: one {id: ovr} map per iteration, replaced in place when EA edits an iteration
    # under the same id. The page seeds its week-over-week trends from this, so a device that did not
    # open the page during a week still gets that week. Written even when ratings.json is unchanged.
    history = []
    try:
        with open(HISTORY) as fh:
            history = json.load(fh)
    except Exception:
        history = []
    entry = {"id": iteration.get("id"), "label": iteration.get("label"), "date": doc["fetched"][:10],
             "ratings": {str(p["id"]): p["ovr"] for p in unique}}
    prior = [h for h in history if h.get("id") == entry["id"]]
    history_changed = not prior or prior[0].get("ratings") != entry["ratings"] or prior[0].get("label") != entry["label"]
    if history_changed:
        history = [h for h in history if h.get("id") != entry["id"]] + [entry]
        with open(HISTORY, "w") as fh:
            json.dump(history, fh, separators=(",", ":"))
    core_keys_cmp = ("id", "name", "team", "pos", "ovr", "age", "college", "jersey", "yearsPro", "avatar", "abilities")
    if old and old.get("iteration") == iteration and \
            [{k: p.get(k) for k in core_keys_cmp} for p in old.get("players", [])] == [{k: p.get(k) for k in core_keys_cmp} for p in unique]:
        if history_changed:
            print("ratings unchanged; wrote %s for %s" % (os.path.relpath(HISTORY), iteration.get("label")))
            return 0
        print("unchanged: %s, %d players" % (iteration.get("label"), len(unique)))
        return 3                                     # nothing to commit (3, not 1: 1 is Python's crash code)
    # Two tiers, so the board loads one small file and the attribute sheets come per team on demand:
    #   data/ratings.json        core fields for every player (~600 KB raw, ~120 KB over the wire)
    #   data/stats/<TEAM>.json   id -> {stats, diffs} for that team, fetched when a card is opened
    core_keys = ("id", "name", "team", "teamName", "teamFull", "pos", "posName", "side", "ovr", "age",
                 "college", "jersey", "yearsPro", "height", "weight", "avatar", "abilities")
    stats_dir = os.path.join(os.path.dirname(OUT), "stats")
    os.makedirs(stats_dir, exist_ok=True)
    by_team = {}
    for p in unique:
        by_team.setdefault(p["team"], {})[str(p["id"])] = {"stats": p["stats"], "diffs": p["diffs"]}
    for team, sheet in by_team.items():
        with open(os.path.join(stats_dir, team + ".json"), "w") as fh:
            json.dump(sheet, fh, separators=(",", ":"))
    doc["players"] = [{k: p[k] for k in core_keys} for p in unique]
    with open(OUT, "w") as fh:
        json.dump(doc, fh, separators=(",", ":"), ensure_ascii=False)
    print("wrote %s: %s, %d players; %d team stat sheets" % (os.path.relpath(OUT), iteration.get("label"), len(unique), len(by_team)))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except SystemExit:
        raise
    except Exception as exc:                          # a crash must look like a failure (2), never like "unchanged"
        print("fetch failed: %s: %s" % (type(exc).__name__, exc), file=sys.stderr)
        sys.exit(2)

#!/usr/bin/env python3
"""What happens to a player the feed stops carrying. Offline, no network, no browser.

EA rates only players who are on a roster, so the week the season starts it simply stops sending
1,215 of them. fetch_ratings.free_agent_pool is what keeps those players in existence; these checks
pin down the three things it has to get right — carry, remember, and let go again when he signs.

    python3 tools/test_free_agent_pool.py        # exit 0 = every check passed
"""
import os, sys, json, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_ratings as F

fails = []


def ck(name, cond, extra=""):
    print(("  ok   " if cond else "  FAIL ") + name + (("  " + str(extra)) if not cond and extra else ""))
    if not cond:
        fails.append(name)


def player(pid, name, ovr, team="FA", full="Free agent"):
    return {"id": pid, "name": name, "ovr": ovr, "team": team, "teamName": full.split(" ")[-1], "teamFull": full}


LAST_WEEK = {
    "iteration": {"id": "1-base", "label": "Launch Ratings"},
    "players": [player(1, "Bobby Wagner", 89), player(2, "Tyreek Hill", 88),
                player(3, "Cut Lineman", 62, "WSH", "Washington Commanders"),
                player(4, "Still Playing", 95, "CIN", "Cincinnati Bengals")],
}
THIS_WEEK = [player(4, "Still Playing", 96, "CIN", "Cincinnati Bengals")]

tmp = tempfile.mkdtemp()
F.FREE = os.path.join(tmp, "free-agents.json")

print("a feed that has dropped three players")
pool = F.free_agent_pool(LAST_WEEK, THIS_WEEK)
by_id = {p["id"]: p for p in pool}
ck("all three are kept", sorted(by_id) == [1, 2, 3], sorted(by_id))
ck("nobody on a roster is in here", 4 not in by_id)
ck("sorted by rating", [p["name"] for p in pool] == ["Bobby Wagner", "Tyreek Hill", "Cut Lineman"], [p["name"] for p in pool])
ck("they keep their last rating", by_id[1]["ovr"] == 89)
ck("the week is recorded", by_id[1]["lastSeen"]["label"] == "Launch Ratings", by_id[1].get("lastSeen"))
ck("everyone reads as a free agent now", all(p["team"] == "FA" and p["teamFull"] == "Free agent" for p in pool))
ck("a cut player remembers his club", by_id[3]["lastTeamFull"] == "Washington Commanders", by_id[3].get("lastTeamFull"))
ck("a free agent has no old club to remember", "lastTeam" not in by_id[1])

print("the file is written, then the same week is fetched again")
with open(F.FREE, "w") as fh:
    json.dump({"players": pool}, fh)
again = F.free_agent_pool(LAST_WEEK, THIS_WEEK)
ck("nothing changes", again == pool)

print("one of them signs")
signed = THIS_WEEK + [player(2, "Tyreek Hill", 88, "MIA", "Miami Dolphins")]
pool2 = F.free_agent_pool(dict(LAST_WEEK, players=THIS_WEEK), signed)
ck("he leaves the pool", 2 not in [p["id"] for p in pool2], [p["id"] for p in pool2])
ck("the others stay", sorted(p["id"] for p in pool2) == [1, 3], sorted(p["id"] for p in pool2))

print("a second player is dropped a week later")
week2 = {"iteration": {"id": "week-2", "label": "Week 2 Ratings"}, "players": signed}
pool3 = F.free_agent_pool(week2, [player(2, "Tyreek Hill", 88, "MIA", "Miami Dolphins")])
by_id3 = {p["id"]: p for p in pool3}
ck("the new one carries the new week", by_id3[4]["lastSeen"]["label"] == "Week 2 Ratings", by_id3[4].get("lastSeen"))
ck("the old ones keep the week they were dropped", by_id3[1]["lastSeen"]["label"] == "Launch Ratings", by_id3[1].get("lastSeen"))

print("an empty or missing file is not a crash")
os.remove(F.FREE)
ck("no previous file", [p["id"] for p in F.free_agent_pool(LAST_WEEK, THIS_WEEK)] == [1, 2, 3])
ck("no previous feed", F.free_agent_pool(None, THIS_WEEK) == [])

print(("\nFAILED: " + ", ".join(fails)) if fails else "\nall checks passed")
sys.exit(1 if fails else 0)

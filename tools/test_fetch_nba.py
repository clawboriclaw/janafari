#!/usr/bin/env python3
"""Offline regression tests for fetch_nba_ratings.py — run before every fetch (the workflow does), no network.

    python3 tools/test_fetch_nba.py

Fixtures are real 2kratings.com pages saved gzipped in tools/fixtures/. They exist because of a real failure:
on 2026-09-20 the Sunday full run died on Tyler Nickel's page (9 numeric attributes, the rest "--") — an
over-strict "fewer than 20 attributes = broken layout" guard aborted the whole run and paged the owner.
These tests pin what a THIN page, a FULL page and a TEAM page must parse to, and what a truly BROKEN page
looks like, so a guard can never again mistake one for the other. Add a fixture whenever the site shows a
new shape that the parser had to learn."""
import gzip, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_nba_ratings as F   # noqa: E402

FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
failures = []


def check(cond, msg):
    if not cond:
        failures.append(msg)
        print("  FAIL", msg)
    else:
        print("  ok  ", msg)


def fixture(name):
    with gzip.open(os.path.join(FIX, name), "rt", encoding="utf-8") as fh:
        return fh.read()


def season_ok(html):
    title = re.search(r"<title>(.*?)</title>", html, re.S)
    return bool(title and F.SEASON_MARK in title.group(1))


print("thin player page (Tyler Nickel): a real player with a thin sheet is NOT broken")
thin = fixture("player-thin-tyler-nickel.html.gz")
d = F.parse_player_page(thin)
check(d["ovr"] == 68, "overall parsed (68)")
check(5 <= len(d["stats"]) < 20, "only the numeric attributes are kept (%d), the '--' ones dropped" % len(d["stats"]))
check(len(d["labels"]) == 14, "season chart labels parsed (14)")
check(d["badges"] == [], "zero badges is allowed")
check(not F.page_is_broken(d), "page_is_broken() accepts the thin sheet  ← the 2026-09-20 failure")
check(season_ok(thin), "season check reads the <title>")

print("full player page (Tyrese Haliburton)")
full = fixture("player-full-tyrese-haliburton.html.gz")
d = F.parse_player_page(full)
check(d["ovr"] == 90, "overall parsed (90)")
check(len(d["stats"]) == 35, "35 attributes (%d)" % len(d["stats"]))
check(set(d["groups"]) == {"Outside Scoring", "Athleticism", "Inside Scoring", "Playmaking", "Defense", "Rebounding"}, "six attribute groups")
check(d["stats"].get("passAccuracy") == 97 and d["stats"].get("threePointShot") == 87, "known values (pass accuracy 97, three 87)")
check(len(d["badges"]) == 22 and len(set(b["label"] for b in d["badges"])) == 22, "22 badges, deduplicated across the tabs (%d)" % len(d["badges"]))
check(d["badges"][0]["tier"] == "hof" and d["badges"][0]["label"] == "Bail Out", "badges sorted best tier first (Bail Out, HOF)")
check(all(b["description"] for b in d["badges"]), "every badge has 2K's description")
check(d["labels"][0] == "NBA 2K27 Launch Rating" and d["series"][0] == 90, "season series starts at the launch rating")
check(d["jersey"] == "0" and d["weight"] == 185 and d["wingspan"] == 80 and d["height"] == 77, "header: jersey 0, 185 lb, 6'8\" wingspan, 6'5\"")
check(d["college"] == "Iowa State" and d["nationality"] == "United States" and d["yearsPro"] == 6, "header: Iowa State, United States, 6 years")
check(F.age_from(d["birthdate"], __import__("time").strptime("2026-09-19", "%Y-%m-%d")) == 26, "age from birthdate (26 on 2026-09-19)")
check(not F.page_is_broken(d), "page_is_broken() accepts a full page")

print("broken page: the season chart gone means the layout changed")
noshart = re.sub(r'getElementById\("chartjs-dashboard-line-player"\)', 'getElementById("gone")', full)
d = F.parse_player_page(noshart)
check(not d["labels"] and F.page_is_broken(d), "no chart → broken")
d = F.parse_player_page(full.replace("attribute-box-player", "attribute-box-nope"))
check(d["ovr"] is None and F.page_is_broken(d), "no overall → broken")
check(not season_ok(full.replace("NBA 2K27", "NBA 2K26")), "a page for another season is refused")

print("team page (Indiana Pacers)")
team = fixture("team-indiana-pacers.html.gz")
rows = F.parse_team_page(team, ("indiana-pacers", "IND", "Pacers", "Indiana Pacers", 11))
check(len(rows) >= 8, "%d roster rows" % len(rows))
top = rows[0]
check(top["id"] == "tyrese-haliburton" and top["name"] == "Tyrese Haliburton" and top["ovr"] == 90, "first row: Haliburton 90")
check(top["positions"] == ["PG", "SG"] and top["threePt"] == 87 and top["dunk"] == 65 and top["badgeCount"] == 22, "positions, 3PT, DNK, badge count")
check(top["height"] == 77 and top["archetype"] == "Crafty Offensive Engine", "height and archetype from the row")
check(all(r["team"] == "IND" and isinstance(r["ovr"], int) for r in rows), "every row carries the team and an integer overall")
check(season_ok(team), "team page season check")

print("helpers")
check(F.camel("Three-Point Shot") == "threePointShot" and F.camel("Help Defense IQ") == "helpDefenseIQ", "attribute keys")
check(F.slugify("Nikola Jokić") == "nikola-jokic" and F.norm_name("Jimmy Butler III") == "jimmy-butler", "slug and name normalisation")
check(F.inches("6'5\" (196cm)") == 77 and F.inches("nope") is None, "height parsing")

if failures:
    print("\n%d check(s) FAILED" % len(failures))
    sys.exit(1)
print("\nall checks passed")

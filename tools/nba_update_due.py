#!/usr/bin/env python3
"""Is a 2K ratings update due? Reads only the committed data — no request to 2K Ratings.

2K Ratings publishes its season calendar on every player's chart (data/nba/movement.json "labels"):
"NBA 2K27 Launch Rating", "Nov. 5, 2026", "Nov. 19, 2026", ... — every other Thursday, then a few
undated ones ("NBA All-Star Weekend", "NBA Playoffs Rd 1"). The owner (2026-10-26): only call the site
on the day it actually refreshes. So the scheduled run goes through when the next label after the
current iteration is dated today or earlier (and keeps trying daily until it lands, then stops until
the next date; a week overdue it falls back to Thursdays); an undated next label is checked on
Thursdays only. After the last label (the Finals) it skips until next season's game is fetched by hand.
Prints "due: <why>" or "skip: <why>".

    python3 tools/nba_update_due.py [--today YYYY-MM-DD]
"""
import datetime, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def parse_date(label):
    m = re.match(r"^([A-Z][a-z]{2})[a-z]*\.? (\d{1,2}), (\d{4})$", label.strip())
    if not m:
        return None
    try:
        return datetime.datetime.strptime("%s %s %s" % m.groups(), "%b %d %Y").date()
    except ValueError:
        return None


def decide(labels, current, today):
    if current not in labels:
        # The calendar and our snapshot disagree; a weekly Thursday look is the safe fallback.
        return (today.weekday() == 3, "current iteration %r not on the calendar; Thursday check" % current)
    nxt = labels[labels.index(current) + 1:]
    if not nxt:
        return (False, "no update left on the calendar after %r" % current)
    when = parse_date(nxt[0])
    if when is None:
        return (today.weekday() == 3, "next update %r has no date; Thursday check" % nxt[0])
    if today > when + datetime.timedelta(days=7):
        # A week late: stop calling daily and look on Thursdays (2K's update day) until it shows up.
        return (today.weekday() == 3, "next update %r was due %s and has not landed; Thursday check" % (nxt[0], when.isoformat()))
    return (today >= when, "next update %r is %s" % (nxt[0], when.isoformat()))


def main():
    today = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-5))).date()   # US Eastern (standard), close enough for a date
    if "--today" in sys.argv:
        today = datetime.date.fromisoformat(sys.argv[sys.argv.index("--today") + 1])
    labels = json.load(open(os.path.join(ROOT, "data/nba/movement.json"))).get("labels") or []
    current = json.load(open(os.path.join(ROOT, "data/nba/ratings.json")))["iteration"]["label"]
    due, why = decide(labels, current, today)
    print(("due: " if due else "skip: ") + why)


if __name__ == "__main__":
    main()

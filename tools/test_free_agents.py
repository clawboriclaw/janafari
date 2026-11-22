#!/usr/bin/env python3
"""What the page does with a player nobody has on a roster.

Neither source rates a free agent: EA dropped 1,215 of its 1,240 the week the season started, and 2K
keeps its unsigned players on a page of their own. The page used to react by deleting them — off the
board, and silently off a child's list of favourite players. These checks pin down what it does now.

It runs the page against SYNTHETIC data written to a temp folder (made-up players, two ratings
weeks), never the committed data/: a real player signing with a team must not fail the daily
refresh. Every request off 127.0.0.1 is aborted, so it is offline for real.

Needs Playwright's chromium:

    python3 tools/test_free_agents.py            # exit 0 = every check passed
    python3 tools/test_free_agents.py --port 9000

Without Playwright it skips with exit 0 locally, and FAILS in CI (GITHUB_ACTIONS / CI set), where a
skip would read as a pass."""
import json, os, re, sys, shutil, tempfile, threading, functools, http.server, socketserver

REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
PORT = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 0   # 0 = any free port

# --- the synthetic league -------------------------------------------------------------------
NFL_TEAMS = [("CIN", "Bengals", "Cincinnati Bengals"), ("SEA", "Seahawks", "Seattle Seahawks"),
             ("KC", "Chiefs", "Kansas City Chiefs"), ("PHI", "Eagles", "Philadelphia Eagles")]
NBA_TEAMS = [("LAL", "Lakers", "Los Angeles Lakers"), ("BOS", "Celtics", "Boston Celtics"),
             ("DEN", "Nuggets", "Denver Nuggets"), ("OKC", "Thunder", "Oklahoma City Thunder")]
PER_TEAM, N_FREE = 30, 30          # 120 rostered (> validFeed's 100) and more free agents than one page (24)
WAGNER, CHASE = 900, 1             # a watched free agent EA no longer rates, and a watched rostered player
FA_NAME, LIVE_NAME, FIND_NAME = "Freddie Agent", "Rory Rostered", "Quincy Findable"
NBA_FA_NAME = "Nolan Unsigned"
NFL_STATS = {"speed": 90, "acceleration": 88, "agility": 84, "strength": 76, "awareness": 80, "catching": 85}
NBA_STATS = {"threePointShot": 74, "midRangeShot": 79, "closeShot": 83, "speed": 76, "strength": 68, "layup": 90}
NFL_WEEKS = [{"id": "wk-1", "label": "Week 1 Ratings", "date": "2026-09-12"}, {"id": "wk-2", "label": "Week 2 Ratings", "date": "2026-09-19"}]
NBA_WEEKS = [{"id": "nba-launch", "label": "Launch Rating", "date": "2026-09-19"}, {"id": "nba-wk-2", "label": "Update 2", "date": "2026-09-26"}]
NOWHERE = "http://nowhere.invalid/p.png"   # aborted by the route below; the page falls back to a monogram


def _player(pid, name, team, ovr, nba):
    t = {"team": team[0], "teamName": team[1], "teamFull": team[2]}
    if nba:
        return dict(t, id=pid, name=name, pos="PG", posName="Point Guard", positions=["PG"], side="guard", ovr=ovr,
                    archetype="Test Archetype", age=25, college="Nowhere", jersey="7", yearsPro=3, height=78,
                    weight=200, avatar=NOWHERE, abilities=[])
    return dict(t, id=pid, name=name, pos="WR", posName="Wide Receiver", side="offense", ovr=ovr, age=25,
                college="Nowhere", jersey=1, yearsPro=3, height=72, weight=200, avatar=NOWHERE, abilities=[])


def _league(nba):
    teams, weeks, stats = (NBA_TEAMS, NBA_WEEKS, NBA_STATS) if nba else (NFL_TEAMS, NFL_WEEKS, NFL_STATS)
    key = (lambda n: "nba-p-%d" % n) if nba else (lambda n: n)
    roster, n = [], 1
    for team in teams:
        for _ in range(PER_TEAM):
            name = LIVE_NAME if n == 1 else ("Player %d" % n)
            roster.append(_player(key(n), name, team, 99 - n % 40, nba)); n += 1
    fa_team = ("FA", "Free agent", "Free agent")
    free = []
    for k in range(N_FREE):
        n = 900 + k
        name = (NBA_FA_NAME if nba else FA_NAME) if k == 0 else (FIND_NAME if k == 1 and not nba else "Free %d" % n)
        p = _player(key(n), name, fa_team, 90 - k, nba)
        p.update(lastTeam=teams[0][0], lastTeamFull=teams[0][2])
        if not nba:   # Madden free agents are frozen at the week EA last rated them; 2K rates its own FA page
            p["lastSeen"] = {"id": weeks[0]["id"], "label": weeks[0]["label"]}
        free.append(p)
    cur = weeks[-1]
    ratings = {"game": "test", "source": "synthetic", "iteration": {"id": cur["id"], "label": cur["label"]},
               "iterations": [{"id": w["id"], "label": w["label"]} for w in weeks],
               "fetched": cur["date"] + "T12:00:00Z", "count": len(roster), "players": roster}
    history = [dict(w, ratings=dict({str(p["id"]): p["ovr"] for p in roster},
                                    **({str(p["id"]): p["ovr"] for p in free} if i == 0 else {})))
               for i, w in enumerate(weeks)]
    fa_doc = {"game": "test", "source": "synthetic", "note": "", "fetched": ratings["fetched"], "count": len(free), "players": free}
    sheets = {}
    for p in roster + free:
        sheets.setdefault(p["team"], {})[str(p["id"])] = {"stats": stats}
    return ratings, fa_doc, history, sheets


def build_site():
    """A throwaway copy of the page with synthetic data in place of data/."""
    root = tempfile.mkdtemp(prefix="janafari-fa-test-")
    for f in ("index.html", "app.js", "styles.css", "game.js", "hoops.js"):
        shutil.copy(os.path.join(REPO, f), root)
    shutil.copytree(os.path.join(REPO, "brand"), os.path.join(root, "brand"))
    for nba, sub in ((False, "data"), (True, os.path.join("data", "nba"))):
        d = os.path.join(root, sub); os.makedirs(os.path.join(d, "stats"), exist_ok=True)
        ratings, fa_doc, history, sheets = _league(nba)
        for name, doc in (("ratings.json", ratings), ("free-agents.json", fa_doc), ("history.json", history)):
            json.dump(doc, open(os.path.join(d, name), "w"))
        for team, sheet in sheets.items():
            json.dump(sheet, open(os.path.join(d, "stats", team + ".json"), "w"))
        json.dump({}, open(os.path.join(d, "badges.json" if nba else "abilities.json"), "w"))
    return root


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(root):
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, "http://127.0.0.1:%d/index.html" % httpd.server_address[1]


def offline(route):
    url = route.request.url
    (route.continue_() if url.startswith("http://127.0.0.1:") or url.startswith("data:") else route.abort())


try:
    from playwright.sync_api import sync_playwright
except ImportError:
    if os.environ.get("GITHUB_ACTIONS") or os.environ.get("CI"):
        print("FAIL: playwright is not installed in CI — the free-agent checks did not run")
        sys.exit(1)
    print("playwright is not installed — skipping the browser checks (local run only)")
    sys.exit(0)

fails = []


def ck(name, cond, extra=""):
    print(("  ok   " if cond else "  FAIL ") + name + (("  " + str(extra)) if not cond and extra else ""))
    if not cond:
        fails.append(name)


SITE = build_site()
httpd, BASE = serve(SITE)
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900})
    ctx.route("**/*", offline)
    pg=ctx.new_page()
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console."+m.type+": "+m.text) if m.type=="error" else None)

    print("A. clean load, NFL")
    pg.goto(BASE, wait_until="networkidle")
    pg.wait_for_function("document.getElementById('loading').hidden", timeout=20000)
    real=[e for e in errs if "Failed to load resource" not in e]   # aborted portrait requests
    ck("no page errors", not real, real[:3])
    ck("board painted", pg.locator(".pcard").count() > 0)
      # settle
    pg.wait_for_timeout(1200)             # the background free-agent prefetch
    pg.click("#teamChip")
    pg.wait_for_selector("#teamModal:not([hidden])")
    cells=pg.eval_on_selector_all("#teamGrid .team-cell","e=>e.map(x=>x.innerText.trim())")
    ck("Free agents tile present", any("Free agent" in c for c in cells), cells[-3:])
    idx=[i for i,c in enumerate(cells) if "Free agent" in c][0]
    pg.locator("#teamGrid .team-cell").nth(idx).click()
    pg.wait_for_function("document.getElementById('teamModal').hidden")
    pg.wait_for_timeout(400)
    n=pg.locator(".pcard").count()
    ck("free agents render", n>=24, n)
    names=pg.eval_on_selector_all(".pcard-name","e=>e.map(x=>x.innerText)")
    ck("the free agent is on the free agent board", FA_NAME in names, names[:3])
    note=pg.inner_text("#boardNote")
    ck("board note explains", "free agents" in note and "stopped rating them" in note, note[:120])
    ck("and says the numbers are old", "last had" in note, note[:120])
    ck("FA chip instead of an arrow", pg.locator(".change-fa").count()>0)
    ck("no up/down arrow on a free agent", pg.locator(".pcard .change-up, .pcard .change-down").count()==0)

    print("B. free agent player sheet")
    pg.locator(".pcard").first.click()
    pg.wait_for_selector("#playerModal:not([hidden])")
    pg.wait_for_timeout(600)
    ck("kicker says FREE AGENT", "FREE AGENT" in pg.inner_text("#playerKicker"), pg.inner_text("#playerKicker"))
    ck("hero says when he was last rated", "Last rated" in pg.inner_text("#bioHero"), pg.inner_text("#bioHero")[:150].replace("\n"," / "))
    ck("attributes loaded for a free agent", pg.locator("#bioStats .stat-row, #bioStats li, #bioStats .attr-row").count()>0 or "Speed" in pg.inner_text("#bioStats"), pg.inner_text("#bioStats")[:80])
    pg.keyboard.press("Escape")

    print("C. a watched free agent survives a reload and is asked about")
    pg.evaluate("""() => {
      localStorage.setItem('janafari-v2', JSON.stringify({version:2, watchlist:[%d, %d], snapshots:[]}));
      localStorage.removeItem('janafari-team');
    }""" % (WAGNER, CHASE))
    errs.clear()
    pg.goto(BASE, wait_until="networkidle")
    pg.wait_for_function("document.getElementById('loading').hidden", timeout=20000)
    pg.wait_for_timeout(1200)
    ck("no page errors on the watch path", not [e for e in errs if "Failed to load resource" not in e], errs[:3])
    ck("the sheet asks about him", not pg.locator("#faModal").is_hidden())
    ck("it names him", FA_NAME in pg.inner_text("#faTitle"), pg.inner_text("#faTitle"))
    ck("it explains why", "roster" in pg.inner_text("#faNote"), pg.inner_text("#faNote")[:120])
    pg.click("#faKeep")
    pg.wait_for_function("document.getElementById('faModal').hidden")
    saved=json.loads(pg.evaluate("() => localStorage.getItem('janafari-v2')"))
    ck("he is still on the list", WAGNER in saved["watchlist"], saved["watchlist"])
    ck("the answer was recorded", str(WAGNER) in (saved.get("faSeen") or {}), saved.get("faSeen"))
    watch=pg.eval_on_selector_all(".pcard-name","e=>e.map(x=>x.innerText)")
    ck("he is on the board", FA_NAME in watch, watch)

    print("D. it is not asked twice")
    errs.clear()
    pg.goto(BASE, wait_until="networkidle"); pg.wait_for_function("document.getElementById('loading').hidden", timeout=20000); pg.wait_for_timeout(1200)
    ck("sheet stays shut", pg.locator("#faModal").is_hidden())
    ck("still on the list", FA_NAME in pg.eval_on_selector_all(".pcard-name","e=>e.map(x=>x.innerText)"))

    print("D2. Refresh keeps a watched free agent on the board")
    pg.click("#updateButton")
    pg.wait_for_function("!document.getElementById('updateButton').disabled", timeout=10000); pg.wait_for_timeout(400)
    after=pg.eval_on_selector_all(".pcard-name","e=>e.map(x=>x.innerText)")
    ck("still on the board after Refresh", FA_NAME in after, after)

    print("D3. Clear my players keeps the ratings weeks")
    pg.once("dialog", lambda d: d.accept())
    pg.click("#moreButton"); pg.wait_for_selector("#moreModal:not([hidden])")
    pg.click("#resetButton"); pg.wait_for_timeout(400)
    saved=json.loads(pg.evaluate("() => localStorage.getItem('janafari-v2')"))
    ck("players cleared", saved["watchlist"]==[], saved["watchlist"])
    ck("weeks kept", len(saved["snapshots"])>=2, len(saved["snapshots"]))

    print("E. Remove takes him off")
    pg.evaluate("""() => localStorage.setItem('janafari-v2', JSON.stringify({version:2, watchlist:[%d, %d], snapshots:[]}))""" % (WAGNER, CHASE))
    pg.goto(BASE, wait_until="networkidle"); pg.wait_for_function("document.getElementById('loading').hidden", timeout=20000); pg.wait_for_timeout(1200)
    pg.click("#faList .button")
    pg.wait_for_timeout(500)
    saved=json.loads(pg.evaluate("() => localStorage.getItem('janafari-v2')"))
    ck("removed on request", WAGNER not in saved["watchlist"], saved["watchlist"])
    ck("the other player kept", CHASE in saved["watchlist"], saved["watchlist"])

    print("F. NBA side")
    pg.evaluate("() => localStorage.clear()")
    errs.clear()
    pg.goto(BASE+"?sport=nba", wait_until="networkidle")
    pg.wait_for_function("document.getElementById('loading').hidden", timeout=25000); pg.wait_for_timeout(1500)
    real=[e for e in errs if "Failed to load resource" not in e]   # aborted portrait requests, not our code
    ck("no page errors (NBA)", not real, real[:3])
    pg.click("#teamChip"); pg.wait_for_selector("#teamModal:not([hidden])")
    cells=pg.eval_on_selector_all("#teamGrid .team-cell","e=>e.map(x=>x.innerText.trim())")
    ck("NBA has a Free agents tile", any("Free agent" in c for c in cells), cells[-3:])
    idx=[i for i,c in enumerate(cells) if "Free agent" in c][0]
    pg.locator("#teamGrid .team-cell").nth(idx).click()
    pg.wait_for_function("document.getElementById('teamModal').hidden"); pg.wait_for_timeout(400)
    names=pg.eval_on_selector_all(".pcard-name","e=>e.map(x=>x.innerText)")
    ck("NBA free agents render", len(names)>=24, len(names))   # 24 = the first page of cards
    ck("the NBA free agent is there", NBA_FA_NAME in names, names[:3])
    pg.locator(".pcard").first.click(); pg.wait_for_selector("#playerModal:not([hidden])"); pg.wait_for_timeout(600)
    bio=pg.inner_text("#bioStats")   # top attributes differ per player, so look for any rated row, not a named one
    ck("NBA free agent sheet has attributes", "ATTRIBUTES" in bio.upper() and len(re.findall(r"\n\d{2}\b", bio)) >= 3, bio[:80])
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    nbanote=pg.inner_text("#boardNote")
    # 2K rates its own free agency page, so the NBA note must NOT claim all of them are stale;
    # anyone a roster dropped since is frozen, and the note may say so for those only
    ck("NBA note says the numbers are current", "current" in nbanote and "has stopped rating them" not in nbanote, nbanote[:130])
    ck("no 'last rated' on a currently-rated free agent", "Last rated" not in pg.inner_text("#bioHero"))

    print("G. searching finds a free agent")
    pg.evaluate("() => localStorage.clear()")
    pg.goto(BASE, wait_until="networkidle"); pg.wait_for_function("document.getElementById('loading').hidden", timeout=20000); pg.wait_for_timeout(1200)
    pg.fill("#searchInput", "Quincy")
    pg.wait_for_timeout(600)
    ck("league search finds him", FIND_NAME in pg.eval_on_selector_all(".pcard-name","e=>e.map(x=>x.innerText)"))
    pg.fill("#searchInput", "")
    pg.click("#addButton"); pg.wait_for_selector("#addModal:not([hidden])")
    pg.fill("#addSearch", "Quincy"); pg.wait_for_timeout(500)
    rows=pg.eval_on_selector_all("#addResults .roster-info","e=>e.map(x=>x.innerText.replace(/\\n/g,' '))")
    ck("Add player finds him", any("Quincy" in r for r in rows), rows[:3])
    ck("and says his numbers are old", any("last rated" in r for r in rows), rows[:3])
    pg.keyboard.press("Escape")

    print("H. phone width, free agents view")
    pg2=ctx.new_page(); e2=[]; pg2.on("pageerror", lambda e: e2.append(str(e)))
    pg2.set_viewport_size({"width":390,"height":844})
    pg2.goto(BASE, wait_until="networkidle"); pg2.wait_for_function("document.getElementById('loading').hidden", timeout=20000); pg2.wait_for_timeout(1200)
    pg2.click("#teamChip"); pg2.wait_for_selector("#teamModal:not([hidden])")
    cells=pg2.eval_on_selector_all("#teamGrid .team-cell","e=>e.map(x=>x.innerText.trim())")
    i=[k for k,c in enumerate(cells) if "Free agent" in c][0]
    pg2.locator("#teamGrid .team-cell").nth(i).click(); pg2.wait_for_timeout(600)
    ow=pg2.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    ck("no horizontal overflow at 390px", ow<=0, ow)
    ck("no errors at phone width", not e2, e2[:2])
    b.close()

httpd.shutdown()
shutil.rmtree(SITE, ignore_errors=True)
print(("\nFAILED: " + ", ".join(fails)) if fails else "\nall checks passed")
sys.exit(1 if fails else 0)

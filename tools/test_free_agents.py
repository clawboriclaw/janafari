#!/usr/bin/env python3
"""What the page does with a player nobody has on a roster.

Neither source rates a free agent: EA dropped 1,215 of its 1,240 the week the season started, and 2K
keeps its unsigned players on a page of their own. The page used to react by deleting them — off the
board, and silently off a child's list of favourite players. These checks pin down what it does now.

Needs Playwright's chromium and serves the working tree itself:

    python3 tools/test_free_agents.py            # exit 0 = every check passed
    python3 tools/test_free_agents.py --port 9000

The data files it reads are the committed ones, so it also fails if a fetch ever publishes a
free-agents.json the page cannot use."""
import json, os, sys, threading, functools, http.server, socketserver

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
PORT = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 0   # 0 = any free port
WAGNER, CHASE = 11567, 21586          # a launch free agent EA no longer rates, and a live one


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, "http://127.0.0.1:%d/index.html" % httpd.server_address[1]


try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("playwright is not installed — skipping the browser checks")
    sys.exit(0)

fails = []


def ck(name, cond, extra=""):
    print(("  ok   " if cond else "  FAIL ") + name + (("  " + str(extra)) if not cond and extra else ""))
    if not cond:
        fails.append(name)


httpd, BASE = serve()
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900})
    pg=ctx.new_page()
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console."+m.type+": "+m.text) if m.type=="error" else None)

    print("A. clean load, NFL")
    pg.goto(BASE, wait_until="networkidle")
    pg.wait_for_function("document.getElementById('loading').hidden", timeout=20000)
    ck("no page errors", not errs, errs[:3])
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
    ck("Bobby Wagner on the free agent board", "Bobby Wagner" in names, names[:3])
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
    ck("no page errors on the watch path", not errs, errs[:3])
    ck("the sheet asks about him", not pg.locator("#faModal").is_hidden())
    ck("it names him", "Bobby Wagner" in pg.inner_text("#faTitle"), pg.inner_text("#faTitle"))
    ck("it explains why", "roster" in pg.inner_text("#faNote"), pg.inner_text("#faNote")[:120])
    pg.click("#faKeep")
    pg.wait_for_function("document.getElementById('faModal').hidden")
    saved=json.loads(pg.evaluate("() => localStorage.getItem('janafari-v2')"))
    ck("he is still on the list", WAGNER in saved["watchlist"], saved["watchlist"])
    ck("the answer was recorded", str(WAGNER) in (saved.get("faSeen") or {}), saved.get("faSeen"))
    watch=pg.eval_on_selector_all(".pcard-name","e=>e.map(x=>x.innerText)")
    ck("he is on the board", "Bobby Wagner" in watch, watch)

    print("D. it is not asked twice")
    errs.clear()
    pg.goto(BASE, wait_until="networkidle"); pg.wait_for_function("document.getElementById('loading').hidden", timeout=20000); pg.wait_for_timeout(1200)
    ck("sheet stays shut", pg.locator("#faModal").is_hidden())
    ck("still on the list", "Bobby Wagner" in pg.eval_on_selector_all(".pcard-name","e=>e.map(x=>x.innerText)"))

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
    real=[e for e in errs if "Failed to load resource" not in e]   # cdn.nba.com headshots, not our code
    ck("no page errors (NBA)", not real, real[:3])
    pg.click("#teamChip"); pg.wait_for_selector("#teamModal:not([hidden])")
    cells=pg.eval_on_selector_all("#teamGrid .team-cell","e=>e.map(x=>x.innerText.trim())")
    ck("NBA has a Free agents tile", any("Free agent" in c for c in cells), cells[-3:])
    idx=[i for i,c in enumerate(cells) if "Free agent" in c][0]
    pg.locator("#teamGrid .team-cell").nth(idx).click()
    pg.wait_for_function("document.getElementById('teamModal').hidden"); pg.wait_for_timeout(400)
    names=pg.eval_on_selector_all(".pcard-name","e=>e.map(x=>x.innerText)")
    ck("NBA free agents render", len(names)>=24, len(names))   # 24 = the first page of cards
    ck("Jonas Valanciunas there", any("Valan" in n for n in names), names[:3])
    pg.locator(".pcard").first.click(); pg.wait_for_selector("#playerModal:not([hidden])"); pg.wait_for_timeout(600)
    ck("NBA free agent sheet has attributes", "Close shot" in pg.inner_text("#bioStats") or "Strength" in pg.inner_text("#bioStats"), pg.inner_text("#bioStats")[:80])
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    nbanote=pg.inner_text("#boardNote")
    # 2K rates its own free agency page, so the NBA note must NOT claim these numbers are stale
    ck("NBA note says the numbers are current", "current" in nbanote and "last had" not in nbanote, nbanote[:130])
    ck("no 'last rated' on a currently-rated free agent", "Last rated" not in pg.inner_text("#bioHero"))

    print("G. searching finds a free agent")
    pg.evaluate("() => localStorage.clear()")
    pg.goto(BASE, wait_until="networkidle"); pg.wait_for_function("document.getElementById('loading').hidden", timeout=20000); pg.wait_for_timeout(1200)
    pg.fill("#searchInput", "Tyreek")
    pg.wait_for_timeout(600)
    ck("league search finds him", "Tyreek Hill" in pg.eval_on_selector_all(".pcard-name","e=>e.map(x=>x.innerText)"))
    pg.fill("#searchInput", "")
    pg.click("#addButton"); pg.wait_for_selector("#addModal:not([hidden])")
    pg.fill("#addSearch", "Tyreek"); pg.wait_for_timeout(500)
    rows=pg.eval_on_selector_all("#addResults .roster-info","e=>e.map(x=>x.innerText.replace(/\\n/g,' '))")
    ck("Add player finds him", any("Tyreek" in r for r in rows), rows[:3])
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
print(("\nFAILED: " + ", ".join(fails)) if fails else "\nall checks passed")
sys.exit(1 if fails else 0)

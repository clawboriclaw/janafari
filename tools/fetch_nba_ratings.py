#!/usr/bin/env python3
"""Snapshot NBA 2K27 player ratings into data/nba/ — the basketball twin of fetch_ratings.py.

2K publishes no ratings feed: nba.2k.com lists only a top 100, so the whole-league numbers come from
2kratings.com, the NBA 2K Play Now database (every current team, every player, every attribute and
badge, plus each player's rating on every roster update of the season). The site sits behind
Cloudflare and refuses plain HTTP clients, so this script drives a real headless Chromium
(Playwright) — a browser is exactly what the site expects. Run daily by
.github/workflows/refresh-nba-ratings.yml, or by hand:

    python3 tools/fetch_nba_ratings.py            # 30 team pages; player pages only for new/changed players
    python3 tools/fetch_nba_ratings.py --full     # every player page (attributes/badges that moved without the OVR)
    python3 tools/fetch_nba_ratings.py --check    # print what is live, write nothing
    python3 tools/fetch_nba_ratings.py --limit 2  # first N teams only (a smoke test)

Exit codes match the Madden fetcher (the workflow keys off them):
    0  changed, files written        3  unchanged, nothing written
    2  the fetch or a sanity check failed (any exception lands here too, never on 1)

Files (all under data/nba/):
    ratings.json        core fields for every player, same shape as data/ratings.json
    stats/<TEAM>.json   id -> {stats, diffs} per team, loaded when a card opens
    history.json        one {id: ovr} map per roster update — the page seeds its week list from it
    movement.json       per-player OVR series from the site's season chart (the raw material of history.json)
    badges.json         2K's own badge descriptions ("official") + our plain-English lines ("lines")
    photos.json         player slug -> headshot URL (NBA's own CDN, keyed by the id in nba.com's player index;
                        2kratings' images refuse hotlinks)

"Iterations" are the site's roster-update labels ("NBA 2K27 Launch Rating", "Nov. 5, 2026", ...):
the current one is the last label that carries a number for anyone."""
import asyncio, json, os, re, sys, time, unicodedata
from html import unescape

SITE = "https://www.2kratings.com"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "nba")
OUT = os.path.join(ROOT, "ratings.json")
HISTORY = os.path.join(ROOT, "history.json")
MOVEMENT = os.path.join(ROOT, "movement.json")
BADGES = os.path.join(ROOT, "badges.json")
PHOTOS = os.path.join(ROOT, "photos.json")
STATS_DIR = os.path.join(ROOT, "stats")
GAME = "NBA 2K27"
SEASON_MARK = "NBA 2K27"      # the site's title says which game it is serving; refuse another season
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"
PAUSE = 0.8                   # seconds between page loads: a fan site, not a feed
NBA_INDEX = "https://www.nba.com/players"     # embeds every current player (PERSON_ID, slug, team) in its Next.js data
NBA_HEADSHOT = "https://cdn.nba.com/headshots/nba/latest/260x190/%s.png"

# slug on 2kratings -> (abbr, nickname, full name, ESPN team id — kept for the logo CDN only)
TEAMS = [
    ("atlanta-hawks", "ATL", "Hawks", "Atlanta Hawks", 1), ("boston-celtics", "BOS", "Celtics", "Boston Celtics", 2),
    ("brooklyn-nets", "BKN", "Nets", "Brooklyn Nets", 17), ("charlotte-hornets", "CHA", "Hornets", "Charlotte Hornets", 30),
    ("chicago-bulls", "CHI", "Bulls", "Chicago Bulls", 4), ("cleveland-cavaliers", "CLE", "Cavaliers", "Cleveland Cavaliers", 5),
    ("dallas-mavericks", "DAL", "Mavericks", "Dallas Mavericks", 6), ("denver-nuggets", "DEN", "Nuggets", "Denver Nuggets", 7),
    ("detroit-pistons", "DET", "Pistons", "Detroit Pistons", 8), ("golden-state-warriors", "GSW", "Warriors", "Golden State Warriors", 9),
    ("houston-rockets", "HOU", "Rockets", "Houston Rockets", 10), ("indiana-pacers", "IND", "Pacers", "Indiana Pacers", 11),
    ("los-angeles-clippers", "LAC", "Clippers", "Los Angeles Clippers", 12), ("los-angeles-lakers", "LAL", "Lakers", "Los Angeles Lakers", 13),
    ("memphis-grizzlies", "MEM", "Grizzlies", "Memphis Grizzlies", 29), ("miami-heat", "MIA", "Heat", "Miami Heat", 14),
    ("milwaukee-bucks", "MIL", "Bucks", "Milwaukee Bucks", 15), ("minnesota-timberwolves", "MIN", "Timberwolves", "Minnesota Timberwolves", 16),
    ("new-orleans-pelicans", "NOP", "Pelicans", "New Orleans Pelicans", 3), ("new-york-knicks", "NYK", "Knicks", "New York Knicks", 18),
    ("oklahoma-city-thunder", "OKC", "Thunder", "Oklahoma City Thunder", 25), ("orlando-magic", "ORL", "Magic", "Orlando Magic", 19),
    ("philadelphia-76ers", "PHI", "76ers", "Philadelphia 76ers", 20), ("phoenix-suns", "PHX", "Suns", "Phoenix Suns", 21),
    ("portland-trail-blazers", "POR", "Trail Blazers", "Portland Trail Blazers", 22), ("sacramento-kings", "SAC", "Kings", "Sacramento Kings", 23),
    ("san-antonio-spurs", "SAS", "Spurs", "San Antonio Spurs", 24), ("toronto-raptors", "TOR", "Raptors", "Toronto Raptors", 28),
    ("utah-jazz", "UTA", "Jazz", "Utah Jazz", 26), ("washington-wizards", "WAS", "Wizards", "Washington Wizards", 27),
]
POS_NAME = {"PG": "Point Guard", "SG": "Shooting Guard", "SF": "Small Forward", "PF": "Power Forward", "C": "Center"}
SIDE = {"PG": "guard", "SG": "guard", "SF": "forward", "PF": "forward", "C": "center"}
BADGE_TIERS = ("legend", "hof", "gold", "silver", "bronze")
TIER_LABEL = {"legend": "Legend", "hof": "Hall of Fame", "gold": "Gold", "silver": "Silver", "bronze": "Bronze"}


def log(msg):
    print(msg, flush=True)


def text(s):
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def camel(label):
    words = re.sub(r"[^A-Za-z0-9 ]+", " ", label).split()
    return words[0].lower() + "".join(w[:1].upper() + w[1:] for w in words[1:]) if words else ""


def slugify(name):
    s = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode()
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))


def norm_name(name):
    s = slugify(name)
    return re.sub(r"-(jr|sr|ii|iii|iv)$", "", s)


def inches(txt):
    m = re.search(r"(\d+)'\s*(\d+)", txt or "")
    return int(m.group(1)) * 12 + int(m.group(2)) if m else None


def load_json(path, default):
    try:
        with open(path) as fh:
            return json.load(fh)
    except Exception:
        return default


def dump_json(path, doc, indent=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        json.dump(doc, fh, separators=(",", ":") if indent is None else (",", ": "), indent=indent, ensure_ascii=False)


# ---------------------------------------------------------------- parsing

def parse_team_page(html, team):
    """Roster rows: slug, name, positions, height, archetype, OVR, 3PT, DNK, badge count."""
    slug, abbr, nick, full, _ = team
    rows = [r for r in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S) if 'class="entries"' in r]
    out = []
    for r in rows:
        m = re.search(r'href="' + re.escape(SITE) + r'/([a-z0-9\-]+)"', r)
        name = re.search(r'class="player-name[^"]*" data-full="([^"]+)"', r)
        ovr = re.search(r'class="rating-updated">\s*<span data-order="[\d.]+" class="attribute-box[^"]*">(\d+)', r)
        if not (m and name and ovr):
            continue
        cells = re.findall(r'<td class="list-col\d-cell" data-sort="(\d+)"', r)
        badges = re.search(r'class="badge-icon">\s*<span class="text-white">(\d+)</span>', r)
        pos = re.findall(r'href="/lists/[a-z\-]+" title="(Point Guard|Shooting Guard|Small Forward|Power Forward|Center)"', r)
        arche = re.search(r'class="optional-info">\s*\|\s*([^<]+?)\s*</span>', r)
        height = re.search(r"title=\"(\d+'\d+)&quot; Players\"", r)
        out.append({
            "id": m.group(1), "name": unescape(name.group(1)), "team": abbr, "teamName": nick, "teamFull": full,
            "positions": [abbr_pos(p) for p in pos] or ["ATH"], "ovr": int(ovr.group(1)),
            "threePt": int(cells[0]) if len(cells) > 0 else None, "dunk": int(cells[1]) if len(cells) > 1 else None,
            "badgeCount": int(badges.group(1)) if badges else 0,
            "archetype": text(arche.group(1)) if arche else "", "height": inches(height.group(1).replace("&#039;", "'")) if height else None,
        })
    return out


def abbr_pos(full):
    return {"Point Guard": "PG", "Shooting Guard": "SG", "Small Forward": "SF", "Power Forward": "PF", "Center": "C"}[full]


def header_field(html, label):
    """One 'Label: value' line from the player header (the block under the name, never the page body)."""
    i = html.find('class="header-subtitle"')
    block = html[i:html.find("Compare", i)] if i >= 0 else html
    m = re.search(r">\s*" + re.escape(label) + r"[^:<]*:\s*(?:<[^>]+>\s*)*([^<]+)<", block)
    return text(m.group(1)) if m else ""


def parse_player_page(html):
    """Attributes by category, badges (deduped), season chart, bio header."""
    doc = {}
    m = re.search(r'attribute-box-player[^"]*">(\d+)', html)
    doc["ovr"] = int(m.group(1)) if m else None
    stats, groups = {}, {}
    for cat, body in re.findall(r'<h4 class="card-title mb-0 ml-1">([^<]+)</h4>(.*?)</ul>', html, re.S):
        cat = text(cat)
        if cat == "Total Attributes":
            continue
        for item in re.findall(r'<li class="mb-3">(.*?)</li>', body, re.S):
            label = text(re.sub(r"<span id=.*?</span>\s*</span>", "", item.split('<span class="mb-1">')[0], flags=re.S))
            val = re.search(r'attribute-box[^"]*">(\d+)', item)
            if label and val:
                stats[camel(label)] = int(val.group(1))
                groups.setdefault(cat, []).append(camel(label))
    doc["stats"], doc["groups"] = stats, groups
    badges, seen = [], set()
    for card in re.findall(r'<div class="row no-gutters badge-card">(.*?)</div>\s*</div>\s*</div>', html, re.S):
        name = re.search(r"<h4[^>]*>([^<]+)</h4>", card)
        img = re.search(r'data-src="([^"]+)"', card)
        cat = re.search(r"badge-pill[^>]*>([^<]+)<", card)
        desc = re.search(r'badge-description">(.*?)</p>', card, re.S)
        if not (name and img):
            continue
        label = text(name.group(1))
        if label in seen:
            continue
        seen.add(label)
        tier = next((t for t in BADGE_TIERS if img.group(1).lower().endswith("-%s.png" % t)), "bronze")
        badges.append({"label": label, "type": TIER_LABEL[tier], "tier": tier, "category": text(cat.group(1)) if cat else "",
                       "description": text(desc.group(1)) if desc else "", "imageUrl": img.group(1)})
    order = {t: i for i, t in enumerate(BADGE_TIERS)}
    badges.sort(key=lambda b: (order[b["tier"]], b["label"]))
    doc["badges"] = badges
    chart = re.search(r'getElementById\("chartjs-dashboard-line-player"\).*?labels:\s*\[(.*?)\].*?data:\s*\[(.*?)\]', html, re.S)
    if chart:
        labels = [unescape(x) for x in re.findall(r'"([^"]+)"', chart.group(1))]
        raw = [x.strip().strip('"') for x in chart.group(2).split(",")]
        series = [int(v) if v.isdigit() else None for v in raw][:len(labels)]
        series += [None] * (len(labels) - len(series))
        doc["labels"], doc["series"] = labels, series
    else:
        doc["labels"], doc["series"] = [], []
    doc["jersey"] = re.sub(r"\D", "", header_field(html, "Jersey")) or None
    doc["archetype"] = header_field(html, "Archetype")
    doc["height"] = inches(header_field(html, "Height"))
    w = re.search(r"(\d+)\s*lbs", header_field(html, "Weight"))
    doc["weight"] = int(w.group(1)) if w else None
    doc["wingspan"] = inches(header_field(html, "Wingspan"))
    y = re.search(r"\d+", header_field(html, "Year(s) in the NBA"))
    doc["yearsPro"] = int(y.group()) if y else None
    doc["birthdate"] = header_field(html, "Birthdate")
    doc["hometown"] = header_field(html, "Hometown")
    doc["college"] = header_field(html, "Prior to")
    doc["nationality"] = header_field(html, "Nationality")
    return doc


def page_is_broken(d):
    """A player page we must not publish: no overall or no season chart means the layout changed.
    A thin sheet (few numeric attributes, zero badges) is a real player, not a broken page."""
    return d.get("ovr") is None or not d.get("labels")


def age_from(birthdate, today=None):
    try:
        b = time.strptime(birthdate, "%B %d, %Y")
    except Exception:
        return None
    t = today or time.gmtime()
    return t.tm_year - b.tm_year - (1 if (t.tm_mon, t.tm_mday) < (b.tm_mon, b.tm_mday) else 0)


# ---------------------------------------------------------------- browser

class Browser:
    def __init__(self):
        self.page = None
        self.pw = None
        self.browser = None

    async def __aenter__(self):
        from playwright.async_api import async_playwright
        self.pw = await async_playwright().start()
        kw = {"headless": True}
        if os.environ.get("CHROME_PATH"):          # a machine with Chrome but not Playwright's chromium (the WSL box)
            kw["executable_path"] = os.environ["CHROME_PATH"]
        self.browser = await self.pw.chromium.launch(**kw)
        ctx = await self.browser.new_context(user_agent=UA, viewport={"width": 1280, "height": 900})
        # Only the site's own documents: no ads, images, fonts or trackers — faster, and lighter on them.
        async def gate(route):
            req = route.request
            if req.resource_type in ("image", "media", "font", "stylesheet") or not req.url.startswith(SITE):
                await route.abort()
            else:
                await route.continue_()
        await ctx.route("**/*", gate)
        self.page = await ctx.new_page()
        return self

    async def __aexit__(self, *exc):
        try:
            await self.browser.close()
        finally:
            await self.pw.stop()

    async def html(self, url):
        last = None
        for attempt in range(3):
            try:
                resp = await self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
                body = await self.page.content()
                if resp and resp.status == 200 and "Just a moment" not in body[:2000]:
                    await asyncio.sleep(PAUSE)
                    return body
                last = "status %s" % (resp.status if resp else "?")
                if resp and resp.status == 404:
                    return None
            except Exception as exc:
                last = "%s: %s" % (type(exc).__name__, exc)
            await asyncio.sleep(4 * (attempt + 1))
        raise RuntimeError("could not load %s (%s)" % (url, last))

    async def json(self, url):
        """A cross-origin JSON document, read through the browser's own fetch (same IP reputation as the pages)."""
        try:
            return await self.page.evaluate("u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null)", url)
        except Exception:
            return None


def nba_photos(players, photos):
    """slug -> NBA CDN headshot for anyone not already mapped. nba.com/players carries the whole current
    player index in its page data; cdn.nba.com serves headshots by PERSON_ID and allows hotlinks.
    Names are matched by slug, then by normalised full name, then by team + last name + first-name prefix.
    A miss is a monogram on the card, never a 404."""
    import urllib.request
    want = [p for p in players if p["id"] not in photos]
    if not want:
        return 0
    req = urllib.request.Request(NBA_INDEX, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        html = r.read().decode("utf-8", "replace")
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        raise RuntimeError("nba.com player index not found in the page")
    index = json.loads(m.group(1))["props"]["pageProps"]["players"]
    by_slug, by_name, by_team = {}, {}, {}
    for a in index:
        pid = a.get("PERSON_ID")
        if not pid:
            continue
        by_slug.setdefault(a.get("PLAYER_SLUG") or "", pid)
        full = norm_name((a.get("PLAYER_FIRST_NAME") or "") + " " + (a.get("PLAYER_LAST_NAME") or ""))
        by_name.setdefault(full, pid)
        key = (a.get("TEAM_ABBREVIATION") or "", norm_name(a.get("PLAYER_LAST_NAME") or ""), norm_name(a.get("PLAYER_FIRST_NAME") or "")[:2])
        by_team.setdefault(key, pid)
    added = 0
    for p in want:
        parts = norm_name(p["name"]).split("-")
        pid = by_slug.get(p["id"]) or by_name.get(norm_name(p["name"])) or by_team.get((p["team"], parts[-1] if parts else "", parts[0][:2] if parts else ""))
        if pid:
            photos[p["id"]] = NBA_HEADSHOT % pid
            added += 1
    return added


# ---------------------------------------------------------------- main

async def run(argv):
    full = "--full" in argv
    check = "--check" in argv
    limit = int(argv[argv.index("--limit") + 1]) if "--limit" in argv else None
    teams = TEAMS[:limit] if limit else TEAMS
    old = load_json(OUT, None)
    old_players = {p["id"]: p for p in (old or {}).get("players", [])}
    old_stats = {}
    for name in (os.listdir(STATS_DIR) if os.path.isdir(STATS_DIR) else []):
        if name.endswith(".json"):
            old_stats.update(load_json(os.path.join(STATS_DIR, name), {}))
    movement = load_json(MOVEMENT, {"labels": [], "series": {}})
    photos = load_json(PHOTOS, {})
    badge_defs = load_json(BADGES, {"official": {}, "lines": {}})

    async with Browser() as bro:
        players = []
        for team in teams:
            html = await bro.html(SITE + "/teams/" + team[0])
            if html is None:
                raise RuntimeError("team page missing: " + team[0])
            title = re.search(r"<title>(.*?)</title>", html, re.S)
            if not title or SEASON_MARK not in title.group(1):
                raise RuntimeError("the site is not serving %s (%s)" % (SEASON_MARK, team[0]))
            roster = parse_team_page(html, team)
            if len(roster) < 8:
                raise RuntimeError("only %d players parsed for %s — the page layout changed?" % (len(roster), team[0]))
            players.extend(roster)
            log("%s: %d players" % (team[1], len(roster)))
        seen, unique = set(), []
        for p in players:
            if p["id"] not in seen:
                seen.add(p["id"]); unique.append(p)
        if check:
            log("live: %d players on %d teams; top: %s" % (len(unique), len(teams), ", ".join("%s %d" % (p["name"], p["ovr"]) for p in sorted(unique, key=lambda p: -p["ovr"])[:3])))
            return 0
        # Which player pages to open: every one on --full; otherwise new players, moved OVRs, anyone with no sheet yet,
        # plus one sentinel so a roster update that changed nobody on the board is still dated.
        need = []
        for p in unique:
            o = old_players.get(p["id"])
            if full or not o or o.get("ovr") != p["ovr"] or p["id"] not in old_stats:
                need.append(p)
        if not need:
            need.append(max(unique, key=lambda p: p["ovr"]))
        log("opening %d player pages (%s)" % (len(need), "full" if full else "changed/new + sentinel"))
        detail, broken = {}, []
        for i, p in enumerate(need):
            html = await bro.html(SITE + "/" + p["id"])
            if html is None:
                log("  %s: page missing, keeping the roster row only" % p["id"])
                continue
            d = parse_player_page(html)
            # Zero badges is real (41 players at launch) and so is a thin sheet — a two-way player can carry "--" for
            # most attributes (Tyler Nickel had 9 numbers on 2026-09-20, which tripped an over-strict "< 20" guard and
            # killed the whole Sunday run). What is NOT real is a page with no overall or no season chart: that is a
            # layout change. One such page is skipped (the player keeps his last sheet); many mean the site changed.
            if page_is_broken(d):
                broken.append(p["id"])
                log("  %s: parsed to ovr=%s, %d attributes, %d chart labels — skipped" % (p["id"], d["ovr"], len(d["stats"]), len(d["labels"])))
                if len(broken) > max(3, len(need) // 30):
                    raise RuntimeError("%d player pages failed to parse (%s …) — the page layout changed?" % (len(broken), ", ".join(broken[:5])))
                continue
            detail[p["id"]] = d
            if (i + 1) % 25 == 0:
                log("  %d/%d" % (i + 1, len(need)))
    try:
        added = nba_photos(unique, photos)
        if added:
            log("photos: %d new headshots" % added)
    except Exception as exc:
        log("photos: skipped (%s)" % exc)

    # ---- iteration (roster update) from the season charts
    labels = movement.get("labels") or []
    for d in detail.values():
        if d["labels"] and len(d["labels"]) >= len(labels):
            labels = d["labels"]
    if not labels:
        raise RuntimeError("no season chart found on any player page")
    series = movement.get("series") or {}
    for pid, d in detail.items():
        if d["series"]:
            series[pid] = d["series"]
    current_index = 0
    for s in series.values():
        for i, v in enumerate(s):
            if v is not None and i > current_index:
                current_index = i
    iterations = [{"id": slugify(l), "label": l} for l in labels[:current_index + 1]]
    iteration = iterations[-1]
    iteration_changed = not old or (old.get("iteration") or {}).get("id") != iteration["id"]

    # ---- assemble players (roster row + detail, or the previous snapshot's detail when the page was not opened)
    core = []
    now = time.gmtime()
    for p in unique:
        d = detail.get(p["id"])
        o = old_players.get(p["id"], {})
        pos = p["positions"][0]
        entry = {
            "id": p["id"], "name": p["name"], "team": p["team"], "teamName": p["teamName"], "teamFull": p["teamFull"],
            "pos": pos, "posName": " / ".join(POS_NAME.get(x, x) for x in p["positions"]), "positions": p["positions"],
            "side": SIDE.get(pos, "guard"), "ovr": p["ovr"], "archetype": (d or {}).get("archetype") or p["archetype"] or o.get("archetype", ""),
            "age": age_from(d["birthdate"], now) if d else o.get("age"),
            "college": d["college"] if d else o.get("college"), "hometown": d["hometown"] if d else o.get("hometown"),
            "jersey": d["jersey"] if d else o.get("jersey"), "yearsPro": d["yearsPro"] if d else o.get("yearsPro"),
            "height": (d["height"] if d else None) or p["height"] or o.get("height"), "weight": d["weight"] if d else o.get("weight"),
            "wingspan": d["wingspan"] if d else o.get("wingspan"), "nationality": d["nationality"] if d else o.get("nationality"),
            "avatar": photos.get(p["id"]),
            "abilities": [{"label": b["label"], "type": b["type"], "category": b["category"]} for b in d["badges"]] if d else o.get("abilities", []),
            "badgeCount": p["badgeCount"], "threePt": p["threePt"], "dunk": p["dunk"],
        }
        core.append(entry)
    core.sort(key=lambda p: (-p["ovr"], p["name"]))
    if limit is None and len(core) < 400:
        raise RuntimeError("refusing to write: only %d players" % len(core))
    if limit is None and old and len(core) < len(old_players) * 0.9:
        raise RuntimeError("refusing to write: %d players, had %d" % (len(core), len(old_players)))

    # ---- stat sheets. `diffs` = this roster update's attributes minus the PREVIOUS update's, like EA's week-over-week
    # diffs. Each entry records the update (`iter`) its numbers were read under, so a page re-read inside the same
    # update diffs against the same base (base = stats − diffs), and a player whose page was not re-opened under a new
    # update carries no diff at all — never last update's arrows (Codex hypothesis, 2026-09-19, confirmed).
    new_stats = {}
    for p in core:
        d = detail.get(p["id"])
        prev = old_stats.get(p["id"])
        if d and d["stats"]:
            base = {}
            if prev and prev.get("stats"):
                base = dict(prev["stats"])
                if prev.get("iter") == iteration["id"]:
                    for k, dv in (prev.get("diffs") or {}).items():
                        if k in base:
                            base[k] -= dv
            diffs = {k: v - base[k] for k, v in d["stats"].items() if k in base and base[k] != v}
            new_stats[p["id"]] = {"stats": d["stats"], "diffs": diffs, "groups": d["groups"], "iter": iteration["id"]}   # badges live in ratings.json + badges.json
        elif prev:
            new_stats[p["id"]] = prev if prev.get("iter") == iteration["id"] else dict(prev, diffs={}, iter=iteration["id"])

    # ---- history: one {id: ovr} map per roster update. The COMMITTED map is the base (a day that re-read only three
    # player pages must not shrink last month's update to three players — Codex, 2026-09-19); the season charts of
    # every page ever read overlay it, and the current update carries everyone's live OVR from the team pages.
    old_history = load_json(HISTORY, [])
    committed = {h.get("id"): h for h in old_history if isinstance(h, dict)}
    history = []
    for i, it in enumerate(iterations):
        prior = committed.get(it["id"]) or {}
        ratings = dict(prior.get("ratings") or {})
        for pid, s in series.items():
            if i < len(s) and s[i] is not None:
                ratings[pid] = s[i]
        if i == current_index:
            ratings.update({p["id"]: p["ovr"] for p in core})
        if ratings:
            history.append({"id": it["id"], "label": it["label"], "date": prior.get("date") or time.strftime("%Y-%m-%d", now), "ratings": ratings})
    # ---- badge definitions: 2K's text and art for every badge seen; our lines are never overwritten
    official = badge_defs.setdefault("official", {})
    for d in detail.values():
        for b in d["badges"]:
            if b["label"] and b["description"] and b["label"] not in official:
                official[b["label"]] = {"category": b["category"], "description": b["description"],
                                        "imageUrl": re.sub(r"-(legend|hof|gold|silver|bronze)\.png$", "-gold.png", b["imageUrl"])}
    badge_defs.setdefault("lines", {})

    doc = {
        "game": GAME, "source": SITE + "/", "sourceName": "2K Ratings",
        "iteration": iteration, "iterations": iterations,
        "fetched": time.strftime("%Y-%m-%dT%H:%M:%SZ", now), "count": len(core), "players": core,
    }
    # "Unchanged" means every published field of every player, every sheet, the history AND the side files
    # (movement/photos/badges) are byte-for-byte what is committed — the workflow commits only on rc 0, so anything
    # written here on an rc 3 would be lost (Codex, 2026-09-19). `fetched` alone never counts as a change.
    same_players = bool(old) and old.get("players", []) == core
    same_stats = old_stats == new_stats
    same_history = old_history == history
    movement_doc = {"labels": labels, "series": series}
    same_side = (load_json(MOVEMENT, None) == movement_doc and load_json(PHOTOS, None) == photos and load_json(BADGES, None) == badge_defs)
    if same_players and same_stats and same_history and same_side and not iteration_changed:
        log("unchanged: %s, %d players" % (iteration["label"], len(core)))
        return 3
    dump_json(MOVEMENT, movement_doc)
    dump_json(PHOTOS, photos, indent=0)
    dump_json(BADGES, badge_defs, indent=2)
    dump_json(HISTORY, history)
    by_team = {}
    for p in core:
        if p["id"] in new_stats:
            by_team.setdefault(p["team"], {})[p["id"]] = new_stats[p["id"]]
    for team, sheet in by_team.items():
        dump_json(os.path.join(STATS_DIR, team + ".json"), sheet)
    dump_json(OUT, doc)
    log("wrote data/nba/ratings.json: %s, %d players, %d team sheets, %d updates in history" % (iteration["label"], len(core), len(by_team), len(history)))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(run(sys.argv[1:])))
    except SystemExit:
        raise
    except Exception as exc:
        print("fetch failed: %s: %s" % (type(exc).__name__, exc), file=sys.stderr)
        sys.exit(2)

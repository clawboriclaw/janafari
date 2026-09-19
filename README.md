# Janafari

A private, no-account ratings tracker built for a 10-year-old on an iPad, a phone or a PC — **Madden 27**
and, since 2026-09-19, **NBA 2K27** on the same page. It is a static site: no build step, framework,
analytics, ads, or webfonts. Every rating comes from a feed a script snapshots into `data/`; nobody
types a rating in here.

Live site: <https://clawboriclaw.github.io/janafari/> (basketball straight away: `?sport=nba`)

## Two sports, one page

The **🏈 Madden | 🏀 NBA 2K** switch in the header flips the whole page: the league, the team picker (30
NBA clubs, ESPN logos), the filters (Guards / Forwards / Centers instead of Offense / Defense / Special
teams), the ⭐ Stars filter (Hall of Fame / Gold **badges** instead of X-Factor / Superstar abilities), the
player card (size with wingspan, build, hometown, badges by level, top 2K attributes) and the Playbook's
copy. Each sport has its **own watchlist and saved weeks** (`janafari-v2` for Madden, `janafari-nba-v1`
for NBA 2K) — switching never touches the other list, and a backup file says which sport it belongs to.
The last sport used is remembered (`janafari-sport`). Each sport has its own easter-egg game: End Zone Run on
the football side, **Janafari Jam** on the basketball side (below). In the code, everything sport-specific is one `SPORTS` object at the top of
`app.js`; the rest reads `SPORT` and never says "football" itself. Elements that belong to one sport carry
`data-sport="nfl|nba"` and `html[data-sport]` hides the other's.

## What is on the page

- **League** — everyone EA rates (3,111 players at Launch Ratings, free agents included), top 100 by
  overall, search finds anyone. **My players** — the players this device's owner chose to follow.
- **Team** chip → tap a logo (32 clubs + free agents) to see that whole roster, sorted by overall; the pick
  sticks between visits. Works together with Offense / Defense / Special teams.
- **Badges & abilities** — a red **X** on a card means an X-Factor player, a grey **★** means Superstar abilities
  (159 players). The **⭐ Stars** filter shows only them. On a card every ability name is a button: tap "Double Me"
  and a plain-English meaning appears, then EA's own description and artwork (`data/abilities.json`: our lines for
  all 115 names, plus the `ea` block the fetcher fills from the feed — new names get EA's text automatically).
  A player with no badge has no abilities in EA's feed this year (e.g. Aaron Donald at launch).
- **Add** (＋) searches the whole league and opens a real player card: age, size, college, years pro,
  abilities, the top attributes with EA's week-over-week diffs, and a one-tap "Add to my players".
- Phone (≤600 px): one column, a bottom tab bar (My players · League · Add), sticky search, full-screen
  sheets. Tablet (601–1024 px): 2–3 columns, search on its own row. Desktop: 4 columns, one toolbar row.
- Every control is at least 44 px tall; the search field uses 16 px text so iOS does not zoom.
- **End Zone Run** — an endless Tecmo/Retro-Bowl-style football runner with modern backgrounds (🏈 in the
  footer, More → Play, the Playbook, or catch the tiny runner who sprints across the top bar). You're Jonathan
  Taylor #28 in pixel art; the big button starts a run and then jumps (a tap on the field or Space does the same).
  Every 100 yards is a touchdown — arms up, fireworks, crowd roar, 7 points on the Tecmo scoreboard at the top
  right — then the next drive is at the next team's stadium (AFC South first, then around the league): their
  pixel defenders, their painted end zone with goal posts, their city skyline and weather (snow in Buffalo,
  Green Bay, Denver…, rain in Seattle), a stadium crowd doing the wave with a fan's sign, a blimp with a
  JANAFARI banner, day rolling into night. Halftime after two touchdowns. Beat the Texans, Jaguars and Titans for an AFC SOUTH CHAMPS banner. A hurdle
  streak counter celebrates 3/5/10 in a row; "12 yd to your best" turns into NEW BEST! when he passes it; a grabbed
  football shouts UNSTOPPABLE with a draining 2-second bar. **One tackle and the run is over**
  (yellow flag, whistle); then an honest coach line (early / late / flat-footed), the initials right under it if the run makes the top 10,
  and Run again one tap away.
  First-down chain every 10 yards; a floating football gives two seconds of turbo. Keys:
  `janafari-ezr-v2` (best) and `janafari-ezr-scores-v1` (board). `game.js` loads only on Play; the loop runs
  only while the sheet is open and running; backgrounding pauses; Exit stops loop and sound; sound off until
  switched on; reduced motion → no fireworks. Everything scales with the canvas width.
- **Janafari Jam** (`hoops.js`, NBA side; the hoop button in the footer, More → Play, the Playbook, or catch the
  ball that bounces across the top bar) — two-on-two, one button, everything random. Your two Pacers run on their
  own; you tap to jump and tap with the ball to shoot. Every basket rerolls the rules: the ball (basketball, beach
  ball, bowling ball, mini ball, a football), gravity (moon, heavy), the bodies (giants, shorties, big heads, one of
  each), the sky (snow, rain, lights out). First to 5. Beat a team and the next one comes to town in its own colours,
  with its two best-rated players from `data/nba/ratings.json` wearing their real names and numbers — their 2K
  three-point rating steers how straight they shoot, dunk rating how they finish at the rim, height is height.
  Lose once and your win streak goes on the retro board (`janafari-jam-v1`, `janafari-jam-scores-v1`). An 8-second
  shot clock, a jump ball after 25 s without a basket, the scored-on team brings it in. **2 players** puts a friend on
  the ↑ key or the right half of the court. Same house rules as End Zone Run (loop only while open, hidden → pause,
  sound off until switched on, reduced motion → no confetti). `JanafariHoops.peek()` is a read-only snapshot for tests.
- **⋯ More** holds backup & restore, "where the numbers come from" and the EA link — the things a kid
  should not press by accident.

## Identity

`brand/make_brand.py` draws the wordmark and the jersey-patch J as SVG paths (no fonts, so it renders the
same on every device). Chosen 2026-09-12: **B · Scoreboard**. Outputs: `brand/wordmark-B.svg`,
`brand/mark-B.svg` (both inlined in `index.html`), `brand/apple-touch-icon.png` (rendered from the vector);
the favicon is the same mark as a data URI. `brand/compare.html` shows the treatments at header size.

## Where the data comes from, and how it stays fresh

### NBA 2K27 (`data/nba/`)

2K publishes no ratings feed — nba.2k.com shows only a top 100 — so the whole league comes from
[2K Ratings](https://www.2kratings.com/), the NBA 2K Play Now database (every current team, every player,
35 attributes, badges with 2K's descriptions, and each player's overall on every roster update of the
season). The site sits behind Cloudflare and refuses plain HTTP clients, so `tools/fetch_nba_ratings.py`
drives a real headless Chromium through Playwright (`pip install playwright && python3 -m playwright
install chromium`; on the WSL box `CHROME_PATH=/usr/bin/google-chrome`). It writes the same shape as the
Madden files: `data/nba/ratings.json` (core fields), `data/nba/stats/<TEAM>.json` (attributes, diffs,
badges with descriptions, loaded when a card opens), `data/nba/history.json` (one map per roster update —
the site's own labels, "NBA 2K27 Launch Rating", "Nov. 5, 2026", …), plus `movement.json` (the raw
per-player series), `badges.json` (2K's text and art for every badge seen + our plain-English lines) and
`photos.json` (headshots from ESPN's public roster API; 2K Ratings' own images refuse hotlinks).
`.github/workflows/refresh-nba-ratings.yml` runs it **every day** (team pages + only the players whose
overall moved; Sundays every player page) and commits only when something changed. Same exit codes
(0 changed · 3 unchanged · 2 failed → red run + Telegram).

### Madden 27 (`data/`)

- `tools/fetch_ratings.py` reads EA's feed (it needs EA's own `x-feature` header or it serves last
  season; the script refuses a wrong-season file) and writes `data/ratings.json` (core fields),
  `data/stats/<TEAM>.json` (attributes, loaded when a card opens) and `data/history.json` (every
  iteration's overall ratings, so a week the page was not opened is never lost).
- `.github/workflows/refresh-ratings.yml` runs the script **every day** and commits only when EA's
  numbers changed; GitHub Pages redeploys from the commit. Exit codes: 0 changed · 3 unchanged ·
  2 failed (the workflow goes red on 2).
- **↻ Refresh** on the page re-reads the committed file. A browser cannot call EA directly (no CORS
  header), so "Refresh" is "get what the daily check found", and the stat strip says when that was.
- Weeks are EA's own iterations (Launch Ratings, Week 1, …). Week-over-week arrows, the Movers filter,
  the week picker and the trend sparklines appear once a second iteration exists.

## Run it locally

```bash
python3 -m http.server 8027 --bind 0.0.0.0
```

On a device on the same Wi-Fi, visit `http://COMPUTER-IP:8027`. In Safari, Share → Add to Home Screen
gives an app-like shortcut. The watchlist lives in that browser's local storage — use **⋯ More → Save a
backup file** now and then, because Safari can clear website data. Separate devices do not share.

## Old-iPad rules (keep them)

ES5 only in `app.js`; no flex `gap` (margins instead; grids carry a `grid-gap` twin); a plain colour
before every `var()`; no webfonts; XHR not fetch. CSS Grid needs iOS 10.3+.

Official sources: <https://www.ea.com/games/madden-nfl/ratings> · NBA 2K27 via <https://www.2kratings.com/>

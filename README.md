# Janafari

A private, no-account Madden 27 ratings tracker built for a 10-year-old on an iPad, a phone or a PC.
It is a static site: no build step, framework, analytics, ads, or webfonts. Every rating comes from
EA's official Madden 27 ratings feed; nobody types a rating in here.

Live site: <https://clawboriclaw.github.io/janafari/>

## What is on the page

- **League** — everyone EA rates (3,111 players at Launch Ratings, free agents included), top 100 by
  overall, search finds anyone. **My players** — the players this device's owner chose to follow.
- **Team** chip → tap a logo (32 clubs + free agents) to see that whole roster, sorted by overall; the pick
  sticks between visits. Works together with Offense / Defense / Special teams.
- **Badges & abilities** — a red **X** on a card means an X-Factor player, a grey **★** means Superstar abilities
  (159 players). The **⭐ Stars** filter shows only them. On a card every ability name is a button: tap "Double Me"
  and a plain-English meaning appears (`data/abilities.json`, all 115 names EA uses, written for a ten-year-old).
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
  JANAFARI banner, day rolling into night. Halftime after two touchdowns. **One tackle and the run is over**
  (yellow flag, whistle); if it makes the top 10 you type three initials while the board updates live.
  First-down chain every 10 yards; a floating football gives two seconds of turbo. Keys:
  `janafari-ezr-v2` (best) and `janafari-ezr-scores-v1` (board). `game.js` loads only on Play; the loop runs
  only while the sheet is open and running; backgrounding pauses; Exit stops loop and sound; sound off until
  switched on; reduced motion → no fireworks. Everything scales with the canvas width.
- **⋯ More** holds backup & restore, "where the numbers come from" and the EA link — the things a kid
  should not press by accident.

## Identity

`brand/make_brand.py` draws the wordmark and the jersey-patch J as SVG paths (no fonts, so it renders the
same on every device). Chosen 2026-09-12: **B · Scoreboard**. Outputs: `brand/wordmark-B.svg`,
`brand/mark-B.svg` (both inlined in `index.html`), `brand/apple-touch-icon.png` (rendered from the vector);
the favicon is the same mark as a data URI. `brand/compare.html` shows the treatments at header size.

## Where the data comes from, and how it stays fresh

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

Official source: <https://www.ea.com/games/madden-nfl/ratings>

(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Janafari v4 — real ratings, a real watchlist, one screen per job,
     TWO sports on one page (2026-09-19). Every number comes from a feed
     snapshotted into data/ by a fetcher and checked daily by a GitHub
     Action. Nobody types a rating in here.
       🏈 Madden 27   EA's official ratings feed  → data/ratings.json
       🏀 NBA 2K27    2K Ratings' Play Now database → data/nba/ratings.json
       League     = every rated player (top 100 shown; search finds anyone)
       My players = the players THIS device's owner chose to follow
     Weeks are the feed's own iterations (Launch, Week 1 … / roster updates):
     each new iteration the page sees becomes a snapshot, so week-over-week
     arrows are the feed's changes, not ours. If a feed changes numbers UNDER
     the same iteration id (EA did: 2,364 → 3,111 players under "1-base"),
     the stored snapshot is replaced, never kept stale (review, 2026-09-12).
     Everything sport-specific lives in SPORTS below; the rest of the file
     reads SPORT (the active one) and never says "football" itself. The two
     watchlists are separate keys, so switching sports never touches the other.
     ES5 on purpose: the old iPad in the house must keep working.
     ------------------------------------------------------------------ */

  var SPORTS = {
    nfl: {
      key: "nfl", game: "Madden 27", icon: "🏈", noun: "NFL",
      title: "Janafari — Madden 27 Ratings", desc: "Your Madden clubhouse · Madden 27 ratings",
      storageKey: "janafari-v2", legacyKey: "our-madden-27-board-v1", teamKey: "janafari-team",
      dataUrl: "data/ratings.json", historyUrl: "data/history.json", defsUrl: "data/abilities.json?v=2", statsDir: "data/stats/",
      freeUrl: "data/free-agents.json",   // everyone EA has stopped rating; see loadFree()
      source: "EA", sourceLong: "EA's official Madden 27 ratings feed", sourceLink: "https://www.ea.com/games/madden-nfl/ratings",
      club: { min: 99, label: "in the 99 Club" },
      sides: ["offense", "defense", "special"],
      facts: true,                                 // draft/Super Bowl facts
      arcade: { url: "game.js?v=8", api: "JanafariGame", modal: "gameModal", name: "End Zone Run", egg: "eggRunner" },   // `game` is the ratings title; the mini-game is `arcade`
      logo: function (abbr) { return "https://a.espncdn.com/i/teamlogos/nfl/500/" + abbr.toLowerCase() + ".png"; },
      tiers: { x: { short: "X", name: "X-Factor", kicker: "X-FACTOR" }, star: { short: "★", name: "Superstar", kicker: "SUPERSTAR" } },
      abilitiesLabel: "Abilities", abilitiesQuestion: "What are X-Factor and Superstar abilities?",
      abilitiesHelp: ["X (red) = X-Factor: a star's signature power. It switches on once he gets hot in a game — a few big plays — and while it's on he's nearly unstoppable at that one thing.",
                      "★ (grey) = Superstar: always on, a steady boost to one skill. Tap any ability to see what it means. Both come straight from EA's Madden 27 ratings."],
      abilityFallback: function (x) { return "One of his " + (x ? "X-Factor powers." : "Superstar boosts."); },
      collegeLabel: "College", backupName: "janafari-backup.json",
      teams: [
        { abbr: "ARI", name: "Cardinals", color: "#a40227" }, { abbr: "ATL", name: "Falcons", color: "#a71930" }, { abbr: "BAL", name: "Ravens", color: "#29126f" },
        { abbr: "BUF", name: "Bills", color: "#00338d" }, { abbr: "CAR", name: "Panthers", color: "#0085ca" }, { abbr: "CHI", name: "Bears", color: "#0b1c3a" },
        { abbr: "CIN", name: "Bengals", color: "#fb4f14" }, { abbr: "CLE", name: "Browns", color: "#472a08" }, { abbr: "DAL", name: "Cowboys", color: "#002a5c" },
        { abbr: "DEN", name: "Broncos", color: "#0a2343" }, { abbr: "DET", name: "Lions", color: "#0076b6" }, { abbr: "GB", name: "Packers", color: "#204e32" },
        { abbr: "HOU", name: "Texans", color: "#021018" }, { abbr: "IND", name: "Colts", color: "#003b75" }, { abbr: "JAX", name: "Jaguars", color: "#007487" },
        { abbr: "KC", name: "Chiefs", color: "#e31837" }, { abbr: "LAC", name: "Chargers", color: "#0080c6" }, { abbr: "LAR", name: "Rams", color: "#003594" },
        { abbr: "LV", name: "Raiders", color: "#000000" }, { abbr: "MIA", name: "Dolphins", color: "#008e97" }, { abbr: "MIN", name: "Vikings", color: "#4f2683" },
        { abbr: "NE", name: "Patriots", color: "#002a5c" }, { abbr: "NO", name: "Saints", color: "#d3bc8d" }, { abbr: "NYG", name: "Giants", color: "#003c7f" },
        { abbr: "NYJ", name: "Jets", color: "#115740" }, { abbr: "PHI", name: "Eagles", color: "#06424d" }, { abbr: "PIT", name: "Steelers", color: "#000000" },
        { abbr: "SEA", name: "Seahawks", color: "#002a5c" }, { abbr: "SF", name: "49ers", color: "#aa0000" }, { abbr: "TB", name: "Buccaneers", color: "#bd1c36" },
        { abbr: "TEN", name: "Titans", color: "#4495d2" }, { abbr: "WSH", name: "Commanders", color: "#5a1414" }
      ],
      statLabels: {
        speed: "Speed", acceleration: "Acceleration", agility: "Agility", strength: "Strength", awareness: "Awareness", jumping: "Jumping",
        stamina: "Stamina", injury: "Injury", toughness: "Toughness", throwPower: "Throw power", throwAccuracyShort: "Short accuracy",
        throwAccuracyMid: "Mid accuracy", throwAccuracyDeep: "Deep accuracy", throwOnTheRun: "Throw on the run", throwUnderPressure: "Under pressure",
        playAction: "Play action", breakSack: "Break sack", carrying: "Carrying", bCVision: "Ball carrier vision", trucking: "Trucking",
        breakTackle: "Break tackle", jukeMove: "Juke", spinMove: "Spin", stiffArm: "Stiff arm", changeOfDirection: "Change of direction",
        catching: "Catching", catchInTraffic: "Catch in traffic", spectacularCatch: "Spectacular catch", release: "Release",
        shortRouteRunning: "Short routes", mediumRouteRunning: "Medium routes", deepRouteRunning: "Deep routes", runBlock: "Run block",
        passBlock: "Pass block", runBlockPower: "Run block power", runBlockFinesse: "Run block finesse", passBlockPower: "Pass block power",
        passBlockFinesse: "Pass block finesse", leadBlock: "Lead block", impactBlocking: "Impact blocking", tackle: "Tackle", hitPower: "Hit power",
        pursuit: "Pursuit", playRecognition: "Play recognition", blockShedding: "Block shedding", finesseMoves: "Finesse moves",
        powerMoves: "Power moves", manCoverage: "Man coverage", zoneCoverage: "Zone coverage", press: "Press", kickPower: "Kick power",
        kickAccuracy: "Kick accuracy", kickReturn: "Kick return", runningStyle: "Running style"
      },
      hideStats: { injury: 1, toughness: 1, stamina: 1, runningStyle: 1 }
    },
    nba: {
      key: "nba", game: "NBA 2K27", icon: "🏀", noun: "NBA",
      title: "Janafari — NBA 2K27 Ratings", desc: "Your 2K clubhouse · NBA 2K27 ratings",
      storageKey: "janafari-nba-v1", legacyKey: null, teamKey: "janafari-nba-team",
      dataUrl: "data/nba/ratings.json", historyUrl: "data/nba/history.json", defsUrl: "data/nba/badges.json?v=1", statsDir: "data/nba/stats/",
      freeUrl: "data/nba/free-agents.json",   // 2K's free agency list, plus anyone off every roster
      source: "2K Ratings", sourceLong: "the NBA 2K27 Play Now database at 2K Ratings", sourceLink: "https://www.2kratings.com/",
      club: { min: 95, label: "rated 95 or better" },
      sides: ["guard", "forward", "center"],
      facts: false,
      arcade: { url: "hoops.js?v=4", api: "JanafariHoops", modal: "hoopsModal", name: "Janafari Jam", egg: "eggBall" },
      // ESPN's logo slugs are not the NBA's abbreviations for six clubs
      logo: function (abbr) { var s = { GSW: "gs", NOP: "no", NYK: "ny", SAS: "sa", UTA: "utah", WAS: "wsh" }[abbr] || abbr.toLowerCase(); return "https://a.espncdn.com/i/teamlogos/nba/500/" + s + ".png"; },
      tiers: { x: { short: "HOF", name: "Hall of Fame badge", kicker: "HALL OF FAME" } },   // Gold is too common to be a card badge (227 of 535 players)
      abilitiesLabel: "Badges", abilitiesQuestion: "What are 2K badges?",
      abilitiesHelp: ["Badges are the skills 2K gives a player on top of his numbers — each one makes him better at one thing, like hitting threes off the dribble or finishing through contact.",
                      "They come in levels: Bronze, Silver, Gold, Hall of Fame and Legend. A purple HOF on a card means he has at least one Hall of Fame badge. Tap any badge to see what it does."],
      abilityFallback: function () { return "One of his 2K badges."; },
      collegeLabel: "Before the NBA", backupName: "janafari-nba-backup.json",
      teams: [
        { abbr: "ATL", name: "Hawks", color: "#c8102e" }, { abbr: "BOS", name: "Celtics", color: "#007a33" }, { abbr: "BKN", name: "Nets", color: "#000000" },
        { abbr: "CHA", name: "Hornets", color: "#1d1160" }, { abbr: "CHI", name: "Bulls", color: "#ce1141" }, { abbr: "CLE", name: "Cavaliers", color: "#860038" },
        { abbr: "DAL", name: "Mavericks", color: "#00538c" }, { abbr: "DEN", name: "Nuggets", color: "#0e2240" }, { abbr: "DET", name: "Pistons", color: "#c8102e" },
        { abbr: "GSW", name: "Warriors", color: "#1d428a" }, { abbr: "HOU", name: "Rockets", color: "#ce1141" }, { abbr: "IND", name: "Pacers", color: "#002d62" },
        { abbr: "LAC", name: "Clippers", color: "#c8102e" }, { abbr: "LAL", name: "Lakers", color: "#552583" }, { abbr: "MEM", name: "Grizzlies", color: "#5d76a9" },
        { abbr: "MIA", name: "Heat", color: "#98002e" }, { abbr: "MIL", name: "Bucks", color: "#00471b" }, { abbr: "MIN", name: "Timberwolves", color: "#0c2340" },
        { abbr: "NOP", name: "Pelicans", color: "#0c2340" }, { abbr: "NYK", name: "Knicks", color: "#006bb6" }, { abbr: "OKC", name: "Thunder", color: "#007ac1" },
        { abbr: "ORL", name: "Magic", color: "#0077c0" }, { abbr: "PHI", name: "76ers", color: "#006bb6" }, { abbr: "PHX", name: "Suns", color: "#1d1160" },
        { abbr: "POR", name: "Trail Blazers", color: "#e03a3e" }, { abbr: "SAC", name: "Kings", color: "#5a2d81" }, { abbr: "SAS", name: "Spurs", color: "#000000" },
        { abbr: "TOR", name: "Raptors", color: "#ce1141" }, { abbr: "UTA", name: "Jazz", color: "#002b5c" }, { abbr: "WAS", name: "Wizards", color: "#002b5c" }
      ],
      statLabels: {
        threePointShot: "Three-point shot", midRangeShot: "Mid-range shot", closeShot: "Close shot", freeThrow: "Free throw", offensiveConsistency: "Offensive consistency",
        shotIQ: "Shot IQ", speed: "Speed", strength: "Strength", agility: "Agility", vertical: "Vertical", hustle: "Hustle", stamina: "Stamina", overallDurability: "Durability",
        layup: "Layup", drivingDunk: "Driving dunk", standingDunk: "Standing dunk", postHook: "Post hook", postFade: "Post fade", postControl: "Post control",
        drawFoul: "Draw foul", hands: "Hands", ballHandle: "Ball handle", speedWithBall: "Speed with ball", passAccuracy: "Pass accuracy", passVision: "Pass vision",
        passIQ: "Pass IQ", block: "Block", steal: "Steal", passPerception: "Pass perception", interiorDefense: "Interior defense", perimeterDefense: "Perimeter defense",
        defensiveConsistency: "Defensive consistency", helpDefenseIQ: "Help defense IQ", defensiveRebound: "Defensive rebound", offensiveRebound: "Offensive rebound",
        intangibles: "Intangibles", potential: "Potential"
      },
      hideStats: { overallDurability: 1, stamina: 1, hustle: 1, intangibles: 1, potential: 1 }
    }
  };
  var SPORT_KEY_STORAGE = "janafari-sport";
  var sport = "nfl";            // "nfl" | "nba" — set once by boot(), changed only by switchSport()
  var SPORT = SPORTS.nfl;       // the active sport's config; every sport-specific string or list is read from here
  var loadGen = 0;              // bumped by every loadSport(); any XHR reply carrying an older number is dropped (Codex, 2026-09-19:
                                // a late NBA refresh landed in Madden's storage, a late NBA stats sheet was cached for Madden's IND)
  var ABILITY_DEFS = null;      // {lines:{name:text}, official:{name:{description,imageUrl}}} once loaded (abilities.json / badges.json)
  var LEAGUE_LIMIT = 100;      // league tab with no search: the top 100
  var SEARCH_LIMIT = 120;      // a search never renders more than this (old iPads froze on 3,000)
  var PAGE = 24;               // cards drawn before "Show more" (portraits are ~120 KB each)
  var SVG_NS = "http://www.w3.org/2000/svg";

  var DATA = null;          // {game, iteration, iterations, fetched, count, players:[...]}
  var FREE = null;          // free agents: null = the file has not been read yet, [] = read and empty
  var byId = {};            // id -> player (the feed, plus any free agent once FREE is loaded)
  var statsCache = {};      // team -> {id: {stats, diffs}}
  var state;                // {version:2, watchlist:[ids], snapshots:[{id,label,date,ratings}]}
  var selectedSnapshot = 0;
  var tab = "watch";        // "watch" | "league"
  var activeFilter = "all";
  var activeTeam = "";      // "" = every team; "FA" = free agents; else a club abbreviation
  var viewMode = "cards";
  var searchTerm = "";
  var shownLimit = PAGE;    // grows with "Show more"; resets on any filter/search/tab change
  var toastTimer, searchTimer;
  var openRequest = 0;      // openPlayer() token: a slow stats request must never paint another player's card
  var lastFocus = null;     // element to return focus to when a modal closes

  var playerBio = {
    "jonathan-taylor": { college: "Wisconsin", draftYear: 2020, draftRound: 2, draftPick: 41, playoffs: [2020], superBowls: [] },
    "justin-jefferson": { college: "LSU", draftYear: 2020, draftRound: 1, draftPick: 22, playoffs: [2022, 2024], superBowls: [] },
    "christian-gonzalez": { college: "Oregon", draftYear: 2023, draftRound: 1, draftPick: 17, playoffs: [2025], superBowls: [] },
    "christian-mccaffrey": { college: "Stanford", draftYear: 2017, draftRound: 1, draftPick: 8, playoffs: [2017, 2022, 2023, 2025], superBowls: [] },
    "derrick-brown": { college: "Auburn", draftYear: 2020, draftRound: 1, draftPick: 7, playoffs: [2025], superBowls: [] },
    "fred-warner": { college: "BYU", draftYear: 2018, draftRound: 3, draftPick: 70, playoffs: [2019, 2021, 2022, 2023, 2025], superBowls: [] },
    "garett-bolles": { college: "Utah", draftYear: 2017, draftRound: 1, draftPick: 20, playoffs: [2024, 2025], superBowls: [] },
    "george-kittle": { college: "Iowa", draftYear: 2017, draftRound: 5, draftPick: 146, playoffs: [2019, 2021, 2022, 2023, 2025], superBowls: [] },
    "jahmyr-gibbs": { college: "Alabama", draftYear: 2023, draftRound: 1, draftPick: 12, playoffs: [2023, 2024], superBowls: [] },
    "jamarr-chase": { college: "LSU", draftYear: 2021, draftRound: 1, draftPick: 5, playoffs: [2021, 2022], superBowls: [] },
    "jaxon-smith-njigba": { college: "Ohio State", draftYear: 2023, draftRound: 1, draftPick: 20, playoffs: [2025], superBowls: [2025] },
    "joe-burrow": { college: "LSU", draftYear: 2020, draftRound: 1, draftPick: 1, playoffs: [2021, 2022], superBowls: [] },
    "josh-allen": { college: "Wyoming", draftYear: 2018, draftRound: 1, draftPick: 7, playoffs: [2019, 2020, 2021, 2022, 2023, 2024, 2025], superBowls: [] },
    "lane-johnson": { college: "Oklahoma", draftYear: 2013, draftRound: 1, draftPick: 4, playoffs: [2013, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025], superBowls: [2017, 2024] },
    "matthew-stafford": { college: "Georgia", draftYear: 2009, draftRound: 1, draftPick: 1, playoffs: [2011, 2014, 2016, 2021, 2023, 2024, 2025], superBowls: [2021] },
    "maxx-crosby": { college: "Eastern Michigan", draftYear: 2019, draftRound: 4, draftPick: 106, playoffs: [2021], superBowls: [] },
    "micah-parsons": { college: "Penn State", draftYear: 2021, draftRound: 1, draftPick: 12, playoffs: [2021, 2022, 2023, 2025], superBowls: [] },
    "myles-garrett": { college: "Texas A&M", draftYear: 2017, draftRound: 1, draftPick: 1, playoffs: [2020, 2023], superBowls: [] },
    "patrick-surtain": { college: "Alabama", draftYear: 2021, draftRound: 1, draftPick: 9, playoffs: [2024, 2025], superBowls: [] },
    "penei-sewell": { college: "Oregon", draftYear: 2021, draftRound: 1, draftPick: 7, playoffs: [2023, 2024], superBowls: [] },
    "puka-nacua": { college: "BYU", draftYear: 2023, draftRound: 5, draftPick: 177, playoffs: [2023, 2024, 2025], superBowls: [] },
    "trey-mcbride": { college: "Colorado State", draftYear: 2022, draftRound: 2, draftPick: 55, playoffs: [], superBowls: [] }
  };


  var teamColors = {}, knownTeam = {};
  // Point the page at one sport: team lookups, the html[data-sport] hook that shows/hides the
  // other sport's copy, the document title and the League tab's ball. Data is loaded separately.
  function applySport(which) {
    sport = SPORTS[which] ? which : "nfl"; SPORT = SPORTS[sport];
    teamColors = {}; knownTeam = {};
    SPORT.teams.forEach(function (t) { teamColors[t.abbr] = t.color; knownTeam[t.abbr] = true; });
    document.documentElement.setAttribute("data-sport", sport);
    document.title = SPORT.title;
    var desc = document.querySelector(".brand-desc"); if (desc) { desc.textContent = SPORT.desc; }
    var ball = document.querySelector("#tab-league .tab-icon"); if (ball) { ball.textContent = SPORT.icon; }
    var sw = el("sportSwitch"); if (sw) { sw.setAttribute("data-on", sport); }   // slides the gold patch
    Array.prototype.forEach.call(document.querySelectorAll(".sport-btn"), function (b) {
      var on = b.getAttribute("data-sport-pick") === sport;
      b.className = "sport-btn" + (on ? " active" : ""); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  /* ---------- tiny DOM helpers ---------- */
  function el(id) { return document.getElementById(id); }
  function clear(node) { while (node && node.firstChild) { node.removeChild(node.firstChild); } }
  function textNode(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    node.appendChild(document.createTextNode(text));
    return node;
  }
  function initials(name) {
    return String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("") || "?";
  }
  function slugify(name) { return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function formatDate(value) {
    if (!value) { return "—"; }
    var d = new Date(String(value).length === 10 ? value + "T12:00:00Z" : value);
    if (isNaN(d.getTime())) { return String(value); }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  function heightText(inches) {
    if (!inches) { return "—"; }
    return Math.floor(inches / 12) + "'" + (inches % 12) + '"';
  }
  // Only the clubs have a badge; free agents ("FA") get a neutral monogram, never a 404.
  function logoUrl(abbr) { return knownTeam[abbr] ? SPORT.logo(abbr) : null; }
  function teamText(p) { return p.team === "FA" ? "Free agent" : p.team + " · " + p.teamName; }
  // The top tier of an ability/badge: "x" for the headline kind, "star" for the next, "" for none.
  //   Madden: X-Factor → "x", Superstar → "star".   2K: Legend or Hall of Fame → "x", everything else "" (Gold is too common).
  function abilityTier(a) {
    var t = String(a.type || "");
    if (sport === "nba") { return /legend|hall of fame/i.test(t) ? "x" : ""; }
    return /x-factor/i.test(t) ? "x" : "star";
  }
  function isTop(a) { return abilityTier(a) === "x"; }
  function tierOf(p) {
    var i, list = p.abilities || [], star = false, t;
    for (i = 0; i < list.length; i += 1) { t = abilityTier(list[i]); if (t === "x") { return "x"; } if (t === "star") { star = true; } }
    return star ? "star" : "";
  }
  function badgeNode(p) {
    var tier = tierOf(p); if (!tier) { return null; }
    var b = textNode("span", "tier-badge tier-" + tier, SPORT.tiers[tier].short);
    b.title = SPORT.tiers[tier].name; b.setAttribute("aria-label", SPORT.tiers[tier].name + " player");
    return b;
  }
  // Our plain-English line for an ability or badge (abilities.json keeps xfactor/superstar maps; badges.json keeps one "lines" map).
  function abilityText(a) {
    if (!ABILITY_DEFS) { return null; }
    var lines = ABILITY_DEFS.lines || (isTop(a) ? ABILITY_DEFS.xfactor : ABILITY_DEFS.superstar) || {};
    return lines[a.label] || null;
  }
  function officialDef(a) { var o = ABILITY_DEFS && (ABILITY_DEFS.official || ABILITY_DEFS.ea); return o ? o[a.label] : null; }
  function isClub(r) { return r !== null && r >= SPORT.club.min; }

  /* ---------- state ---------- */
  function makeDefaultState() { return { version: 2, watchlist: [], snapshots: [], faSeen: {} }; }
  function isArray(v) { return Object.prototype.toString.call(v) === "[object Array]"; }
  function validState(v) {
    if (!v || v.version !== 2 || !isArray(v.watchlist) || !isArray(v.snapshots)) { return false; }
    for (var i = 0; i < v.snapshots.length; i += 1) {
      var s = v.snapshots[i];
      if (!s || typeof s.id !== "string" || !s.ratings || typeof s.ratings !== "object") { return false; }
    }
    return true;
  }
  function validFeed(doc) {
    return !!(doc && doc.iteration && typeof doc.iteration.id === "string" && isArray(doc.players) && doc.players.length > 100
      && doc.players[0] && typeof doc.players[0].ovr === "number" && typeof doc.players[0].name === "string");
  }
  function loadState() {
    var raw = null;
    try { raw = window.localStorage.getItem(SPORT.storageKey); } catch (e) {}
    try { state = raw ? JSON.parse(raw) : null; } catch (e) { state = null; }
    if (!validState(state)) { state = makeDefaultState(); }
    if (!state.faSeen || typeof state.faSeen !== "object" || isArray(state.faSeen)) { state.faSeen = {}; }
  }
  function saveState() {
    try { window.localStorage.setItem(SPORT.storageKey, JSON.stringify(state)); return true; }
    catch (e) { showToast("Could not save on this device"); return false; }
  }

  // The v1 board let people type ratings by hand. Its PLAYER LIST becomes the
  // watchlist (matched by name against the real feed); its typed numbers are
  // dropped on purpose — the feed is the only source of ratings now.
  function migrateLegacy() {
    if (!SPORT.legacyKey || state.watchlist.length) { return; }   // only the list matters; snapshots may already exist from history.json
    var raw = null, legacy = null;
    try { raw = window.localStorage.getItem(SPORT.legacyKey); } catch (e) {}
    if (!raw) { return; }
    try { legacy = JSON.parse(raw); } catch (e) { return; }
    if (!legacy || !legacy.players) { return; }
    var index = {};
    DATA.players.forEach(function (p) { index[slugify(p.name)] = p.id; });
    legacy.players.forEach(function (p) {
      var id = index[slugify(p.name)];
      if (id && state.watchlist.indexOf(id) === -1) { state.watchlist.push(id); }
    });
  }

  // One snapshot per feed iteration — but the CONTENT wins over the id. EA grew "1-base"
  // from 2,364 to 3,111 players without a new id, so a same-id snapshot whose ratings
  // differ is replaced in place. Returns "new", "updated" or "same".
  function ensureSnapshot() {
    var i, k, ratings = {}, existing = null, differs = false;
    DATA.players.forEach(function (p) { if (typeof p.ovr === "number") { ratings[p.id] = p.ovr; } });
    for (i = 0; i < state.snapshots.length; i += 1) {
      if (state.snapshots[i].id === DATA.iteration.id) { existing = state.snapshots[i]; break; }
    }
    if (!existing) {
      state.snapshots.push({ id: DATA.iteration.id, label: DATA.iteration.label, date: String(DATA.fetched || "").slice(0, 10), ratings: ratings });
      return "new";
    }
    for (k in ratings) { if (ratings.hasOwnProperty(k) && existing.ratings[k] !== ratings[k]) { differs = true; break; } }
    if (!differs) { for (k in existing.ratings) { if (existing.ratings.hasOwnProperty(k) && !ratings.hasOwnProperty(k)) { differs = true; break; } } }
    if (!differs) { return "same"; }
    existing.ratings = ratings; existing.label = DATA.iteration.label; existing.date = String(DATA.fetched || "").slice(0, 10);
    return "updated";
  }

  // Merge the committed history into this device's snapshots, in feed order, so a week the page
  // was not opened still shows up in trends. Same-id entries are replaced by the committed copy.
  function mergeHistory(history) {
    if (!isArray(history) || !history.length) { return false; }
    var changed = false, merged = [], seen = {};
    history.forEach(function (h) {
      if (!h || typeof h.id !== "string" || !h.ratings || typeof h.ratings !== "object" || isArray(h.ratings)) { return; }
      var mine = null, i;
      for (i = 0; i < state.snapshots.length; i += 1) { if (state.snapshots[i].id === h.id) { mine = state.snapshots[i]; break; } }
      // The committed copy WINS on a same-id week (K3, round 2): EA has edited an iteration in place
      // before, and only the current iteration is content-checked by ensureSnapshot().
      if (!mine || mine.label !== h.label || mine.date !== h.date || JSON.stringify(mine.ratings) !== JSON.stringify(h.ratings)) { changed = true; }
      merged.push({ id: h.id, label: h.label, date: h.date, ratings: h.ratings }); seen[h.id] = true;
    });
    // a local-only snapshot (e.g. newer than the committed history) is kept, then everything is put in date order
    state.snapshots.forEach(function (s) { if (!seen[s.id]) { merged.push(s); seen[s.id] = true; } });
    merged.sort(function (a, b) { return String(a.date || "") < String(b.date || "") ? -1 : (String(a.date || "") > String(b.date || "") ? 1 : 0); });
    for (var j = 0; j < merged.length; j += 1) { if (!state.snapshots[j] || state.snapshots[j].id !== merged[j].id) { changed = true; } }
    if (changed) { state.snapshots = merged; }
    return changed;
  }

  /* ---------- data ---------- */
  function fetchJson(url, ok, fail) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 30000;
    xhr.onload = function () {
      var data = null;
      if (xhr.status >= 200 && xhr.status < 300) { try { data = JSON.parse(xhr.responseText); } catch (e) { data = null; } }
      if (data) { ok(data); } else { fail(); }
    };
    xhr.onerror = fail; xhr.ontimeout = fail;
    xhr.send();
  }
  function useData(doc) {
    DATA = doc;
    FREE = null;       // the other sport's free agents are not this sport's
    byId = {};
    statsCache = {};   // attributes belong to a dataset; a new one invalidates them
    DATA.players.forEach(function (p) { byId[p.id] = p; });
  }
  function player(id) { return byId[id]; }

  /* ---------- free agents ----------
     Neither source rates a player who is not on a roster. EA dropped 1,215 of its 1,240 free agents
     the week the real season started; 2K keeps its unsigned players on a page of their own. Either way
     they are NOT in ratings.json, and the page used to react by deleting them — off the board, and
     silently off someone's list of players. They live in their own file instead, marked `gone`, and are
     read on demand: the boot only waits for them when a watched player is missing from the feed. */
  function loadFree(cb) {
    if (FREE) { if (cb) { cb(FREE); } return; }
    var gen = loadGen;
    var done = function (list) {
      if (gen !== loadGen) { return; }   // a sport switch while this was in flight
      FREE = list;
      FREE.forEach(function (p) { p.gone = true; if (!byId[p.id]) { byId[p.id] = p; } });
      if (cb) { cb(FREE); }
    };
    if (!SPORT.freeUrl) { done([]); return; }
    fetchJson(SPORT.freeUrl, function (doc) { done(doc && isArray(doc.players) ? doc.players : []); }, function () { done([]); });
  }
  function hasFreeAgents() { return !!(FREE && FREE.length); }
  // "Free agent" on its own when the source still rates him (2K's free agency page); the week his
  // numbers are frozen at when it does not (everyone EA stopped rating).
  function lastRatedIn(p) { return (p.gone && p.lastSeen && p.lastSeen.label) || ""; }

  /* ---------- ratings & changes ---------- */
  function snapRating(id, snapIndex) {
    var snap = state.snapshots[snapIndex === undefined ? selectedSnapshot : snapIndex];
    return snap && typeof snap.ratings[id] === "number" ? snap.ratings[id] : null;
  }
  // A free agent is in no week's snapshot, so his own record carries the last rating he was given.
  function rating(id, snapIndex) {
    var v = snapRating(id, snapIndex), p;
    if (v !== null) { return v; }
    p = byId[id];
    return p && p.gone && typeof p.ovr === "number" ? p.ovr : null;
  }
  function getChange(id, snapIndex) {
    var i = snapIndex === undefined ? selectedSnapshot : snapIndex;
    if (byId[id] && byId[id].gone) { return null; }   // nothing to compare: he was not rated this week
    if (i === 0) { return null; }
    var now = snapRating(id, i), before = snapRating(id, i - 1);
    if (now === null || before === null) { return null; }
    return now - before;
  }
  function hasHistory() { return state.snapshots.length > 1; }
  function changeFor(p) { return p.gone ? { text: "FA", cls: "change-fa" } : changeParts(getChange(p.id)); }
  function changeParts(change) {
    if (change === null && !hasHistory()) { return { text: "", cls: "change-none" }; }
    if (change === null) { return { text: "NEW", cls: "change-new" }; }
    if (change > 0) { return { text: "▲ " + change, cls: "change-up" }; }
    if (change < 0) { return { text: "▼ " + Math.abs(change), cls: "change-down" }; }
    return { text: "—", cls: "change-flat" };
  }
  function isWatched(id) { return state.watchlist.indexOf(id) !== -1; }
  function toggleWatch(p) {
    if (isWatched(p.id)) {
      state.watchlist = state.watchlist.filter(function (id) { return id !== p.id; });
      showToast(p.name + " removed from your players");
    } else {
      state.watchlist.push(p.id);
      showToast(p.name + " added to your players");
    }
    saveState();
  }

  /* ---------- which players are on screen ---------- */
  function poolForTab() {
    if (tab === "watch") {
      return state.watchlist.map(player).filter(function (p) { return p; });
    }
    if (activeTeam === "FA") { return FREE || []; }
    // Searchable, so a free agent can still be found and added — but kept out of the plain league board,
    // where his frozen rating would sit among this week's numbers as though it were one of them.
    if (searchTerm && FREE) { return DATA.players.concat(FREE); }
    return DATA.players;
  }
  function sortByRating(list) {
    var out = list.slice(0);
    out.sort(function (a, b) {
      var ra = rating(a.id), rb = rating(b.id);
      return (rb === null ? -1 : rb) - (ra === null ? -1 : ra) || a.name.localeCompare(b.name);
    });
    return out;
  }
  function matchesSearch(p, query) {
    return !query || (p.name + " " + p.team + " " + p.teamName + " " + p.teamFull + " " + p.pos).toLowerCase().indexOf(query) !== -1;
  }
  function matchesTeam(p) { return !activeTeam || p.team === activeTeam; }
  function matchesFilter(p) {
    if (activeFilter === "all") { return true; }
    if (activeFilter === "stars") { return !!tierOf(p); }
    if (activeFilter === "movers") { var c = getChange(p.id); return c !== null && c !== 0; }
    return p.side === activeFilter;
  }
  // Returns {list, total}: `list` is what may be drawn, `total` how many matched before any cap.
  function filteredPlayers() {
    var query = searchTerm.toLowerCase().replace(/^\s+|\s+$/g, "");
    var all = sortByRating(poolForTab()).filter(function (p) { return matchesTeam(p) && matchesSearch(p, query) && matchesFilter(p); });
    var list = all;
    if (tab === "league" && !query && !activeTeam && activeFilter !== "movers") { list = all.slice(0, LEAGUE_LIMIT); }   // a whole team fits; the whole league does not
    else if (query || activeTeam === "FA") { list = all.slice(0, SEARCH_LIMIT); }
    return { list: list, total: all.length, query: query };
  }

  /* ---------- portraits ---------- */
  function buildPortrait(p) {
    var wrap = document.createElement("div");
    var mono = textNode("span", "portrait-mono", initials(p.name));
    wrap.className = "portrait";
    wrap.style.backgroundColor = teamColors[p.team] || "#174a6e";
    wrap.appendChild(mono);
    if (p.avatar) {
      var img = document.createElement("img");
      img.alt = "";
      img.addEventListener("load", function () { wrap.className += " has-photo"; });
      img.addEventListener("error", function () { if (img.parentNode) { img.parentNode.removeChild(img); } });
      img.src = p.avatar;
      if (img.complete && img.naturalWidth > 0) { wrap.className += " has-photo"; }
      wrap.appendChild(img);
    }
    return wrap;
  }
  function buildLogo(p) {
    var src = logoUrl(p.team);
    if (!src) { return null; }
    var logo = document.createElement("img");
    logo.className = "team-logo"; logo.src = src; logo.alt = ""; logo.setAttribute("aria-hidden", "true");
    logo.addEventListener("error", function () { if (logo.parentNode) { logo.parentNode.removeChild(logo); } });
    return logo;
  }

  /* ---------- sparkline over the saved weeks ---------- */
  function makeSparkline(id) {
    var svg = document.createElementNS(SVG_NS, "svg");
    var guide = document.createElementNS(SVG_NS, "line");
    var polyline = document.createElementNS(SVG_NS, "polyline");
    var dot = document.createElementNS(SVG_NS, "circle");
    var values = [], points = [], i, x, y, min, max, range;
    svg.setAttribute("class", "sparkline"); svg.setAttribute("viewBox", "0 0 95 30"); svg.setAttribute("aria-label", "Rating history");
    guide.setAttribute("x1", "2"); guide.setAttribute("x2", "93"); guide.setAttribute("y1", "25"); guide.setAttribute("y2", "25");
    svg.appendChild(guide);
    for (i = 0; i <= selectedSnapshot; i += 1) { if (snapRating(id, i) !== null) { values.push(snapRating(id, i)); } }
    if (!values.length) { return svg; }
    min = Math.min.apply(Math, values); max = Math.max.apply(Math, values); range = Math.max(max - min, 2);
    for (i = 0; i < values.length; i += 1) {
      x = values.length === 1 ? 47 : 3 + (89 * i / (values.length - 1));
      y = 24 - ((values[i] - min + (range - (max - min)) / 2) / range * 18);
      points.push(x.toFixed(1) + "," + y.toFixed(1));
    }
    if (values.length > 1) { polyline.setAttribute("points", points.join(" ")); svg.appendChild(polyline); }
    dot.setAttribute("cx", points[points.length - 1].split(",")[0]); dot.setAttribute("cy", points[points.length - 1].split(",")[1]); dot.setAttribute("r", "3");
    svg.appendChild(dot);
    return svg;
  }

  /* ---------- cards & rows ----------
     A card is one flex row: portrait · name + position/team/badge · OVR.
     Nothing is absolutely positioned over anything else, so nothing can overlap. */
  function buildCard(p, rank) {
    var r = rating(p.id), parts = changeFor(p), watched = isWatched(p.id);
    var card = document.createElement("button"), body = document.createElement("div"), meta = document.createElement("div"), right = document.createElement("div"), ovr = document.createElement("span");
    card.type = "button";
    card.className = "pcard" + (isClub(r) ? " is-99" : "") + (watched ? " is-watched" : "");
    card.setAttribute("aria-label", p.name + ", " + p.pos + ", " + teamText(p) + ", overall " + (r === null ? "unknown" : r));
    card.appendChild(buildPortrait(p));
    body.className = "pcard-body";
    body.appendChild(textNode("h3", "pcard-name", p.name));
    meta.className = "pcard-meta";
    meta.appendChild(textNode("span", "pos-pill", p.pos));
    var bdg = badgeNode(p); if (bdg) { meta.appendChild(bdg); }
    var logo = buildLogo(p); if (logo) { meta.appendChild(logo); }
    meta.appendChild(textNode("span", "pcard-team", teamText(p)));
    body.appendChild(meta);
    card.appendChild(body);
    right.className = "pcard-right";
    var rankLine = textNode("span", "pcard-rank", "#" + rank);
    if (watched) { rankLine.appendChild(textNode("span", "watch-star", " ★")); }
    right.appendChild(rankLine);
    ovr.className = "ovr";
    ovr.appendChild(document.createTextNode(r === null ? "—" : String(r)));
    ovr.appendChild(textNode("small", "", "OVR"));
    right.appendChild(ovr);
    if (parts.text) { right.appendChild(textNode("span", "change " + parts.cls, parts.text)); }
    card.appendChild(right);
    card.addEventListener("click", function () { openPlayer(p, card); });
    return card;
  }

  function buildRow(p, rank) {
    var r = rating(p.id), parts = changeFor(p);
    var row = document.createElement("tr");
    var playerCell = document.createElement("td"), ovrCell = document.createElement("td"), changeCell = document.createElement("td"), trendCell = document.createElement("td");
    var wrap = document.createElement("div"), info = document.createElement("span");
    row.className = "prow"; row.setAttribute("tabindex", "0"); row.setAttribute("role", "button");
    row.setAttribute("aria-label", p.name + ", " + p.pos + ", " + teamText(p) + ", overall " + (r === null ? "unknown" : r));
    wrap.className = "player-wrap"; info.className = "player-info";
    info.appendChild(textNode("span", "player-name", p.name + (isWatched(p.id) ? " ★" : "")));
    var sub = textNode("span", "player-sub", p.pos + " · " + teamText(p)); var rb = badgeNode(p); if (rb) { sub.insertBefore(rb, sub.firstChild); }
    info.appendChild(sub);
    wrap.appendChild(buildPortrait(p)); wrap.appendChild(info); playerCell.appendChild(wrap);
    ovrCell.className = "center"; ovrCell.appendChild(textNode("span", "ovr-badge" + (isClub(r) ? " ovr-99" : ""), r === null ? "—" : String(r)));
    row.appendChild(textNode("td", "rank-col", String(rank))); row.appendChild(playerCell); row.appendChild(ovrCell);
    if (hasHistory()) {
      changeCell.className = "center col-change"; changeCell.appendChild(textNode("span", "change " + parts.cls, parts.text));
      trendCell.className = "col-trend"; trendCell.appendChild(makeSparkline(p.id));
      row.appendChild(changeCell); row.appendChild(trendCell);
    }
    row.addEventListener("click", function () { openPlayer(p, row); });
    row.addEventListener("keydown", function (e) { if (e.keyCode === 13 || e.keyCode === 32) { e.preventDefault(); openPlayer(p, row); } });
    return row;
  }

  /* ---------- the one-line stat strip ---------- */
  function renderSummary() {
    var pool = poolForTab();
    var club = pool.filter(function (p) { return isClub(rating(p.id)); });
    var movers = pool.map(function (p) { return { p: p, c: getChange(p.id) }; }).filter(function (m) { return m.c !== null && m.c !== 0; });
    movers.sort(function (a, b) { return Math.abs(b.c) - Math.abs(a.c); });
    el("clubCount").textContent = String(club.length); el("clubLabel").textContent = SPORT.club.label;
    // On the watch tab, count what is actually on the board: an id no source carries any more is kept
    // in storage (it costs nothing, and comes back if he does) but it is not a player anyone can see.
    var mine = tab === "watch" ? pool.length : DATA.count;
    el("trackedCount").textContent = String(mine);
    el("trackedLabel").textContent = tab === "watch" ? (mine === 1 ? "player on my list" : "players on my list") : "players rated";
    el("moverStat").hidden = !movers.length;
    if (movers.length) {
      el("moverValue").textContent = (movers[0].c > 0 ? "+" : "") + movers[0].c;
      el("moverName").textContent = movers[0].p.name.split(" ").pop() + " · biggest mover";
    }
    // "Updated" is when the feed was last pulled — never a snapshot date dressed up as the feed date.
    var snap = state.snapshots[selectedSnapshot];
    el("sourceStamp").textContent = snap.label + " · updated " + formatDate(DATA.fetched);
    el("footerStamp").textContent = DATA.game + " · " + SPORT.source + " checked " + formatDate(DATA.fetched) + " · " + DATA.count + " players";
    el("moreStamp").textContent = " Last checked " + formatDate(DATA.fetched) + " (" + snap.label + ").";
  }

  function renderWeekSelect() {
    var select = el("weekSelect");
    clear(select);
    state.snapshots.forEach(function (s, i) {
      var opt = document.createElement("option");
      opt.value = String(i); opt.text = s.label + " · " + formatDate(s.date);
      if (i === selectedSnapshot) { opt.selected = true; }
      select.appendChild(opt);
    });
    el("weekRow").hidden = !hasHistory();      // one option is not a choice
    el("moversChip").hidden = !hasHistory();   // nothing can have moved before week two
    el("thChange").hidden = !hasHistory(); el("thTrend").hidden = !hasHistory();
  }

  function renderTabs() {
    Array.prototype.forEach.call(document.querySelectorAll(".tab[data-tab]"), function (btn) {
      var on = btn.getAttribute("data-tab") === tab;
      btn.className = "tab" + (on ? " active" : "");
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.setAttribute("tabindex", on ? "0" : "-1");   // roving tabindex: one tab stop, arrows move inside
    });
    var panel = el("boardPanel"); if (panel) { panel.setAttribute("aria-labelledby", "tab-" + tab); }
    el("watchTabCount").textContent = String(state.watchlist.filter(function (id) { return player(id); }).length);
    el("searchInput").placeholder = tab === "watch" ? "Search my players" : "Search any player or team";
  }

  function renderFilterCounts() {
    var query = searchTerm.toLowerCase().replace(/^\s+|\s+$/g, "");
    var counts = { all: 0, stars: 0, movers: 0 }; SPORT.sides.forEach(function (s) { counts[s] = 0; });
    poolForTab().forEach(function (p) {
      if (!matchesTeam(p) || !matchesSearch(p, query)) { return; }
      var c = getChange(p.id);
      counts.all += 1;
      if (counts.hasOwnProperty(p.side)) { counts[p.side] += 1; }
      if (tierOf(p)) { counts.stars += 1; }
      if (c !== null && c !== 0) { counts.movers += 1; }
    });
    Array.prototype.forEach.call(document.querySelectorAll(".chip[data-filter]"), function (btn) {
      var key = btn.getAttribute("data-filter"), label = btn.getAttribute("data-label");
      if (!label) { label = btn.textContent.replace(/\s+\d+$/, "").trim(); btn.setAttribute("data-label", label); }
      clear(btn); btn.appendChild(document.createTextNode(label)); btn.appendChild(textNode("span", "chip-count", String(counts[key] || 0)));
      btn.className = "chip" + (key === activeFilter ? " active" : "");
    });
  }

  function renderEmptyState(count) {
    var box = el("emptyState");
    box.hidden = count > 0;
    if (count > 0) { return; }
    var icon = SPORT.icon, title = "No players here", hint = "Try a different button up top.", action = null;
    if (tab === "watch" && !state.watchlist.length) {
      icon = "⭐"; title = "No players on your list yet"; hint = "Find anyone in the league and tap “Add to my players”. His real " + SPORT.game + " rating comes with him.";
      action = { label: "Find players", run: openAdd };
    }
    else if (activeTeam === "FA" && tab === "league" && !searchTerm && activeFilter !== "movers") { icon = SPORT.icon; title = "No free agents right now"; hint = "Everyone " + SPORT.source + " rates is on a roster."; action = { label: "Show all teams", run: function () { setTeam(""); } }; }
    else if (activeFilter === "movers") { icon = "😴"; title = "Nobody moved this week"; hint = activeTeam === "FA" ? "Free agents are not rated week to week, so they never move." : "Every rating stayed the same."; }
    else if (activeTeam && tab === "watch") { icon = SPORT.icon; title = "None of your players are on the " + teamLabel(activeTeam); hint = "Try the League tab to see the whole roster."; action = { label: "Show all teams", run: function () { setTeam(""); } }; }
    else if (searchTerm) { icon = "🔍"; title = "No player called “" + searchTerm + "”"; hint = tab === "watch" ? "He may not be on your list yet — try the League tab." : "Check the spelling."; }
    clear(box);
    box.appendChild(textNode("div", "empty-icon", icon));
    box.appendChild(textNode("strong", "empty-title", title));
    box.appendChild(textNode("p", "empty-hint", hint));
    if (action) { var b = textNode("button", "button button-gold", action.label); b.type = "button"; b.addEventListener("click", action.run); box.appendChild(b); }
  }

  function applyView() {
    var grid = el("playerCards"), wrap = el("tableWrap"), cards = viewMode === "cards";
    grid.hidden = !cards; wrap.hidden = cards;
    Array.prototype.forEach.call(document.querySelectorAll(".view-btn"), function (btn) {
      var on = btn.getAttribute("data-view") === viewMode;
      btn.className = "view-btn" + (on ? " active" : ""); btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  // Phones never show the table (the toggle is hidden by CSS), so draw cards there whatever was saved.
  function effectiveView() { return window.innerWidth <= 600 ? "cards" : viewMode; }

  // Only the visible layout is built, and only `shownLimit` of it — the rest waits for "Show more".
  function redraw() {
    var res = filteredPlayers(), visible = res.list, drawn = visible.slice(0, shownLimit), note = "";
    renderTabs(); renderSummary(); renderFilterCounts(); renderInvite();
    var grid = el("playerCards"), body = el("playerRows"), useCards = effectiveView() === "cards";
    clear(grid); clear(body);
    drawn.forEach(function (p, i) { if (useCards) { grid.appendChild(buildCard(p, i + 1)); } else { body.appendChild(buildRow(p, i + 1)); } });
    grid.hidden = !useCards; el("tableWrap").hidden = useCards;
    Array.prototype.forEach.call(document.querySelectorAll(".view-btn"), function (btn) {
      var on = btn.getAttribute("data-view") === viewMode;
      btn.className = "view-btn" + (on ? " active" : ""); btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    renderEmptyState(visible.length);
    el("moreRow").hidden = drawn.length >= visible.length;
    el("moreButtonList").textContent = "Show " + Math.min(PAGE, visible.length - drawn.length) + " more";
    if (activeTeam === "FA" && !res.query) { note = res.total + " free agents — nobody has them on a roster, so " + SPORT.source + " is not rating them this week. These are the numbers each of them last had" + (visible.length < res.total ? ", showing the top " + visible.length : "") + "."; }
    else if (activeTeam && !res.query) { note = teamLabel(activeTeam) + " — " + res.total + " player" + (res.total === 1 ? "" : "s") + (visible.length < res.total ? ", showing the top " + visible.length : "") + "."; }
    else if (res.query && res.total > visible.length) { note = "Showing the first " + visible.length + " of " + res.total + " matches by rating — keep typing to narrow it down."; }
    else if (tab === "league" && !res.query && activeFilter !== "movers" && res.total > LEAGUE_LIMIT) { note = "The top " + LEAGUE_LIMIT + " of " + res.total + ". Search to find anyone else."; }
    el("boardNote").textContent = note; el("boardNote").hidden = !note;
    el("searchClear").hidden = !searchTerm;
    var wrap = el("chipsWrap"), chips = el("filterChips");
    if (wrap && chips) { wrap.className = "chips-wrap" + (chips.scrollWidth - chips.clientWidth - chips.scrollLeft > 4 ? " has-more" : ""); }
  }
  /* ---------- team picker ---------- */
  function teamLabel(abbr) {
    if (abbr === "FA") { return "Free agents"; }
    var i; for (i = 0; i < SPORT.teams.length; i += 1) { if (SPORT.teams[i].abbr === abbr) { return SPORT.teams[i].name; } }
    return abbr || "All teams";
  }
  function renderTeamChip() {
    var chip = el("teamChip"), label = chip.querySelector(".team-chip-label");
    clear(label);
    var src = logoUrl(activeTeam);
    if (src) { var img = document.createElement("img"); img.src = src; img.alt = ""; label.appendChild(img); }
    label.appendChild(document.createTextNode(teamLabel(activeTeam)));
    chip.className = "chip chip-team" + (activeTeam ? " active" : "");
    chip.setAttribute("aria-label", "Team: " + teamLabel(activeTeam) + ". Tap to pick a team");
  }
  function setTeam(abbr) {
    activeTeam = abbr || "";
    try { if (activeTeam) { localStorage.setItem(SPORT.teamKey, activeTeam); } else { localStorage.removeItem(SPORT.teamKey); } } catch (e) {}
    renderTeamChip(); resetAndRedraw();
  }
  function buildTeamGrid() {
    var grid = el("teamGrid"); clear(grid);
    function cell(abbr, name, extraClass) {
      var b = document.createElement("button"); b.type = "button";
      b.className = "team-cell" + (extraClass ? " " + extraClass : "") + (abbr === activeTeam ? " active" : "");
      var src = logoUrl(abbr);
      if (src) { var img = document.createElement("img"); img.src = src; img.alt = ""; b.appendChild(img); }
      else if (abbr) { b.appendChild(textNode("span", "team-mono", abbr)); }
      b.appendChild(textNode("span", "", name));
      b.setAttribute("aria-label", name + (abbr === activeTeam ? " (selected)" : ""));
      b.addEventListener("click", function () { closeModal("teamModal"); setTeam(abbr); window.scrollTo(0, 0); });
      return b;
    }
    grid.appendChild(cell("", "All teams", "team-all"));
    SPORT.teams.forEach(function (t) { grid.appendChild(cell(t.abbr, t.name)); });
    if (hasFreeAgents()) { grid.appendChild(cell("FA", "Free agents")); }
  }
  function openTeams(evt) {
    var opener = evt && evt.currentTarget ? evt.currentTarget : null;
    // Usually already in hand (the boot prefetches it once the board is painted); on a slow connection
    // the picker simply opens without the Free agents tile rather than making anyone wait for it.
    loadFree(function () { if (!el("teamModal").hidden) { buildTeamGrid(); } });
    buildTeamGrid(); showModal("teamModal", opener);
  }

  /* ---------- "he is a free agent now" ----------
     Asked once per player, the first time someone on the list stops being rated. Keeping him is the
     default: Escape, the backdrop and the close button all keep, because a list of favourite players
     is not something to delete on a shrug. */
  function askAboutFreeAgents() {
    var box = el("faList"), asked;
    if (!box) { return; }
    asked = state.watchlist.map(player).filter(function (p) { return p && p.gone && !state.faSeen[p.id]; });
    if (!asked.length) { return; }
    clear(box);
    asked.forEach(function (p) {
      var row = document.createElement("div"), info = document.createElement("div");
      row.className = "fa-row";
      info.className = "fa-info";
      info.appendChild(textNode("strong", "", p.name));
      info.appendChild(textNode("span", "", (p.lastTeamFull ? "Was with the " + p.lastTeamFull + ". " : "")
        + (lastRatedIn(p) ? "Last rated " + lastRatedIn(p) + " · " + p.ovr + " OVR" : "Free agent · " + p.ovr + " OVR")));
      row.appendChild(buildPortrait(p));
      row.appendChild(info);
      var drop = textNode("button", "button button-quiet", "Remove");
      drop.type = "button";
      drop.addEventListener("click", function () {
        state.watchlist = state.watchlist.filter(function (id) { return id !== p.id; });
        state.faSeen[p.id] = 1; saveState();
        row.parentNode.removeChild(row);
        showToast(p.name + " removed from your players");
        if (!box.firstChild) { closeModal("faModal"); }
        render();
      });
      row.appendChild(drop);
      box.appendChild(row);
    });
    el("faTitle").textContent = asked.length === 1 ? asked[0].name + " is a free agent" : asked.length + " of your players are free agents";
    el("faNote").textContent = SPORT.source + " only rates players who are on a roster, so " + (asked.length === 1 ? "he keeps his" : "they keep their")
      + " last numbers until " + (asked.length === 1 ? "he signs" : "they sign") + " again. Keeping " + (asked.length === 1 ? "him" : "them") + " changes nothing else.";
    showModal("faModal");
  }
  // Every way out of the sheet — the button, the close cross, the backdrop, Escape — is "keep". The
  // question is not asked again about these players; the answer is recorded, not the dismissal.
  function markFreeAgentsSeen() {
    var changed = false;
    state.watchlist.forEach(function (id) { var p = player(id); if (p && p.gone && !state.faSeen[id]) { state.faSeen[id] = 1; changed = true; } });
    if (changed) { saveState(); }
  }

  // First use: an invitation to make the page personal — only while the list is empty, only until dismissed.
  function renderInvite() {
    var seen = false; try { seen = localStorage.getItem("janafari-invite") === "seen"; } catch (e) {}
    el("invite").hidden = !!(state.watchlist.length || seen || tab === "watch");
  }
  function render() { renderWeekSelect(); renderTeamChip(); redraw(); }
  function resetAndRedraw() { shownLimit = PAGE; redraw(); }

  // attribute labels and the ones a kid does not need to see live in SPORTS[...].statLabels / hideStats

  function loadStats(team, cb) {
    if (statsCache[team]) { cb(statsCache[team]); return; }
    var gen = loadGen;   // a sheet requested under one sport must never be cached under another
    fetchJson(SPORT.statsDir + team + ".json", function (sheet) { if (gen !== loadGen) { return; } statsCache[team] = sheet; cb(sheet); }, function () { if (gen === loadGen) { cb(null); } });
  }

  function infoRow(label, valueNode) {
    var row = document.createElement("div"); row.className = "bio-row";
    row.appendChild(textNode("dt", "", label)); row.appendChild(valueNode); return row;
  }
  function dd(text) { var d = document.createElement("dd"); d.appendChild(document.createTextNode(text)); return d; }
  function yearChips(list, className, emptyText) {
    var d = document.createElement("dd");
    if (!list || !list.length) { d.appendChild(textNode("span", "bio-none", emptyText)); return d; }
    list.slice().sort(function (a, b) { return b - a; }).forEach(function (y) { d.appendChild(textNode("span", className, String(y))); });
    return d;
  }

  function openPlayer(p, opener) {
    var token = ++openRequest;   // any stats response that arrives for an older open is dropped
    var facts = (SPORT.facts && playerBio[slugify(p.name)]) || {};
    var r = rating(p.id), change = getChange(p.id), parts = changeFor(p);
    var hero = el("bioHero"), list = el("bioList"), statsBox = el("bioStats"), watchBtn = el("watchToggle");
    el("playerTitle").textContent = p.name;
    var tier = tierOf(p);
    el("playerKicker").textContent = (p.posName || p.pos) + "  ·  " + (p.team === "FA" ? "FREE AGENT" : p.teamFull.toUpperCase()) + (tier ? "  ·  " + SPORT.tiers[tier].kicker : "");

    clear(hero);
    hero.style.background = "linear-gradient(150deg, " + (teamColors[p.team] || "#174a6e") + " 0%, rgba(0,0,0,.55) 140%)";
    hero.appendChild(buildPortrait(p));
    var head = document.createElement("div"); head.className = "bio-headline";
    head.appendChild(textNode("b", "", p.name));
    head.appendChild(textNode("span", "", teamText(p) + " · " + (p.posName || p.pos) + (p.jersey ? " · #" + p.jersey : "")));
    if (change !== null) { head.appendChild(textNode("span", "change " + parts.cls, parts.text + " vs " + (state.snapshots[selectedSnapshot - 1] ? state.snapshots[selectedSnapshot - 1].label : "last week"))); }
    if (p.gone) {
      head.appendChild(textNode("span", "change change-fa", lastRatedIn(p) ? "Last rated " + lastRatedIn(p) : "Free agent"));
    }
    hero.appendChild(head);
    var big = textNode("div", "bio-ovr", r === null ? "—" : String(r)); big.appendChild(textNode("small", "", "Overall rating")); hero.appendChild(big);

    clear(list);
    list.appendChild(infoRow("Age", dd(p.age ? String(p.age) : "—")));
    list.appendChild(infoRow("Size", dd(heightText(p.height) + (p.weight ? ", " + p.weight + " lb" : "") + (p.wingspan ? " · " + heightText(p.wingspan) + " wingspan" : ""))));
    list.appendChild(infoRow(SPORT.collegeLabel, dd(p.college || facts.college || "—")));
    list.appendChild(infoRow("Years pro", dd(typeof p.yearsPro === "number" ? (p.yearsPro === 0 ? "Rookie" : String(p.yearsPro)) : "—")));
    if (p.archetype) { list.appendChild(infoRow("Build", dd(p.archetype))); }
    if (p.hometown) { list.appendChild(infoRow("Hometown", dd(p.hometown))); }
    if (p.abilities && p.abilities.length) {
      var ab = document.createElement("dd"), row = document.createElement("div"), dt = document.createElement("div"), info = document.createElement("button"), help = document.createElement("div");
      var defBox = document.createElement("div"); defBox.className = "ability-def"; defBox.hidden = true;
      p.abilities.forEach(function (a) {
        var x = isTop(a), chip = document.createElement("button"), kind = String(a.type || "");
        var badgeTier = sport === "nba" ? kind.toLowerCase().replace("hall of fame", "hof") : "";
        chip.type = "button"; chip.className = "ability" + (x ? " ability-x" : "") + (badgeTier ? " ability-" + badgeTier : ""); chip.setAttribute("aria-expanded", "false");
        chip.appendChild(textNode("span", "ability-icon", sport === "nba" ? kind.charAt(0).toUpperCase() : (x ? "X" : "★"))); chip.appendChild(document.createTextNode(a.label));
        chip.title = kind + ": " + a.label + " — tap for what it means";
        chip.addEventListener("click", function () {
          var open = chip.getAttribute("aria-expanded") === "true";
          Array.prototype.forEach.call(ab.querySelectorAll(".ability"), function (c) { c.setAttribute("aria-expanded", "false"); });
          if (open) { defBox.hidden = true; return; }
          chip.setAttribute("aria-expanded", "true");
          clear(defBox);
          var ea = officialDef(a), head = document.createElement("div"); head.className = "ability-def-head";
          if (ea && ea.imageUrl) { var art = document.createElement("img"); art.className = "ability-art"; art.src = ea.imageUrl; art.alt = ""; art.addEventListener("error", function () { if (art.parentNode) { art.parentNode.removeChild(art); } }); head.appendChild(art); }
          head.appendChild(textNode("b", "", kind + " · " + a.label + (a.category ? " · " + a.category : "")));
          defBox.appendChild(head);
          defBox.appendChild(textNode("p", "", abilityText(a) || (ea && ea.description) || SPORT.abilityFallback(x)));
          if (ea && ea.description && abilityText(a)) { defBox.appendChild(textNode("p", "ability-ea", SPORT.source + " says: " + ea.description)); }
          defBox.hidden = false;
        });
        ab.appendChild(chip);
      });
      ab.appendChild(defBox);
      row.className = "bio-row bio-row-abilities";
      dt.className = "bio-dt-with-info";
      dt.appendChild(document.createTextNode(SPORT.abilitiesLabel));
      info.type = "button"; info.className = "info-btn"; info.setAttribute("aria-label", SPORT.abilitiesQuestion); info.setAttribute("aria-expanded", "false");
      info.appendChild(textNode("span", "", "i"));
      dt.appendChild(info);
      help.className = "ability-help"; help.hidden = true;
      SPORT.abilitiesHelp.forEach(function (line) { help.appendChild(textNode("p", "", line)); });
      info.addEventListener("click", function () { var open = help.hidden; help.hidden = !open; info.setAttribute("aria-expanded", open ? "true" : "false"); });
      var ddWrap = document.createElement("dd"); ddWrap.appendChild(ab); ddWrap.appendChild(help);
      row.appendChild(dt); row.appendChild(ddWrap);
      list.appendChild(row);
    }
    if (facts.draftYear) {
      var draft = dd(String(facts.draftYear)); draft.appendChild(textNode("small", "", "Round " + facts.draftRound + ", pick " + facts.draftPick));
      list.appendChild(infoRow("Drafted", draft));
    }
    if (facts.superBowls || facts.playoffs) {
      list.appendChild(infoRow("Super Bowls", yearChips(facts.superBowls, "bio-ring", "No rings yet")));
      list.appendChild(infoRow("Playoffs", yearChips(facts.playoffs, "bio-year", "Has not made it yet")));
    }

    clear(statsBox);
    statsBox.appendChild(textNode("div", "kicker", "Top attributes · latest " + SPORT.source + " numbers"));
    statsBox.appendChild(textNode("p", "modal-copy", "Loading attributes…"));
    loadStats(p.team, function (sheet) {
      if (token !== openRequest) { return; }   // the reader has moved on to another player
      clear(statsBox);
      statsBox.appendChild(textNode("div", "kicker", "Top attributes · latest " + SPORT.source + " numbers"));
      var entry = sheet && sheet[String(p.id)];
      if (!entry) { statsBox.appendChild(textNode("p", "modal-copy", "Attributes are not available right now.")); return; }
      var keys = Object.keys(entry.stats).filter(function (k) { return !SPORT.hideStats[k]; });
      keys.sort(function (a, b) { return entry.stats[b] - entry.stats[a]; });
      keys.slice(0, 8).forEach(function (k) {
        var row = document.createElement("div"), bar = document.createElement("div"), fill = document.createElement("span");
        var d = entry.diffs && entry.diffs[k];
        row.className = "stat-row";
        row.appendChild(textNode("span", "stat-label", SPORT.statLabels[k] || k));
        bar.className = "stat-bar"; fill.className = "stat-fill" + (entry.stats[k] >= 90 ? " stat-elite" : ""); fill.style.width = entry.stats[k] + "%";
        bar.appendChild(fill); row.appendChild(bar);
        row.appendChild(textNode("span", "stat-value", String(entry.stats[k]) + (d ? (d > 0 ? " ▲" + d : " ▼" + Math.abs(d)) : "")));
        statsBox.appendChild(row);
      });
    });

    function paintWatch() {
      watchBtn.textContent = isWatched(p.id) ? "★ On my players — remove" : "☆ Add to my players";
      watchBtn.className = "button " + (isWatched(p.id) ? "button-quiet" : "button-gold");
    }
    paintWatch();
    watchBtn.onclick = function () { toggleWatch(p); closeModal("playerModal"); resetAndRedraw(); };
    showModal("playerModal", opener);
  }

  /* ---------- add a player: search the real league ---------- */
  function openAdd(evt) {
    var input = el("addSearch");
    input.value = "";
    renderAddResults("");
    showModal("addModal", evt && evt.currentTarget ? evt.currentTarget : null);
    window.setTimeout(function () { try { input.focus(); } catch (e) {} }, 50);
  }
  function renderAddResults(query) {
    var list = el("addResults"), status = el("addStatus");
    var q = query.toLowerCase().replace(/^\s+|\s+$/g, "");
    clear(list);
    if (!q) { status.textContent = "Type a name, team or position — every " + SPORT.game + " player is here."; return; }
    // Free agents are searchable here too, or a player who has just left a roster could never be added
    // back — but they come after everyone on a roster, whose numbers are this week's.
    var hits = DATA.players.filter(function (p) { return matchesSearch(p, q); })
      .concat((FREE || []).filter(function (p) { return matchesSearch(p, q); })).slice(0, 30);
    status.textContent = hits.length ? hits.length + (hits.length === 30 ? "+" : "") + " player" + (hits.length === 1 ? "" : "s") + " — tap one to see his card" : "No player called “" + query + "”";
    hits.forEach(function (p) {
      var row = document.createElement("button"), info = document.createElement("span");
      row.type = "button"; row.className = "roster-row";
      row.appendChild(buildPortrait(p));
      info.className = "roster-info";
      info.appendChild(textNode("b", "", p.name + (isWatched(p.id) ? " ★" : "")));
      info.appendChild(textNode("small", "", p.pos + " · " + (p.team === "FA" ? "Free agent" + (lastRatedIn(p) ? " · last rated " + lastRatedIn(p) : "") : p.teamFull)));
      row.appendChild(info);
      var live = rating(p.id) === null ? p.ovr : rating(p.id);
      row.appendChild(textNode("span", "ovr-badge" + (isClub(live) ? " ovr-99" : ""), String(live)));
      row.addEventListener("click", function () { closeModal("addModal"); openPlayer(p, el("addButton")); });
      list.appendChild(row);
    });
  }

  /* ---------- refresh: re-read the file the daily Action publishes ----------
     This does not contact EA directly (a browser cannot; the feed has no CORS header).
     The Action checks EA every day and commits a new file when the numbers change. */
  function checkRatings() {
    var btn = el("updateButton"), gen = loadGen;
    btn.disabled = true;
    showToast("Checking for new ratings…");
    fetchJson(SPORT.dataUrl + "?t=" + Date.now(), function (doc) {
      btn.disabled = false;
      if (gen !== loadGen) { return; }   // the sport changed while this was in flight: not our file any more
      if (!validFeed(doc)) { showToast("Could not read the ratings file"); return; }
      useData(doc);
      var outcome = ensureSnapshot();
      if (outcome === "new") { selectedSnapshot = state.snapshots.length - 1; saveState(); render(); showToast("New ratings week: " + doc.iteration.label); }
      else if (outcome === "updated") { saveState(); render(); showToast("Ratings updated — " + doc.iteration.label + ", " + formatDate(doc.fetched)); }
      else { redraw(); showToast("Already up to date — " + SPORT.source + " checked " + formatDate(doc.fetched)); }
    }, function () { btn.disabled = false; if (gen === loadGen) { showToast("Could not reach the ratings file. Check the internet."); } });
  }

  /* ---------- modals, toast, backup ---------- */
  var scrollY = 0;
  function firstFocusable(root) {
    return root.querySelector("input:not([type=file]), button:not([data-close]), select, [tabindex='0']") || root.querySelector("button");
  }
  function showModal(id, opener) {
    var modal = el(id);
    if (!document.querySelector(".modal:not([hidden])")) {
      scrollY = window.pageYOffset || 0;
      document.body.className = "modal-open";
      document.body.style.top = (-scrollY) + "px";
      lastFocus = opener || document.activeElement;
    }
    modal.hidden = false;
    window.setTimeout(function () {
      var f = id === "addModal" ? el("addSearch") : (id === "helpModal" ? modal.querySelector(".help-nav a") : (id === "gameModal" ? el("gameOverlayBtn") : (id === "hoopsModal" ? el("hoopsOverlayBtn") : (firstFocusable(modal) || modal.querySelector(".close-button")))));
      try { if (f) { f.focus(); } } catch (e) {}
    }, 30);
  }
  function closeModal(id) {
    var modal = el(id);
    if (modal.hidden) { return; }
    modal.hidden = true;
    if (id === "faModal") { markFreeAgentsSeen(); render(); }
    if (id === "gameModal" && window.JanafariGame) { window.JanafariGame.stop(); }   // no loop, no sound after Exit/Escape/backdrop
    if (id === "hoopsModal" && window.JanafariHoops) { window.JanafariHoops.stop(); }
    if (!document.querySelector(".modal:not([hidden])")) {
      document.body.className = "";
      document.body.style.top = "";
      window.scrollTo(0, scrollY);
      try { if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) { lastFocus.focus(); } } catch (e) {}
      lastFocus = null;
    }
  }
  // Keep Tab inside the open sheet (aria-modal alone does not trap focus on older Safari).
  function trapFocus(event) {
    var open = document.querySelector(".modal:not([hidden])");
    if (!open || event.keyCode !== 9) { return; }
    var nodes = open.querySelectorAll("button, input, select, a[href], [tabindex='0']"), items = [], i;
    for (i = 0; i < nodes.length; i += 1) { if (nodes[i].offsetWidth || nodes[i].offsetHeight) { items.push(nodes[i]); } }
    if (!items.length) { return; }
    var first = items[0], last = items[items.length - 1];
    if (!open.contains(document.activeElement)) { event.preventDefault(); first.focus(); return; }   // focus escaped (or never entered): pull it back in
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  function showToast(message) {
    var node = el("toast");
    node.textContent = message; node.className = "toast show";
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { node.className = "toast"; }, 2600);
  }
  function exportBackup() {
    state.sport = sport;   // a backup says which list it is, so it can never be restored onto the other sport
    var json = JSON.stringify(state, null, 2);
    try {
      var blob = new Blob([json], { type: "application/json" });
      var url = window.URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = SPORT.backupName;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
      showToast("Backup ready");
    } catch (e) {
      // very old Safari cannot download a Blob: open the JSON in a tab so it can be saved by hand
      var w = window.open("", "_blank"); if (w) { w.document.write("<pre>" + json.replace(/</g, "&lt;") + "</pre>"); w.document.close(); }
    }
  }
  function importBackup(file) {
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function () {
      var imported;
      try {
        imported = JSON.parse(reader.result);
        if (imported && imported.sport && SPORTS[imported.sport] && imported.sport !== sport) {
          showToast("That backup is for " + SPORTS[imported.sport].game + " — switch sports first"); el("importInput").value = ""; return;
        }
        if (validState(imported)) { state = imported; }
        else if (imported && imported.version === 1 && imported.players) {   // a v1 backup: keep its names only
          state = makeDefaultState();
          var index = {}; DATA.players.forEach(function (p) { index[slugify(p.name)] = p.id; });
          imported.players.forEach(function (p) { var id = index[slugify(p.name)]; if (id && state.watchlist.indexOf(id) === -1) { state.watchlist.push(id); } });
        } else { throw new Error("invalid"); }
        state.watchlist = state.watchlist.filter(function (id, i, arr) { return arr.indexOf(id) === i; });
        if (!state.faSeen || typeof state.faSeen !== "object" || isArray(state.faSeen)) { state.faSeen = {}; }
        ensureSnapshot();
        selectedSnapshot = state.snapshots.length - 1;
        saveState(); closeModal("moreModal"); render(); showToast("Backup restored");
      } catch (e) { showToast("That backup file is not valid"); }
      el("importInput").value = "";
    };
    reader.readAsText(file);
  }

  /* ---------- events ---------- */
  var tabButtons = [];
  function selectTab(which, focus) {
    tab = which === "league" ? "league" : "watch";
    try { localStorage.setItem("janafari-tab", tab); } catch (e) {}
    searchTerm = ""; el("searchInput").value = ""; activeFilter = "all"; resetAndRedraw();
    if (!focus) { window.scrollTo(0, 0); }   // a tap starts at the top; an arrow-key switch keeps the reader's place (K3)
    if (focus) { var i; for (i = 0; i < tabButtons.length; i += 1) { if (tabButtons[i].getAttribute("data-tab") === tab) { tabButtons[i].focus(); } } }
  }

  /* ---------- Janafari Playbook (help) + quick tour ----------
     Help describes only what the page can do right now: the changes section and its action
     follow hasHistory(). "Show me" closes the Playbook FIRST, then opens the destination, so
     there is never a second sheet stacked under an invisible modal. */
  var TOUR_KEY = "janafari-tour-v1";   // its own key: never the watchlist or history keys
  var tourStep = 0;
  function tourSteps() {
    var nba = sport === "nba";
    return [
      { title: "Find a player", copy: "Tap ＋ Add — it's on the bottom bar on a phone, top-right on an iPad or PC — and type a name, a team or a position.",
        art: '<div class="tour-tabbar"><span><i>★</i>My players</span><span><i>' + SPORT.icon + '</i>League</span><span class="hot"><i>＋</i>Add</span></div>' },
      { title: "Add him to My players", copy: "Open his card and tap ☆ Add to my players. He shows up under ★ My players with his real " + SPORT.game + " rating.",
        art: '<div class="tour-search"><span class="fake-input">⌕ Search the league…</span><div class="fake-row"><span class="portrait help-portrait" style="width:36px;height:36px"><span class="portrait-mono" style="line-height:32px;font-size:14px">J</span></span><b>Player name</b><span class="tour-pill">☆ Add to my players</span></div></div>' },
      { title: "Read the rating", copy: "The big number is OVR — overall rating. 99 is the best. Tap any card for the player's position, age, " + (nba ? "size, badges" : "college, abilities") + " and top skills.",
        art: '<div class="help-card"><span class="portrait help-portrait"><span class="portrait-mono">J</span></span><span class="help-card-body"><b>Player name</b><span><i class="pos-pill">' + (nba ? "PG" : "QB") + '</i> Team</span></span><span class="help-card-ovr"><b>OVR</b><small>overall</small></span></div>' }
    ];
  }
  function tourState() { try { return localStorage.getItem(TOUR_KEY) || ""; } catch (e) { return ""; } }
  function setTourState(v) { try { localStorage.setItem(TOUR_KEY, v); } catch (e) {} }
  function renderTour() {
    var TOUR = tourSteps(), step = TOUR[tourStep];
    el("tourStep").textContent = "Step " + (tourStep + 1) + " of " + TOUR.length;
    el("tourTitle").textContent = step.title;
    el("tourCopy").textContent = step.copy;
    el("tourArt").innerHTML = step.art;
    el("tourBack").hidden = tourStep === 0;
    el("tourNext").textContent = tourStep === TOUR.length - 1 ? "Finish" : "Next";
    el("tourNext").setAttribute("data-last", tourStep === TOUR.length - 1 ? "1" : "0");
  }
  function openTour(opener) {
    tourStep = 0; renderTour();
    ["helpModal", "moreModal"].forEach(closeModal);
    showModal("tourModal", opener || el("helpButton"));
    window.setTimeout(function () { try { el("tourNext").focus(); } catch (e) {} }, 40);   // Back is hidden on step 1: focus must land on a VISIBLE control or the trap has nothing to hold
  }
  function endTour(how) { setTourState(how); closeModal("tourModal"); if (how === "done") { showToast("You're all set — go find a player"); } }
  function renderHelpState() {
    el("helpChangesCopy").textContent = hasHistory()
      ? "On a card, ▲ means his rating went up since last week; ▼ means down. Movers lists everyone who moved."
      : "On a card, ▲ means his rating went up since last week; ▼ means down. We only have one week so far, so no arrows yet.";
    el("helpMoversGo").hidden = !hasHistory();
  }
  function openHelp(opener) {
    renderHelpState();
    closeModal("moreModal");
    showModal("helpModal", opener || el("helpButton") || el("moreButton"));
    var body = el("helpModal").querySelector(".modal-body"); if (body) { body.scrollTop = 0; }
  }
  // "Show me": close help, then do exactly what the label says — nothing else changes
  function helpGo(what) {
    closeModal("helpModal");
    if (what === "add") { openAdd(); }
    else if (what === "mine") { selectTab("watch", false); }
    else if (what === "team") { selectTab("league", false); openTeams(); }
    else if (what === "movers") { if (hasHistory()) { selectTab("league", false); activeFilter = "movers"; resetAndRedraw(); } }
    else if (what === "reset") { activeFilter = "all"; searchTerm = ""; el("searchInput").value = ""; setTeam(""); showToast("Filters, team and search cleared"); }
    else if (what === "refresh") { checkRatings(); }
    else if (what === "backup") { showModal("moreModal", el("moreButton")); }
    else if (what === "game") { openGame(el("helpButton").offsetWidth ? el("helpButton") : el("moreButton")); }
  }

  /* ---------- the sport's game (End Zone Run · Janafari Jam): loaded only when someone asks to play ----------
     Each sport names its script, its global, its sheet and its easter egg in SPORT.arcade. The bridge hands the
     game the page's modal helpers plus the loaded roster and logo URLs, so Janafari Jam can field real players. */
  var gameLoading = false;
  var modalApi = { show: showModal, close: closeModal, toast: showToast, players: function () { return DATA ? DATA.players : []; }, logo: function (abbr) { return SPORT.logo(abbr); } };
  function openGame(opener) {
    var g = SPORT.arcade;
    if (window[g.api]) { window[g.api].open(opener || el("moreButton"), modalApi); return; }
    if (gameLoading) { return; }
    gameLoading = true; showToast("Loading " + g.name + "…");
    var sc = document.createElement("script"); sc.src = g.url;
    sc.onload = function () { gameLoading = false; if (window[g.api] && SPORT.arcade.api === g.api) { window[g.api].open(opener || el("moreButton"), modalApi); } };   // the sport may have been switched while the script was downloading
    sc.onerror = function () { gameLoading = false; showToast("The game could not load. Check the internet and try again."); };
    document.body.appendChild(sc);
  }

  // Easter egg: every so often, while the page is visible and no sheet is open, something crosses the top bar
  // (3.2 s) — a tiny runner on the football side, a bouncing ball on the basketball side. Tapping it opens the
  // game. It never runs over an open sheet or a hidden tab.
  function eggSprint() {
    var egg = el(SPORT.arcade.egg), base = "egg-runner" + (egg && egg.id === "eggBall" ? " egg-ball" : "");   // the ball keeps its own styling while it runs
    if (!egg || document.hidden || document.querySelector(".modal:not([hidden])")) { return; }
    egg.hidden = false; egg.className = base;
    window.setTimeout(function () { egg.className = base + " run"; }, 30);
    window.setTimeout(function () { if (egg.className.indexOf("run") !== -1) { egg.hidden = true; egg.className = base; } }, 3600);
  }
  function scheduleEgg(first) {
    window.setTimeout(function () { eggSprint(); scheduleEgg(false); }, first ? 9000 : 45000 + Math.random() * 45000);
  }

  function bindEvents() {
    tabButtons = Array.prototype.slice.call(document.querySelectorAll(".tab[data-tab]"));
    tabButtons.forEach(function (btn, idx) {
      btn.addEventListener("click", function () { selectTab(btn.getAttribute("data-tab"), false); });
      // W3C tabs pattern: Left/Right/Home/End move AND select (two tabs, automatic activation)
      btn.addEventListener("keydown", function (e) {
        var k = e.keyCode, next = null;
        if (k === 37 || k === 38) { next = tabButtons[(idx - 1 + tabButtons.length) % tabButtons.length]; }
        else if (k === 39 || k === 40) { next = tabButtons[(idx + 1) % tabButtons.length]; }
        else if (k === 36) { next = tabButtons[0]; }
        else if (k === 35) { next = tabButtons[tabButtons.length - 1]; }
        if (next && next !== btn) { e.preventDefault(); selectTab(next.getAttribute("data-tab"), true); }   // Home on the first tab is a no-op, not a redraw
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".view-btn"), function (btn) {
      btn.addEventListener("click", function () {
        viewMode = btn.getAttribute("data-view") === "list" ? "list" : "cards";
        try { localStorage.setItem("janafari-view", viewMode); } catch (e) {}
        redraw();
      });
    });
    el("weekSelect").addEventListener("change", function () { selectedSnapshot = parseInt(this.value, 10); resetAndRedraw(); });
    el("searchInput").addEventListener("input", function () {
      var v = this.value;
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(function () { searchTerm = v; resetAndRedraw(); }, 150);   // one redraw per pause, not per keystroke
    });
    el("searchClear").addEventListener("click", function () { el("searchInput").value = ""; searchTerm = ""; resetAndRedraw(); el("searchInput").focus(); });
    Array.prototype.forEach.call(document.querySelectorAll(".chip[data-filter]"), function (button) {
      button.addEventListener("click", function () { activeFilter = this.getAttribute("data-filter"); resetAndRedraw(); });
    });
    el("moreButtonList").addEventListener("click", function () { shownLimit += PAGE; redraw(); });
    el("teamChip").addEventListener("click", openTeams);
    Array.prototype.forEach.call(document.querySelectorAll(".sport-btn"), function (b) {
      b.addEventListener("click", function () { switchSport(b.getAttribute("data-sport-pick")); });
    });
    el("helpButton").addEventListener("click", function (e) { openHelp(e.currentTarget); });
    el("playEgg").addEventListener("click", function (e) { openGame(e.currentTarget); });
    el("playEggNba").addEventListener("click", function (e) { openGame(e.currentTarget); });
    Array.prototype.forEach.call(document.querySelectorAll(".egg-runner"), function (egg) {
      egg.addEventListener("click", function () { egg.hidden = true; egg.className = egg.className.replace(/\s*\brun\b/, ""); openGame(el("moreButton")); });
    });
    scheduleEgg(true);
    el("playMore").addEventListener("click", function () { closeModal("moreModal"); openGame(el("moreButton")); });
    el("playMoreNba").addEventListener("click", function () { closeModal("moreModal"); openGame(el("moreButton")); });
    el("helpMore").addEventListener("click", function () { openHelp(el("moreButton")); });
    el("inviteTour").addEventListener("click", function (e) { openTour(e.currentTarget); });
    el("tourStart").addEventListener("click", function () { openTour(el("helpButton")); });
    el("tourNext").addEventListener("click", function () { if (el("tourNext").getAttribute("data-last") !== "1") { tourStep += 1; renderTour(); el("tourNext").focus(); } else { endTour("done"); } });
    el("tourBack").addEventListener("click", function () { if (tourStep > 0) { tourStep -= 1; renderTour(); el("tourBack").hidden ? el("tourNext").focus() : el("tourBack").focus(); } });
    el("tourSkip").addEventListener("click", function () { endTour("skipped"); });
    Array.prototype.forEach.call(document.querySelectorAll(".help-go"), function (b) { b.addEventListener("click", function () { helpGo(b.getAttribute("data-go")); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".help-nav a"), function (a) {   // jump links scroll inside the sheet, never the page
      a.addEventListener("click", function (e) { e.preventDefault(); var t = document.querySelector(a.getAttribute("href")); if (t) { t.scrollIntoView(); var h = t.querySelector("h3"); if (h) { h.setAttribute("tabindex", "-1"); h.focus(); } } });
    });
    el("inviteButton").addEventListener("click", openAdd);
    el("inviteClose").addEventListener("click", function () { try { localStorage.setItem("janafari-invite", "seen"); } catch (e) {} renderInvite(); });
    el("refreshMore").addEventListener("click", function () { closeModal("moreModal"); checkRatings(); });
    var chips = el("filterChips"), wrap = el("chipsWrap");
    function chipCue() { wrap.className = "chips-wrap" + (chips.scrollWidth - chips.clientWidth - chips.scrollLeft > 4 ? " has-more" : ""); }
    chips.addEventListener("scroll", chipCue); window.addEventListener("resize", chipCue); chipCue();
    Array.prototype.forEach.call(chips.querySelectorAll("button"), function (b) {
      b.addEventListener("focus", function () {   // a focused chip must be visible (keyboard users cannot see an off-screen focus ring)
        var r = b.getBoundingClientRect(), c = chips.getBoundingClientRect();
        if (r.right > c.right) { chips.scrollLeft += r.right - c.right + 12; } else if (r.left < c.left) { chips.scrollLeft -= c.left - r.left + 12; }
      });
    });
    el("addSearch").addEventListener("input", function () { renderAddResults(this.value); });
    el("updateButton").addEventListener("click", checkRatings);
    el("addButton").addEventListener("click", openAdd);
    el("addTab").addEventListener("click", openAdd);
    el("moreButton").addEventListener("click", function (e) { showModal("moreModal", e.currentTarget); });
    el("exportButton").addEventListener("click", exportBackup);
    el("importInput").addEventListener("change", function () { importBackup(this.files[0]); });
    el("resetButton").addEventListener("click", function () {
      if (window.confirm("Clear your players and saved weeks on this device?")) {
        state = makeDefaultState(); ensureSnapshot(); selectedSnapshot = 0; saveState(); closeModal("moreModal"); render(); showToast("Your players were cleared");
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (button) {
      button.addEventListener("click", function () { closeModal(this.getAttribute("data-close") + "Modal"); });
    });
    // Closing the free-agent sheet any way at all means "keep them" — the destructive choice is only
    // ever the explicit Remove next to a name.
    el("faKeep").addEventListener("click", function () { closeModal("faModal"); });
    document.addEventListener("keydown", function (event) {
      if (event.keyCode === 27) { ["gameModal", "hoopsModal", "tourModal", "helpModal", "moreModal", "playerModal", "addModal", "teamModal", "faModal"].forEach(closeModal); }
      trapFocus(event);
    });
    var lastPhone = window.innerWidth <= 600, resizeTimer;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { var phone = window.innerWidth <= 600; if (phone !== lastPhone) { lastPhone = phone; redraw(); } }, 200);
    });
  }

  /* ---------- boot ---------- */
  function failBoot(title, hint) {
    var box = el("loading");
    box.hidden = false; box.className = "empty-state";
    clear(box);
    box.appendChild(textNode("div", "empty-icon", "📡"));
    box.appendChild(textNode("strong", "empty-title", title));
    box.appendChild(textNode("p", "empty-hint", hint));
    var b = textNode("button", "button button-gold", "Try again"); b.type = "button"; b.addEventListener("click", function () { window.location.reload(); }); box.appendChild(b);
  }
  var booted = false;
  // Load one sport's feed, history and definitions, then draw. Called at boot and on every switch;
  // events are bound exactly once. The other sport's watchlist and weeks are untouched (separate keys).
  function loadSport(which) {
    applySport(which);
    try { localStorage.setItem(SPORT_KEY_STORAGE, sport); } catch (e) {}
    DATA = null; byId = {}; statsCache = {}; ABILITY_DEFS = null; searchTerm = ""; activeFilter = "all"; activeTeam = ""; shownLimit = PAGE; selectedSnapshot = 0;
    el("searchInput").value = ""; el("updateButton").disabled = false;
    el("loading").hidden = false; el("loading").className = "empty-state"; clear(el("loading"));
    el("loading").appendChild(textNode("div", "empty-icon", SPORT.icon)); el("loading").appendChild(textNode("strong", "empty-title", "Loading " + SPORT.game + " ratings…"));
    clear(el("playerCards")); clear(el("playerRows")); el("emptyState").hidden = true; el("moreRow").hidden = true; el("boardNote").hidden = true;
    loadState();
    try { var tm = localStorage.getItem(SPORT.teamKey); if (tm && (knownTeam[tm] || tm === "FA")) { activeTeam = tm; } } catch (e) {}
    var gen = ++loadGen;   // a second switch while this one is in flight: the late reply is dropped — even A→B→A, which a sport-name check let through
    fetchJson(SPORT.dataUrl, function (doc) {
      if (gen !== loadGen) { return; }
      if (!validFeed(doc)) { failBoot("The ratings file looks wrong", "The page loaded, but the " + SPORT.game + " ratings file could not be read. Try again in a minute."); return; }
      useData(doc);
      migrateLegacy();
      // Duplicates go; NOBODY is dropped. This line used to delete every id the feed no longer carried,
      // which is exactly what happens to a player the week he stops being on a roster.
      state.watchlist = state.watchlist.filter(function (id, i, arr) { return arr.indexOf(id) === i; });
      var missing = state.watchlist.filter(function (id) { return !byId[id]; }).length;
      var start = function (history) {
        if (gen !== loadGen) { return; }
        var dirty = mergeHistory(history);
        if (ensureSnapshot() !== "same") { dirty = true; }
        if (dirty) { saveState(); }
        selectedSnapshot = state.snapshots.length - 1;
        if (!state.watchlist.length && tab === "watch") { tab = "league"; }
        if (!booted) { bindEvents(); booted = true; }
        render();
        el("loading").hidden = true;
        // The board is on screen; fetch the free agents now so the team picker has them, and ask about
        // any watched player who has just become one.
        loadFree(function () { render(); askAboutFreeAgents(); });
      };
      // A watched player who is not in the feed is waited for: he must not blink off the list first.
      var withFree = function (history) { if (missing) { loadFree(function () { start(history); }); } else { start(history); } };
      fetchJson(SPORT.historyUrl + "?t=" + Date.now(), withFree, function () { withFree(null); });   // history is optional
      fetchJson(SPORT.defsUrl, function (defs) { if (gen === loadGen && defs && (defs.lines || (defs.xfactor && defs.superstar))) { ABILITY_DEFS = defs; } }, function () {});   // definitions are optional too
    }, function () {
      if (gen !== loadGen) { return; }
      failBoot("Could not load the ratings", "Check the internet and try again. The ratings file lives with this page.");
    });
  }
  function switchSport(which) {
    if (!SPORTS[which] || which === sport) { return; }
    ["gameModal", "hoopsModal", "tourModal", "helpModal", "moreModal", "playerModal", "addModal", "teamModal", "faModal"].forEach(closeModal);
    loadSport(which);
    // a ?sport= in the address would win again on reload, so drop it: the switch is now the choice
    try { if (window.history && window.history.replaceState && /[?&]sport=/.test(window.location.search)) { window.history.replaceState(null, "", window.location.pathname + window.location.hash); } } catch (e) {}
    window.scrollTo(0, 0);
    showToast(SPORTS[which].icon + " " + SPORTS[which].game);
  }
  function boot() {
    try { var t = localStorage.getItem("janafari-tab"); if (t === "league" || t === "watch") { tab = t; } } catch (e) {}
    try { var v = localStorage.getItem("janafari-view"); if (v === "list" || v === "cards") { viewMode = v; } } catch (e) {}
    // ?sport=nba in the address wins (a link straight to basketball); otherwise the last sport used; otherwise football
    var pick = null, m = /[?&]sport=(nfl|nba)\b/.exec(window.location.search || "");
    if (m) { pick = m[1]; }
    if (!pick) { try { pick = localStorage.getItem(SPORT_KEY_STORAGE); } catch (e) {} }
    loadSport(SPORTS[pick] ? pick : "nfl");
  }

  boot();
}());

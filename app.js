(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Janafari v3 — real ratings, a real watchlist, one screen per job.
     Every number on this page comes from EA's official Madden 27 ratings
     feed, snapshotted into data/ratings.json by tools/fetch_ratings.py
     (checked daily by a GitHub Action). Nobody types a rating in here.
       League     = every rated player (top 100 shown; search finds anyone)
       My players = the players THIS device's owner chose to follow
     Weeks are the feed's own iterations (Launch, Week 1, Week 2 ...): each
     new iteration the page sees becomes a snapshot, so week-over-week
     arrows are EA's changes, not ours. If EA changes numbers UNDER the same
     iteration id (it did: 2,364 → 3,111 players under "1-base"), the stored
     snapshot is replaced, never kept stale (review finding, 2026-09-12).
     ES5 on purpose: the old iPad in the house must keep working.
     ------------------------------------------------------------------ */

  var STORAGE_KEY = "janafari-v2";
  var LEGACY_KEY = "our-madden-27-board-v1";
  var DATA_URL = "data/ratings.json";
  var HISTORY_URL = "data/history.json";   // every iteration the Action has seen: {id,label,date,ratings}[]
  var LEAGUE_LIMIT = 100;      // league tab with no search: the top 100
  var SEARCH_LIMIT = 120;      // a search never renders more than this (old iPads froze on 3,000)
  var PAGE = 24;               // cards drawn before "Show more" (portraits are ~120 KB each)
  var SVG_NS = "http://www.w3.org/2000/svg";

  var DATA = null;          // {game, iteration, iterations, fetched, count, players:[...]}
  var byId = {};            // id -> player
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


  var nflTeams = [
    { abbr: "ARI", name: "Cardinals", color: "#a40227" },
    { abbr: "ATL", name: "Falcons", color: "#a71930" },
    { abbr: "BAL", name: "Ravens", color: "#29126f" },
    { abbr: "BUF", name: "Bills", color: "#00338d" },
    { abbr: "CAR", name: "Panthers", color: "#0085ca" },
    { abbr: "CHI", name: "Bears", color: "#0b1c3a" },
    { abbr: "CIN", name: "Bengals", color: "#fb4f14" },
    { abbr: "CLE", name: "Browns", color: "#472a08" },
    { abbr: "DAL", name: "Cowboys", color: "#002a5c" },
    { abbr: "DEN", name: "Broncos", color: "#0a2343" },
    { abbr: "DET", name: "Lions", color: "#0076b6" },
    { abbr: "GB", name: "Packers", color: "#204e32" },
    { abbr: "HOU", name: "Texans", color: "#021018" },
    { abbr: "IND", name: "Colts", color: "#003b75" },
    { abbr: "JAX", name: "Jaguars", color: "#007487" },
    { abbr: "KC", name: "Chiefs", color: "#e31837" },
    { abbr: "LAC", name: "Chargers", color: "#0080c6" },
    { abbr: "LAR", name: "Rams", color: "#003594" },
    { abbr: "LV", name: "Raiders", color: "#000000" },
    { abbr: "MIA", name: "Dolphins", color: "#008e97" },
    { abbr: "MIN", name: "Vikings", color: "#4f2683" },
    { abbr: "NE", name: "Patriots", color: "#002a5c" },
    { abbr: "NO", name: "Saints", color: "#d3bc8d" },
    { abbr: "NYG", name: "Giants", color: "#003c7f" },
    { abbr: "NYJ", name: "Jets", color: "#115740" },
    { abbr: "PHI", name: "Eagles", color: "#06424d" },
    { abbr: "PIT", name: "Steelers", color: "#000000" },
    { abbr: "SEA", name: "Seahawks", color: "#002a5c" },
    { abbr: "SF", name: "49ers", color: "#aa0000" },
    { abbr: "TB", name: "Buccaneers", color: "#bd1c36" },
    { abbr: "TEN", name: "Titans", color: "#4495d2" },
    { abbr: "WSH", name: "Commanders", color: "#5a1414" }
  ];


  var teamColors = {}, knownTeam = {};
  nflTeams.forEach(function (t) { teamColors[t.abbr] = t.color; knownTeam[t.abbr] = true; });

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
  // Only the 32 clubs have a badge; free agents ("FA") get a neutral monogram, never a 404.
  function logoUrl(abbr) { return knownTeam[abbr] ? "https://a.espncdn.com/i/teamlogos/nfl/500/" + abbr.toLowerCase() + ".png" : null; }
  function teamText(p) { return p.team === "FA" ? "Free agent" : p.team + " · " + p.teamName; }

  /* ---------- state ---------- */
  function makeDefaultState() { return { version: 2, watchlist: [], snapshots: [] }; }
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
    try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (e) {}
    try { state = raw ? JSON.parse(raw) : null; } catch (e) { state = null; }
    if (!validState(state)) { state = makeDefaultState(); }
  }
  function saveState() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
    catch (e) { showToast("Could not save on this device"); return false; }
  }

  // The v1 board let people type ratings by hand. Its PLAYER LIST becomes the
  // watchlist (matched by name against the real feed); its typed numbers are
  // dropped on purpose — the feed is the only source of ratings now.
  function migrateLegacy() {
    if (state.watchlist.length) { return; }   // only the list matters; snapshots may already exist from history.json
    var raw = null, legacy = null;
    try { raw = window.localStorage.getItem(LEGACY_KEY); } catch (e) {}
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
    byId = {};
    statsCache = {};   // attributes belong to a dataset; a new one invalidates them
    DATA.players.forEach(function (p) { byId[p.id] = p; });
  }
  function player(id) { return byId[id]; }

  /* ---------- ratings & changes ---------- */
  function rating(id, snapIndex) {
    var snap = state.snapshots[snapIndex === undefined ? selectedSnapshot : snapIndex];
    return snap && typeof snap.ratings[id] === "number" ? snap.ratings[id] : null;
  }
  function getChange(id, snapIndex) {
    var i = snapIndex === undefined ? selectedSnapshot : snapIndex;
    if (i === 0) { return null; }
    var now = rating(id, i), before = rating(id, i - 1);
    if (now === null || before === null) { return null; }
    return now - before;
  }
  function hasHistory() { return state.snapshots.length > 1; }
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
    for (i = 0; i <= selectedSnapshot; i += 1) { if (rating(id, i) !== null) { values.push(rating(id, i)); } }
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
    var r = rating(p.id), parts = changeParts(getChange(p.id)), watched = isWatched(p.id);
    var card = document.createElement("button"), body = document.createElement("div"), meta = document.createElement("div"), right = document.createElement("div"), ovr = document.createElement("span");
    card.type = "button";
    card.className = "pcard" + (r === 99 ? " is-99" : "") + (watched ? " is-watched" : "");
    card.setAttribute("aria-label", p.name + ", " + p.pos + ", " + teamText(p) + ", overall " + (r === null ? "unknown" : r));
    card.appendChild(buildPortrait(p));
    body.className = "pcard-body";
    body.appendChild(textNode("h3", "pcard-name", p.name));
    meta.className = "pcard-meta";
    meta.appendChild(textNode("span", "pos-pill", p.pos));
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
    var r = rating(p.id), parts = changeParts(getChange(p.id));
    var row = document.createElement("tr");
    var playerCell = document.createElement("td"), ovrCell = document.createElement("td"), changeCell = document.createElement("td"), trendCell = document.createElement("td");
    var wrap = document.createElement("div"), info = document.createElement("span");
    row.className = "prow"; row.setAttribute("tabindex", "0"); row.setAttribute("role", "button");
    row.setAttribute("aria-label", p.name + ", " + p.pos + ", " + teamText(p) + ", overall " + (r === null ? "unknown" : r));
    wrap.className = "player-wrap"; info.className = "player-info";
    info.appendChild(textNode("span", "player-name", p.name + (isWatched(p.id) ? " ★" : "")));
    info.appendChild(textNode("span", "player-sub", p.pos + " · " + teamText(p)));
    wrap.appendChild(buildPortrait(p)); wrap.appendChild(info); playerCell.appendChild(wrap);
    ovrCell.className = "center"; ovrCell.appendChild(textNode("span", "ovr-badge" + (r === 99 ? " ovr-99" : ""), r === null ? "—" : String(r)));
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
    var club = pool.filter(function (p) { return rating(p.id) === 99; });
    var movers = pool.map(function (p) { return { p: p, c: getChange(p.id) }; }).filter(function (m) { return m.c !== null && m.c !== 0; });
    movers.sort(function (a, b) { return Math.abs(b.c) - Math.abs(a.c); });
    el("clubCount").textContent = String(club.length);
    el("trackedCount").textContent = String(tab === "watch" ? state.watchlist.length : DATA.count);
    el("trackedLabel").textContent = tab === "watch" ? (state.watchlist.length === 1 ? "player on my list" : "players on my list") : "players rated";
    el("moverStat").hidden = !movers.length;
    if (movers.length) {
      el("moverValue").textContent = (movers[0].c > 0 ? "+" : "") + movers[0].c;
      el("moverName").textContent = movers[0].p.name.split(" ").pop() + " · biggest mover";
    }
    // "Updated" is when EA's feed was last pulled — never a snapshot date dressed up as the feed date.
    var snap = state.snapshots[selectedSnapshot];
    el("sourceStamp").textContent = snap.label + " · updated " + formatDate(DATA.fetched);
    el("footerStamp").textContent = DATA.game + " · EA feed checked " + formatDate(DATA.fetched) + " · " + DATA.count + " players";
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
    el("watchTabCount").textContent = String(state.watchlist.length);
    el("searchInput").placeholder = tab === "watch" ? "Search my players" : "Search any player or team";
  }

  function renderFilterCounts() {
    var query = searchTerm.toLowerCase().replace(/^\s+|\s+$/g, "");
    var counts = { all: 0, offense: 0, defense: 0, special: 0, movers: 0 };
    poolForTab().forEach(function (p) {
      if (!matchesTeam(p) || !matchesSearch(p, query)) { return; }
      var c = getChange(p.id);
      counts.all += 1;
      if (counts.hasOwnProperty(p.side)) { counts[p.side] += 1; }
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
    var icon = "🏈", title = "No players here", hint = "Try a different button up top.", action = null;
    if (tab === "watch" && !state.watchlist.length) {
      icon = "⭐"; title = "No players on your list yet"; hint = "Find anyone in the league and tap “Add to my players”. His real EA rating comes with him.";
      action = { label: "Find players", run: openAdd };
    }
    else if (activeFilter === "movers") { icon = "😴"; title = "Nobody moved this week"; hint = "Every rating stayed the same."; }
    else if (activeTeam && tab === "watch") { icon = "🏈"; title = "None of your players are on the " + teamLabel(activeTeam); hint = "Try the League tab to see the whole roster."; action = { label: "Show all teams", run: function () { setTeam(""); } }; }
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
    if (activeTeam && !res.query) { note = teamLabel(activeTeam) + " — " + res.total + " player" + (res.total === 1 ? "" : "s") + (visible.length < res.total ? ", showing the top " + visible.length : "") + "."; }
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
    var i; for (i = 0; i < nflTeams.length; i += 1) { if (nflTeams[i].abbr === abbr) { return nflTeams[i].name; } }
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
    try { if (activeTeam) { localStorage.setItem("janafari-team", activeTeam); } else { localStorage.removeItem("janafari-team"); } } catch (e) {}
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
    nflTeams.forEach(function (t) { grid.appendChild(cell(t.abbr, t.name)); });
    grid.appendChild(cell("FA", "Free agents"));
  }
  function openTeams(evt) { buildTeamGrid(); showModal("teamModal", evt && evt.currentTarget ? evt.currentTarget : null); }

  // First use: an invitation to make the page personal — only while the list is empty, only until dismissed.
  function renderInvite() {
    var seen = false; try { seen = localStorage.getItem("janafari-invite") === "seen"; } catch (e) {}
    el("invite").hidden = !!(state.watchlist.length || seen || tab === "watch");
  }
  function render() { renderWeekSelect(); renderTeamChip(); redraw(); }
  function resetAndRedraw() { shownLimit = PAGE; redraw(); }

  var STAT_LABELS = {
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
  };
  var HIDE_STATS = { injury: 1, toughness: 1, stamina: 1, runningStyle: 1 };

  function loadStats(team, cb) {
    if (statsCache[team]) { cb(statsCache[team]); return; }
    fetchJson("data/stats/" + team + ".json", function (sheet) { statsCache[team] = sheet; cb(sheet); }, function () { cb(null); });
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
    var facts = playerBio[slugify(p.name)] || {};
    var r = rating(p.id), change = getChange(p.id), parts = changeParts(change);
    var hero = el("bioHero"), list = el("bioList"), statsBox = el("bioStats"), watchBtn = el("watchToggle");
    el("playerTitle").textContent = p.name;
    el("playerKicker").textContent = (p.posName || p.pos) + "  ·  " + (p.team === "FA" ? "FREE AGENT" : p.teamFull.toUpperCase());

    clear(hero);
    hero.style.background = "linear-gradient(150deg, " + (teamColors[p.team] || "#174a6e") + " 0%, rgba(0,0,0,.55) 140%)";
    hero.appendChild(buildPortrait(p));
    var head = document.createElement("div"); head.className = "bio-headline";
    head.appendChild(textNode("b", "", p.name));
    head.appendChild(textNode("span", "", teamText(p) + " · " + (p.posName || p.pos) + (p.jersey ? " · #" + p.jersey : "")));
    if (change !== null) { head.appendChild(textNode("span", "change " + parts.cls, parts.text + " vs " + (state.snapshots[selectedSnapshot - 1] ? state.snapshots[selectedSnapshot - 1].label : "last week"))); }
    hero.appendChild(head);
    var big = textNode("div", "bio-ovr", r === null ? "—" : String(r)); big.appendChild(textNode("small", "", "Overall rating")); hero.appendChild(big);

    clear(list);
    list.appendChild(infoRow("Age", dd(p.age ? String(p.age) : "—")));
    list.appendChild(infoRow("Size", dd(heightText(p.height) + (p.weight ? ", " + p.weight + " lb" : ""))));
    list.appendChild(infoRow("College", dd(p.college || facts.college || "—")));
    list.appendChild(infoRow("Years pro", dd(typeof p.yearsPro === "number" ? (p.yearsPro === 0 ? "Rookie" : String(p.yearsPro)) : "—")));
    if (p.abilities && p.abilities.length) {
      var ab = document.createElement("dd");
      p.abilities.forEach(function (a) { ab.appendChild(textNode("span", "ability" + (/x-factor/i.test(a.type) ? " ability-x" : ""), a.label)); });
      list.appendChild(infoRow("Abilities", ab));
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
    statsBox.appendChild(textNode("div", "kicker", "Top attributes · latest EA numbers"));
    statsBox.appendChild(textNode("p", "modal-copy", "Loading attributes…"));
    loadStats(p.team, function (sheet) {
      if (token !== openRequest) { return; }   // the reader has moved on to another player
      clear(statsBox);
      statsBox.appendChild(textNode("div", "kicker", "Top attributes · latest EA numbers"));
      var entry = sheet && sheet[String(p.id)];
      if (!entry) { statsBox.appendChild(textNode("p", "modal-copy", "Attributes are not available right now.")); return; }
      var keys = Object.keys(entry.stats).filter(function (k) { return !HIDE_STATS[k]; });
      keys.sort(function (a, b) { return entry.stats[b] - entry.stats[a]; });
      keys.slice(0, 8).forEach(function (k) {
        var row = document.createElement("div"), bar = document.createElement("div"), fill = document.createElement("span");
        var d = entry.diffs && entry.diffs[k];
        row.className = "stat-row";
        row.appendChild(textNode("span", "stat-label", STAT_LABELS[k] || k));
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
    if (!q) { status.textContent = "Type a name, team or position — every EA-rated player is here."; return; }
    var hits = DATA.players.filter(function (p) { return matchesSearch(p, q); }).slice(0, 30);
    status.textContent = hits.length ? hits.length + (hits.length === 30 ? "+" : "") + " player" + (hits.length === 1 ? "" : "s") + " — tap one to see his card" : "No player called “" + query + "”";
    hits.forEach(function (p) {
      var row = document.createElement("button"), info = document.createElement("span");
      row.type = "button"; row.className = "roster-row";
      row.appendChild(buildPortrait(p));
      info.className = "roster-info";
      info.appendChild(textNode("b", "", p.name + (isWatched(p.id) ? " ★" : "")));
      info.appendChild(textNode("small", "", p.pos + " · " + (p.team === "FA" ? "Free agent" : p.teamFull)));
      row.appendChild(info);
      var live = rating(p.id) === null ? p.ovr : rating(p.id);
      row.appendChild(textNode("span", "ovr-badge" + (live === 99 ? " ovr-99" : ""), String(live)));
      row.addEventListener("click", function () { closeModal("addModal"); openPlayer(p, el("addButton")); });
      list.appendChild(row);
    });
  }

  /* ---------- refresh: re-read the file the daily Action publishes ----------
     This does not contact EA directly (a browser cannot; the feed has no CORS header).
     The Action checks EA every day and commits a new file when the numbers change. */
  function checkRatings() {
    var btn = el("updateButton");
    btn.disabled = true;
    showToast("Checking for new ratings…");
    fetchJson(DATA_URL + "?t=" + Date.now(), function (doc) {
      btn.disabled = false;
      if (!validFeed(doc)) { showToast("Could not read the ratings file"); return; }
      useData(doc);
      var outcome = ensureSnapshot();
      if (outcome === "new") { selectedSnapshot = state.snapshots.length - 1; saveState(); render(); showToast("New ratings week: " + doc.iteration.label); }
      else if (outcome === "updated") { saveState(); render(); showToast("Ratings updated — " + doc.iteration.label + ", " + formatDate(doc.fetched)); }
      else { redraw(); showToast("Already up to date — EA checked " + formatDate(doc.fetched)); }
    }, function () { btn.disabled = false; showToast("Could not reach the ratings file. Check the internet."); });
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
      var f = id === "addModal" ? el("addSearch") : (id === "helpModal" ? modal.querySelector(".help-nav a") : (id === "gameModal" ? el("gameOverlayBtn") : (firstFocusable(modal) || modal.querySelector(".close-button"))));
      try { if (f) { f.focus(); } } catch (e) {}
    }, 30);
  }
  function closeModal(id) {
    var modal = el(id);
    if (modal.hidden) { return; }
    modal.hidden = true;
    if (id === "gameModal" && window.JanafariGame) { window.JanafariGame.stop(); }   // no loop, no sound after Exit/Escape/backdrop
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
    var json = JSON.stringify(state, null, 2);
    try {
      var blob = new Blob([json], { type: "application/json" });
      var url = window.URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = "janafari-backup.json";
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
        if (validState(imported)) { state = imported; }
        else if (imported && imported.version === 1 && imported.players) {   // a v1 backup: keep its names only
          state = makeDefaultState();
          var index = {}; DATA.players.forEach(function (p) { index[slugify(p.name)] = p.id; });
          imported.players.forEach(function (p) { var id = index[slugify(p.name)]; if (id && state.watchlist.indexOf(id) === -1) { state.watchlist.push(id); } });
        } else { throw new Error("invalid"); }
        state.watchlist = state.watchlist.filter(function (id, i, arr) { return byId[id] && arr.indexOf(id) === i; });
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
  var TOUR = [
    { title: "Find a player", copy: "Tap ＋ Add — it's on the bottom bar on a phone, top-right on an iPad or PC — and type a name, a team or a position.",
      art: '<div class="tour-tabbar"><span><i>★</i>My players</span><span><i>🏈</i>League</span><span class="hot"><i>＋</i>Add</span></div>' },
    { title: "Add him to My players", copy: "Open his card and tap ☆ Add to my players. He shows up under ★ My players with his real EA rating.",
      art: '<div class="tour-search"><span class="fake-input">⌕ Search the league…</span><div class="fake-row"><span class="portrait help-portrait" style="width:36px;height:36px"><span class="portrait-mono" style="line-height:32px;font-size:14px">J</span></span><b>Player name</b><span class="tour-pill">☆ Add to my players</span></div></div>' },
    { title: "Read the rating", copy: "The big number is OVR — overall rating. 99 is the best. Tap any card for the player's position, age, college, abilities and top skills.",
      art: '<div class="help-card"><span class="portrait help-portrait"><span class="portrait-mono">J</span></span><span class="help-card-body"><b>Player name</b><span><i class="pos-pill">QB</i> Team</span></span><span class="help-card-ovr"><b>OVR</b><small>overall</small></span></div>' }
  ];
  function tourState() { try { return localStorage.getItem(TOUR_KEY) || ""; } catch (e) { return ""; } }
  function setTourState(v) { try { localStorage.setItem(TOUR_KEY, v); } catch (e) {} }
  function renderTour() {
    var step = TOUR[tourStep];
    el("tourStep").textContent = "Step " + (tourStep + 1) + " of " + TOUR.length;
    el("tourTitle").textContent = step.title;
    el("tourCopy").textContent = step.copy;
    el("tourArt").innerHTML = step.art;
    el("tourBack").hidden = tourStep === 0;
    el("tourNext").textContent = tourStep === TOUR.length - 1 ? "Finish" : "Next";
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

  /* ---------- End Zone Run: loaded only when someone asks to play ---------- */
  var GAME_URL = "game.js?v=1", gameLoading = false;
  var modalApi = { show: showModal, close: closeModal, toast: showToast };
  function openGame(opener) {
    if (window.JanafariGame) { window.JanafariGame.open(opener || el("moreButton"), modalApi); return; }
    if (gameLoading) { return; }
    gameLoading = true; showToast("Loading End Zone Run…");
    var sc = document.createElement("script"); sc.src = GAME_URL;
    sc.onload = function () { gameLoading = false; if (window.JanafariGame) { window.JanafariGame.open(opener || el("moreButton"), modalApi); } };
    sc.onerror = function () { gameLoading = false; showToast("The game could not load. Check the internet and try again."); };
    document.body.appendChild(sc);
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
    el("helpButton").addEventListener("click", function (e) { openHelp(e.currentTarget); });
    el("playEgg").addEventListener("click", function (e) { openGame(e.currentTarget); });
    el("playMore").addEventListener("click", function () { closeModal("moreModal"); openGame(el("moreButton")); });
    el("helpMore").addEventListener("click", function () { openHelp(el("moreButton")); });
    el("inviteTour").addEventListener("click", function (e) { openTour(e.currentTarget); });
    el("tourStart").addEventListener("click", function () { openTour(el("helpButton")); });
    el("tourNext").addEventListener("click", function () { if (tourStep < TOUR.length - 1) { tourStep += 1; renderTour(); el("tourNext").focus(); } else { endTour("done"); } });
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
    document.addEventListener("keydown", function (event) {
      if (event.keyCode === 27) { ["gameModal", "tourModal", "helpModal", "moreModal", "playerModal", "addModal", "teamModal"].forEach(closeModal); }
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
  function boot() {
    loadState();
    try { var t = localStorage.getItem("janafari-tab"); if (t === "league" || t === "watch") { tab = t; } } catch (e) {}
    try { var v = localStorage.getItem("janafari-view"); if (v === "list" || v === "cards") { viewMode = v; } } catch (e) {}
    try { var tm = localStorage.getItem("janafari-team"); if (tm && (knownTeam[tm] || tm === "FA")) { activeTeam = tm; } } catch (e) {}
    fetchJson(DATA_URL, function (doc) {
      if (!validFeed(doc)) { failBoot("The ratings file looks wrong", "The page loaded, but EA's ratings file could not be read. Try again in a minute."); return; }
      useData(doc);
      migrateLegacy();
      state.watchlist = state.watchlist.filter(function (id, i, arr) { return arr.indexOf(id) === i; });
      var start = function (history) {
        var dirty = mergeHistory(history);
        if (ensureSnapshot() !== "same") { dirty = true; }
        if (dirty) { saveState(); }
        selectedSnapshot = state.snapshots.length - 1;
        if (!state.watchlist.length && tab === "watch") { tab = "league"; }
        bindEvents();
        render();
        el("loading").hidden = true;
      };
      fetchJson(HISTORY_URL + "?t=" + Date.now(), start, function () { start(null); });   // history is optional
    }, function () {
      failBoot("Could not load the ratings", "Check the internet and try again. The ratings file lives with this page.");
    });
  }

  boot();
}());

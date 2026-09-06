(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Janafari v2 — real ratings, a real watchlist.
     Every number on this page comes from EA's official Madden 27 ratings
     feed, snapshotted into data/ratings.json by tools/fetch_ratings.py
     (refreshed weekly by a GitHub Action). Nobody types a rating in here.
       League   = every rated player (top 100 shown; search finds anyone)
       Watchlist = the players THIS iPad's owner chose to follow
     Weeks are the feed's own iterations (Launch, Week 1, Week 2 ...): each
     new iteration the page sees becomes a snapshot, so week-over-week
     arrows and trend lines are EA's changes, not ours.
     ES5 on purpose: the old iPad in the house must keep working.
     ------------------------------------------------------------------ */

  var STORAGE_KEY = "janafari-v2";
  var LEGACY_KEY = "our-madden-27-board-v1";
  var DATA_URL = "data/ratings.json";
  var LEAGUE_LIMIT = 100;
  var SVG_NS = "http://www.w3.org/2000/svg";

  var DATA = null;          // {game, iteration, iterations, fetched, count, players:[...]}
  var byId = {};            // id -> player
  var statsCache = {};      // team -> {id: {stats, diffs}}
  var state;                // {version:2, watchlist:[ids], snapshots:[{id,label,date,ratings}]}
  var selectedSnapshot = 0;
  var tab = "watch";        // "watch" | "league"
  var activeFilter = "all";
  var viewMode = "cards";
  var searchTerm = "";
  var toastTimer;

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


  var teamColors = {};
  nflTeams.forEach(function (t) { teamColors[t.abbr] = t.color; });

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
    return name.split(" ").filter(function (p) { return p; }).slice(0, 2).map(function (p) { return p.charAt(0); }).join("").toUpperCase();
  }
  function slugify(name) { return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function formatDate(value) {
    var parts = String(value || "").split("-");
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (parts.length !== 3) { return value; }
    return months[parseInt(parts[1], 10) - 1] + " " + parseInt(parts[2], 10) + ", " + parts[0];
  }
  function heightText(inches) {
    if (!inches) { return "—"; }
    return Math.floor(inches / 12) + "'" + (inches % 12) + '"';
  }
  function logoUrl(abbr) { return abbr ? "https://a.espncdn.com/i/teamlogos/nfl/500/" + abbr.toLowerCase() + ".png" : null; }

  /* ---------- state ---------- */
  function makeDefaultState() { return { version: 2, watchlist: [], snapshots: [] }; }
  function validState(v) { return v && v.version === 2 && v.watchlist && v.snapshots; }
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
    if (state.watchlist.length || state.snapshots.length) { return; }
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

  // One snapshot per feed iteration: the page never invents a week.
  function ensureSnapshot() {
    var i, ratings = {};
    for (i = 0; i < state.snapshots.length; i += 1) {
      if (state.snapshots[i].id === DATA.iteration.id) { return false; }
    }
    DATA.players.forEach(function (p) { ratings[p.id] = p.ovr; });
    state.snapshots.push({ id: DATA.iteration.id, label: DATA.iteration.label, date: String(DATA.fetched || "").slice(0, 10), ratings: ratings });
    return true;
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
  function changeParts(change) {
    // Until EA's second week is saved there is nothing to compare — say nothing, not "NEW" everywhere.
    if (change === null && state.snapshots.length < 2) { return { text: "", cls: "change-none" }; }
    if (change === null) { return { text: "NEW", cls: "change-new" }; }
    if (change > 0) { return { text: "▲ " + change, cls: "change-up" }; }
    if (change < 0) { return { text: "▼ " + Math.abs(change), cls: "change-down" }; }
    return { text: "—", cls: "change-flat" };
  }
  function isWatched(id) { return state.watchlist.indexOf(id) !== -1; }

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
  function matchesFilter(p) {
    if (activeFilter === "all") { return true; }
    if (activeFilter === "movers") { var c = getChange(p.id); return c !== null && c !== 0; }
    return p.side === activeFilter;
  }
  function filteredPlayers() {
    var query = searchTerm.toLowerCase();
    var list = sortByRating(poolForTab()).filter(function (p) { return matchesSearch(p, query) && matchesFilter(p); });
    if (tab === "league" && !query && activeFilter !== "movers") { list = list.slice(0, LEAGUE_LIMIT); }
    return list;
  }

  /* ---------- portraits ---------- */
  function buildPortrait(p, className) {
    var wrap = document.createElement("div");
    var mono = textNode("span", "portrait-mono", initials(p.name));
    wrap.className = className;
    wrap.style.backgroundColor = teamColors[p.team] || "#174a6e";
    wrap.appendChild(mono);
    if (p.avatar) {
      var img = document.createElement("img");
      img.className = "portrait-img portrait-ea";
      img.alt = p.name;
      img.loading = "lazy";
      img.addEventListener("load", function () { wrap.className += " has-photo"; });
      img.addEventListener("error", function () { if (img.parentNode) { img.parentNode.removeChild(img); } });
      img.src = p.avatar;
      if (img.complete && img.naturalWidth > 0) { wrap.className += " has-photo"; }
      wrap.appendChild(img);
    }
    return wrap;
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

  /* ---------- cards & rows ---------- */
  function buildCard(p, rank) {
    var r = rating(p.id), parts = changeParts(getChange(p.id));
    var card = document.createElement("article"), top = document.createElement("div"), ovr = document.createElement("div");
    var body = document.createElement("div"), meta = document.createElement("div");
    card.className = "pcard" + (r === 99 ? " is-99" : "");
    top.className = "pcard-top";
    top.style.setProperty("--team", teamColors[p.team] || "#174a6e");
    var logoSrc = logoUrl(p.team);
    if (logoSrc) {
      var logo = document.createElement("img");
      logo.className = "pcard-logo"; logo.src = logoSrc; logo.alt = ""; logo.setAttribute("aria-hidden", "true"); logo.loading = "lazy";
      logo.addEventListener("error", function () { if (logo.parentNode) { logo.parentNode.removeChild(logo); } });
      top.appendChild(logo);
    }
    top.appendChild(textNode("span", "pcard-rank", "#" + rank));
    top.appendChild(textNode("span", "pcard-change " + parts.cls, parts.text));
    top.appendChild(buildPortrait(p, "pcard-portrait"));
    ovr.className = "pcard-ovr";
    ovr.appendChild(document.createTextNode(r === null ? "—" : String(r)));
    ovr.appendChild(textNode("small", "", "OVR"));
    top.appendChild(ovr);
    body.className = "pcard-body";
    body.appendChild(textNode("h3", "pcard-name", p.name));
    meta.className = "pcard-meta";
    meta.appendChild(textNode("span", "position-pill", p.pos));
    meta.appendChild(textNode("span", "pcard-team", p.team + " · " + p.teamName));
    if (isWatched(p.id)) { meta.appendChild(textNode("span", "watch-dot", "★")); }
    body.appendChild(meta);
    card.appendChild(top); card.appendChild(body);
    card.setAttribute("role", "button"); card.setAttribute("tabindex", "0");
    card.addEventListener("click", function () { openPlayer(p); });
    card.addEventListener("keydown", function (e) { if (e.keyCode === 13 || e.keyCode === 32) { e.preventDefault(); openPlayer(p); } });
    return card;
  }

  function buildRow(p, rank) {
    var r = rating(p.id), parts = changeParts(getChange(p.id));
    var row = document.createElement("tr");
    var playerCell = document.createElement("td"), posCell = document.createElement("td");
    var ovrCell = document.createElement("td"), changeCell = document.createElement("td"), trendCell = document.createElement("td");
    var wrap = document.createElement("div"), info = document.createElement("span");
    playerCell.className = "player-cell"; wrap.className = "player-wrap"; info.className = "player-info";
    info.appendChild(textNode("span", "player-name", p.name + (isWatched(p.id) ? " ★" : "")));
    info.appendChild(textNode("span", "player-side", p.side));
    wrap.appendChild(buildPortrait(p, "player-avatar")); wrap.appendChild(info); playerCell.appendChild(wrap);
    posCell.appendChild(textNode("span", "position-pill", p.pos));
    ovrCell.className = "center"; ovrCell.appendChild(textNode("span", "ovr-badge" + (r === 99 ? " ovr-99" : ""), r === null ? "—" : String(r)));
    changeCell.className = "center"; changeCell.appendChild(textNode("span", "change-pill " + parts.cls, parts.text));
    trendCell.appendChild(makeSparkline(p.id));
    row.appendChild(textNode("td", "rank-col", String(rank))); row.appendChild(playerCell); row.appendChild(posCell);
    row.appendChild(textNode("td", "team-code", p.team)); row.appendChild(ovrCell); row.appendChild(changeCell); row.appendChild(trendCell);
    row.style.cursor = "pointer";
    row.addEventListener("click", function () { openPlayer(p); });
    return row;
  }

  /* ---------- summary cards ---------- */
  function renderSummary() {
    var pool = poolForTab();
    var club = pool.filter(function (p) { return rating(p.id) === 99; });
    var movers = pool.map(function (p) { return { p: p, c: getChange(p.id) }; }).filter(function (m) { return m.c !== null && m.c !== 0; });
    movers.sort(function (a, b) { return Math.abs(b.c) - Math.abs(a.c); });
    el("clubCount").textContent = String(club.length);
    el("clubNames").textContent = club.length ? club.slice(0, 2).map(function (p) { return p.name.split(" ").pop(); }).join(" · ") + (club.length > 2 ? " +" + (club.length - 2) : "") : (tab === "watch" ? "Nobody on your list yet" : "—");
    el("trackedCount").textContent = String(tab === "watch" ? state.watchlist.length : DATA.count);
    el("trackedLabel").textContent = tab === "watch" ? "On your watchlist" : "Rated by EA this week";
    if (movers.length) {
      el("moverValue").textContent = (movers[0].c > 0 ? "+" : "") + movers[0].c;
      el("moverName").textContent = movers[0].p.name;
    } else {
      el("moverValue").textContent = "—";
      el("moverName").textContent = state.snapshots.length < 2 ? "Waiting for EA's next update" : "No changes this week";
    }
    el("sourceStamp").textContent = DATA.game + " · " + state.snapshots[selectedSnapshot].label + " · EA feed " + formatDate(state.snapshots[selectedSnapshot].date);
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
  }

  function renderTabs() {
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (btn) {
      var on = btn.getAttribute("data-tab") === tab;
      btn.className = "tab" + (on ? " active" : "");
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    el("watchTabCount").textContent = String(state.watchlist.length);
    el("boardTitle").textContent = tab === "watch" ? "My watchlist" : "League leaderboard";
    el("boardKicker").textContent = tab === "watch" ? "YOUR PLAYERS" : "ALL " + DATA.count + " RATED PLAYERS";
    el("searchInput").placeholder = tab === "watch" ? "Search your watchlist" : "Search any NFL player or team";
  }

  function renderFilterCounts() {
    var query = searchTerm.toLowerCase();
    var counts = { all: 0, offense: 0, defense: 0, movers: 0 };
    poolForTab().forEach(function (p) {
      if (!matchesSearch(p, query)) { return; }
      var c = getChange(p.id);
      counts.all += 1;
      if (p.side === "offense") { counts.offense += 1; }
      if (p.side === "defense") { counts.defense += 1; }
      if (c !== null && c !== 0) { counts.movers += 1; }
    });
    Array.prototype.forEach.call(document.querySelectorAll(".filter"), function (btn) {
      var key = btn.getAttribute("data-filter"), label = btn.getAttribute("data-label");
      if (!label) { label = btn.textContent.replace(/\s+\d+$/, "").trim(); btn.setAttribute("data-label", label); }
      clear(btn); btn.appendChild(document.createTextNode(label)); btn.appendChild(textNode("span", "filter-count", String(counts[key] || 0)));
    });
  }

  function renderEmptyState(count) {
    var box = el("emptyState");
    box.hidden = count > 0;
    if (count > 0) { return; }
    var icon = "🏈", title = "No players here", hint = "Try a different button up top.";
    if (tab === "watch" && !state.watchlist.length) { icon = "⭐"; title = "Your watchlist is empty"; hint = "Tap “Add player”, find anyone in the league, and add him. His real EA rating comes with him."; }
    else if (activeFilter === "movers" && state.snapshots.length < 2) { icon = "📅"; title = "No moves yet"; hint = "EA updates ratings every week during the season. Tap “Check ratings” after Thursday to pull the new numbers."; }
    else if (activeFilter === "movers") { icon = "😴"; title = "Nobody moved this week"; hint = "Every rating stayed the same."; }
    else if (searchTerm) { icon = "🔍"; title = "No player called “" + searchTerm + "”"; hint = tab === "watch" ? "He may not be on your list yet — check the League tab." : "Check the spelling."; }
    clear(box);
    box.appendChild(textNode("div", "empty-icon", icon));
    box.appendChild(textNode("strong", "empty-title", title));
    box.appendChild(textNode("p", "empty-hint", hint));
  }

  function applyView() {
    var grid = el("playerCards"), wrap = el("tableWrap"), cards = viewMode === "cards";
    grid.hidden = !cards; wrap.hidden = cards;
    Array.prototype.forEach.call(document.querySelectorAll(".view-btn"), function (btn) {
      var on = btn.getAttribute("data-view") === viewMode;
      btn.className = "view-btn" + (on ? " active" : ""); btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function redraw() {
    var visible = filteredPlayers();
    renderTabs(); renderSummary(); renderFilterCounts();
    var grid = el("playerCards"), body = el("playerRows");
    clear(grid); clear(body);
    visible.forEach(function (p, i) { grid.appendChild(buildCard(p, i + 1)); body.appendChild(buildRow(p, i + 1)); });
    applyView();
    renderEmptyState(visible.length);
    el("leagueNote").hidden = !(tab === "league" && !searchTerm && activeFilter !== "movers" && DATA.count > LEAGUE_LIMIT);
  }
  function render() { renderWeekSelect(); redraw(); }

  /* ---------- player card (modal) ---------- */
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

  function openPlayer(p) {
    var facts = playerBio[slugify(p.name)] || {};
    var r = rating(p.id), change = getChange(p.id), parts = changeParts(change);
    var hero = el("bioHero"), list = el("bioList"), statsBox = el("bioStats"), watchBtn = el("watchToggle");
    el("playerTitle").textContent = p.name;
    el("playerKicker").textContent = p.pos + "  ·  " + p.teamFull.toUpperCase();

    clear(hero);
    hero.style.background = "linear-gradient(150deg, " + (teamColors[p.team] || "#174a6e") + " 0%, rgba(0,0,0,.55) 140%)";
    hero.appendChild(buildPortrait(p, "bio-portrait"));
    var head = document.createElement("div"); head.className = "bio-headline";
    head.appendChild(textNode("b", "", p.name));
    head.appendChild(textNode("span", "", p.team + " · " + p.teamName + " · " + (p.posName || p.pos) + (p.jersey ? " · #" + p.jersey : "")));
    if (change !== null) { head.appendChild(textNode("span", "change-pill " + parts.cls, parts.text + " vs last week")); }
    hero.appendChild(head);
    hero.appendChild(textNode("div", "bio-ovr", r === null ? "—" : String(r)));

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
    statsBox.appendChild(textNode("div", "section-kicker", "TOP ATTRIBUTES · EA MADDEN 27"));
    var loading = textNode("p", "modal-copy", "Loading attributes…"); statsBox.appendChild(loading);
    loadStats(p.team, function (sheet) {
      clear(statsBox);
      statsBox.appendChild(textNode("div", "section-kicker", "TOP ATTRIBUTES · EA MADDEN 27"));
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

    watchBtn.textContent = isWatched(p.id) ? "★ On your watchlist — remove" : "☆ Add to my watchlist";
    watchBtn.className = "button " + (isWatched(p.id) ? "button-quiet" : "button-red") + " watch-toggle";
    watchBtn.onclick = function () {
      if (isWatched(p.id)) {
        state.watchlist = state.watchlist.filter(function (id) { return id !== p.id; });
        showToast(p.name + " removed from your watchlist");
      } else {
        state.watchlist.push(p.id);
        showToast(p.name + " added to your watchlist");
      }
      saveState(); closeModal("playerModal"); redraw();
    };
    showModal("playerModal");
  }

  /* ---------- add a player: search the real league ---------- */
  function openAdd() {
    var input = el("addSearch");
    input.value = "";
    renderAddResults("");
    showModal("addModal");
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
      row.appendChild(buildPortrait(p, "roster-pic"));
      info.className = "roster-info";
      info.appendChild(textNode("b", "", p.name + (isWatched(p.id) ? " ★" : "")));
      info.appendChild(textNode("small", "", p.pos + " · " + p.teamFull));
      row.appendChild(info);
      row.appendChild(textNode("span", "ovr-badge" + (p.ovr === 99 ? " ovr-99" : ""), String(rating(p.id) === null ? p.ovr : rating(p.id))));
      row.addEventListener("click", function () { closeModal("addModal"); openPlayer(p); });
      list.appendChild(row);
    });
  }

  /* ---------- check for new ratings ---------- */
  function checkRatings() {
    var btn = el("updateButton");
    btn.disabled = true;
    showToast("Checking EA's ratings…");
    fetchJson(DATA_URL + "?t=" + Date.now(), function (doc) {
      btn.disabled = false;
      if (!doc || !doc.iteration || !doc.players) { showToast("Could not read the ratings file"); return; }
      var before = DATA.iteration.id;
      useData(doc);
      var added = ensureSnapshot();
      if (added) { selectedSnapshot = state.snapshots.length - 1; saveState(); render(); showToast("New ratings: " + doc.iteration.label); }
      else { redraw(); showToast("Ratings are current — " + doc.iteration.label + (before === doc.iteration.id ? "" : "")); }
    }, function () { btn.disabled = false; showToast("Could not reach the ratings file. Check the internet."); });
  }

  /* ---------- modals, toast, backup ---------- */
  var scrollY = 0;
  function showModal(id) {
    scrollY = window.pageYOffset || 0;
    el(id).hidden = false;
    document.body.className = "modal-open";
    document.body.style.top = (-scrollY) + "px";
  }
  function closeModal(id) {
    el(id).hidden = true;
    if (!document.querySelector(".modal:not([hidden])")) {
      document.body.className = "";
      document.body.style.top = "";
      window.scrollTo(0, scrollY);
    }
  }
  function showToast(message) {
    var node = el("toast");
    node.textContent = message; node.className = "toast show";
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { node.className = "toast"; }, 2400);
  }
  function exportBackup() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var url = window.URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = "janafari-watchlist-backup.json";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
    showToast("Backup ready");
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
        ensureSnapshot();
        selectedSnapshot = state.snapshots.length - 1;
        saveState(); closeModal("backupModal"); render(); showToast("Backup restored");
      } catch (e) { showToast("That backup file is not valid"); }
      el("importInput").value = "";
    };
    reader.readAsText(file);
  }

  /* ---------- events ---------- */
  function bindEvents() {
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (btn) {
      btn.addEventListener("click", function () {
        tab = btn.getAttribute("data-tab") === "league" ? "league" : "watch";
        try { localStorage.setItem("janafari-tab", tab); } catch (e) {}
        searchTerm = ""; el("searchInput").value = ""; redraw();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".view-btn"), function (btn) {
      btn.addEventListener("click", function () {
        viewMode = btn.getAttribute("data-view") === "list" ? "list" : "cards";
        try { localStorage.setItem("janafari-view", viewMode); } catch (e) {}
        redraw();
      });
    });
    el("weekSelect").addEventListener("change", function () { selectedSnapshot = parseInt(this.value, 10); redraw(); });
    el("searchInput").addEventListener("input", function () { searchTerm = this.value; redraw(); });
    Array.prototype.forEach.call(document.querySelectorAll(".filter"), function (button) {
      button.addEventListener("click", function () {
        Array.prototype.forEach.call(document.querySelectorAll(".filter"), function (item) { item.className = "filter"; });
        this.className = "filter active"; activeFilter = this.getAttribute("data-filter"); redraw();
      });
    });
    el("addSearch").addEventListener("input", function () { renderAddResults(this.value); });
    el("updateButton").addEventListener("click", checkRatings);
    el("addButton").addEventListener("click", openAdd);
    el("backupButton").addEventListener("click", function () { showModal("backupModal"); });
    el("exportButton").addEventListener("click", exportBackup);
    el("importInput").addEventListener("change", function () { importBackup(this.files[0]); });
    el("resetButton").addEventListener("click", function () {
      if (window.confirm("Clear your watchlist and saved weeks on this device?")) {
        state = makeDefaultState(); ensureSnapshot(); selectedSnapshot = 0; saveState(); closeModal("backupModal"); render(); showToast("Watchlist cleared");
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (button) {
      button.addEventListener("click", function () { closeModal(this.getAttribute("data-close") + "Modal"); });
    });
    document.addEventListener("keydown", function (event) {
      if (event.keyCode === 27) { ["backupModal", "playerModal", "addModal"].forEach(closeModal); }
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    loadState();
    try { var t = localStorage.getItem("janafari-tab"); if (t === "league" || t === "watch") { tab = t; } } catch (e) {}
    try { var v = localStorage.getItem("janafari-view"); if (v === "list" || v === "cards") { viewMode = v; } } catch (e) {}
    fetchJson(DATA_URL, function (doc) {
      useData(doc);
      migrateLegacy();
      if (ensureSnapshot()) { saveState(); }
      selectedSnapshot = state.snapshots.length - 1;
      if (!state.watchlist.length && tab === "watch") { tab = "league"; }
      bindEvents();
      render();
      el("loading").hidden = true;
    }, function () {
      var box = el("loading");
      box.className = "empty-state";
      clear(box);
      box.appendChild(textNode("div", "empty-icon", "📡"));
      box.appendChild(textNode("strong", "empty-title", "Could not load the ratings"));
      box.appendChild(textNode("p", "empty-hint", "Check the internet and reload. The ratings file lives with this page."));
    });
  }

  boot();
}());

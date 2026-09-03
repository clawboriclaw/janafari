(function () {
  "use strict";

  var STORAGE_KEY = "our-madden-27-board-v1";
  var SVG_NS = "http://www.w3.org/2000/svg";
  var defaultPlayers = [
    { id: "jamarr-chase", name: "Ja'Marr Chase", team: "CIN", teamName: "Bengals", pos: "WR", side: "offense" },
    { id: "jaxon-smith-njigba", name: "Jaxon Smith-Njigba", team: "SEA", teamName: "Seahawks", pos: "WR", side: "offense" },
    { id: "josh-allen", name: "Josh Allen", team: "BUF", teamName: "Bills", pos: "QB", side: "offense" },
    { id: "matthew-stafford", name: "Matthew Stafford", team: "LAR", teamName: "Rams", pos: "QB", side: "offense" },
    { id: "myles-garrett", name: "Myles Garrett", team: "LAR", teamName: "Rams", pos: "REDG", side: "defense" },
    { id: "trey-mcbride", name: "Trey McBride", team: "ARI", teamName: "Cardinals", pos: "TE", side: "offense" },
    { id: "christian-gonzalez", name: "Christian Gonzalez", team: "NE", teamName: "Patriots", pos: "CB", side: "defense" },
    { id: "jahmyr-gibbs", name: "Jahmyr Gibbs", team: "DET", teamName: "Lions", pos: "HB", side: "offense" },
    { id: "micah-parsons", name: "Micah Parsons", team: "GB", teamName: "Packers", pos: "REDG", side: "defense" },
    { id: "penei-sewell", name: "Penei Sewell", team: "DET", teamName: "Lions", pos: "LT", side: "offense" },
    { id: "puka-nacua", name: "Puka Nacua", team: "LAR", teamName: "Rams", pos: "WR", side: "offense" },
    { id: "christian-mccaffrey", name: "Christian McCaffrey", team: "SF", teamName: "49ers", pos: "HB", side: "offense" },
    { id: "fred-warner", name: "Fred Warner", team: "SF", teamName: "49ers", pos: "MIKE", side: "defense" },
    { id: "joe-burrow", name: "Joe Burrow", team: "CIN", teamName: "Bengals", pos: "QB", side: "offense" },
    { id: "lane-johnson", name: "Lane Johnson", team: "PHI", teamName: "Eagles", pos: "RT", side: "offense" },
    { id: "maxx-crosby", name: "Maxx Crosby", team: "LV", teamName: "Raiders", pos: "LEDG", side: "defense" },
    { id: "patrick-surtain", name: "Patrick Surtain II", team: "DEN", teamName: "Broncos", pos: "CB", side: "defense" },
    { id: "derrick-brown", name: "Derrick Brown", team: "CAR", teamName: "Panthers", pos: "DT", side: "defense" },
    { id: "garett-bolles", name: "Garett Bolles", team: "DEN", teamName: "Broncos", pos: "LT", side: "offense" },
    { id: "george-kittle", name: "George Kittle", team: "SF", teamName: "49ers", pos: "TE", side: "offense" },
    { id: "justin-jefferson", name: "Justin Jefferson", team: "MIN", teamName: "Vikings", pos: "WR", side: "offense", espn: "4262921" },
    { id: "jonathan-taylor", name: "Jonathan Taylor", team: "IND", teamName: "Colts", pos: "RB", side: "offense", espn: "4242335" }
  ];
  var initialRatings = {
    "jamarr-chase": 99, "jaxon-smith-njigba": 99, "josh-allen": 99, "matthew-stafford": 99,
    "myles-garrett": 99, "trey-mcbride": 99, "christian-gonzalez": 98, "jahmyr-gibbs": 98,
    "micah-parsons": 98, "penei-sewell": 98, "puka-nacua": 98, "christian-mccaffrey": 97,
    "fred-warner": 97, "joe-burrow": 97, "lane-johnson": 97, "maxx-crosby": 97,
    "patrick-surtain": 97, "derrick-brown": 96, "garett-bolles": 96, "george-kittle": 96,
    "justin-jefferson": 90, "jonathan-taylor": 90
  };
  // ESPN headshot ids, resolved from the live NFL team rosters 2026-09-02.
  // Kept in a separate map (not on the player objects) on purpose: a returning
  // visitor already has players saved in localStorage from before photos existed,
  // and that saved copy would otherwise win and show no pictures.
  var playerPhotos = {
    "jamarr-chase": "4362628", "jaxon-smith-njigba": "4430878", "josh-allen": "3918298",
    "matthew-stafford": "12483", "myles-garrett": "3122132", "trey-mcbride": "4361307",
    "christian-gonzalez": "4686772", "jahmyr-gibbs": "4429795", "micah-parsons": "4361423",
    "penei-sewell": "4373825", "puka-nacua": "4426515", "christian-mccaffrey": "3117251",
    "fred-warner": "3138826", "joe-burrow": "3915511", "lane-johnson": "15797",
    "maxx-crosby": "3916655", "patrick-surtain": "4372012", "derrick-brown": "4035495",
    "garett-bolles": "4035662", "george-kittle": "3040151"
  };

  function logoUrl(teamAbbr) {
    return teamAbbr ? "https://a.espncdn.com/i/teamlogos/nfl/500/" + teamAbbr.toLowerCase() + ".png" : null;
  }

  // Career facts pulled from ESPN 2026-09-03 and baked in, so the page still
  // makes zero network calls of its own. Playoff years and rings are DERIVED:
  // a player's team that season, then that team's postseason schedule -- and a
  // team won the title iff its last postseason game was a win, since every other
  // playoff team ends on a loss. Years are NFL SEASONS (2021 = the Feb 2022 game).
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

  function photoUrl(player) {
    // Players the user adds carry their own espn id; the built-in twenty use the map.
    var espnId = (player && player.espn) || playerPhotos[(player && player.id) || player];
    return espnId ? "https://a.espncdn.com/i/headshots/nfl/players/full/" + espnId + ".png" : null;
  }

  // Build the portrait. Always render the monogram underneath, then lay the photo
  // over it -- if the image 404s or the device is offline the monogram is already
  // there, so a card never shows a broken-image icon.
  function buildPortrait(player, className) {
    var wrap = document.createElement("div");
    var mono = textNode("span", "portrait-mono", initials(player.name));
    var url = photoUrl(player);
    wrap.className = className;
    wrap.style.backgroundColor = teamColors[player.team] || "#174a6e";
    wrap.appendChild(mono);
    if (url) {
      var img = document.createElement("img");
      img.className = "portrait-img";
      img.alt = player.name;
      img.loading = "lazy";
      // Headshots are transparent PNGs, so the monogram would show THROUGH the
      // photo. Hide it the moment the image actually loads; if the image fails
      // the class is never added and the monogram is still there to fall back on.
      img.addEventListener("load", function () { wrap.className += " has-photo"; });
      img.addEventListener("error", function () {
        if (img.parentNode) { img.parentNode.removeChild(img); }
      });
      img.src = url;
      // A cached image can finish before the listener is attached.
      if (img.complete && img.naturalWidth > 0) { wrap.className += " has-photo"; }
      wrap.appendChild(img);
    }
    return wrap;
  }

  var teamColors = {
    CIN: "#fb4f14", SEA: "#002244", BUF: "#00338d", LAR: "#003594", ARI: "#97233f",
    NE: "#002244", DET: "#0076b6", GB: "#203731", SF: "#aa0000", PHI: "#004c54",
    LV: "#111111", DEN: "#fb4f14", CAR: "#0085ca",
    MIN: "#4f2683", IND: "#002c5f"
  };

  var state;
  var selectedSnapshot = 0;
  var activeFilter = "all";
  var viewMode = "cards";   // cards is the default: far easier to read at a glance
  var searchTerm = "";
  var toastTimer;

  function makeDefaultState() {
    return {
      version: 1,
      players: JSON.parse(JSON.stringify(defaultPlayers)),
      snapshots: [{ label: "Launch", date: "2026-09-02", ratings: JSON.parse(JSON.stringify(initialRatings)) }]
    };
  }

  function validState(value) {
    return value && value.version === 1 && value.players && value.players.length && value.snapshots && value.snapshots.length;
  }

  function loadState() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
      state = raw ? JSON.parse(raw) : makeDefaultState();
      if (!validState(state)) { state = makeDefaultState(); }
    } catch (error) {
      state = makeDefaultState();
    }
    selectedSnapshot = state.snapshots.length - 1;
  }

  // A board saved before a built-in player existed would never show him, because
  // the saved copy of `players` wins over defaultPlayers. Fold in anyone missing
  // and give him a rating in every snapshot so sorting and week-change stay sane.
  function mergeNewDefaults() {
    var changed = false;
    defaultPlayers.forEach(function (dp) {
      var known = state.players.some(function (p) { return p.id === dp.id; });
      if (!known) {
        state.players.push(JSON.parse(JSON.stringify(dp)));
        changed = true;
      }
      var seed = initialRatings[dp.id];
      if (typeof seed === "number") {
        state.snapshots.forEach(function (snap) {
          if (typeof snap.ratings[dp.id] !== "number") { snap.ratings[dp.id] = seed; changed = true; }
        });
      }
    });
    return changed;
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      showToast("Safari could not save the update");
      return false;
    }
  }

  function el(id) { return document.getElementById(id); }
  function clear(node) { while (node.firstChild) { node.removeChild(node.firstChild); } }

  function textNode(tag, className, value) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    node.appendChild(document.createTextNode(value));
    return node;
  }

  function initials(name) {
    var pieces = name.replace(/[^A-Za-z ]/g, "").split(/\s+/);
    return (pieces[0].charAt(0) + pieces[pieces.length - 1].charAt(0)).toUpperCase();
  }

  function formatDate(value) {
    var parts = value.split("-");
    var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (parts.length !== 3) { return value; }
    return names[parseInt(parts[1], 10) - 1] + " " + parseInt(parts[2], 10) + ", " + parts[0];
  }

  function previousSnapshot(index) {
    return index > 0 ? state.snapshots[index - 1] : null;
  }

  function getChange(playerId, index) {
    var current = state.snapshots[index].ratings[playerId];
    var previous = previousSnapshot(index);
    if (!previous || typeof previous.ratings[playerId] !== "number") { return null; }
    return current - previous.ratings[playerId];
  }

  function sortedPlayers() {
    var ratings = state.snapshots[selectedSnapshot].ratings;
    var players = state.players.slice(0);
    players.sort(function (a, b) {
      var ratingDiff = ratings[b.id] - ratings[a.id];
      return ratingDiff || a.name.localeCompare(b.name);
    });
    return players;
  }

  function filteredPlayers() {
    var players = sortedPlayers();
    var query = searchTerm.toLowerCase();
    return players.filter(function (player) {
      var matchesSearch = !query || (player.name + " " + player.team + " " + player.teamName + " " + player.pos).toLowerCase().indexOf(query) !== -1;
      var matchesFilter = activeFilter === "all" || player.side === activeFilter || (activeFilter === "movers" && getChange(player.id, selectedSnapshot) !== 0 && getChange(player.id, selectedSnapshot) !== null);
      return matchesSearch && matchesFilter;
    });
  }

  function makeSparkline(playerId) {
    var svg = document.createElementNS(SVG_NS, "svg");
    var guide = document.createElementNS(SVG_NS, "line");
    var polyline = document.createElementNS(SVG_NS, "polyline");
    var dot = document.createElementNS(SVG_NS, "circle");
    var values = [];
    var points = [];
    var i, x, y, min, max, range;
    svg.setAttribute("class", "sparkline");
    svg.setAttribute("viewBox", "0 0 95 30");
    svg.setAttribute("aria-label", "Rating history");
    guide.setAttribute("x1", "2"); guide.setAttribute("x2", "93"); guide.setAttribute("y1", "25"); guide.setAttribute("y2", "25");
    svg.appendChild(guide);
    for (i = 0; i <= selectedSnapshot; i += 1) {
      if (typeof state.snapshots[i].ratings[playerId] === "number") { values.push(state.snapshots[i].ratings[playerId]); }
    }
    min = Math.min.apply(Math, values);
    max = Math.max.apply(Math, values);
    range = Math.max(max - min, 2);
    for (i = 0; i < values.length; i += 1) {
      x = values.length === 1 ? 47 : 3 + (89 * i / (values.length - 1));
      y = 24 - ((values[i] - min + (range - (max - min)) / 2) / range * 18);
      points.push(x.toFixed(1) + "," + y.toFixed(1));
    }
    if (values.length > 1) {
      polyline.setAttribute("points", points.join(" "));
      svg.appendChild(polyline);
    }
    dot.setAttribute("cx", points[points.length - 1].split(",")[0]);
    dot.setAttribute("cy", points[points.length - 1].split(",")[1]);
    dot.setAttribute("r", "3");
    svg.appendChild(dot);
    return svg;
  }

  function buildRow(player, rank) {
    var snapshot = state.snapshots[selectedSnapshot];
    var rating = snapshot.ratings[player.id];
    var change = getChange(player.id, selectedSnapshot);
    var row = document.createElement("tr");
    var rankCell = textNode("td", "rank-col", String(rank));
    var playerCell = document.createElement("td");
    var posCell = document.createElement("td");
    var teamCell = textNode("td", "team-code", player.team);
    var ovrCell = document.createElement("td");
    var changeCell = document.createElement("td");
    var trendCell = document.createElement("td");
    var changeText;
    var changeClass;

    var playerWrap = document.createElement("div");
    var avatar = buildPortrait(player, "player-avatar");
    var playerInfo = document.createElement("span");
    playerCell.className = "player-cell";
    playerWrap.className = "player-wrap";
    playerInfo.className = "player-info";
    playerInfo.appendChild(textNode("span", "player-name", player.name));
    playerInfo.appendChild(textNode("span", "player-side", player.side));
    playerWrap.appendChild(avatar);
    playerWrap.appendChild(playerInfo);
    playerCell.appendChild(playerWrap);
    posCell.appendChild(textNode("span", "position-pill", player.pos));
    ovrCell.className = "center";
    ovrCell.appendChild(textNode("span", "ovr-badge" + (rating === 99 ? " ovr-99" : ""), String(rating)));
    changeCell.className = "center";
    if (change === null) { changeText = "NEW"; changeClass = "change-new"; }
    else if (change > 0) { changeText = "▲ " + change; changeClass = "change-up"; }
    else if (change < 0) { changeText = "▼ " + Math.abs(change); changeClass = "change-down"; }
    else { changeText = "—"; changeClass = "change-flat"; }
    changeCell.appendChild(textNode("span", "change-pill " + changeClass, changeText));
    trendCell.appendChild(makeSparkline(player.id));

    row.addEventListener("click", function () { openPlayer(player); });
    row.style.cursor = "pointer";
    row.appendChild(rankCell); row.appendChild(playerCell); row.appendChild(posCell); row.appendChild(teamCell);
    row.appendChild(ovrCell); row.appendChild(changeCell); row.appendChild(trendCell);
    return row;
  }

  function changeParts(change) {
    if (change === null) { return { text: "NEW", cls: "change-new" }; }
    if (change > 0) { return { text: "▲ " + change, cls: "change-up" }; }
    if (change < 0) { return { text: "▼ " + Math.abs(change), cls: "change-down" }; }
    return { text: "—", cls: "change-flat" };
  }

  function buildCard(player, rank) {
    var rating = state.snapshots[selectedSnapshot].ratings[player.id];
    var change = getChange(player.id, selectedSnapshot);
    var parts = changeParts(change);
    var card = document.createElement("article");
    var top = document.createElement("div");
    var ovr = document.createElement("div");
    var body = document.createElement("div");
    var meta = document.createElement("div");

    card.className = "pcard" + (rating === 99 ? " is-99" : "");
    top.className = "pcard-top";
    top.style.setProperty("--team", teamColors[player.team] || "#174a6e");

    // Team logo as the card's backdrop. Appended first so the photo, rank,
    // change chip and OVR all paint over it; dropped on error so a missing
    // logo just leaves the plain team colour.
    var logoSrc = logoUrl(player.team);
    if (logoSrc) {
      var logo = document.createElement("img");
      logo.className = "pcard-logo";
      logo.src = logoSrc;
      logo.alt = "";
      logo.setAttribute("aria-hidden", "true");
      logo.loading = "lazy";
      logo.addEventListener("error", function () {
        if (logo.parentNode) { logo.parentNode.removeChild(logo); }
      });
      top.appendChild(logo);
    }

    top.appendChild(textNode("span", "pcard-rank", "#" + rank));
    top.appendChild(textNode("span", "pcard-change " + parts.cls, parts.text));
    top.appendChild(buildPortrait(player, "pcard-portrait"));

    ovr.className = "pcard-ovr";
    ovr.appendChild(document.createTextNode(String(rating)));
    ovr.appendChild(textNode("small", "", "OVR"));
    top.appendChild(ovr);

    body.className = "pcard-body";
    body.appendChild(textNode("h3", "pcard-name", player.name));
    meta.className = "pcard-meta";
    meta.appendChild(textNode("span", "position-pill", player.pos));
    meta.appendChild(textNode("span", "pcard-team", player.team + " · " + player.teamName));
    body.appendChild(meta);

    card.appendChild(top);
    card.appendChild(body);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.addEventListener("click", function () { openPlayer(player); });
    card.addEventListener("keydown", function (event) {
      if (event.keyCode === 13 || event.keyCode === 32) { event.preventDefault(); openPlayer(player); }
    });
    return card;
  }

  function renderCards() {
    var grid = el("playerCards");
    // A cached older index.html will not have this container. Skip rather than
    // throw: one missing optional element must never take the table down too.
    if (!grid) { return; }
    var visible = filteredPlayers();
    clear(grid);
    // Rank within the SECTION being viewed, so Defense reads 1..7 rather than
    // the overall 5, 9, 12 -- which looks broken to anyone reading a filter.
    visible.forEach(function (player, index) { grid.appendChild(buildCard(player, index + 1)); });
  }

  function applyView() {
    var grid = el("playerCards");
    var wrap = el("tableWrap");
    var cards = viewMode === "cards";
    if (!grid || !wrap) { return; }   // older cached markup: leave the table as-is
    grid.hidden = !cards;
    wrap.hidden = cards;
    Array.prototype.forEach.call(document.querySelectorAll(".view-btn"), function (btn) {
      var on = btn.getAttribute("data-view") === viewMode;
      btn.className = "view-btn" + (on ? " active" : "");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function yearChips(list, className, emptyText) {
    var dd = document.createElement("dd");
    if (!list || !list.length) {
      dd.appendChild(textNode("span", "bio-none", emptyText));
      return dd;
    }
    list.slice().sort(function (a, b) { return b - a; }).forEach(function (year) {
      dd.appendChild(textNode("span", className, String(year)));
    });
    return dd;
  }

  function bioRow(label, ddNode) {
    var row = document.createElement("div");
    row.className = "bio-row";
    row.appendChild(textNode("dt", "", label));
    row.appendChild(ddNode);
    return row;
  }

  function openPlayer(player) {
    var facts = playerBio[player.id] || {};
    var rating = state.snapshots[selectedSnapshot].ratings[player.id];
    var hero = el("bioHero");
    var list = el("bioList");
    if (!hero || !list) { return; }

    el("playerTitle").textContent = player.name;
    el("playerKicker").textContent = player.pos + "  ·  " + player.teamName.toUpperCase();

    clear(hero);
    hero.style.background = "linear-gradient(150deg, " + (teamColors[player.team] || "#174a6e") + " 0%, rgba(0,0,0,.55) 140%)";
    hero.appendChild(buildPortrait(player, "bio-portrait"));
    var head = document.createElement("div");
    head.className = "bio-headline";
    head.appendChild(textNode("b", "", player.name));
    head.appendChild(textNode("span", "", player.team + " · " + player.teamName + " · " + player.pos));
    hero.appendChild(head);
    hero.appendChild(textNode("div", "bio-ovr", String(rating)));

    clear(list);
    var college = document.createElement("dd");
    college.appendChild(document.createTextNode(facts.college || "—"));
    list.appendChild(bioRow("College", college));

    var draft = document.createElement("dd");
    if (facts.draftYear) {
      draft.appendChild(document.createTextNode(String(facts.draftYear)));
      var detail2 = "Round " + facts.draftRound + ", pick " + facts.draftPick;
      draft.appendChild(textNode("small", "", detail2));
    } else {
      draft.appendChild(textNode("span", "bio-none", "Undrafted"));
    }
    list.appendChild(bioRow("Drafted", draft));

    list.appendChild(bioRow("Super Bowls", yearChips(facts.superBowls, "bio-ring", "No rings yet")));
    list.appendChild(bioRow("Playoffs", yearChips(facts.playoffs, "bio-year", "Has not made it yet")));

    var note = document.createElement("dd");
    note.appendChild(textNode("small", "", "Years are NFL seasons — the 2021 season’s Super Bowl was played in February 2022."));
    list.appendChild(bioRow("", note));

    showModal("playerModal");
  }

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

  var OFFENSE_POS = { QB:1, RB:1, HB:1, FB:1, WR:1, TE:1, LT:1, LG:1, C:1, RG:1, RT:1, OL:1, OT:1, OG:1, G:1, T:1 };

  function sideForPosition(pos) {
    return OFFENSE_POS[(pos || "").toUpperCase()] ? "offense" : "defense";
  }

  function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function addPane(which) {
    ["addTeams", "addRoster", "addConfirm"].forEach(function (id) {
      var node = el(id);
      if (node) { node.hidden = id !== which; }
    });
  }

  function openAdd() {
    var grid = el("addTeams");
    if (!grid) { return; }
    el("addStatus").textContent = "Pick a team";
    clear(grid);
    nflTeams.forEach(function (team) {
      var button = document.createElement("button");
      var img = document.createElement("img");
      button.type = "button";
      button.className = "team-chip";
      img.src = "https://a.espncdn.com/i/teamlogos/nfl/500/" + team.abbr.toLowerCase() + ".png";
      img.alt = "";
      img.loading = "lazy";
      button.appendChild(img);
      button.appendChild(textNode("span", "", team.name));
      button.addEventListener("click", function () { loadRoster(team); });
      grid.appendChild(button);
    });
    addPane("addTeams");
    showModal("addModal");
  }

  function loadRoster(team) {
    var list = el("addRoster");
    var status = el("addStatus");
    clear(list);
    addPane("addRoster");
    status.textContent = "Loading the " + team.name + "...";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/" + team.abbr.toLowerCase() + "/roster", true);
    xhr.timeout = 20000;
    xhr.onload = function () {
      var data = null;
      try { data = JSON.parse(xhr.responseText); } catch (e) { data = null; }
      var players = [];
      if (data && data.athletes) {
        data.athletes.forEach(function (group) {
          (group.items || []).forEach(function (a) { players.push(a); });
        });
      }
      if (!players.length) {
        status.textContent = "Could not load that roster. Check the internet and try again.";
        return;
      }
      status.textContent = "Tap a player to add";
      players.sort(function (a, b) { return (a.fullName || "").localeCompare(b.fullName || ""); });
      players.forEach(function (a) {
        var pos = (a.position && a.position.abbreviation) || "";
        var row = document.createElement("button");
        var pic = document.createElement("span");
        var info = document.createElement("span");
        row.type = "button";
        row.className = "roster-row";
        pic.className = "roster-pic";
        pic.style.backgroundColor = team.color;
        var hs = (a.headshot && a.headshot.href) || null;
        if (hs) {
          var img = document.createElement("img");
          img.src = hs; img.alt = ""; img.loading = "lazy";
          img.addEventListener("error", function () { if (img.parentNode) { img.parentNode.removeChild(img); } });
          pic.appendChild(img);
        }
        info.className = "roster-info";
        info.appendChild(textNode("b", "", a.fullName || "Unknown"));
        info.appendChild(textNode("small", "", pos + " - " + team.name));
        row.appendChild(pic);
        row.appendChild(info);
        row.addEventListener("click", function () { confirmAdd(team, a, pos); });
        list.appendChild(row);
      });
    };
    xhr.onerror = function () { status.textContent = "Could not reach the roster list. Check the internet and try again."; };
    xhr.ontimeout = xhr.onerror;
    xhr.send();
  }

  function confirmAdd(team, athlete, pos) {
    var box = el("addConfirm");
    var name = athlete.fullName || "Unknown";
    var id = slugify(name);
    clear(box);
    addPane("addConfirm");
    el("addStatus").textContent = "";

    if (state.players.some(function (p) { return p.id === id; })) {
      box.appendChild(textNode("p", "modal-copy", name + " is already on the board."));
      var back0 = document.createElement("button");
      back0.type = "button";
      back0.className = "button button-quiet";
      back0.textContent = "Pick someone else";
      back0.addEventListener("click", function () { loadRoster(team); });
      box.appendChild(back0);
      return;
    }

    box.appendChild(textNode("h3", "add-name", name));
    box.appendChild(textNode("p", "modal-copy", pos + " - " + team.name + ". What is his Madden rating?"));

    var stepper = document.createElement("div");
    var minus = document.createElement("button");
    var input = document.createElement("input");
    var plus = document.createElement("button");
    stepper.className = "stepper add-stepper";
    minus.type = "button";
    minus.textContent = "-";
    minus.setAttribute("aria-label", "Lower rating");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", "Raise rating");
    input.type = "number";
    input.min = "0";
    input.max = "99";
    input.step = "1";
    input.setAttribute("inputmode", "numeric");
    input.value = "80";
    minus.addEventListener("click", function () { input.value = Math.max(0, (parseInt(input.value, 10) || 0) - 1); });
    plus.addEventListener("click", function () { input.value = Math.min(99, (parseInt(input.value, 10) || 0) + 1); });
    stepper.appendChild(minus);
    stepper.appendChild(input);
    stepper.appendChild(plus);
    box.appendChild(stepper);

    var actions = document.createElement("div");
    var back = document.createElement("button");
    var save = document.createElement("button");
    actions.className = "modal-actions";
    back.type = "button";
    back.className = "button button-quiet";
    back.textContent = "Back";
    back.addEventListener("click", function () { loadRoster(team); });
    save.type = "button";
    save.className = "button button-red";
    save.textContent = "Add to board";
    save.addEventListener("click", function () {
      var rating = Math.max(0, Math.min(99, parseInt(input.value, 10) || 0));
      state.players.push({
        id: id,
        name: name,
        team: team.abbr,
        teamName: team.name,
        pos: pos || "ATH",
        side: sideForPosition(pos),
        espn: String(athlete.id || "")
      });
      // Give him a rating in EVERY snapshot. Without it the sort and the
      // week-over-week change read undefined for weeks before he was added.
      state.snapshots.forEach(function (snap) { snap.ratings[id] = rating; });
      if (!teamColors[team.abbr]) { teamColors[team.abbr] = team.color; }
      saveState();
      closeModal("addModal");
      render();
      showToast(name + " added");
    });
    actions.appendChild(back);
    actions.appendChild(save);
    box.appendChild(actions);
  }

  function renderWeekSelect() {
    var select = el("weekSelect");
    clear(select);
    state.snapshots.forEach(function (snapshot, index) {
      var option = document.createElement("option");
      option.value = String(index);
      option.text = snapshot.label + " · " + formatDate(snapshot.date);
      if (index === selectedSnapshot) { option.selected = true; }
      select.appendChild(option);
    });
  }

  function renderSummary() {
    var ratings = state.snapshots[selectedSnapshot].ratings;
    var club = state.players.filter(function (player) { return ratings[player.id] === 99; });
    var movers = state.players.map(function (player) { return { player: player, change: getChange(player.id, selectedSnapshot) }; });
    movers = movers.filter(function (item) { return item.change !== null && item.change !== 0; });
    movers.sort(function (a, b) { return Math.abs(b.change) - Math.abs(a.change); });
    el("clubCount").textContent = String(club.length);
    el("clubNames").textContent = club.length ? club.slice(0, 2).map(function (player) { return player.name.split(" ").pop(); }).join(" · ") + (club.length > 2 ? " +" + (club.length - 2) : "") : "No players this week";
    el("trackedCount").textContent = String(state.players.length);
    if (movers.length) {
      el("moverValue").textContent = (movers[0].change > 0 ? "+" : "") + movers[0].change;
      el("moverName").textContent = movers[0].player.name;
    } else {
      el("moverValue").textContent = "—";
      el("moverName").textContent = selectedSnapshot === 0 ? "Add the next week to compare" : "No changes this week";
    }
    el("sourceStamp").textContent = state.snapshots[selectedSnapshot].label + " · " + formatDate(state.snapshots[selectedSnapshot].date);
  }

  function renderRows() {
    var body = el("playerRows");
    var visible = filteredPlayers();
    clear(body);
    visible.forEach(function (player, index) { body.appendChild(buildRow(player, index + 1)); });
    renderEmptyState(visible.length);
  }

  // Redraw everything the current filters affect. Deliberately does NOT rebuild
  // the week <select>: that is only needed when the snapshot list itself changes,
  // and rebuilding it mid-interaction would fight the user's own selection.
  // Show how many players sit in each section, on the buttons themselves.
  // An empty grid saying "no players match" tells a 10-year-old nothing about
  // what to do next. Movers in particular is empty for a perfectly normal
  // reason -- only one week is saved -- so say that, and name the button.
  function renderEmptyState(visibleCount) {
    var box = el("emptyState");
    if (!box) { return; }
    box.hidden = visibleCount > 0;
    if (visibleCount > 0) { return; }

    var onlyOneWeek = state.snapshots.length < 2;
    var icon = "🏈";
    var title = "No players here";
    var hint = "Try a different button up top.";

    if (activeFilter === "movers" && onlyOneWeek) {
      icon = "📅";
      title = "No moves yet";
      hint = "Tap “Update week” to save this week’s ratings. Once two weeks are saved, everyone who went up or down shows up right here.";
    } else if (activeFilter === "movers") {
      icon = "😴";
      title = "Nobody moved this week";
      hint = "Every rating stayed the same. Check again after the next update.";
    } else if (searchTerm) {
      icon = "🔍";
      title = "No player called “" + searchTerm + "”";
      hint = "Check the spelling, or clear the search box.";
    }

    clear(box);
    box.appendChild(textNode("div", "empty-icon", icon));
    box.appendChild(textNode("strong", "empty-title", title));
    box.appendChild(textNode("p", "empty-hint", hint));
  }

  function renderFilterCounts() {
    var players = sortedPlayers();
    var query = searchTerm.toLowerCase();
    function matches(player) {
      return !query || (player.name + " " + player.team + " " + player.teamName + " " + player.pos).toLowerCase().indexOf(query) !== -1;
    }
    var counts = { all: 0, offense: 0, defense: 0, movers: 0 };
    players.forEach(function (player) {
      if (!matches(player)) { return; }
      var change = getChange(player.id, selectedSnapshot);
      counts.all += 1;
      if (player.side === "offense") { counts.offense += 1; }
      if (player.side === "defense") { counts.defense += 1; }
      if (change !== null && change !== 0) { counts.movers += 1; }
    });
    Array.prototype.forEach.call(document.querySelectorAll(".filter"), function (btn) {
      var key = btn.getAttribute("data-filter");
      var label = btn.getAttribute("data-label");
      if (!label) { label = btn.textContent.trim(); btn.setAttribute("data-label", label); }
      clear(btn);
      btn.appendChild(document.createTextNode(label));
      btn.appendChild(textNode("span", "filter-count", String(counts[key] || 0)));
    });
  }

  function redraw() {
    renderSummary();
    renderFilterCounts();
    renderRows();
    renderCards();
    applyView();
    renderEmptyState(filteredPlayers().length);
  }

  function render() {
    renderWeekSelect();
    renderSummary();
    renderFilterCounts();
    renderRows();
    renderCards();
    applyView();
    renderEmptyState(filteredPlayers().length);
  }

  function localDateValue() {
    var date = new Date();
    var month = String(date.getMonth() + 1);
    var day = String(date.getDate());
    if (month.length < 2) { month = "0" + month; }
    if (day.length < 2) { day = "0" + day; }
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function openUpdate() {
    var latest = state.snapshots[state.snapshots.length - 1];
    var editor = el("ratingEditor");
    clear(editor);
    el("snapshotLabel").value = "Week " + state.snapshots.length;
    el("snapshotDate").value = localDateValue();
    sortedByLatest().forEach(function (player) {
      var row = document.createElement("label");
      var info = document.createElement("span");
      var controls = document.createElement("span");
      var minus = document.createElement("button");
      var input = document.createElement("input");
      var plus = document.createElement("button");
      row.className = "rating-edit-row";
      info.appendChild(textNode("b", "", player.name));
      info.appendChild(textNode("small", "", player.pos + " · " + player.team));
      controls.className = "stepper";
      minus.type = "button"; minus.textContent = "−"; minus.setAttribute("aria-label", "Lower " + player.name + " rating");
      plus.type = "button"; plus.textContent = "+"; plus.setAttribute("aria-label", "Raise " + player.name + " rating");
      input.type = "number"; input.min = "0"; input.max = "99"; input.step = "1"; input.setAttribute("inputmode", "numeric");
      input.value = latest.ratings[player.id]; input.setAttribute("data-player", player.id); input.setAttribute("data-original", latest.ratings[player.id]);
      function reflectChange() {
        var value = parseInt(input.value, 10);
        row.className = "rating-edit-row" + (input.value !== input.getAttribute("data-original") ? " changed" : "");
        minus.disabled = value <= 0;
        plus.disabled = value >= 99;
      }
      minus.addEventListener("click", function () { var value = parseInt(input.value, 10) || 0; input.value = Math.max(0, value - 1); reflectChange(); });
      plus.addEventListener("click", function () { var value = parseInt(input.value, 10) || 0; input.value = Math.min(99, value + 1); reflectChange(); });
      input.addEventListener("input", reflectChange);
      controls.appendChild(minus); controls.appendChild(input); controls.appendChild(plus);
      row.appendChild(info); row.appendChild(controls); editor.appendChild(row);
      reflectChange();
    });
    showModal("updateModal");
  }

  function sortedByLatest() {
    var latest = state.snapshots[state.snapshots.length - 1].ratings;
    var players = state.players.slice(0);
    players.sort(function (a, b) { return latest[b.id] - latest[a.id] || a.name.localeCompare(b.name); });
    return players;
  }

  function saveSnapshot() {
    var label = el("snapshotLabel").value.replace(/^\s+|\s+$/g, "");
    var date = el("snapshotDate").value;
    var inputs = el("ratingEditor").getElementsByTagName("input");
    var ratings = {};
    var i, value;
    if (!label || !date) { showToast("Add a week name and date"); return; }
    for (i = 0; i < inputs.length; i += 1) {
      value = parseInt(inputs[i].value, 10);
      if (isNaN(value) || value < 0 || value > 99) { showToast("Ratings must be from 0 to 99"); inputs[i].focus(); return; }
      ratings[inputs[i].getAttribute("data-player")] = value;
    }
    state.snapshots.push({ label: label, date: date, ratings: ratings });
    selectedSnapshot = state.snapshots.length - 1;
    if (saveState()) {
      closeModal("updateModal");
      render();
      showToast(label + " saved");
    }
  }

  function showModal(id) { el(id).hidden = false; document.body.className = "modal-open"; }
  function closeModal(id) { el(id).hidden = true; document.body.className = ""; }
  function showToast(message) {
    var node = el("toast");
    node.textContent = message;
    node.className = "toast show";
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { node.className = "toast"; }, 2400);
  }

  function exportBackup() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "janafari-ratings-backup.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
    showToast("Backup ready");
  }

  function importBackup(file) {
    var reader;
    if (!file) { return; }
    reader = new FileReader();
    reader.onload = function () {
      var imported;
      try {
        imported = JSON.parse(reader.result);
        if (!validState(imported)) { throw new Error("invalid"); }
        state = imported;
        selectedSnapshot = state.snapshots.length - 1;
        saveState(); closeModal("backupModal"); render(); showToast("Backup restored");
      } catch (error) { showToast("That backup file is not valid"); }
      el("importInput").value = "";
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    Array.prototype.forEach.call(document.querySelectorAll(".view-btn"), function (btn) {
      btn.addEventListener("click", function () {
        viewMode = btn.getAttribute("data-view") === "list" ? "list" : "cards";
        try { localStorage.setItem("janafari-view", viewMode); } catch (e) {}
        redraw();
      });
    });
    try {
      var savedView = localStorage.getItem("janafari-view");
      if (savedView === "list" || savedView === "cards") { viewMode = savedView; }
    } catch (e) {}

    el("weekSelect").addEventListener("change", function () { selectedSnapshot = parseInt(this.value, 10); redraw(); });
    el("searchInput").addEventListener("input", function () { searchTerm = this.value; redraw(); });
    Array.prototype.forEach.call(document.querySelectorAll(".filter"), function (button) {
      button.addEventListener("click", function () {
        Array.prototype.forEach.call(document.querySelectorAll(".filter"), function (item) { item.className = "filter"; });
        this.className = "filter active"; activeFilter = this.getAttribute("data-filter"); redraw();
      });
    });
    el("updateButton").addEventListener("click", openUpdate);
    el("backupButton").addEventListener("click", function () { showModal("backupModal"); });
    var addBtn = el("addButton");
    if (addBtn) { addBtn.addEventListener("click", openAdd); }
    el("saveSnapshot").addEventListener("click", saveSnapshot);
    el("exportButton").addEventListener("click", exportBackup);
    el("importInput").addEventListener("change", function () { importBackup(this.files[0]); });
    el("resetButton").addEventListener("click", function () {
      if (window.confirm("Delete the saved weeks on this iPad and start over?")) {
        state = makeDefaultState(); selectedSnapshot = 0; saveState(); closeModal("backupModal"); render(); showToast("Board reset");
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (button) {
      button.addEventListener("click", function () { closeModal(this.getAttribute("data-close") + "Modal"); });
    });
    document.addEventListener("keydown", function (event) {
      if (event.keyCode === 27) { closeModal("updateModal"); closeModal("backupModal"); closeModal("playerModal"); closeModal("addModal"); }
    });
  }

  loadState();
  if (mergeNewDefaults()) { saveState(); }
  bindEvents();
  render();
}());

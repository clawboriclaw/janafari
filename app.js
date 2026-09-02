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
    { id: "george-kittle", name: "George Kittle", team: "SF", teamName: "49ers", pos: "TE", side: "offense" }
  ];
  var initialRatings = {
    "jamarr-chase": 99, "jaxon-smith-njigba": 99, "josh-allen": 99, "matthew-stafford": 99,
    "myles-garrett": 99, "trey-mcbride": 99, "christian-gonzalez": 98, "jahmyr-gibbs": 98,
    "micah-parsons": 98, "penei-sewell": 98, "puka-nacua": 98, "christian-mccaffrey": 97,
    "fred-warner": 97, "joe-burrow": 97, "lane-johnson": 97, "maxx-crosby": 97,
    "patrick-surtain": 97, "derrick-brown": 96, "garett-bolles": 96, "george-kittle": 96
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

  function photoUrl(playerId) {
    var espnId = playerPhotos[playerId];
    return espnId ? "https://a.espncdn.com/i/headshots/nfl/players/full/" + espnId + ".png" : null;
  }

  // Build the portrait. Always render the monogram underneath, then lay the photo
  // over it -- if the image 404s or the device is offline the monogram is already
  // there, so a card never shows a broken-image icon.
  function buildPortrait(player, className) {
    var wrap = document.createElement("div");
    var mono = textNode("span", "portrait-mono", initials(player.name));
    var url = photoUrl(player.id);
    wrap.className = className;
    wrap.style.backgroundColor = teamColors[player.team] || "#174a6e";
    wrap.appendChild(mono);
    if (url) {
      var img = document.createElement("img");
      img.className = "portrait-img";
      img.src = url;
      img.alt = player.name;
      img.loading = "lazy";
      img.addEventListener("error", function () {
        if (img.parentNode) { img.parentNode.removeChild(img); }
      });
      wrap.appendChild(img);
    }
    return wrap;
  }

  var teamColors = {
    CIN: "#fb4f14", SEA: "#002244", BUF: "#00338d", LAR: "#003594", ARI: "#97233f",
    NE: "#002244", DET: "#0076b6", GB: "#203731", SF: "#aa0000", PHI: "#004c54",
    LV: "#111111", DEN: "#fb4f14", CAR: "#0085ca"
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
    return card;
  }

  function renderCards() {
    var grid = el("playerCards");
    // A cached older index.html will not have this container. Skip rather than
    // throw: one missing optional element must never take the table down too.
    if (!grid) { return; }
    var visible = filteredPlayers();
    var allSorted = sortedPlayers();
    clear(grid);
    visible.forEach(function (player) { grid.appendChild(buildCard(player, allSorted.indexOf(player) + 1)); });
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
    var allSorted = sortedPlayers();
    clear(body);
    visible.forEach(function (player) { body.appendChild(buildRow(player, allSorted.indexOf(player) + 1)); });
    el("emptyState").hidden = visible.length > 0;
  }

  function render() {
    renderWeekSelect();
    renderSummary();
    renderRows();
    renderCards();
    applyView();
    var empty = el("emptyState");
    if (empty) { empty.hidden = filteredPlayers().length > 0; }
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
        render();
      });
    });
    try {
      var savedView = localStorage.getItem("janafari-view");
      if (savedView === "list" || savedView === "cards") { viewMode = savedView; }
    } catch (e) {}

    el("weekSelect").addEventListener("change", function () { selectedSnapshot = parseInt(this.value, 10); renderSummary(); renderRows(); });
    el("searchInput").addEventListener("input", function () { searchTerm = this.value; renderRows(); });
    Array.prototype.forEach.call(document.querySelectorAll(".filter"), function (button) {
      button.addEventListener("click", function () {
        Array.prototype.forEach.call(document.querySelectorAll(".filter"), function (item) { item.className = "filter"; });
        this.className = "filter active"; activeFilter = this.getAttribute("data-filter"); renderRows();
      });
    });
    el("updateButton").addEventListener("click", openUpdate);
    el("backupButton").addEventListener("click", function () { showModal("backupModal"); });
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
      if (event.keyCode === 27) { closeModal("updateModal"); closeModal("backupModal"); }
    });
  }

  loadState();
  bindEvents();
  render();
}());

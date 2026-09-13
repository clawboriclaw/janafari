/* End Zone Run v3 — Janafari's endless football runner. Tecmo / Retro Bowl feel, modern backgrounds.
   Loaded lazily by app.js the first time someone taps Play; nothing here runs on the ratings page.
   Canvas 2D, ES5, no assets except the page's own ESPN team emblems.
   Rules (owner, 2026-09-12 evening): you are Jonathan Taylor #28; the run is continuous — 100 yards is a
   touchdown (arms up, fireworks, roar), then the next drive against the next team: their pixel defenders,
   their city behind the stands, their painted end zone, a little faster. ONE TACKLE AND THE RUN IS OVER
   (yellow flag, whistle) — then your initials go on the retro board, which is shown live while you type.
   Score = 7 points per touchdown, shown Tecmo-style at the top right, plus yards.
   Backgrounds: skyline per city, day/dusk/night/dawn, weather by city (snow, rain), a blimp with a
   JANAFARI banner, stands with a pixel crowd doing the wave (kept above the play band), a crowd sign,
   halftime after two touchdowns. First-down chain every 10 yards; a floating football = 2 s of turbo.
   House rules: loop only while the sheet is open and running; tab hidden → pause; Exit stops loop and
   sound; sound off until switched on; keys janafari-ezr-v2 (best) + janafari-ezr-scores-v1 (board), both
   best-effort; reduced motion → no fireworks/confetti. Everything scales with U = canvas width / 358. */
(function () {
  "use strict";
  var KEY = "janafari-ezr-v2", OLD_KEY = "janafari-ezr-best-v1", SCORES_KEY = "janafari-ezr-scores-v1";
  var DRIVE = 100, GROUND = 0.72, BOARD_MAX = 10, POINTS = 7;

  /* Opponents in order: AFC South first, then around the league. colors = [primary, trim]. */
  var TEAMS = [
    { abbr: "HOU", city: "Houston", name: "TEXANS", colors: ["#03202f", "#a71930"], sky: "towers", weather: "" },
    { abbr: "JAX", city: "Jacksonville", name: "JAGUARS", colors: ["#006778", "#d7a22a"], sky: "bridge", weather: "" },
    { abbr: "TEN", city: "Nashville", name: "TITANS", colors: ["#0c2340", "#4b92db"], sky: "spire", weather: "" },
    { abbr: "NE", city: "Foxborough", name: "PATRIOTS", colors: ["#002244", "#c60c30"], sky: "lighthouse", weather: "rain" },
    { abbr: "KC", city: "Kansas City", name: "CHIEFS", colors: ["#e31837", "#ffb81c"], sky: "fountain", weather: "" },
    { abbr: "BUF", city: "Buffalo", name: "BILLS", colors: ["#00338d", "#c60c30"], sky: "towers", weather: "snow" },
    { abbr: "DEN", city: "Denver", name: "BRONCOS", colors: ["#fb4f14", "#002244"], sky: "mountains", weather: "snow" },
    { abbr: "MIA", city: "Miami", name: "DOLPHINS", colors: ["#008e97", "#fc4c02"], sky: "palms", weather: "" },
    { abbr: "PIT", city: "Pittsburgh", name: "STEELERS", colors: ["#101820", "#ffb612"], sky: "bridge", weather: "" },
    { abbr: "BAL", city: "Baltimore", name: "RAVENS", colors: ["#241773", "#9e7c0c"], sky: "harbor", weather: "" },
    { abbr: "CIN", city: "Cincinnati", name: "BENGALS", colors: ["#fb4f14", "#101820"], sky: "towers", weather: "" },
    { abbr: "CLE", city: "Cleveland", name: "BROWNS", colors: ["#311d00", "#ff3c00"], sky: "towers", weather: "rain" },
    { abbr: "LAC", city: "Los Angeles", name: "CHARGERS", colors: ["#0080c6", "#ffc20e"], sky: "palms", weather: "" },
    { abbr: "LV", city: "Las Vegas", name: "RAIDERS", colors: ["#000000", "#a5acaf"], sky: "neon", weather: "" },
    { abbr: "NYJ", city: "New York", name: "JETS", colors: ["#125740", "#ffffff"], sky: "towers", weather: "" },
    { abbr: "CHI", city: "Chicago", name: "BEARS", colors: ["#0b162a", "#c83803"], sky: "towers", weather: "snow" },
    { abbr: "GB", city: "Green Bay", name: "PACKERS", colors: ["#203731", "#ffb612"], sky: "towers", weather: "snow" },
    { abbr: "SEA", city: "Seattle", name: "SEAHAWKS", colors: ["#002244", "#69be28"], sky: "needle", weather: "rain" },
    { abbr: "DAL", city: "Dallas", name: "COWBOYS", colors: ["#041e42", "#869397"], sky: "towers", weather: "" },
    { abbr: "PHI", city: "Philadelphia", name: "EAGLES", colors: ["#004c54", "#a5acaf"], sky: "towers", weather: "" },
    { abbr: "SF", city: "San Francisco", name: "49ERS", colors: ["#aa0000", "#b3995d"], sky: "bridge", weather: "" },
    { abbr: "DET", city: "Detroit", name: "LIONS", colors: ["#0076b6", "#b0b7bc"], sky: "towers", weather: "" },
    { abbr: "MIN", city: "Minneapolis", name: "VIKINGS", colors: ["#4f2683", "#ffc62f"], sky: "towers", weather: "snow" },
    { abbr: "NO", city: "New Orleans", name: "SAINTS", colors: ["#d3bc8d", "#101820"], sky: "harbor", weather: "" },
    { abbr: "ATL", city: "Atlanta", name: "FALCONS", colors: ["#a71930", "#000000"], sky: "towers", weather: "" },
    { abbr: "TB", city: "Tampa", name: "BUCCANEERS", colors: ["#d50a0a", "#ff7900"], sky: "palms", weather: "" },
    { abbr: "CAR", city: "Charlotte", name: "PANTHERS", colors: ["#0085ca", "#101820"], sky: "towers", weather: "" },
    { abbr: "ARI", city: "Phoenix", name: "CARDINALS", colors: ["#97233f", "#ffb612"], sky: "mountains", weather: "" },
    { abbr: "LAR", city: "Los Angeles", name: "RAMS", colors: ["#003594", "#ffa300"], sky: "palms", weather: "" },
    { abbr: "NYG", city: "New York", name: "GIANTS", colors: ["#0b2265", "#a71930"], sky: "towers", weather: "" },
    { abbr: "WSH", city: "Washington", name: "COMMANDERS", colors: ["#5a1414", "#ffb612"], sky: "obelisk", weather: "" }
  ];
  var HOME = { abbr: "IND", city: "Indianapolis", name: "COLTS", colors: ["#003b75", "#ffffff"], sky: "indy", weather: "" };

  /* ---------- pixel sprites (16 wide × 20 tall), Tecmo style; drawn with a white outline ----------
     . none · H helmet · X helmet stripe/logo · F face · M facemask · J jersey · N number · S skin · P pants · K socks/cleats */
  var RUN_A = [
    "......HHHHH.....", ".....HHHHHHH....", "....HHXXHHHHH...", "....HHHHHHHHH...", "....HHHHHFFFM...", ".....HHHHFFMM...",
    "......JJJJJJ....", "....JJJJJJJJJJ..", "...JJJJNNJJJJJS.", "..SSJJJNNJJJJ.S.", "..S.JJJJJJJJJ...", "....JJJJJJJJ....",
    "....PPPPPPPP....", "....PPPPPPPP....", ".....PPP.PPP....", "....PPP...PPP...", "...SSS.....SSS..", "...SS.......SS..",
    "..KKK.......KKK.", "..KKK........KKK"];
  var RUN_B = [
    "......HHHHH.....", ".....HHHHHHH....", "....HHXXHHHHH...", "....HHHHHHHHH...", "....HHHHHFFFM...", ".....HHHHFFMM...",
    "......JJJJJJ....", "....JJJJJJJJJJ..", "...SJJJJNNJJJJS.", "...S.JJJNNJJJ.S.", "....JJJJJJJJJ...", "....JJJJJJJJ....",
    "....PPPPPPPP....", "....PPPPPPPP....", "......PPPP......", ".....PPP.PP.....", "....SSS..SSS....", "....SS....SS....",
    "...KKK....KKK...", "...KKK....KKK..."];
  var JUMP = [
    "......HHHHH.....", ".....HHHHHHH....", "....HHXXHHHHH...", "....HHHHHHHHH...", "....HHHHHFFFM...", ".....HHHHFFMM...",
    "......JJJJJJ....", "....JJJJJJJJJJ..", ".SSJJJJNNJJJJSS.", "S..JJJJNNJJJJ..S", "....JJJJJJJJJ...", "....JJJJJJJJ....",
    "....PPPPPPPP....", "...PPPPPPPPPP...", "..PPPP....PPPP..", ".SSS........SSS.", ".SS..........SS.", "KKK..........KKK",
    "KKK..........KKK", "................"];
  var ARMS_UP = [
    ".S....HHHHH...S.", ".S...HHHHHHH..S.", ".S..HHXXHHHHH.S.", ".S..HHHHHHHHH.S.", ".S..HHHHHFFFM.S.", ".S...HHHHFFMM.S.",
    ".S....JJJJJJ..S.", ".SSJJJJJJJJJJSS.", "...JJJJNNJJJJ...", "....JJJNNJJJ....", "....JJJJJJJJJ...", "....JJJJJJJJ....",
    "....PPPPPPPP....", "....PPPPPPPP....", "......PPPP......", ".....PPP.PP.....", "....SSS..SSS....", "....SS....SS....",
    "...KKK....KKK...", "...KKK....KKK..."];
  var DEF_A = mirror(RUN_A), DEF_B = mirror(RUN_B);
  // defenders reach forward (to the left) with both arms: rows 8–9 rewritten after the mirror
  DEF_A[8] = ".SSJJJJNNJJJJ...".replace(/^\.SS/, "SSS"); DEF_A[9] = "SS.JJJJNNJJJJ...";
  DEF_B[8] = "SSSJJJJNNJJJJ..."; DEF_B[9] = ".SSJJJJNNJJJJ...";
  function mirror(frame) { var out = [], r; for (r = 0; r < frame.length; r += 1) { out.push(frame[r].split("").reverse().join("")); } return out; }
  var outlineCache = {};
  function outlineOf(frame, key) {
    if (outlineCache[key]) { return outlineCache[key]; }
    var cells = [], r, c, H2 = frame.length, W2 = frame[0].length;
    function filled(rr, cc) { return rr >= 0 && rr < H2 && cc >= 0 && cc < W2 && frame[rr].charAt(cc) !== "."; }
    for (r = -1; r <= H2; r += 1) { for (c = -1; c <= W2; c += 1) { if (!filled(r, c) && (filled(r - 1, c) || filled(r + 1, c) || filled(r, c - 1) || filled(r, c + 1))) { cells.push([r, c]); } } }
    outlineCache[key] = cells; return cells;
  }
  var SX = 0.72;   // a pixel is 0.72× as wide as it is tall — the athletes read as tall, not wide (owner: "the sprites look fat")
  function drawSprite(frame, key, x, y, s, pal) {   // x,y = top-left of the 16×20 box; box is 16·s·SX wide, 20·s tall
    var r, c, cells = outlineOf(frame, key), i, sw = s * SX;
    ctx.fillStyle = "#ffffff";
    for (i = 0; i < cells.length; i += 1) { ctx.fillRect(x + cells[i][1] * sw, y + cells[i][0] * s, sw + 0.5, s + 0.5); }
    for (r = 0; r < frame.length; r += 1) {
      var row = frame[r], runStart = -1, runCh = "";
      for (c = 0; c <= row.length; c += 1) {
        var ch = c < row.length ? row.charAt(c) : ".";
        if (ch !== runCh) {
          if (runCh !== "." && runCh !== "" && runStart >= 0) { ctx.fillStyle = pal[runCh] || "#f0f"; ctx.fillRect(x + runStart * sw, y + r * s, (c - runStart) * sw + 0.5, s + 0.5); }
          runStart = c; runCh = ch;
        }
      }
    }
  }

  var canvas, ctx, W = 0, H = 0, dpr = 1, raf = 0, last = 0, U = 1, PPY = 60;
  var running = false, paused = false, over = false;
  var driveIdx = 0, yards = 0, total = 0, peak = 0, tds = 0, speed = 0, t = 0, spawnAt = 0, celebrate = 0, halftime = 0, turbo = 0, nextFirst = 10, chainFlash = 0, turboAt = 0, waveT = 0, driveT = 0;
  var best = { yards: 0, tds: 0 }, newBest = false, lastMiss = "", board = [], pendingScore = null, tackleAt = null;
  var player = { y: 0, vy: 0, jumps: 0 };
  var obs = [], balls = [], particles = [], rockets = [], stars = [], flakes = [];
  var stadium = true, opp = HOME, seed = 1, blimpX = -1, signX = -1, signText = "";
  var logos = {};
  var soundOn = false, actx = null, reducedMotion = false, bridge = null, ui = {};

  function el(id) { return document.getElementById(id); }
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function readBest() {
    best = { yards: 0, tds: 0 };
    try { var raw = localStorage.getItem(KEY); if (raw) { var b = JSON.parse(raw); if (b && typeof b.yards === "number") { best = { yards: b.yards, tds: b.tds || 0 }; } } } catch (e) {}
    try { var old = parseInt(localStorage.getItem(OLD_KEY), 10); if (old && old > best.yards) { best.yards = old; } } catch (e) {}
    board = [];
    try { var rawB = localStorage.getItem(SCORES_KEY); if (rawB) { var arr = JSON.parse(rawB); if (Object.prototype.toString.call(arr) === "[object Array]") { board = arr.filter(function (s) { return s && typeof s.ini === "string" && typeof s.tds === "number" && typeof s.yards === "number"; }).slice(0, BOARD_MAX); } } } catch (e) { board = []; }
  }
  function writeBest() { try { localStorage.setItem(KEY, JSON.stringify(best)); } catch (e) {} }
  function writeBoard() { try { localStorage.setItem(SCORES_KEY, JSON.stringify(board)); } catch (e) {} }
  function team() { return driveIdx === 0 ? HOME : TEAMS[(driveIdx - 1) % TEAMS.length]; }   // the venue: stands, wall, end zone, city
  function visitor() { return driveIdx === 0 ? TEAMS[0] : team(); }                             // the defenders: at the home opener the Texans visit
  function betterThan(a, b) { return a.tds > b.tds || (a.tds === b.tds && a.yards > b.yards); }
  function qualifies(score) { return board.length < BOARD_MAX || betterThan(score, board[board.length - 1]); }
  function placeOf(score) { var i; for (i = 0; i < board.length; i += 1) { if (betterThan(score, board[i])) { return i; } } return board.length; }
  function loadLogo(abbr) { if (!logos[abbr]) { var img = new Image(); logos[abbr] = img; img.src = "https://a.espncdn.com/i/teamlogos/nfl/500/" + abbr.toLowerCase() + ".png"; } }
  function drawLogo(abbr, x, y, size, alpha) {
    var img = logos[abbr]; ctx.save(); ctx.globalAlpha = alpha || 1;
    if (img && img.complete && img.naturalWidth > 0) { ctx.drawImage(img, x, y, size, size); }
    else { ctx.fillStyle = "#24364d"; ctx.fillRect(x, y, size, size); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "bold " + (size * 0.3) + "px Arial, sans-serif"; ctx.fillText(abbr, x + size / 2, y + size / 2); }
    ctx.restore(); ctx.textBaseline = "alphabetic";
  }

  /* ---------- sound ---------- */
  function ensureAudio() { if (actx) { return true; } try { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) { return false; } actx = new AC(); return true; } catch (e) { return false; } }
  function beep(freq, ms, type, gain) {
    if (!soundOn || !ensureAudio()) { return; }
    try {
      if (actx.state === "suspended" && actx.resume) { actx.resume(); }
      var o = actx.createOscillator(), g = actx.createGain(), now = actx.currentTime;
      o.type = type || "square"; o.frequency.value = freq; g.gain.value = gain || 0.05;
      o.connect(g); g.connect(actx.destination); o.start(now); g.gain.exponentialRampToValueAtTime(0.0005, now + ms / 1000); o.stop(now + ms / 1000);
    } catch (e) {}
  }
  function roar(ms) {
    if (!soundOn || !ensureAudio()) { return; }
    try {
      if (actx.state === "suspended" && actx.resume) { actx.resume(); }
      var len = Math.floor(actx.sampleRate * ms / 1000), buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0), i;
      for (i = 0; i < len; i += 1) { d[i] = (Math.random() * 2 - 1) * (1 - i / len); }
      var src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
      src.buffer = buf; f.type = "lowpass"; f.frequency.value = 900; g.gain.value = 0.12;
      src.connect(f); f.connect(g); g.connect(actx.destination); src.start();
    } catch (e) {}
  }
  function whistle() { beep(2400, 140, "square", 0.04); window.setTimeout(function () { beep(2000, 220, "square", 0.04); }, 150); }

  /* ---------- sizing ---------- */
  function resize() {
    var stage = el("gameStage"); if (!stage) { return; }
    var cw = stage.clientWidth, ch = Math.max(210, Math.min(Math.round(cw * 0.66), Math.round(window.innerHeight * 0.5)));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cw; H = ch; U = W / 358; PPY = W / 6;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeStars(); draw();
  }
  function makeStars() { var i; stars = []; for (i = 0; i < 40; i += 1) { stars.push({ x: Math.random(), y: Math.random() * 0.4, s: 0.5 + Math.random() }); } flakes = []; for (i = 0; i < 60; i += 1) { flakes.push({ x: Math.random(), y: Math.random(), v: 0.5 + Math.random() }); } }

  /* ---------- drives ---------- */
  function setDrive(i) {
    driveIdx = i; opp = visitor(); seed = 7 + i * 31; driveT = 0;
    stadium = i === 0 ? true : rnd() < 0.6;
    yards = 0; nextFirst = 10; obs = []; balls = []; spawnAt = i === 0 ? 3.0 : 2.4; turboAt = 20 + rnd() * 30;
    blimpX = (stadium && rnd() < 0.7) ? W + 60 * U : -1;   // it enters nose first from the right and tows the banner behind it
    signX = stadium ? W * (0.45 + rnd() * 0.4) : -1; signText = board.length ? "GO " + board[0].ini + "!" : "GO 28!";
    loadLogo(team().abbr); loadLogo(opp.abbr); loadLogo(TEAMS[i % TEAMS.length].abbr);
    hud();
  }
  function paceYps() { return (2.8 + 0.36 * Math.min(driveIdx, 8)) * (turbo > 0 ? 1.6 : 1); }   // owner: "speed the game a little bit up"
  function reset() {
    total = 0; peak = 0; tds = 0; t = 0; celebrate = 0; halftime = 0; turbo = 0; chainFlash = 0; lastMiss = ""; newBest = false; pendingScore = null; tackleAt = null;
    player.y = 0; player.vy = 0; player.jumps = 0; particles = []; rockets = []; over = false; paused = false;
    setDrive(0);
  }

  /* ---------- HUD / overlay / board ---------- */
  function hud() {
    ui.yards.textContent = Math.max(0, Math.floor(yards)) + " yd";
    ui.lives.textContent = "IND " + (tds * POINTS);
    ui.best.textContent = "Best " + (best.tds * POINTS) + " pts · " + best.yards + " yd";
    ui.drive.textContent = driveIdx === 0 ? "Home opener · Indianapolis" : "Drive " + (driveIdx + 1) + " · at " + opp.city + " (" + opp.abbr + ")";
    ui.pause.textContent = paused ? "Resume" : "Pause";
    ui.pause.disabled = !running || over;
    ui.jump.textContent = (!running || over) ? "TAP TO START" : (paused ? "RESUME" : "JUMP");
  }
  function renderBoard(preview) {
    var list = ui.boardList, rows = board.slice(0), i, you = -1;
    while (list.firstChild) { list.removeChild(list.firstChild); }
    if (preview) { you = placeOf(preview); rows.splice(you, 0, preview); rows = rows.slice(0, BOARD_MAX); }
    else if (pendingScore) { you = pendingScore.placed; }
    if (!rows.length) { var li0 = document.createElement("li"); li0.className = "board-empty"; li0.appendChild(document.createTextNode("No runs yet — be the first on the board.")); list.appendChild(li0); return; }
    for (i = 0; i < rows.length; i += 1) {
      var s = rows[i], li = document.createElement("li");
      if (i === you) { li.className = "board-you"; }
      var rank = document.createElement("span"); rank.className = "board-rank"; rank.appendChild(document.createTextNode(String(i + 1)));
      var ini = document.createElement("span"); ini.className = "board-ini"; ini.appendChild(document.createTextNode(s.ini || "___"));
      var sc = document.createElement("span"); sc.className = "board-score"; sc.appendChild(document.createTextNode((s.tds * POINTS) + " pts · " + s.yards + " yd"));
      li.appendChild(rank); li.appendChild(ini); li.appendChild(sc); list.appendChild(li);
    }
  }
  function overlay(kind) {
    var box = ui.overlay, title = ui.overlayTitle, copy = ui.overlayCopy, btn = ui.overlayBtn;
    ui.initials.hidden = kind !== "initials"; ui.boardWrap.hidden = !(kind === "ready" || kind === "over" || kind === "initials");
    if (!kind) { box.hidden = true; return; }
    box.hidden = false;
    if (kind === "ready") { title.textContent = "End Zone Run"; copy.textContent = "You're Jonathan Taylor, #28. Hurdle the defenders and cones. Every 100 yards is a touchdown — then a new city, a little faster. One tackle and the run is over."; btn.textContent = "Start"; renderBoard(null); }
    else if (kind === "paused") { title.textContent = "Paused"; copy.textContent = "Take a breath. Your yards are safe."; btn.textContent = "Resume"; }
    else if (kind === "initials") { title.textContent = "TACKLED — " + (tds * POINTS) + " PTS · " + peak + " YD"; copy.textContent = "That makes the board. Enter your initials."; btn.textContent = "Save"; ui.iniInput.value = ""; renderBoard({ ini: "", tds: tds, yards: peak }); window.setTimeout(function () { try { ui.iniInput.focus(); } catch (e) {} }, 40); return; }
    else if (kind === "over") { title.textContent = "TACKLED — " + (tds * POINTS) + " PTS · " + peak + " YD"; copy.textContent = (newBest ? "New best run! " : "") + (lastMiss === "early" ? "You jumped a little early — wait until they're closer." : "Jump a bit sooner next time."); btn.textContent = "Play again"; renderBoard(null); }
    window.setTimeout(function () { try { btn.focus(); } catch (e) {} }, 30);
  }
  function saveInitials() {
    var ini = String(ui.iniInput.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
    if (!ini) { ini = "JAN"; }
    var score = { ini: ini, tds: tds, yards: peak, date: new Date().toISOString().slice(0, 10) }, placed = placeOf(score);
    board.splice(placed, 0, score); board = board.slice(0, BOARD_MAX); writeBoard();
    pendingScore = { placed: placed }; beep(1046, 80, "triangle"); window.setTimeout(function () { beep(1318, 160, "triangle"); }, 90);
    overlay("over");
  }

  function start() {
    if (running && !over) { return; }
    reset(); running = true; overlay(null); hud();
    last = 0; loop(); beep(660, 90, "triangle");
  }
  function pause() { if (!running || over) { return; } paused = true; cancel(); overlay("paused"); hud(); }
  function resume() { if (!running || !paused || over) { return; } paused = false; overlay(null); hud(); last = 0; loop(); }
  function jump() {
    if (!running || paused || over || halftime > 0) { return; }
    if (player.jumps < 1) { player.vy = -440 * U; player.jumps += 1; beep(880, 70, "square"); }
  }
  function endRun() {
    over = true; cancel(); whistle();
    var score = { tds: tds, yards: peak };
    newBest = betterThan(score, best);
    if (newBest) { best = { yards: peak, tds: tds }; writeBest(); }
    hud(); draw();
    if (peak > 0 && qualifies(score)) { overlay("initials"); } else { overlay("over"); }
  }
  function touchdown() {
    tds += 1; celebrate = 2.6; roar(1400);
    beep(523, 120, "triangle"); window.setTimeout(function () { beep(659, 120, "triangle"); }, 130); window.setTimeout(function () { beep(784, 260, "triangle"); }, 260);
    if (!reducedMotion) { var i; for (i = 0; i < 6; i += 1) { rockets.push({ x: W * (0.2 + Math.random() * 0.7), y: H * 0.42, vy: -(200 + Math.random() * 120) * U, fuse: 0.4 + Math.random() * 0.5, c: i % 3 === 0 ? "#fdbb30" : (i % 3 === 1 ? team().colors[1] : "#ffffff") }); } }
    if (tds === 2) { halftime = 2.6; }
    setDrive(driveIdx + 1);
  }
  function burst(x, y, c) { var i; for (i = 0; i < 24; i += 1) { var a = Math.random() * Math.PI * 2, v = (60 + Math.random() * 150) * U; particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.9 + Math.random() * 0.6, c: Math.random() < 0.3 ? "#ffffff" : c }); } }
  function cancel() { if (raf) { window.cancelAnimationFrame(raf); raf = 0; } }
  function isHidden() { return el("gameModal").hidden; }

  /* ---------- the loop ---------- */
  function loop() { cancel(); raf = window.requestAnimationFrame(frame); }
  function frame(now) {
    if (!running || paused || over || isHidden()) { raf = 0; return; }
    if (!last) { last = now; }
    var dt = Math.min(0.04, (now - last) / 1000); last = now;
    t += dt; waveT += dt; driveT += dt;
    if (halftime > 0) { halftime -= dt; draw(); raf = window.requestAnimationFrame(frame); return; }   // the field holds still at halftime
    var yps = paceYps(); speed = yps * PPY;
    yards += yps * dt; total = driveIdx * DRIVE + Math.max(0, Math.floor(yards)); if (total > peak) { peak = total; }
    if (turbo > 0) { turbo -= dt; }
    if (celebrate > 0) { celebrate -= dt; }
    if (chainFlash > 0) { chainFlash -= dt; }
    if (blimpX > -1) { blimpX -= 26 * U * dt; if (blimpX < -60 * U) { blimpX = -1; } }
    if (yards >= nextFirst && nextFirst < DRIVE) { nextFirst += 10; chainFlash = 0.8; beep(1046, 60, "sine", 0.04); }
    player.vy += 1150 * U * dt; player.y += player.vy * dt;
    if (player.y > 0) { player.y = 0; player.vy = 0; player.jumps = 0; }
    spawnAt -= dt;
    if (spawnAt <= 0 && celebrate <= 0 && yards < DRIVE - 6) {
      var d = Math.min(driveIdx, 8), r = Math.random(), type;
      if (r < 0.32 - d * 0.02) { type = "cone"; } else if (r < 0.74) { type = "def"; } else if (d >= 2 && r < 0.9) { type = "cones2"; } else { type = "def"; }
      var w = type === "cones2" ? 40 : (type === "def" ? 30 : 18), h = type === "def" ? 44 : 22;
      obs.push({ type: type, x: W + 40 * U, w: w * U, h: h * U, hit: false, skin: Math.random() < 0.5 ? "#8d5524" : "#c68642" });
      spawnAt = Math.max(0.85, 2.3 - yards * 0.011 - d * 0.11) + Math.random() * 0.6;
    }
    if (yards > turboAt && celebrate <= 0) { balls.push({ x: W + 30 * U, y: -70 * U }); turboAt = yards + 35 + Math.random() * 40; }
    var i, px = W * 0.22, pw = 24 * U, ph = 42 * U, gy = H * GROUND;
    for (i = balls.length - 1; i >= 0; i -= 1) {
      var bl = balls[i]; bl.x -= speed * dt;
      if (bl.x < -20 * U) { balls.splice(i, 1); continue; }
      if (Math.abs(bl.x - px) < 18 * U && Math.abs(bl.y - (player.y - ph * 0.5)) < 26 * U) { turbo = 2.0; beep(1318, 120, "triangle"); burst(px, gy + player.y - ph * 0.5, "#fdbb30"); balls.splice(i, 1); }
    }
    for (i = obs.length - 1; i >= 0; i -= 1) {
      var o = obs[i]; o.x -= speed * dt;
      if (o.x + o.w < -10) { obs.splice(i, 1); continue; }
      var pl = px - pw / 2 + 4 * U, pr = px + pw / 2 - 4 * U, pb = gy + player.y - 2 * U;
      var ol = o.x + o.w * 0.12, orr = o.x + o.w * 0.88, ot = gy - o.h + 4 * U;
      if (!o.hit && turbo <= 0 && pr > ol && pl < orr && pb > ot) {
        o.hit = true; lastMiss = player.y < -2 ? "early" : "late"; tackleAt = { x: o.x + o.w / 2, y: gy - o.h };
        endRun(); return;   // one tackle and the run is over
      } else if (turbo > 0 && !o.hit && pr > ol && pl < orr) { o.hit = true; burst(o.x + o.w / 2, gy - o.h / 2, "#ffffff"); }
    }
    if (yards >= DRIVE) { touchdown(); }
    for (i = rockets.length - 1; i >= 0; i -= 1) { var rk = rockets[i]; rk.y += rk.vy * dt; rk.fuse -= dt; if (rk.fuse <= 0) { burst(rk.x, rk.y, rk.c); rockets.splice(i, 1); } }
    for (i = particles.length - 1; i >= 0; i -= 1) { var p = particles[i]; p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; } p.vy += 220 * U * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    hud(); draw();
    raf = window.requestAnimationFrame(frame);
  }

  /* ---------- drawing ---------- */
  function lerp(a, b, k) { return a + (b - a) * k; }
  function mix(c1, c2, k) { var a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16); return "rgb(" + Math.round(lerp(a >> 16, b >> 16, k)) + "," + Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, k)) + "," + Math.round(lerp(a & 255, b & 255, k)) + ")"; }
  function dayPhase() { return ((total / DRIVE) / 4 + 0.35) % 1; }
  function skyColors(ph) {
    var stops = [[0.00, "#0a1a3a", "#1a2d55"], [0.15, "#f2a65a", "#8b5fbf"], [0.30, "#7cc4ff", "#cfe9ff"], [0.55, "#6bb8ff", "#d8ecff"], [0.70, "#f7b267", "#c66d9e"], [0.85, "#0a1a3a", "#1a2d55"], [1.00, "#0a1a3a", "#1a2d55"]];
    var i; for (i = 0; i < stops.length - 1; i += 1) { if (ph >= stops[i][0] && ph <= stops[i + 1][0]) { var k = (ph - stops[i][0]) / (stops[i + 1][0] - stops[i][0]); return { top: mix(stops[i][1], stops[i + 1][1], k), bottom: mix(stops[i][2], stops[i + 1][2], k), night: (ph < 0.12 || ph > 0.8) ? 1 : (ph < 0.2 ? (0.2 - ph) / 0.08 : (ph > 0.72 ? (ph - 0.72) / 0.08 : 0)) }; } }
    return { top: "#6bb8ff", bottom: "#d8ecff", night: 0 };
  }
  function ellipse(x, y, rx, ry) { if (ctx.ellipse) { ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); } else { ctx.arc(x, y, (rx + ry) / 2, 0, Math.PI * 2); } }
  function drawSkyline(kind, base, night, u) {
    var i, x, span = W + 200 * u, sc = (total * PPY * 0.08) % span;
    var dark = night > 0.5 ? "#1b2b48" : "#5c7fa8", land = night > 0.5 ? "#26395e" : "#42658c";
    seed = 100 + driveIdx * 17;
    if (kind === "mountains") { ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-sc, base); for (i = 0; i <= 8; i += 1) { ctx.lineTo(-sc + i * span / 8, base - (30 + rnd() * 60) * u); } ctx.lineTo(span - sc, base); ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.6)"; for (i = 1; i < 8; i += 2) { x = -sc + i * span / 8; ctx.fillRect(x - 3 * u, base - 84 * u, 6 * u, 6 * u); } return; }
    if (kind === "palms") { for (i = 0; i < 7; i += 1) { x = ((i * 90 * u) - sc + span * 2) % span - 100 * u; ctx.fillStyle = night > 0.5 ? "#1b2b48" : "#3d6b4a"; ctx.fillRect(x, base - 40 * u, 4 * u, 40 * u); ctx.beginPath(); ctx.arc(x + 2 * u, base - 42 * u, 12 * u, 0, Math.PI * 2); ctx.fill(); } return; }
    for (i = 0; i < 14; i += 1) {
      var bw = (14 + rnd() * 22) * u, bh = (18 + rnd() * 52) * u; x = ((i * 34 * u) - sc + span * 2) % span - 100 * u;
      ctx.fillStyle = dark; ctx.fillRect(x, base - bh, bw, bh);
      if (night > 0.3) { ctx.fillStyle = "rgba(255,220,120," + (0.5 * night) + ")"; var wy; for (wy = base - bh + 6 * u; wy < base - 6 * u; wy += 9 * u) { if (rnd() < 0.6) { ctx.fillRect(x + 3 * u, wy, 4 * u, 4 * u); } if (rnd() < 0.6 && bw > 16 * u) { ctx.fillRect(x + bw - 7 * u, wy, 4 * u, 4 * u); } } }
    }
    var lx = (W * 0.62 - sc * 0.5 + span * 2) % span - 100 * u; ctx.fillStyle = land;
    if (kind === "indy") { ctx.fillRect(lx - 6 * u, base - 90 * u, 12 * u, 90 * u); ctx.fillRect(lx - 10 * u, base - 96 * u, 20 * u, 6 * u); ctx.beginPath(); ctx.arc(lx - 70 * u, base, 40 * u, Math.PI, 0); ctx.fill(); }
    else if (kind === "obelisk") { ctx.fillRect(lx - 5 * u, base - 96 * u, 10 * u, 96 * u); ctx.beginPath(); ctx.moveTo(lx - 5 * u, base - 96 * u); ctx.lineTo(lx, base - 108 * u); ctx.lineTo(lx + 5 * u, base - 96 * u); ctx.fill(); }
    else if (kind === "spire") { ctx.fillRect(lx - 12 * u, base - 70 * u, 24 * u, 70 * u); ctx.fillRect(lx - 14 * u, base - 96 * u, 4 * u, 30 * u); ctx.fillRect(lx + 10 * u, base - 96 * u, 4 * u, 30 * u); }
    else if (kind === "needle") { ctx.fillRect(lx - 2 * u, base - 96 * u, 4 * u, 96 * u); ctx.beginPath(); ellipse(lx, base - 84 * u, 18 * u, 7 * u); ctx.fill(); }
    else if (kind === "bridge") { ctx.fillRect(lx - 90 * u, base - 22 * u, 180 * u, 4 * u); ctx.fillRect(lx - 40 * u, base - 70 * u, 6 * u, 70 * u); ctx.fillRect(lx + 34 * u, base - 70 * u, 6 * u, 70 * u); ctx.strokeStyle = land; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(lx - 90 * u, base - 22 * u); ctx.quadraticCurveTo(lx - 37 * u, base - 90 * u, lx, base - 26 * u); ctx.quadraticCurveTo(lx + 37 * u, base - 90 * u, lx + 90 * u, base - 22 * u); ctx.stroke(); }
    else if (kind === "lighthouse") { ctx.fillRect(lx - 6 * u, base - 60 * u, 12 * u, 60 * u); ctx.fillStyle = night > 0.5 ? "#ffe08a" : "#e8f0ff"; ctx.fillRect(lx - 8 * u, base - 68 * u, 16 * u, 8 * u); }
    else if (kind === "fountain") { ctx.fillRect(lx - 30 * u, base - 8 * u, 60 * u, 8 * u); ctx.fillStyle = "rgba(180,220,255,.8)"; ctx.fillRect(lx - 2 * u, base - 46 * u, 4 * u, 38 * u); ctx.fillRect(lx - 16 * u, base - 30 * u, 3 * u, 22 * u); ctx.fillRect(lx + 13 * u, base - 30 * u, 3 * u, 22 * u); }
    else if (kind === "harbor") { ctx.fillRect(lx - 60 * u, base - 6 * u, 120 * u, 6 * u); ctx.fillRect(lx - 20 * u, base - 30 * u, 40 * u, 24 * u); ctx.fillRect(lx - 2 * u, base - 56 * u, 4 * u, 26 * u); }
    else if (kind === "neon") { ctx.fillRect(lx - 4 * u, base - 100 * u, 8 * u, 100 * u); ctx.fillStyle = "#ff4fd8"; ctx.fillRect(lx - 30 * u, base - 60 * u, 60 * u, 6 * u); ctx.fillStyle = "#4ff0ff"; ctx.fillRect(lx - 24 * u, base - 48 * u, 48 * u, 6 * u); }
  }
  function drawBlimp(x, y, u, night) {
    var body = night > 0.5 ? "#9aa3b3" : "#e6eaf0", shade = night > 0.5 ? "#6f7887" : "#c3cad6", bob = Math.sin(t * 1.3) * 2 * u;
    y += bob;
    // trailing banner on a line behind the tail
    ctx.strokeStyle = "rgba(60,70,90,.7)"; ctx.lineWidth = 1 * u; ctx.beginPath(); ctx.moveTo(x + 38 * u, y); ctx.lineTo(x + 52 * u, y + 2 * u); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.fillRect(x + 52 * u, y - 6 * u, 74 * u, 12 * u); ctx.strokeStyle = "#041c38"; ctx.lineWidth = 1 * u; ctx.strokeRect(x + 52 * u, y - 6 * u, 74 * u, 12 * u);
    ctx.fillStyle = "#003b75"; ctx.font = "bold " + Math.round(8 * u) + "px 'Arial Narrow', Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText("JANAFARI", x + 89 * u, y + 3 * u);
    // hull: a long teardrop, darker underside, tail fins, gondola
    ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(x - 44 * u, y); ctx.quadraticCurveTo(x - 30 * u, y - 14 * u, x + 10 * u, y - 12 * u); ctx.quadraticCurveTo(x + 40 * u, y - 10 * u, x + 44 * u, y); ctx.quadraticCurveTo(x + 40 * u, y + 10 * u, x + 10 * u, y + 12 * u); ctx.quadraticCurveTo(x - 30 * u, y + 14 * u, x - 44 * u, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade; ctx.beginPath(); ctx.moveTo(x - 40 * u, y + 3 * u); ctx.quadraticCurveTo(x - 20 * u, y + 13 * u, x + 10 * u, y + 12 * u); ctx.quadraticCurveTo(x + 40 * u, y + 10 * u, x + 44 * u, y); ctx.quadraticCurveTo(x + 20 * u, y + 6 * u, x - 40 * u, y + 3 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#003b75"; ctx.beginPath(); ctx.moveTo(x + 30 * u, y - 4 * u); ctx.lineTo(x + 48 * u, y - 13 * u); ctx.lineTo(x + 44 * u, y - 1 * u); ctx.closePath(); ctx.fill();   // top fin
    ctx.beginPath(); ctx.moveTo(x + 30 * u, y + 4 * u); ctx.lineTo(x + 48 * u, y + 13 * u); ctx.lineTo(x + 44 * u, y + 1 * u); ctx.closePath(); ctx.fill();   // bottom fin
    ctx.fillStyle = "#003b75"; ctx.fillRect(x - 24 * u, y - 4 * u, 44 * u, 8 * u);   // the side stripe
    ctx.fillStyle = "#fdbb30"; ctx.font = "bold " + Math.round(6.5 * u) + "px Arial, sans-serif"; ctx.fillText("COLTS", x - 2 * u, y + 2.5 * u);
    ctx.fillStyle = "#2b3442"; ctx.fillRect(x - 10 * u, y + 11 * u, 18 * u, 5 * u);   // gondola
    if (night > 0.3) { ctx.fillStyle = "rgba(255,80,80," + night + ")"; ctx.fillRect(x - 44 * u, y - 1 * u, 2 * u, 2 * u); ctx.fillStyle = "rgba(120,255,120," + night + ")"; ctx.fillRect(x + 43 * u, y - 1 * u, 2 * u, 2 * u); ctx.fillStyle = "rgba(255,255,255," + (Math.floor(t * 2) % 2 ? night : 0) + ")"; ctx.fillRect(x - 2 * u, y + 15 * u, 2 * u, 2 * u); }
  }
  function drawWeather(kind, bottom, u) {
    var i;
    if (kind === "snow") { ctx.fillStyle = "rgba(255,255,255,.9)"; for (i = 0; i < flakes.length; i += 1) { var f = flakes[i]; ctx.fillRect(((f.x * W) + Math.sin(t * f.v + i) * 6 * u + t * 8 * u) % W, ((f.y * bottom) + t * 28 * u * f.v) % bottom, 2.2 * u, 2.2 * u); } }
    else if (kind === "rain") { ctx.strokeStyle = "rgba(190,220,255,.55)"; ctx.lineWidth = 1 * u; ctx.beginPath(); for (i = 0; i < flakes.length; i += 1) { var g = flakes[i], rx = ((g.x * W) - t * 60 * u * g.v) % W, ry = ((g.y * bottom) + t * 220 * u * g.v) % bottom; if (rx < 0) { rx += W; } ctx.moveTo(rx, ry); ctx.lineTo(rx - 3 * u, ry + 9 * u); } ctx.stroke(); }
  }
  function drawStands(top, bottom, u, colors, night) {
    // the stands: a dark bowl with three rows of pixel fans in the home crowd's colours, a wave rolling through
    ctx.fillStyle = night > 0.5 ? "#1a2030" : "#2a3140"; ctx.fillRect(0, top, W, bottom - top);
    var rows = 3, r, c, cols = Math.ceil(W / (8 * u)) + 1, wx = (waveT * 200 * u) % (W + 260 * u) - 80 * u;
    for (r = 0; r < rows; r += 1) {
      var by = top + 8 * u + r * ((bottom - top - 10 * u) / rows);
      for (c = 0; c < cols; c += 1) {
        var x = c * 8 * u + (r % 2) * 4 * u, wave = Math.max(0, 1 - Math.abs(wx - x) / (55 * u)), y = by - wave * 5 * u;
        var k = (c * 7 + r * 3) % 5;
        ctx.fillStyle = k === 0 ? colors[1] : (k < 3 ? colors[0] : (k === 3 ? "#e8c39e" : "#8d5524"));
        ctx.fillRect(x, y, 4 * u, 5 * u);
        if (wave > 0.55) { ctx.fillStyle = "#e8c39e"; ctx.fillRect(x - 1.5 * u, y - 4 * u, 1.5 * u, 4 * u); ctx.fillRect(x + 4 * u, y - 4 * u, 1.5 * u, 4 * u); }
      }
    }
    if (signX > -1) {   // a fan's sign
      var sw = 62 * u, sx = signX - sw / 2, sy = top + 14 * u;
      ctx.fillStyle = "#fff"; ctx.fillRect(sx, sy, sw, 16 * u); ctx.fillStyle = "#003b75"; ctx.font = "bold " + Math.round(10 * u) + "px Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText(signText, signX, sy + 11.5 * u);
    }
    // stadium lights (on at night) and the front wall with the home team's name
    var i; for (i = 0; i < 3; i += 1) { var lxp = W * (0.16 + i * 0.34); ctx.fillStyle = "#6b7280"; ctx.fillRect(lxp - 1.5 * u, top - 34 * u, 3 * u, 36 * u); ctx.fillStyle = night > 0.3 ? "rgba(255,244,200," + (0.95 * night) + ")" : "#9aa3b2"; ctx.fillRect(lxp - 12 * u, top - 40 * u, 24 * u, 7 * u); if (night > 0.3) { ctx.fillStyle = "rgba(255,244,200," + (0.07 * night) + ")"; ctx.beginPath(); ctx.moveTo(lxp - 12 * u, top - 33 * u); ctx.lineTo(lxp - 80 * u, H * GROUND); ctx.lineTo(lxp + 80 * u, H * GROUND); ctx.lineTo(lxp + 12 * u, top - 33 * u); ctx.fill(); } }
  }
  function drawWall(top, u, colors, name) {
    ctx.fillStyle = colors[0]; ctx.fillRect(0, top, W, 14 * u);
    ctx.fillStyle = colors[1]; ctx.fillRect(0, top + 12 * u, W, 2 * u);
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "bold " + Math.round(9 * u) + "px Arial, sans-serif"; ctx.textAlign = "center";
    var span = 180 * u, off = (total * PPY * 0.5) % span, i;
    for (i = -1; i < W / span + 2; i += 1) { ctx.fillText(name + "  ·  " + name, i * span - off + span / 2, top + 10 * u); }
  }
  function drawEndZone(ezx, gy, u, colors, name) {
    if (ezx > W + 20) { return; }
    var ezw = 60 * u * 1.7;   // ten yards deep
    ctx.fillStyle = colors[0]; ctx.fillRect(ezx, gy, W - ezx + 20, H - gy);
    ctx.save(); ctx.beginPath(); ctx.rect(ezx, gy, W - ezx + 20, H - gy); ctx.clip();
    ctx.strokeStyle = colors[1]; ctx.lineWidth = 5 * u; ctx.globalAlpha = 0.35; var i;
    for (i = 0; i < 20; i += 1) { ctx.beginPath(); ctx.moveTo(ezx + i * 24 * u, H); ctx.lineTo(ezx + i * 24 * u + 30 * u, gy); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.restore();
    ctx.fillStyle = "#fff"; ctx.font = "bold " + Math.round(15 * u) + "px 'Arial Narrow', Arial, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(name, ezx + Math.max(ezw / 2, 50 * u), gy + (H - gy) * 0.62);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.moveTo(ezx, gy); ctx.lineTo(ezx, H); ctx.stroke();   // goal line
    var gp = ezx + ezw;   // goal post at the back of the end zone
    ctx.strokeStyle = "#ffd54a"; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.moveTo(gp, gy + 6 * u); ctx.lineTo(gp, gy - 40 * u); ctx.moveTo(gp - 16 * u, gy - 40 * u); ctx.lineTo(gp + 16 * u, gy - 40 * u); ctx.moveTo(gp - 16 * u, gy - 40 * u); ctx.lineTo(gp - 16 * u, gy - 66 * u); ctx.moveTo(gp + 16 * u, gy - 40 * u); ctx.lineTo(gp + 16 * u, gy - 66 * u); ctx.stroke();
  }
  function drawScoreboard(u) {
    var w = 118 * u, h = 30 * u, x = W - w - 8 * u, y = 8 * u;
    ctx.fillStyle = "rgba(4,28,56,.85)"; ctx.fillRect(x, y, w, h); ctx.strokeStyle = "#fdbb30"; ctx.lineWidth = 1.5 * u; ctx.strokeRect(x, y, w, h);
    ctx.textAlign = "left"; ctx.fillStyle = "#fdbb30"; ctx.font = "bold " + Math.round(9 * u) + "px 'Courier New', Courier, monospace"; ctx.fillText("IND", x + 6 * u, y + 12 * u); ctx.fillText(opp.abbr, x + 6 * u, y + 24 * u);
    ctx.textAlign = "right"; ctx.fillStyle = "#fff"; ctx.font = "bold " + Math.round(12 * u) + "px 'Courier New', Courier, monospace"; ctx.fillText(String(tds * POINTS), x + 46 * u, y + 13 * u); ctx.fillText("0", x + 46 * u, y + 25 * u);
    ctx.fillStyle = "#fdbb30"; ctx.font = "bold " + Math.round(9 * u) + "px 'Courier New', Courier, monospace"; ctx.fillText("YDS", x + w - 6 * u, y + 12 * u);
    ctx.fillStyle = "#fff"; ctx.font = "bold " + Math.round(12 * u) + "px 'Courier New', Courier, monospace"; ctx.fillText(String(total), x + w - 6 * u, y + 25 * u);
  }
  function draw() {
    if (!ctx) { return; }
    var gy = H * GROUND, i, u = U, ph = dayPhase(), sky = skyColors(ph), night = sky.night, tm = team();
    var standsTop = H * 0.30, standsBottom = H * 0.50, wallTop = standsBottom;
    var grad = ctx.createLinearGradient(0, 0, 0, gy); grad.addColorStop(0, sky.top); grad.addColorStop(1, sky.bottom);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, gy);
    if (night > 0) { ctx.fillStyle = "rgba(255,255,255," + (0.8 * night) + ")"; for (i = 0; i < stars.length; i += 1) { ctx.fillRect(stars[i].x * W, stars[i].y * gy, stars[i].s * u, stars[i].s * u); } }
    var sunX = W * ((ph + 0.5) % 1), sunY = H * 0.06 + Math.abs(0.5 - ((ph + 0.5) % 1)) * H * 0.3;
    ctx.beginPath(); ctx.arc(sunX, sunY, 11 * u, 0, Math.PI * 2); ctx.fillStyle = night > 0.5 ? "#f4f1e0" : "#ffd54a"; ctx.fill();
    drawSkyline(tm.sky, stadium ? standsTop + 6 * u : wallTop, night, u);
    if (blimpX > -1) { drawBlimp(blimpX, H * 0.215, u, night); }   // below the scoreboard, above the stands
    if (stadium) { drawStands(standsTop, standsBottom, u, tm.colors, night); }
    drawWall(wallTop, u, tm.colors, tm.name);
    // sideline strip then the field
    ctx.fillStyle = night > 0.5 ? "#2f6b3a" : "#3a8a48"; ctx.fillRect(0, wallTop + 14 * u, W, gy - wallTop - 14 * u);
    ctx.fillStyle = night > 0.5 ? "#1a5c2c" : "#1f7a3a"; ctx.fillRect(0, gy, W, H - gy);
    var step = 5 * PPY, off = (Math.max(0, yards) * PPY) % step, px0 = W * 0.22;
    ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 2;
    for (i = -1; i < W / step + 2; i += 1) { var x = i * step - off; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "bold " + Math.round(11 * u) + "px Arial, sans-serif"; ctx.textAlign = "center";
    for (i = -1; i < W / step + 2; i += 1) { var xx = i * step - off, yd = Math.round(yards + (xx - px0) / PPY); if (yd >= 0 && yd <= 100 && yd % 10 === 0) { ctx.fillText(String(yd), xx, H - 6 * u); } }
    var lx = px0 + (50 - yards) * PPY; if (lx > -60 * u && lx < W + 60 * u) { drawLogo(tm.abbr, lx - 22 * u, gy + (H - gy) / 2 - 22 * u, 44 * u, 0.18); }   // faded midfield emblem
    var cx = px0 + (nextFirst - yards) * PPY;
    if (cx > -20 && cx < W + 20 && nextFirst <= DRIVE) { ctx.fillStyle = chainFlash > 0 ? "#fdbb30" : "#ff8c00"; ctx.fillRect(cx - 2 * u, gy - 26 * u, 4 * u, 26 * u); ctx.fillRect(cx - 8 * u, gy - 30 * u, 16 * u, 6 * u); }
    if (chainFlash > 0) { ctx.fillStyle = "rgba(253,187,48," + Math.min(1, chainFlash) + ")"; ctx.font = "bold " + Math.round(16 * u) + "px Arial, sans-serif"; ctx.fillText("1ST DOWN", W * 0.5, gy - 60 * u); }
    drawEndZone(px0 + (DRIVE - yards) * PPY, gy, u, tm.colors, tm.name);
    if (tm.weather) { drawWeather(tm.weather, gy, u); }
    // turbo football
    ctx.lineWidth = 2 * u; ctx.strokeStyle = "#fff";
    for (i = 0; i < balls.length; i += 1) { var bl = balls[i], by = gy + bl.y + Math.sin(t * 5) * 4 * u; ctx.fillStyle = "#8b4513"; ctx.beginPath(); ellipse(bl.x, by, 12 * u, 7 * u); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.fillRect(bl.x - 5 * u, by - 1 * u, 10 * u, 2 * u); }
    // obstacles: cones, and pixel defenders in the opponent's colours
    var s = 2.4 * u, defPal = { H: opp.colors[0], X: opp.colors[1], F: "#8d5524", M: "#2b2b2b", J: opp.colors[0], N: opp.colors[0], S: "#8d5524", P: opp.colors[1] === "#ffffff" ? "#d9d9d9" : "#e8e8e8", K: "#1b1b1b" };
    for (i = 0; i < obs.length; i += 1) {
      var o = obs[i];
      if (o.type === "cone" || o.type === "cones2") {
        var n = o.type === "cones2" ? 2 : 1, cwid = o.w / n, k;
        for (k = 0; k < n; k += 1) { var ox = o.x + k * cwid; ctx.fillStyle = "#ff7a1a"; ctx.beginPath(); ctx.moveTo(ox, gy); ctx.lineTo(ox + cwid / 2, gy - o.h); ctx.lineTo(ox + cwid, gy); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.fillRect(ox + 4 * u, gy - o.h * 0.45, cwid - 8 * u, 3 * u); }
      } else {
        defPal.S = o.skin; defPal.F = o.skin;
        ctx.globalAlpha = o.hit ? 0.45 : 1;
        drawSprite(Math.floor(t * 6 + i) % 2 ? DEF_A : DEF_B, Math.floor(t * 6 + i) % 2 ? "da" : "db", o.x + o.w / 2 - 8 * s * SX, gy - 20 * s, s, defPal);
        ctx.fillStyle = opp.colors[1]; ctx.fillRect(o.x + o.w / 2 - 1.5 * s * SX, gy - 12 * s, 3 * s * SX, 2 * s);
        ctx.globalAlpha = 1;
      }
    }
    // Jonathan Taylor #28
    var px = W * 0.22, py = gy + player.y, runPal = { H: "#ffffff", X: "#003b75", F: "#8d5524", M: "#2b2b2b", J: "#003b75", N: "#003b75", S: "#8d5524", P: "#ffffff", K: "#1b1b1b" };
    if (turbo > 0) { ctx.fillStyle = "rgba(253,187,48,.35)"; ctx.fillRect(px - 44 * u, py - 42 * u, 30 * u, 42 * u); }
    var frame = celebrate > 0 ? ARMS_UP : (player.y < 0 ? JUMP : (Math.floor(yards * 4) % 2 ? RUN_A : RUN_B)), fkey = celebrate > 0 ? "up" : (player.y < 0 ? "jump" : (Math.floor(yards * 4) % 2 ? "ra" : "rb"));
    drawSprite(frame, fkey, px - 8 * s * SX, py - 20 * s, s, runPal);
    ctx.fillStyle = "#fff"; ctx.font = "bold " + Math.round(3.1 * s) + "px Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText("28", px + 0.5 * s * SX, py - 10.6 * s);   // the number sits on the jersey pixels
    if (over && tackleAt) {   // the yellow flag flies where the tackle happened
      ctx.fillStyle = "#ffd400"; ctx.beginPath(); ctx.moveTo(tackleAt.x, tackleAt.y - 30 * u); ctx.lineTo(tackleAt.x + 14 * u, tackleAt.y - 24 * u); ctx.lineTo(tackleAt.x + 2 * u, tackleAt.y - 16 * u); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffd400"; ctx.font = "bold " + Math.round(18 * u) + "px 'Arial Narrow', Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText("TACKLED!", W * 0.5, H * 0.24);
    }
    for (i = 0; i < rockets.length; i += 1) { ctx.fillStyle = "#fff"; ctx.fillRect(rockets[i].x - 1 * u, rockets[i].y, 2 * u, 8 * u); }
    for (i = 0; i < particles.length; i += 1) { var p = particles[i]; ctx.globalAlpha = Math.min(1, p.life); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 4 * u, 4 * u); }
    ctx.globalAlpha = 1;
    // drive banner for the first three seconds; the Tecmo scoreboard always
    if (driveT < 3 && running && !over) { var bw = 150 * u, bx = 8 * u, byy = 8 * u; ctx.fillStyle = "rgba(4,28,56,.85)"; ctx.fillRect(bx, byy, bw, 30 * u); drawLogo(tm.abbr, bx + 3 * u, byy + 3 * u, 24 * u, 1); ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.font = "bold " + Math.round(10 * u) + "px Arial, sans-serif"; ctx.fillText(driveIdx === 0 ? "HOME OPENER" : "AT " + tm.city.toUpperCase(), bx + 32 * u, byy + 13 * u); ctx.fillStyle = "#fdbb30"; ctx.font = Math.round(8 * u) + "px Arial, sans-serif"; ctx.fillText(tm.name, bx + 32 * u, byy + 24 * u); }
    drawScoreboard(u);
    if (celebrate > 0) { ctx.fillStyle = "rgba(255,255,255," + Math.min(1, celebrate) + ")"; ctx.font = "bold " + Math.round(26 * u) + "px 'Arial Narrow', Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText("TOUCHDOWN!", W * 0.5, H * 0.24); }
    if (halftime > 0) { ctx.fillStyle = "rgba(4,28,56,.75)"; ctx.fillRect(0, H * 0.3, W, H * 0.34); ctx.fillStyle = "#fdbb30"; ctx.font = "bold " + Math.round(22 * u) + "px 'Courier New', Courier, monospace"; ctx.textAlign = "center"; ctx.fillText("HALFTIME", W * 0.5, H * 0.45); ctx.fillStyle = "#fff"; ctx.font = "bold " + Math.round(11 * u) + "px 'Courier New', Courier, monospace"; ctx.fillText("IND " + (tds * POINTS) + "  ·  " + total + " YDS", W * 0.5, H * 0.57); }
  }

  /* ---------- open / close ---------- */
  function onVisibility() { if (document.hidden && running && !paused && !over) { pause(); } }
  function onKey(e) {
    if (isHidden()) { return; }
    var tg = e.target;
    if (tg === ui.iniInput) { if (e.keyCode === 13) { e.preventDefault(); saveInitials(); } return; }
    if (e.keyCode === 32 && tg && tg !== document.body && tg !== canvas && tg !== ui.jump && /^(BUTTON|INPUT|SELECT|A)$/.test(tg.tagName)) { return; }
    if (e.keyCode === 32) { if (!running || over) { if (!ui.initials.hidden) { return; } e.preventDefault(); start(); } else if (paused) { e.preventDefault(); resume(); } else { e.preventDefault(); jump(); } }
    else if (e.keyCode === 80) { e.preventDefault(); if (paused) { resume(); } else { pause(); } }
  }
  function bindOnce() {
    if (ui.bound) { return; }
    ui.bound = true;
    canvas = el("gameCanvas"); ctx = canvas.getContext("2d");
    ui.yards = el("gameYards"); ui.lives = el("gameLives"); ui.best = el("gameBest"); ui.drive = el("gameDrive");
    ui.jump = el("gameJump"); ui.pause = el("gamePause"); ui.restart = el("gameRestart"); ui.sound = el("gameSound"); ui.exit = el("gameExit");
    ui.overlay = el("gameOverlay"); ui.overlayTitle = el("gameOverlayTitle"); ui.overlayCopy = el("gameOverlayCopy"); ui.overlayBtn = el("gameOverlayBtn");
    ui.initials = el("gameInitials"); ui.iniInput = el("gameIni"); ui.iniSkip = el("gameIniSkip"); ui.boardWrap = el("gameBoard"); ui.boardList = el("gameBoardList");
    var press = function (fn) { return function (e) { if (e && e.preventDefault && e.type === "touchstart") { e.preventDefault(); } fn(); }; };
    var jumpOrStart = function () { if (!ui.initials.hidden) { return; } if (!running || over) { running = false; start(); } else if (paused) { resume(); } else { jump(); } };
    ui.jump.addEventListener("touchstart", press(jumpOrStart)); ui.jump.addEventListener("mousedown", press(jumpOrStart));
    ui.jump.addEventListener("keydown", function (e) { if (e.keyCode === 13) { e.preventDefault(); jumpOrStart(); } });
    canvas.addEventListener("touchstart", press(jumpOrStart)); canvas.addEventListener("mousedown", press(jumpOrStart));
    ui.pause.addEventListener("click", function () { if (paused) { resume(); } else { pause(); } });
    ui.restart.addEventListener("click", function () { running = false; start(); });
    ui.overlayBtn.addEventListener("click", function () { if (!ui.initials.hidden) { saveInitials(); } else if (paused && running && !over) { resume(); } else { running = false; start(); } });
    ui.overlay.addEventListener("click", function (e) { if (e.target === ui.overlay && ui.initials.hidden) { if (paused && running && !over) { resume(); } else if (!running || over) { running = false; start(); } } });
    ui.iniSkip.addEventListener("click", function () { pendingScore = null; overlay("over"); });
    ui.iniInput.addEventListener("input", function () { this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3); renderBoard({ ini: this.value, tds: tds, yards: peak }); });   // the board updates as you type
    ui.sound.addEventListener("click", function () { soundOn = !soundOn; ui.sound.setAttribute("aria-pressed", soundOn ? "true" : "false"); ui.sound.textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off"; if (soundOn) { beep(660, 60, "triangle"); } });
    ui.exit.addEventListener("click", function () { if (bridge) { bridge.close("gameModal"); } });
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", function () { if (!isHidden()) { resize(); } });
    try { reducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { reducedMotion = false; }
  }
  function open(opener, api) {
    bridge = api; bindOnce(); readBest();
    loadLogo(HOME.abbr); loadLogo(TEAMS[0].abbr); loadLogo(TEAMS[1].abbr); loadLogo(TEAMS[2].abbr);
    running = false; paused = false; over = false; obs = []; balls = []; particles = []; rockets = []; yards = 0; total = 0; peak = 0; tds = 0; driveIdx = 0; opp = HOME; stadium = true; pendingScore = null; tackleAt = null; blimpX = -1; signX = -1;
    bridge.show("gameModal", opener);
    window.setTimeout(function () { resize(); hud(); overlay("ready"); }, 40);
  }
  function stop() { cancel(); running = false; paused = false; particles = []; rockets = []; try { if (actx && actx.suspend) { actx.suspend(); } } catch (e) {} }
  function peek() { return { yards: yards, total: total, peak: peak, tds: tds, drive: driveIdx, opp: opp.abbr, stadium: stadium, night: skyColors(dayPhase()).night, speed: speed, running: running, paused: paused, over: over, turbo: turbo, celebrate: celebrate, halftime: halftime, playerX: W * 0.22, playerY: player.y, board: board.length, obstacles: obs.map(function (o) { return { x: o.x, w: o.w, h: o.h, type: o.type }; }) }; }
  window.JanafariGame = { open: open, stop: stop, peek: peek };
}());

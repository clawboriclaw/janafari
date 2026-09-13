/* End Zone Run v2 — Janafari's endless football runner (Chrome-dinosaur style, Colts edition).
   Loaded lazily by app.js the first time someone taps Play; nothing here runs on the ratings page.
   Canvas 2D, ES5, no assets: runner, defenders, cones, skylines, crowd and fireworks are all paths.
   Design (owner, 2026-09-12): Jonathan Taylor #28 in Colts blue; the run is CONTINUOUS — every 100 yards
   is a touchdown (arms up, fireworks, roar) and the next drive starts against the next team: their colours
   on the defenders, their city behind the stadium, faster. Day rolls into dusk, night and dawn across
   drives. Some drives are a packed stadium with the wave. A hit does not cost a life: it is a TACKLE that
   pushes you back 10 yards; the run ends only if you are pushed behind your own goal line. Every 10 yards
   is a first down (ding + chain marker). A floating football gives two seconds of turbo. A retro top-10
   board takes three initials. Sound is off until the switch is pressed. Storage: janafari-ezr-v2 (best) and
   janafari-ezr-scores-v1 (board), both best-effort. Reduced motion: no fireworks. */
(function () {
  "use strict";
  var KEY = "janafari-ezr-v2", OLD_KEY = "janafari-ezr-best-v1", SCORES_KEY = "janafari-ezr-scores-v1";
  var DRIVE = 100;            // yards per touchdown
  var GROUND = 0.74;          // ground line as a fraction of canvas height
  var PUSHBACK = 10;          // yards lost per tackle
  var BOARD_MAX = 10;

  /* Opponents in order: the AFC South first, then around the league. colors = [jersey, trim]; sky = landmark. */
  var TEAMS = [
    { abbr: "HOU", city: "Houston", colors: ["#03202f", "#a71930"], sky: "towers" },
    { abbr: "JAX", city: "Jacksonville", colors: ["#006778", "#d7a22a"], sky: "bridge" },
    { abbr: "TEN", city: "Nashville", colors: ["#0c2340", "#4b92db"], sky: "spire" },
    { abbr: "NE", city: "Foxborough", colors: ["#002244", "#c60c30"], sky: "lighthouse" },
    { abbr: "KC", city: "Kansas City", colors: ["#e31837", "#ffb81c"], sky: "fountain" },
    { abbr: "BUF", city: "Buffalo", colors: ["#00338d", "#c60c30"], sky: "snow" },
    { abbr: "DEN", city: "Denver", colors: ["#fb4f14", "#002244"], sky: "mountains" },
    { abbr: "MIA", city: "Miami", colors: ["#008e97", "#fc4c02"], sky: "palms" },
    { abbr: "PIT", city: "Pittsburgh", colors: ["#101820", "#ffb612"], sky: "bridge" },
    { abbr: "BAL", city: "Baltimore", colors: ["#241773", "#9e7c0c"], sky: "harbor" },
    { abbr: "CIN", city: "Cincinnati", colors: ["#fb4f14", "#101820"], sky: "towers" },
    { abbr: "CLE", city: "Cleveland", colors: ["#311d00", "#ff3c00"], sky: "towers" },
    { abbr: "LAC", city: "Los Angeles", colors: ["#0080c6", "#ffc20e"], sky: "palms" },
    { abbr: "LV", city: "Las Vegas", colors: ["#000000", "#a5acaf"], sky: "neon" },
    { abbr: "NYJ", city: "New York", colors: ["#125740", "#ffffff"], sky: "towers" },
    { abbr: "CHI", city: "Chicago", colors: ["#0b162a", "#c83803"], sky: "towers" },
    { abbr: "GB", city: "Green Bay", colors: ["#203731", "#ffb612"], sky: "snow" },
    { abbr: "SEA", city: "Seattle", colors: ["#002244", "#69be28"], sky: "needle" },
    { abbr: "DAL", city: "Dallas", colors: ["#041e42", "#869397"], sky: "towers" },
    { abbr: "PHI", city: "Philadelphia", colors: ["#004c54", "#a5acaf"], sky: "towers" },
    { abbr: "SF", city: "San Francisco", colors: ["#aa0000", "#b3995d"], sky: "bridge" },
    { abbr: "DET", city: "Detroit", colors: ["#0076b6", "#b0b7bc"], sky: "towers" },
    { abbr: "MIN", city: "Minneapolis", colors: ["#4f2683", "#ffc62f"], sky: "snow" },
    { abbr: "NO", city: "New Orleans", colors: ["#d3bc8d", "#101820"], sky: "harbor" },
    { abbr: "ATL", city: "Atlanta", colors: ["#a71930", "#000000"], sky: "towers" },
    { abbr: "TB", city: "Tampa", colors: ["#d50a0a", "#ff7900"], sky: "palms" },
    { abbr: "CAR", city: "Charlotte", colors: ["#0085ca", "#101820"], sky: "towers" },
    { abbr: "ARI", city: "Phoenix", colors: ["#97233f", "#ffb612"], sky: "mountains" },
    { abbr: "LAR", city: "Los Angeles", colors: ["#003594", "#ffa300"], sky: "palms" },
    { abbr: "NYG", city: "New York", colors: ["#0b2265", "#a71930"], sky: "towers" },
    { abbr: "WSH", city: "Washington", colors: ["#5a1414", "#ffb612"], sky: "obelisk" }
  ];
  var HOME = { abbr: "IND", city: "Indianapolis", colors: ["#003b75", "#ffffff"], sky: "indy" };

  var canvas, ctx, W = 0, H = 0, dpr = 1, raf = 0, last = 0, U = 1, PPY = 60;
  var running = false, paused = false, over = false;
  var driveIdx = 0, yards = 0, total = 0, tds = 0, speed = 0, t = 0, spawnAt = 0, hurt = 0, celebrate = 0, turbo = 0, pushAnim = 0, nextFirst = 10, chainFlash = 0, turboAt = 0, waveT = 0;
  var best = { yards: 0, tds: 0 }, newBest = false, lastMiss = "", board = [], pendingScore = null, peak = 0;   // peak = farthest point reached this run (a tackle pushes `total` back, the score keeps the high-water mark)
  var player = { y: 0, vy: 0, jumps: 0 };
  var obs = [], balls = [], particles = [], rockets = [], stars = [];
  var stadium = true, opp = HOME, seed = 1;
  var soundOn = false, actx = null, reducedMotion = false, bridge = null, ui = {};

  function el(id) { return document.getElementById(id); }
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }   // seeded, so a city looks the same each time
  function readBest() {
    best = { yards: 0, tds: 0 };
    try { var raw = localStorage.getItem(KEY); if (raw) { var b = JSON.parse(raw); if (b && typeof b.yards === "number") { best = { yards: b.yards, tds: b.tds || 0 }; } } } catch (e) {}
    try { var old = parseInt(localStorage.getItem(OLD_KEY), 10); if (old && old > best.yards) { best.yards = old; } } catch (e) {}   // v1's best distance carries over
    board = [];
    try { var rawB = localStorage.getItem(SCORES_KEY); if (rawB) { var arr = JSON.parse(rawB); if (Object.prototype.toString.call(arr) === "[object Array]") { board = arr.filter(function (s) { return s && typeof s.ini === "string" && typeof s.tds === "number" && typeof s.yards === "number"; }).slice(0, BOARD_MAX); } } } catch (e) { board = []; }
  }
  function writeBest() { try { localStorage.setItem(KEY, JSON.stringify(best)); } catch (e) {} }
  function writeBoard() { try { localStorage.setItem(SCORES_KEY, JSON.stringify(board)); } catch (e) {} }
  function team() { return driveIdx === 0 ? HOME : TEAMS[(driveIdx - 1) % TEAMS.length]; }
  function betterThan(a, b) { return a.tds > b.tds || (a.tds === b.tds && a.yards > b.yards); }
  function qualifies(score) { return board.length < BOARD_MAX || betterThan(score, board[board.length - 1]); }

  /* ---------- sound: oscillator beeps plus a noise "roar", only when the switch is on ---------- */
  function ensureAudio() {
    if (actx) { return true; }
    try { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) { return false; } actx = new AC(); return true; } catch (e) { return false; }
  }
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
      var len = Math.floor(actx.sampleRate * ms / 1000), buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0), i;
      for (i = 0; i < len; i += 1) { d[i] = (Math.random() * 2 - 1) * (1 - i / len); }
      var src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
      src.buffer = buf; f.type = "lowpass"; f.frequency.value = 900; g.gain.value = 0.12;
      src.connect(f); f.connect(g); g.connect(actx.destination); src.start();
    } catch (e) {}
  }

  /* ---------- sizing ---------- */
  function resize() {
    var stage = el("gameStage"); if (!stage) { return; }
    var cw = stage.clientWidth, ch = Math.max(190, Math.min(Math.round(cw * 0.58), Math.round(window.innerHeight * 0.46)));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cw; H = ch; U = W / 358; PPY = W / 6;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeStars(); draw();
  }
  function makeStars() { var i; stars = []; for (i = 0; i < 40; i += 1) { stars.push({ x: Math.random(), y: Math.random() * 0.5, s: 0.5 + Math.random() }); } }

  /* ---------- drives ---------- */
  function setDrive(i) {
    driveIdx = i; opp = team(); seed = 7 + i * 31;
    stadium = i === 0 ? true : rnd() < 0.55;       // the home opener is always a full house
    yards = 0; nextFirst = 10; obs = []; balls = []; spawnAt = i === 0 ? 3.0 : 2.2; turboAt = 20 + rnd() * 30;
    hud();
  }
  function paceYps() { return (2.3 + 0.35 * Math.min(driveIdx, 8)) * (turbo > 0 ? 1.6 : 1); }
  function reset() {
    total = 0; peak = 0; tds = 0; t = 0; hurt = 0; celebrate = 0; turbo = 0; pushAnim = 0; chainFlash = 0; lastMiss = ""; newBest = false; pendingScore = null;
    player.y = 0; player.vy = 0; player.jumps = 0; particles = []; rockets = []; over = false; paused = false;
    setDrive(0);
  }

  /* ---------- HUD / overlay / board ---------- */
  function hud() {
    ui.yards.textContent = Math.max(0, Math.floor(yards)) + " yd";
    ui.lives.textContent = tds + " TD" + (tds === 1 ? "" : "s");
    ui.best.textContent = "Best " + best.tds + " TD · " + best.yards + " yd";
    ui.drive.textContent = driveIdx === 0 ? "Home opener · Indianapolis" : "Drive " + (driveIdx + 1) + " · at " + opp.city + " (" + opp.abbr + ")";
    ui.pause.textContent = paused ? "Resume" : "Pause";
    ui.pause.disabled = !running || over;
    ui.jump.textContent = (!running || over) ? "TAP TO START" : (paused ? "RESUME" : "JUMP");
  }
  function renderBoard() {
    var list = ui.boardList, i; while (list.firstChild) { list.removeChild(list.firstChild); }
    if (!board.length) { var li0 = document.createElement("li"); li0.className = "board-empty"; li0.appendChild(document.createTextNode("No runs yet — be the first on the board.")); list.appendChild(li0); return; }
    for (i = 0; i < board.length; i += 1) {
      var s = board[i], li = document.createElement("li");
      if (pendingScore && pendingScore.placed === i) { li.className = "board-you"; }
      var rank = document.createElement("span"); rank.className = "board-rank"; rank.appendChild(document.createTextNode(String(i + 1)));
      var ini = document.createElement("span"); ini.className = "board-ini"; ini.appendChild(document.createTextNode(s.ini));
      var sc = document.createElement("span"); sc.className = "board-score"; sc.appendChild(document.createTextNode(s.tds + " TD · " + s.yards + " yd"));
      li.appendChild(rank); li.appendChild(ini); li.appendChild(sc); list.appendChild(li);
    }
  }
  function overlay(kind) {
    var box = ui.overlay, title = ui.overlayTitle, copy = ui.overlayCopy, btn = ui.overlayBtn;
    ui.initials.hidden = kind !== "initials"; ui.boardWrap.hidden = !(kind === "ready" || kind === "over");
    if (!kind) { box.hidden = true; return; }
    box.hidden = false;
    if (kind === "ready") { title.textContent = "End Zone Run"; copy.textContent = "You're Jonathan Taylor, #28. Hurdle the cones and defenders. Every 100 yards is a touchdown — then a new city, a little faster. A tackle pushes you back 10 yards."; btn.textContent = "Start"; renderBoard(); }
    else if (kind === "paused") { title.textContent = "Paused"; copy.textContent = "Take a breath. Your yards are safe."; btn.textContent = "Resume"; }
    else if (kind === "initials") { title.textContent = "HIGH SCORE!"; copy.textContent = tds + " touchdown" + (tds === 1 ? "" : "s") + " · " + peak + " yards. Enter your initials."; btn.textContent = "Save"; ui.iniInput.value = ""; window.setTimeout(function () { try { ui.iniInput.focus(); } catch (e) {} }, 40); return; }
    else if (kind === "over") { title.textContent = tds + " touchdown" + (tds === 1 ? "" : "s") + " · " + peak + " yards"; copy.textContent = (newBest ? "New best run! " : "") + "Tackled behind your own goal line. " + (lastMiss === "early" ? "You jumped a little early — wait until they're closer." : "Jump a bit sooner next time."); btn.textContent = "Play again"; renderBoard(); }
    window.setTimeout(function () { try { btn.focus(); } catch (e) {} }, 30);
  }
  function saveInitials() {
    var ini = String(ui.iniInput.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
    if (!ini) { ini = "JAN"; }
    var score = { ini: ini, tds: tds, yards: peak, date: new Date().toISOString().slice(0, 10) }, i, placed = board.length;
    for (i = 0; i < board.length; i += 1) { if (betterThan(score, board[i])) { placed = i; break; } }
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
    if (!running || paused || over) { return; }
    if (player.jumps < 1) { player.vy = -470 * U; player.jumps += 1; beep(880, 70, "square"); }
  }
  function endRun() {
    over = true; cancel();
    var score = { tds: tds, yards: peak };
    newBest = betterThan(score, best);
    if (newBest) { best = { yards: peak, tds: tds }; writeBest(); }
    beep(160, 260, "sawtooth"); hud(); draw();
    if (peak > 0 && qualifies(score)) { overlay("initials"); } else { overlay("over"); }
  }
  function touchdown() {
    tds += 1; celebrate = 2.6; hurt = 2.6; roar(1400);
    beep(523, 120, "triangle"); window.setTimeout(function () { beep(659, 120, "triangle"); }, 130); window.setTimeout(function () { beep(784, 260, "triangle"); }, 260);
    if (!reducedMotion) { var i; for (i = 0; i < 5; i += 1) { rockets.push({ x: W * (0.25 + Math.random() * 0.6), y: H * GROUND, vy: -(260 + Math.random() * 120) * U, fuse: 0.5 + Math.random() * 0.5, c: i % 2 ? team().colors[1] : "#fdbb30" }); } }
    setDrive(driveIdx + 1);
  }
  function burst(x, y, c) {
    var i; for (i = 0; i < 26; i += 1) { var a = Math.random() * Math.PI * 2, v = (60 + Math.random() * 160) * U; particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.9 + Math.random() * 0.6, c: Math.random() < 0.3 ? "#ffffff" : c }); }
  }
  function cancel() { if (raf) { window.cancelAnimationFrame(raf); raf = 0; } }
  function isHidden() { return el("gameModal").hidden; }

  /* ---------- the loop ---------- */
  function loop() { cancel(); raf = window.requestAnimationFrame(frame); }
  function frame(now) {
    if (!running || paused || over || isHidden()) { raf = 0; return; }
    if (!last) { last = now; }
    var dt = Math.min(0.04, (now - last) / 1000); last = now;
    t += dt; waveT += dt;
    var yps = paceYps(); speed = yps * PPY;
    yards += yps * dt; total = driveIdx * DRIVE + Math.max(0, Math.floor(yards)); if (total > peak) { peak = total; }
    if (turbo > 0) { turbo -= dt; }
    if (celebrate > 0) { celebrate -= dt; }
    if (hurt > 0) { hurt -= dt; }
    if (pushAnim > 0) { pushAnim -= dt; }
    if (chainFlash > 0) { chainFlash -= dt; }
    if (yards >= nextFirst && nextFirst < DRIVE) { nextFirst += 10; chainFlash = 0.8; beep(1046, 60, "sine", 0.04); }   // first down
    player.vy += 1150 * U * dt; player.y += player.vy * dt;
    if (player.y > 0) { player.y = 0; player.vy = 0; player.jumps = 0; }
    // obstacles: none during the celebration stretch; each drive ramps up
    spawnAt -= dt;
    if (spawnAt <= 0 && celebrate <= 0 && yards < DRIVE - 6) {
      var d = Math.min(driveIdx, 8), r = Math.random(), type;
      if (r < 0.35 - d * 0.02) { type = "cone"; } else if (r < 0.75) { type = "def"; } else if (d >= 2 && r < 0.9) { type = "cones2"; } else { type = "def"; }
      var w = type === "cones2" ? 40 : (type === "def" ? 30 : 18), h = type === "def" ? 44 : 22;
      obs.push({ type: type, x: W + 40 * U, w: w * U, h: h * U, hit: false });
      spawnAt = Math.max(0.9, 2.6 - yards * 0.012 - d * 0.12) + Math.random() * 0.7;
    }
    if (yards > turboAt && celebrate <= 0) { balls.push({ x: W + 30 * U, y: -60 * U, got: false }); turboAt = yards + 35 + Math.random() * 40; }   // a floating football: turbo
    var i, px = W * 0.22, pw = 22 * U, ph = 40 * U, gy = H * GROUND;
    for (i = balls.length - 1; i >= 0; i -= 1) {
      var bl = balls[i]; bl.x -= speed * dt;
      if (bl.x < -20 * U) { balls.splice(i, 1); continue; }
      if (!bl.got && Math.abs(bl.x - px) < 18 * U && Math.abs(bl.y - (player.y - ph * 0.5)) < 26 * U) { bl.got = true; turbo = 2.0; beep(1318, 120, "triangle"); burst(px, gy + player.y - ph * 0.5, "#fdbb30"); balls.splice(i, 1); }
    }
    for (i = obs.length - 1; i >= 0; i -= 1) {
      var o = obs[i]; o.x -= speed * dt;
      if (o.x + o.w < -10) { obs.splice(i, 1); continue; }
      var pl = px - pw / 2 + 4 * U, pr = px + pw / 2 - 4 * U, pb = gy + player.y - 2 * U;
      var ol = o.x + o.w * 0.1, orr = o.x + o.w * 0.9, ot = gy - o.h + 3 * U;
      if (!o.hit && hurt <= 0 && turbo <= 0 && pr > ol && pl < orr && pb > ot) {
        o.hit = true; hurt = 1.2; pushAnim = 0.5; lastMiss = player.y < -2 ? "early" : "late";
        yards -= PUSHBACK; nextFirst = Math.max(10, Math.floor(Math.max(0, yards) / 10) * 10 + 10);
        beep(200, 160, "sawtooth"); hud();
        if (yards < 0) { total = driveIdx * DRIVE; endRun(); return; }
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
  function mix(c1, c2, k) {
    var a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    return "rgb(" + Math.round(lerp(a >> 16, b >> 16, k)) + "," + Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, k)) + "," + Math.round(lerp(a & 255, b & 255, k)) + ")";
  }
  function dayPhase() { return ((total / DRIVE) / 4 + 0.35) % 1; }   // one full day per ~4 drives, starting in the afternoon
  function skyColors(ph) {
    var stops = [[0.00, "#0a1a3a", "#1a2d55"], [0.15, "#f2a65a", "#8b5fbf"], [0.30, "#7cc4ff", "#cfe9ff"], [0.55, "#6bb8ff", "#d8ecff"], [0.70, "#f7b267", "#c66d9e"], [0.85, "#0a1a3a", "#1a2d55"], [1.00, "#0a1a3a", "#1a2d55"]];
    var i; for (i = 0; i < stops.length - 1; i += 1) { if (ph >= stops[i][0] && ph <= stops[i + 1][0]) { var k = (ph - stops[i][0]) / (stops[i + 1][0] - stops[i][0]); return { top: mix(stops[i][1], stops[i + 1][1], k), bottom: mix(stops[i][2], stops[i + 1][2], k), night: (ph < 0.12 || ph > 0.8) ? 1 : (ph < 0.2 ? (0.2 - ph) / 0.08 : (ph > 0.72 ? (ph - 0.72) / 0.08 : 0)) }; } }
    return { top: "#6bb8ff", bottom: "#d8ecff", night: 0 };
  }
  function ellipse(x, y, rx, ry) { if (ctx.ellipse) { ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); } else { ctx.arc(x, y, (rx + ry) / 2, 0, Math.PI * 2); } }
  function drawSkyline(kind, base, night, u) {
    var i, x, span = W + 200 * u, sc = (total * PPY * 0.08) % span;   // parallax: the city drifts slowly
    var dark = night > 0.5 ? "#1b2b48" : "#5c7fa8", land = night > 0.5 ? "#26395e" : "#42658c";
    seed = 100 + driveIdx * 17;
    if (kind === "mountains") { ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-sc, base); for (i = 0; i <= 8; i += 1) { ctx.lineTo(-sc + i * span / 8, base - (30 + rnd() * 60) * u); } ctx.lineTo(span - sc, base); ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.6)"; for (i = 1; i < 8; i += 2) { x = -sc + i * span / 8; ctx.fillRect(x - 3 * u, base - 84 * u, 6 * u, 6 * u); } return; }
    if (kind === "palms") { for (i = 0; i < 7; i += 1) { x = ((i * 90 * u) - sc + span * 2) % span - 100 * u; ctx.fillStyle = night > 0.5 ? "#1b2b48" : "#3d6b4a"; ctx.fillRect(x, base - 40 * u, 4 * u, 40 * u); ctx.beginPath(); ctx.arc(x + 2 * u, base - 42 * u, 12 * u, 0, Math.PI * 2); ctx.fill(); } return; }
    for (i = 0; i < 14; i += 1) {   // a row of buildings, windows lit at night
      var bw = (14 + rnd() * 22) * u, bh = (18 + rnd() * 52) * u; x = ((i * 34 * u) - sc + span * 2) % span - 100 * u;
      ctx.fillStyle = dark; ctx.fillRect(x, base - bh, bw, bh);
      if (night > 0.3) { ctx.fillStyle = "rgba(255,220,120," + (0.5 * night) + ")"; var wy; for (wy = base - bh + 6 * u; wy < base - 6 * u; wy += 9 * u) { if (rnd() < 0.6) { ctx.fillRect(x + 3 * u, wy, 4 * u, 4 * u); } if (rnd() < 0.6 && bw > 16 * u) { ctx.fillRect(x + bw - 7 * u, wy, 4 * u, 4 * u); } } }
    }
    var lx = (W * 0.62 - sc * 0.5 + span * 2) % span - 100 * u; ctx.fillStyle = land;
    if (kind === "indy") { ctx.fillRect(lx - 6 * u, base - 90 * u, 12 * u, 90 * u); ctx.fillRect(lx - 10 * u, base - 96 * u, 20 * u, 6 * u); ctx.beginPath(); ctx.arc(lx - 70 * u, base, 40 * u, Math.PI, 0); ctx.fill(); }   // the Monument + the dome
    else if (kind === "obelisk") { ctx.fillRect(lx - 5 * u, base - 96 * u, 10 * u, 96 * u); ctx.beginPath(); ctx.moveTo(lx - 5 * u, base - 96 * u); ctx.lineTo(lx, base - 108 * u); ctx.lineTo(lx + 5 * u, base - 96 * u); ctx.fill(); }
    else if (kind === "spire") { ctx.fillRect(lx - 12 * u, base - 70 * u, 24 * u, 70 * u); ctx.fillRect(lx - 14 * u, base - 96 * u, 4 * u, 30 * u); ctx.fillRect(lx + 10 * u, base - 96 * u, 4 * u, 30 * u); }
    else if (kind === "needle") { ctx.fillRect(lx - 2 * u, base - 96 * u, 4 * u, 96 * u); ctx.beginPath(); ellipse(lx, base - 84 * u, 18 * u, 7 * u); ctx.fill(); }
    else if (kind === "bridge") { ctx.fillRect(lx - 90 * u, base - 22 * u, 180 * u, 4 * u); ctx.fillRect(lx - 40 * u, base - 70 * u, 6 * u, 70 * u); ctx.fillRect(lx + 34 * u, base - 70 * u, 6 * u, 70 * u); ctx.strokeStyle = land; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(lx - 90 * u, base - 22 * u); ctx.quadraticCurveTo(lx - 37 * u, base - 90 * u, lx, base - 26 * u); ctx.quadraticCurveTo(lx + 37 * u, base - 90 * u, lx + 90 * u, base - 22 * u); ctx.stroke(); }
    else if (kind === "lighthouse") { ctx.fillRect(lx - 6 * u, base - 60 * u, 12 * u, 60 * u); ctx.fillStyle = night > 0.5 ? "#ffe08a" : "#e8f0ff"; ctx.fillRect(lx - 8 * u, base - 68 * u, 16 * u, 8 * u); }
    else if (kind === "fountain") { ctx.fillRect(lx - 30 * u, base - 8 * u, 60 * u, 8 * u); ctx.fillStyle = "rgba(180,220,255,.8)"; ctx.fillRect(lx - 2 * u, base - 46 * u, 4 * u, 38 * u); ctx.fillRect(lx - 16 * u, base - 30 * u, 3 * u, 22 * u); ctx.fillRect(lx + 13 * u, base - 30 * u, 3 * u, 22 * u); }
    else if (kind === "harbor") { ctx.fillRect(lx - 60 * u, base - 6 * u, 120 * u, 6 * u); ctx.fillRect(lx - 20 * u, base - 30 * u, 40 * u, 24 * u); ctx.fillRect(lx - 2 * u, base - 56 * u, 4 * u, 26 * u); }
    else if (kind === "neon") { ctx.fillRect(lx - 4 * u, base - 100 * u, 8 * u, 100 * u); ctx.fillStyle = "#ff4fd8"; ctx.fillRect(lx - 30 * u, base - 60 * u, 60 * u, 6 * u); ctx.fillStyle = "#4ff0ff"; ctx.fillRect(lx - 24 * u, base - 48 * u, 48 * u, 6 * u); }
    else if (kind === "snow") { ctx.fillStyle = "rgba(255,255,255,.85)"; for (i = 0; i < 40; i += 1) { ctx.fillRect(((i * 53 * u) + t * 20 * u) % W, ((i * 37 * u) + t * 40 * u) % base, 2 * u, 2 * u); } }
  }
  function drawCrowd(gy, u, colors) {
    var rows = 4, r, c, cols = Math.ceil(W / (10 * u)) + 1, top = gy - 58 * u;
    ctx.fillStyle = "#2a2f3a"; ctx.fillRect(0, top - 4 * u, W, 62 * u);
    var wx = (waveT * 220 * u) % (W + 300 * u) - 100 * u;   // the wave rolls left → right
    for (r = 0; r < rows; r += 1) {
      for (c = 0; c < cols; c += 1) {
        var x = c * 10 * u + (r % 2) * 5 * u, base = top + r * 13 * u + 10 * u;
        var wave = Math.max(0, 1 - Math.abs(wx - x) / (60 * u)), y = base - wave * 6 * u;
        ctx.fillStyle = ((c + r) % 3 === 0) ? colors[1] : (((c + r) % 3 === 1) ? colors[0] : "#e8c39e");
        ctx.fillRect(x, y - 6 * u, 6 * u, 6 * u);
        if (wave > 0.5) { ctx.fillRect(x - 2 * u, y - 10 * u, 2 * u, 5 * u); ctx.fillRect(x + 6 * u, y - 10 * u, 2 * u, 5 * u); }
      }
    }
    ctx.fillStyle = "#3a4050"; ctx.fillRect(0, gy - 6 * u, W, 6 * u);
  }
  function draw() {
    if (!ctx) { return; }
    var gy = H * GROUND, i, u = U, ph = dayPhase(), sky = skyColors(ph), night = sky.night, tm = team();
    var grad = ctx.createLinearGradient(0, 0, 0, gy); grad.addColorStop(0, sky.top); grad.addColorStop(1, sky.bottom);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, gy);
    if (night > 0) { ctx.fillStyle = "rgba(255,255,255," + (0.8 * night) + ")"; for (i = 0; i < stars.length; i += 1) { ctx.fillRect(stars[i].x * W, stars[i].y * gy, stars[i].s * u, stars[i].s * u); } }
    var sunX = W * ((ph + 0.5) % 1), sunY = gy * 0.2 + Math.abs(0.5 - ((ph + 0.5) % 1)) * gy * 0.6;
    ctx.beginPath(); ctx.arc(sunX, sunY, 12 * u, 0, Math.PI * 2); ctx.fillStyle = night > 0.5 ? "#f4f1e0" : "#ffd54a"; ctx.fill();
    drawSkyline(tm.sky, gy - (stadium ? 62 * u : 8 * u), night, u);
    if (stadium) {
      drawCrowd(gy, u, tm.colors);
      if (night > 0.3) { for (i = 0; i < 3; i += 1) { var lxp = W * (0.15 + i * 0.35); ctx.fillStyle = "#6b7280"; ctx.fillRect(lxp - 2 * u, gy - 120 * u, 4 * u, 62 * u); ctx.fillStyle = "rgba(255,244,200," + (0.9 * night) + ")"; ctx.fillRect(lxp - 14 * u, gy - 126 * u, 28 * u, 8 * u); ctx.fillStyle = "rgba(255,244,200," + (0.08 * night) + ")"; ctx.beginPath(); ctx.moveTo(lxp - 14 * u, gy - 118 * u); ctx.lineTo(lxp - 90 * u, gy); ctx.lineTo(lxp + 90 * u, gy); ctx.lineTo(lxp + 14 * u, gy - 118 * u); ctx.fill(); } }
    }
    ctx.fillStyle = night > 0.5 ? "#1a5c2c" : "#1f7a3a"; ctx.fillRect(0, gy, W, H - gy);
    var step = 5 * PPY, off = (Math.max(0, yards) * PPY) % step, px0 = W * 0.22;
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2;
    for (i = -1; i < W / step + 2; i += 1) { var x = i * step - off; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "bold " + Math.round(11 * u) + "px Arial, sans-serif"; ctx.textAlign = "center";
    for (i = -1; i < W / step + 2; i += 1) { var xx = i * step - off, yd = Math.round(yards + (xx - px0) / PPY); if (yd >= 0 && yd <= 100 && yd % 10 === 0) { ctx.fillText(String(yd), xx, H - 6 * u); } }
    var cx = px0 + (nextFirst - yards) * PPY;   // first-down chain marker
    if (cx > -20 && cx < W + 20 && nextFirst <= DRIVE) { ctx.fillStyle = chainFlash > 0 ? "#fdbb30" : "#ff8c00"; ctx.fillRect(cx - 2 * u, gy - 26 * u, 4 * u, 26 * u); ctx.fillRect(cx - 8 * u, gy - 30 * u, 16 * u, 6 * u); }
    if (chainFlash > 0) { ctx.fillStyle = "rgba(253,187,48," + Math.min(1, chainFlash) + ")"; ctx.font = "bold " + Math.round(16 * u) + "px Arial, sans-serif"; ctx.fillText("1ST DOWN", W * 0.5, gy - 70 * u); }
    var ezx = px0 + (DRIVE - yards) * PPY;   // the end zone rolls in
    if (ezx < W + 20) { ctx.fillStyle = "#003b75"; ctx.fillRect(ezx, gy, W - ezx + 20, H - gy); ctx.fillStyle = "#fff"; ctx.font = "bold " + Math.round(14 * u) + "px Arial, sans-serif"; ctx.fillText("COLTS", Math.min(ezx + 60 * u, W - 40 * u), gy + 22 * u); }
    ctx.lineWidth = 2 * u; ctx.strokeStyle = "#fff";
    for (i = 0; i < balls.length; i += 1) { var bl = balls[i], by = gy + bl.y + Math.sin(t * 5) * 4 * u; ctx.fillStyle = "#8b4513"; ctx.beginPath(); ellipse(bl.x, by, 12 * u, 7 * u); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.fillRect(bl.x - 5 * u, by - 1 * u, 10 * u, 2 * u); }
    for (i = 0; i < obs.length; i += 1) {   // obstacles in the opponent's colours, white-outlined
      var o = obs[i];
      if (o.type === "cone" || o.type === "cones2") {
        var n = o.type === "cones2" ? 2 : 1, cwid = o.w / n, k;
        for (k = 0; k < n; k += 1) { var ox = o.x + k * cwid; ctx.fillStyle = "#ff7a1a"; ctx.beginPath(); ctx.moveTo(ox, gy); ctx.lineTo(ox + cwid / 2, gy - o.h); ctx.lineTo(ox + cwid, gy); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.fillRect(ox + 4 * u, gy - o.h * 0.45, cwid - 8 * u, 3 * u); }
      } else {
        var dcx = o.x + o.w / 2, top = gy - o.h;
        ctx.globalAlpha = o.hit ? 0.45 : 1;
        ctx.fillStyle = opp.colors[0]; ctx.beginPath(); ctx.rect(dcx - 8 * u, top + 12 * u, 16 * u, 18 * u); ctx.fill(); ctx.stroke();
        ctx.fillStyle = opp.colors[1]; ctx.fillRect(dcx - 8 * u, top + 12 * u, 16 * u, 4 * u);
        ctx.fillStyle = opp.colors[0]; ctx.fillRect(o.x - 4 * u, top + 15 * u, o.w + 8 * u, 5 * u); ctx.strokeRect(o.x - 4 * u, top + 15 * u, o.w + 8 * u, 5 * u);
        ctx.fillStyle = "#333"; ctx.fillRect(dcx - 9 * u, gy - 14 * u, 6 * u, 14 * u); ctx.fillRect(dcx + 3 * u, gy - 14 * u, 6 * u, 14 * u);
        ctx.beginPath(); ctx.arc(dcx, top + 5 * u, 7 * u, 0, Math.PI * 2); ctx.fillStyle = opp.colors[0]; ctx.fill(); ctx.stroke();
        ctx.fillStyle = opp.colors[1]; ctx.fillRect(dcx - 7 * u, top + 6 * u, 14 * u, 2 * u);
        ctx.globalAlpha = 1;
      }
    }
    // Jonathan Taylor #28: Colts blue, white 28, white helmet with the horseshoe; arms out on a hurdle, up for a touchdown
    var px = W * 0.22 - (pushAnim > 0 ? pushAnim * 30 * u : 0), phh = 40 * u, py = gy + player.y, blink = hurt > 0 && celebrate <= 0 && Math.floor(t * 12) % 2 === 0;
    if (turbo > 0) { ctx.fillStyle = "rgba(253,187,48,.35)"; ctx.fillRect(px - 40 * u, py - phh, 30 * u, phh); }
    if (!blink) {
      var swing = player.y ? 0 : Math.sin(yards * 6) * 6 * u, armsUp = celebrate > 0, armsOut = player.y < 0 && !armsUp;
      ctx.fillStyle = "#e8c39e"; ctx.fillRect(px - 8 * u, py - 12 * u, 5 * u, 12 * u + swing); ctx.fillRect(px + 3 * u, py - 12 * u, 5 * u, 12 * u - swing);
      ctx.fillStyle = "#003b75"; ctx.beginPath(); ctx.rect(px - 11 * u, py - phh + 12 * u, 22 * u, 18 * u); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "bold " + Math.round(11 * u) + "px Arial, sans-serif"; ctx.fillText("28", px, py - phh + 26 * u);
      ctx.fillStyle = "#e8c39e";
      if (armsUp) { ctx.fillRect(px - 16 * u, py - phh - 6 * u, 5 * u, 20 * u); ctx.fillRect(px + 11 * u, py - phh - 6 * u, 5 * u, 20 * u); }
      else if (armsOut) { ctx.fillRect(px - 22 * u, py - phh + 14 * u, 12 * u, 5 * u); ctx.fillRect(px + 10 * u, py - phh + 14 * u, 12 * u, 5 * u); }
      else { ctx.fillRect(px - 15 * u, py - phh + 14 * u, 5 * u, 12 * u); ctx.fillRect(px + 10 * u, py - phh + 14 * u, 5 * u, 12 * u); }
      ctx.beginPath(); ctx.arc(px, py - phh + 2 * u, 9 * u, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#003b75"; ctx.lineWidth = 2.2 * u; ctx.beginPath(); ctx.arc(px + 1 * u, py - phh + 2 * u, 4 * u, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();   // the horseshoe
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 * u; ctx.fillStyle = "#003b75"; ctx.fillRect(px - 9 * u, py - phh + 1 * u, 18 * u, 3 * u);
    }
    for (i = 0; i < rockets.length; i += 1) { ctx.fillStyle = "#fff"; ctx.fillRect(rockets[i].x - 1 * u, rockets[i].y, 2 * u, 8 * u); }
    for (i = 0; i < particles.length; i += 1) { var p = particles[i]; ctx.globalAlpha = Math.min(1, p.life); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 4 * u, 4 * u); }
    ctx.globalAlpha = 1;
    if (celebrate > 0) { ctx.fillStyle = "rgba(255,255,255," + Math.min(1, celebrate) + ")"; ctx.font = "bold " + Math.round(28 * u) + "px 'Arial Narrow', Arial, sans-serif"; ctx.fillText("TOUCHDOWN!", W * 0.5, gy * 0.45); }
  }

  /* ---------- open / close ---------- */
  function onVisibility() { if (document.hidden && running && !paused && !over) { pause(); } }
  function onKey(e) {
    if (isHidden()) { return; }
    var tg = e.target;
    if (tg === ui.iniInput) { if (e.keyCode === 13) { e.preventDefault(); saveInitials(); } return; }   // typing initials: nothing else listens
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
    ui.initials = el("gameInitials"); ui.iniInput = el("gameIni"); ui.boardWrap = el("gameBoard"); ui.boardList = el("gameBoardList");
    var press = function (fn) { return function (e) { if (e && e.preventDefault && e.type === "touchstart") { e.preventDefault(); } fn(); }; };
    var jumpOrStart = function () { if (!ui.initials.hidden) { return; } if (!running || over) { running = false; start(); } else if (paused) { resume(); } else { jump(); } };
    ui.jump.addEventListener("touchstart", press(jumpOrStart)); ui.jump.addEventListener("mousedown", press(jumpOrStart));
    ui.jump.addEventListener("keydown", function (e) { if (e.keyCode === 13) { e.preventDefault(); jumpOrStart(); } });
    canvas.addEventListener("touchstart", press(jumpOrStart)); canvas.addEventListener("mousedown", press(jumpOrStart));
    ui.pause.addEventListener("click", function () { if (paused) { resume(); } else { pause(); } });
    ui.restart.addEventListener("click", function () { running = false; start(); });
    ui.overlayBtn.addEventListener("click", function () { if (!ui.initials.hidden) { saveInitials(); } else if (paused && running && !over) { resume(); } else { running = false; start(); } });
    ui.overlay.addEventListener("click", function (e) { if (e.target === ui.overlay && ui.initials.hidden) { if (paused && running && !over) { resume(); } else if (!running || over) { running = false; start(); } } });
    ui.iniInput.addEventListener("input", function () { this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3); });
    ui.sound.addEventListener("click", function () { soundOn = !soundOn; ui.sound.setAttribute("aria-pressed", soundOn ? "true" : "false"); ui.sound.textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off"; if (soundOn) { beep(660, 60, "triangle"); } });
    ui.exit.addEventListener("click", function () { if (bridge) { bridge.close("gameModal"); } });
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", function () { if (!isHidden()) { resize(); } });
    try { reducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { reducedMotion = false; }
  }
  function open(opener, api) {
    bridge = api; bindOnce(); readBest();
    running = false; paused = false; over = false; obs = []; balls = []; particles = []; rockets = []; yards = 0; total = 0; tds = 0; driveIdx = 0; opp = HOME; stadium = true; pendingScore = null;
    bridge.show("gameModal", opener);
    window.setTimeout(function () { resize(); hud(); overlay("ready"); }, 40);
  }
  function stop() { cancel(); running = false; paused = false; particles = []; rockets = []; try { if (actx && actx.suspend) { actx.suspend(); } } catch (e) {} }
  function peek() { return { yards: yards, total: total, peak: peak, tds: tds, drive: driveIdx, opp: opp.abbr, stadium: stadium, night: skyColors(dayPhase()).night, speed: speed, running: running, paused: paused, over: over, turbo: turbo, celebrate: celebrate, playerX: W * 0.22, playerY: player.y, board: board.length, obstacles: obs.map(function (o) { return { x: o.x, w: o.w, h: o.h, type: o.type }; }) }; }
  window.JanafariGame = { open: open, stop: stop, peek: peek };
}());

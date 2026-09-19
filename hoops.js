/* Janafari Jam — the basketball easter egg. Two-on-two, one button, everything random.
   Loaded lazily by app.js the first time someone taps Play on the NBA side; nothing here runs on the
   ratings page. Canvas 2D, ES5, no assets except the page's own ESPN team emblems.
   The idea (owner, 2026-09-19: "like Basket Random, but NBA"): wobbly two-man teams, ONE button — tap to
   jump, tap with the ball to shoot — and every point changes the rules: the ball (basketball, beach ball,
   bowling ball, mini ball), the gravity (moon, heavy), the players (giants, shorties, big heads), the
   weather. First to 5 wins the game. You are the Pacers; the opponents come from the real NBA 2K27 file
   — their two best-rated players, wearing their real names and numbers, and their real 2K numbers steer
   the game: three-point rating = how straight they shoot, dunk = finishing at the rim, height = height.
   Win and the next team comes to town; lose once and the run is over — your win streak goes on the board.
   House rules (same as End Zone Run): loop only while the sheet is open and running; tab hidden → pause;
   Exit stops loop and sound; sound off until switched on; keys janafari-jam-v1 (best) +
   janafari-jam-scores-v1 (board), both best-effort; reduced motion → no confetti. Scales with U = W/358. */
(function () {
  "use strict";
  var KEY = "janafari-jam-v1", SCORES_KEY = "janafari-jam-scores-v1";
  var TO_WIN = 5, BOARD_MAX = 10, SHOT_CLOCK = 8;
  var HOME_ABBR = "IND";
  /* Order of opponents: the Central first, then the rest of the East, then the West. colors = [primary, trim]. */
  var TEAMS = [
    { abbr: "CHI", city: "Chicago", name: "BULLS", colors: ["#ce1141", "#000000"] },
    { abbr: "CLE", city: "Cleveland", name: "CAVALIERS", colors: ["#860038", "#fdbb30"] },
    { abbr: "DET", city: "Detroit", name: "PISTONS", colors: ["#c8102e", "#1d42ba"] },
    { abbr: "MIL", city: "Milwaukee", name: "BUCKS", colors: ["#00471b", "#eee1c6"] },
    { abbr: "BOS", city: "Boston", name: "CELTICS", colors: ["#007a33", "#ffffff"] },
    { abbr: "NYK", city: "New York", name: "KNICKS", colors: ["#006bb6", "#f58426"] },
    { abbr: "PHI", city: "Philadelphia", name: "76ERS", colors: ["#006bb6", "#ed174c"] },
    { abbr: "MIA", city: "Miami", name: "HEAT", colors: ["#98002e", "#f9a01b"] },
    { abbr: "ATL", city: "Atlanta", name: "HAWKS", colors: ["#c8102e", "#fdb927"] },
    { abbr: "ORL", city: "Orlando", name: "MAGIC", colors: ["#0077c0", "#c4ced4"] },
    { abbr: "TOR", city: "Toronto", name: "RAPTORS", colors: ["#ce1141", "#000000"] },
    { abbr: "BKN", city: "Brooklyn", name: "NETS", colors: ["#000000", "#ffffff"] },
    { abbr: "CHA", city: "Charlotte", name: "HORNETS", colors: ["#1d1160", "#00788c"] },
    { abbr: "WAS", city: "Washington", name: "WIZARDS", colors: ["#002b5c", "#e31837"] },
    { abbr: "OKC", city: "Oklahoma City", name: "THUNDER", colors: ["#007ac1", "#ef5133"] },
    { abbr: "DEN", city: "Denver", name: "NUGGETS", colors: ["#0e2240", "#fec524"] },
    { abbr: "LAL", city: "Los Angeles", name: "LAKERS", colors: ["#552583", "#fdb927"] },
    { abbr: "GSW", city: "San Francisco", name: "WARRIORS", colors: ["#1d428a", "#ffc72c"] },
    { abbr: "SAS", city: "San Antonio", name: "SPURS", colors: ["#000000", "#c4ced4"] },
    { abbr: "DAL", city: "Dallas", name: "MAVERICKS", colors: ["#00538c", "#b8c4ca"] },
    { abbr: "MIN", city: "Minneapolis", name: "TIMBERWOLVES", colors: ["#0c2340", "#78be20"] },
    { abbr: "HOU", city: "Houston", name: "ROCKETS", colors: ["#ce1141", "#000000"] },
    { abbr: "MEM", city: "Memphis", name: "GRIZZLIES", colors: ["#5d76a9", "#12173f"] },
    { abbr: "PHX", city: "Phoenix", name: "SUNS", colors: ["#1d1160", "#e56020"] },
    { abbr: "LAC", city: "Los Angeles", name: "CLIPPERS", colors: ["#c8102e", "#1d428a"] },
    { abbr: "SAC", city: "Sacramento", name: "KINGS", colors: ["#5a2d81", "#63727a"] },
    { abbr: "NOP", city: "New Orleans", name: "PELICANS", colors: ["#0c2340", "#c8102e"] },
    { abbr: "POR", city: "Portland", name: "TRAIL BLAZERS", colors: ["#e03a3e", "#000000"] },
    { abbr: "UTA", city: "Salt Lake City", name: "JAZZ", colors: ["#002b5c", "#f9a01b"] }
  ];
  var HOME = { abbr: "IND", city: "Indianapolis", name: "PACERS", colors: ["#002d62", "#fdbb30"] };
  /* If the ratings file is not there yet, these two lines stand in (real 2K27 launch numbers). */
  var FALLBACK = {
    IND: [{ name: "Tyrese Haliburton", jersey: "0", ovr: 90, threePt: 87, dunk: 65, height: 77 }, { name: "Pascal Siakam", jersey: "43", ovr: 86, threePt: 78, dunk: 84, height: 80 }],
    ANY: [{ name: "Player One", jersey: "1", ovr: 80, threePt: 75, dunk: 75, height: 78 }, { name: "Player Two", jersey: "2", ovr: 78, threePt: 72, dunk: 78, height: 80 }]
  };
  /* The randomizer: one of each per point. Rarer ones are listed once, the plain ones several times. */
  var BALLS = [
    { id: "ball", label: "", r: 1, g: 1, e: 0.62, mass: 1 }, { id: "ball", label: "", r: 1, g: 1, e: 0.62, mass: 1 }, { id: "ball", label: "", r: 1, g: 1, e: 0.62, mass: 1 }, { id: "ball", label: "", r: 1, g: 1, e: 0.62, mass: 1 },
    { id: "beach", label: "Beach ball", r: 1.55, g: 0.6, e: 0.7, mass: 0.35, drag: 0.35 },
    { id: "bowling", label: "Bowling ball", r: 1.05, g: 1.35, e: 0.18, mass: 2.2 },
    { id: "mini", label: "Mini ball", r: 0.6, g: 1, e: 0.7, mass: 0.7 },
    { id: "football", label: "A football?!", r: 0.95, g: 1, e: 0.55, mass: 1, wobble: true }
  ];
  var GRAVS = [{ id: "normal", label: "", k: 1 }, { id: "normal", label: "", k: 1 }, { id: "normal", label: "", k: 1 }, { id: "moon", label: "Moon gravity", k: 0.45 }, { id: "heavy", label: "Heavy gravity", k: 1.5 }];
  var BODIES = [{ id: "normal", label: "" }, { id: "normal", label: "" }, { id: "tall", label: "Giants" }, { id: "short", label: "Shorties" }, { id: "heads", label: "Big heads" }, { id: "mixed", label: "One tall, one short" }];
  var SKIES = [{ id: "arena", label: "" }, { id: "arena", label: "" }, { id: "arena", label: "" }, { id: "snow", label: "Snow" }, { id: "rain", label: "Rain" }, { id: "night", label: "Lights out" }];

  var canvas, ctx, W = 0, H = 0, dpr = 1, raf = 0, last = 0, U = 1;
  var running = false, paused = false, over = false, twoP = false;
  var t = 0, floorY = 0, rimY = 0, rimHalf = 0, gravity = 0, round = 0, oppIdx = 0, opp = TEAMS[0];
  var score = [0, 0], streak = 0, bestStreak = 0, totalPts = 0, best = { streak: 0 }, board = [], pendingScore = null, newBest = false;   // totalPts = your baskets across the run (board tie-break)
  var loosFor = 0, sinceBasket = 0, shots = [0, 0], makes = [0, 0], lastScorer = 1, frames = 0, lastShots = [];   // lastShots: the last 12 shots for peek()   // seconds since anyone last held the ball · per-side shot counts (peek)
  var ball, teams = [], rules = null, ruleCard = 0, ruleText = "", freeze = 0, banner = "", bannerT = 0, clock = SHOT_CLOCK, lastTouch = -1, stuck = 0, matchOver = "";
  var particles = [], flakes = [], logos = {}, seed = 7;
  var soundOn = false, actx = null, reducedMotion = false, bridge = null, ui = {}, roster = null;

  function el(id) { return document.getElementById(id); }
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ellipse(x, y, rx, ry) { if (ctx.ellipse) { ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); } else { ctx.arc(x, y, (rx + ry) / 2, 0, Math.PI * 2); } }
  function readBest() {
    best = { streak: 0 }; board = [];
    try { var raw = localStorage.getItem(KEY); if (raw) { var b = JSON.parse(raw); if (b && typeof b.streak === "number") { best = { streak: b.streak }; } } } catch (e) {}
    try { var rawB = localStorage.getItem(SCORES_KEY); if (rawB) { var arr = JSON.parse(rawB); if (Object.prototype.toString.call(arr) === "[object Array]") { board = arr.filter(function (s) { return s && typeof s.ini === "string" && typeof s.streak === "number"; }).slice(0, BOARD_MAX); } } } catch (e) { board = []; }
  }
  function writeBest() { try { localStorage.setItem(KEY, JSON.stringify(best)); } catch (e) {} }
  function writeBoard() { try { localStorage.setItem(SCORES_KEY, JSON.stringify(board)); } catch (e) {} }
  function betterThan(a, b) { return a.streak > b.streak || (a.streak === b.streak && (a.pts || 0) > (b.pts || 0)); }
  function qualifies(s) { return board.length < BOARD_MAX || betterThan(s, board[board.length - 1]); }
  function placeOf(s) { var i; for (i = 0; i < board.length; i += 1) { if (betterThan(s, board[i])) { return i; } } return board.length; }
  function loadLogo(abbr) { if (!logos[abbr] && bridge && bridge.logo) { var img = new Image(); logos[abbr] = img; img.src = bridge.logo(abbr); } }
  function drawLogo(abbr, x, y, size, alpha) {
    var img = logos[abbr]; if (!img || !img.complete || !img.naturalWidth) { return; }
    ctx.save(); ctx.globalAlpha = alpha; try { ctx.drawImage(img, x - size / 2, y - size / 2, size, size); } catch (e) {} ctx.restore();
  }
  /* The two best-rated players of a club from the ratings file the page already holds (bridge.players). */
  function duo(abbr) {
    var list = (roster && roster[abbr]) || FALLBACK[abbr] || FALLBACK.ANY;
    return [list[0], list[1] || list[0]];
  }
  function buildRoster() {
    roster = null;
    var all = bridge && bridge.players ? bridge.players() : null; if (!all || !all.length) { return; }
    roster = {};
    all.forEach(function (p) { if (!p || !p.team) { return; } (roster[p.team] = roster[p.team] || []).push(p); });
    var k; for (k in roster) { if (roster.hasOwnProperty(k)) { roster[k].sort(function (a, b) { return (b.ovr || 0) - (a.ovr || 0); }); roster[k] = roster[k].slice(0, 2); } }
  }

  /* ---------- sound (WebAudio bleeps; nothing plays until the switch is on) ---------- */
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
  function swish() { beep(1500, 60, "sine", 0.05); window.setTimeout(function () { beep(1900, 120, "sine", 0.05); }, 60); window.setTimeout(function () { beep(2400, 160, "sine", 0.04); }, 130); }
  function buzzer() { beep(180, 700, "sawtooth", 0.06); }
  function bounceSound(v) { if (v > 120 * U) { beep(160, 40, "triangle", Math.min(0.06, v / (4000 * U))); } }

  /* ---------- sizing ---------- */
  function resize() {
    var stage = el("hoopsStage"); if (!stage) { return; }
    var cw = stage.clientWidth, ch = Math.max(210, Math.min(Math.round(cw * 0.6), Math.round(window.innerHeight * 0.5)));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cw; H = ch; U = W / 358;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    floorY = H * 0.82; rimY = H * 0.40; rimHalf = 19 * U;   // a friendly rim: the ball is 10 U across
    flakes = []; var i; for (i = 0; i < 70; i += 1) { flakes.push({ x: Math.random(), y: Math.random(), v: 0.6 + Math.random() }); }
    if (teams.length) { placeAll(); }
    draw();
  }

  /* ---------- bodies ---------- */
  // A player is a circle for the physics (radius r) with a stick figure drawn on top. side 0 = you (attack the
  // right hoop), side 1 = them (attack the left). `bodyK` scales height; `head` scales the head.
  function makePlayer(side, idx, info, x) {
    var h = info.height || 78;
    return { side: side, idx: idx, info: info, x: x, y: 0, vy: 0, r: 18 * U, bodyK: 0.85 + (h - 72) / 40, head: 1, ground: true, hold: false, shootAt: -1, facing: side === 0 ? 1 : -1,
             speed: (150 + ((info.ovr || 78) - 70) * 4) * U, jumpV: (430 + ((info.dunk || 70) - 60) * 2.2) * U, acc: (info.threePt || 70), dunk: (info.dunk || 70), think: 0, wantJump: false, tilt: 0, run: 0 };
  }
  function placeAll(giveTo) {
    var i; for (i = 0; i < teams[0].length; i += 1) { var p = teams[0][i]; p.x = W * (0.28 + i * 0.12); p.y = floorY - p.r * p.bodyK; p.vy = 0; p.ground = true; p.hold = false; p.shootAt = -1; }
    for (i = 0; i < teams[1].length; i += 1) { var q = teams[1][i]; q.x = W * (0.72 - i * 0.12); q.y = floorY - q.r * q.bodyK; q.vy = 0; q.ground = true; q.hold = false; q.shootAt = -1; }
    ball.x = W / 2; ball.y = H * 0.25; ball.vx = 0; ball.vy = 0; ball.holder = null; ball.spin = 0; ball.lastThrow = -9; ball.thrower = null;
    if (giveTo === 0 || giveTo === 1) { ball.x = teams[giveTo][0].x; ball.y = H * 0.2; }   // the team that was scored on brings it in
  }
  function newRules(first) {
    rules = { ball: first ? BALLS[0] : pick(BALLS), grav: first ? GRAVS[0] : pick(GRAVS), body: first ? BODIES[0] : pick(BODIES), sky: first ? SKIES[0] : pick(SKIES) };
    gravity = 1500 * U * rules.grav.k;   // players; the ball has its own factor (a beach ball floats, the players do not)
    ball.r = 10 * U * rules.ball.r;
    var parts = [rules.ball.label, rules.grav.label, rules.body.label, rules.sky.label].filter(function (s) { return s; });
    ruleText = parts.length ? parts.join(" · ") : "Regular ball, regular gravity";
    ruleCard = first ? 0 : 1.6;
    teams.forEach(function (team) {
      team.forEach(function (p, i) {
        var h = p.info.height || 78, base = 0.85 + (h - 72) / 40;
        p.head = rules.body.id === "heads" ? 1.9 : 1;
        p.bodyK = rules.body.id === "tall" ? base * 1.45 : (rules.body.id === "short" ? base * 0.62 : (rules.body.id === "mixed" ? (i === 0 ? base * 1.45 : base * 0.62) : base));
        p.r = 18 * U;
      });
    });
  }
  function jumpVelocity(p) { return p.jumpV * Math.sqrt(rules.grav.k) * (rules.body.id === "short" || (rules.body.id === "mixed" && p.idx === 1) ? 1.15 : 1); }
  function hoopX(side) { return side === 0 ? W - 34 * U : 34 * U; }   // the hoop a side attacks

  /* ---------- the one button ---------- */
  function press(side) {
    if (!running || paused || over || freeze > 0) { return; }
    var team = teams[side], i;
    for (i = 0; i < team.length; i += 1) {
      var p = team[i];
      if (p.ground) { p.vy = -jumpVelocity(p); p.ground = false; }
      if (p.hold && p.shootAt < 0) { p.shootAt = t + 0.2; }   // the ball leaves near the top of the jump
    }
  }
  function release(p) {
    var ox = p.x + p.facing * p.r * 0.4, oy = p.y - p.r * p.bodyK - ball.r;   // the ball leaves from above the head — the arc must start where the ball starts
    var target = hoopX(p.side), dx = target - ox, dy = (rimY - 4 * U) - oy;
    var dist = Math.abs(dx), T = 0.55 + dist / (W * 1.1), g = gravity * rules.ball.g;
    // The arc must fit under the top of the court: cap the flight time so the apex stays on screen
    // (an early version lobbed everything into the ceiling and every shot fell short).
    var room = Math.max(10 * U, oy - ball.r - 6 * U), vmax = Math.sqrt(2 * g * room), Tcap = (vmax + Math.sqrt(vmax * vmax + 2 * g * dy)) / g;
    if (T > Tcap) { T = Tcap; }
    var vx = dx / T * (1 + 0.5 * (rules.ball.drag || 0.05) * T), vy = (dy - 0.5 * g * T * T) / T;   // a touch extra for the air
    // Accuracy: a 90+ three-point rating barely misses; a 60 sprays. Close to the rim the dunk rating takes over.
    var near = dist < 70 * U, skill = near ? p.dunk : p.acc, err = (100 - skill) / 100;
    if (p.side === 1 && !twoP) { err = err * 1.9 + 0.06; }   // the computer sprays a little: a 10-year-old should win some
    var noise = (Math.random() * 2 - 1) * err * (near ? 0.12 : 0.28) * (dist / W + 0.4);
    vx *= 1 + noise; vy *= 1 - noise * 0.6;
    ball.holder = null; ball.x = ox; ball.y = oy; ball.vx = vx; ball.vy = vy; ball.spin = p.facing * 12; ball.lastThrow = t; ball.thrower = p;
    p.hold = false; p.shootAt = -1; clock = SHOT_CLOCK; shots[p.side] += 1;
    ball.shot = { side: p.side, dist: Math.round(dist / U), ball: rules.ball.id, body: rules.body.id, grav: rules.grav.id, at: null, result: "" }; lastShots.push(ball.shot); if (lastShots.length > 12) { lastShots.shift(); }
    beep(520, 50, "triangle", 0.03);
  }
  function giveBall(p) { ball.holder = p; p.hold = true; ball.vx = 0; ball.vy = 0; lastTouch = p.side; clock = SHOT_CLOCK; }
  function loose(vx, vy) { if (ball.holder) { ball.holder.hold = false; ball.holder.shootAt = -1; ball.holder = null; } ball.vx = vx; ball.vy = vy; ball.lastThrow = t; ball.thrower = null; }

  /* ---------- CPU ---------- */
  function think(p, dt) {
    var mate = teams[p.side][1 - p.idx], target;
    p.think -= dt;
    if (p.hold) {
      var hx = hoopX(p.side), dist = Math.abs(hx - p.x), range = W * (0.16 + 0.16 * (p.acc - 60) / 40);
      target = hx - p.facing * 60 * U;
      if (p.think <= 0 && (dist < range || clock < 1.2) && p.ground) { press(p.side); p.think = 1.2 + Math.random() * 0.8; }
    } else if (ball.holder && ball.holder.side !== p.side) {
      var hd = ball.holder; target = hd.x + hd.facing * (p.idx === 0 ? 46 : 90) * U;   // the first defender gets in his face, the second guards the rim side
      if (Math.abs(hd.x - p.x) < 60 * U && p.think <= 0 && p.ground && Math.random() < 0.5) { p.vy = -jumpVelocity(p); p.ground = false; p.think = 0.8; }
    } else if (ball.holder) {
      target = hoopX(p.side) - p.facing * 110 * U;   // spread the floor for the teammate
    } else {
      target = ball.x + (p.idx === 1 ? (mate.x < ball.x ? 30 * U : -30 * U) : 0);
      if (ball.y < p.y - 20 * U && Math.abs(ball.x - p.x) < 40 * U && p.ground && p.think <= 0 && Math.random() < 0.35) { p.vy = -jumpVelocity(p) * 0.85; p.ground = false; p.think = 0.7; }
    }
    return target;
  }

  /* ---------- the loop ---------- */
  function cancel() { if (raf) { window.cancelAnimationFrame(raf); raf = 0; } }
  function isHidden() { return el("hoopsModal").hidden; }
  function loop() { cancel(); raf = window.requestAnimationFrame(frame); }
  function frame(now) {
    if (!running || paused || over || isHidden()) { raf = 0; return; }
    if (!last) { last = now; }
    var dt = Math.min(0.033, (now - last) / 1000); last = now; frames += 1;
    t += dt;
    if (ruleCard > 0) { ruleCard -= dt; }
    if (bannerT > 0) { bannerT -= dt; }
    if (freeze > 0) { freeze -= dt; if (freeze <= 0) { if (matchOver === "win") { nextOpponent(); } else if (matchOver === "loss") { endRun(); return; } else { placeAll(1 - lastScorer); } } draw(); raf = window.requestAnimationFrame(frame); return; }
    step(dt);
    draw();
    raf = window.requestAnimationFrame(frame);
  }
  function step(dt) {
    var i, s, p;
    // players
    for (s = 0; s < 2; s += 1) {
      for (i = 0; i < teams[s].length; i += 1) {
        p = teams[s][i];
        var human = s === 0 || twoP, target;
        if (human) {
          // Your two run on their own: toward the ball, or with the ball toward the hoop — you only jump/shoot.
          if (p.hold) { target = hoopX(s) - p.facing * 55 * U; }
          else if (ball.holder && ball.holder.side === s) { target = hoopX(s) - p.facing * 120 * U; }
          else { target = ball.x + (i === 1 ? -p.facing * 28 * U : 0); }
        } else { target = think(p, dt); }
        var dx = target - p.x, sp = p.speed * (p.hold ? 0.85 : 1) * (rules.body.id === "tall" ? 0.9 : 1);
        if (Math.abs(dx) > 4 * U) { p.x += Math.max(-sp * dt, Math.min(sp * dt, dx)); p.run += dt * 10; }
        p.facing = p.hold ? (hoopX(s) > p.x ? 1 : -1) : (dx > 0 ? 1 : -1);
        p.x = Math.max(p.r + 4 * U, Math.min(W - p.r - 4 * U, p.x));
        p.vy += gravity * dt; p.y += p.vy * dt;
        var gy = floorY - p.r * p.bodyK;
        if (p.y >= gy) { p.y = gy; p.vy = 0; p.ground = true; } else { p.ground = false; }
        p.tilt = lerp(p.tilt, (p.ground ? 0 : p.vy * 0.0004) + (p.hold ? 0.08 * p.facing : 0), 0.15);
        if (p.hold && p.shootAt >= 0 && t >= p.shootAt) { release(p); }
        if (p.hold) { ball.x = p.x + p.facing * p.r * 0.7; ball.y = p.y - p.r * p.bodyK * 0.55; }
      }
    }
    // nobody stands inside anybody: overlapping players on the floor are nudged apart
    var everyone = teams[0].concat(teams[1]), a, b;
    for (a = 0; a < everyone.length; a += 1) {
      for (b = a + 1; b < everyone.length; b += 1) {
        var pa = everyone[a], pb = everyone[b], sep = (pa.r + pb.r) * 0.75, ox = pb.x - pa.x;
        if (Math.abs(ox) < sep && Math.abs(pa.y - pb.y) < pa.r * 1.5) { var push = (sep - Math.abs(ox)) / 2 * (ox < 0 ? -1 : 1); if (ox === 0) { push = sep / 2; } pa.x -= push; pb.x += push; }
      }
    }
    // 25 s without a basket (a bowling ball parked on the rim, a football nobody can hold): jump ball, new rules
    sinceBasket += dt;
    if (sinceBasket > 25) { sinceBasket = 0; newRules(false); placeAll(); ruleText = "Jump ball! " + ruleText; ruleCard = 1.6; return; }
    // a ball nobody can reach for 7 s comes back to centre court (jump ball)
    if (ball.holder) { loosFor = 0; } else { loosFor += dt; if (loosFor > 7) { loosFor = 0; ball.x = W / 2; ball.y = H * 0.2; ball.vx = 0; ball.vy = 0; ball.lastThrow = -9; ball.thrower = null; ruleText = "Jump ball!"; ruleCard = 1; } }
    // shot clock: whoever holds it too long loses it
    if (ball.holder) { clock -= dt; if (clock <= 0) { var h = ball.holder; loose(-h.facing * 120 * U, -260 * U); beep(300, 200, "square", 0.04); } }
    // the ball
    if (!ball.holder) {
      ball.vy += gravity * rules.ball.g * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.spin += ball.vx * dt * 0.05;
      var drag = rules.ball.drag || 0.05; ball.vx -= ball.vx * drag * dt; ball.vy -= ball.vy * drag * 0.6 * dt;   // air: a beach ball settles fast
      if (rules.ball.wobble) { ball.vy += Math.sin(t * 17) * 40 * U * dt; }
      var e = rules.ball.e;
      if (ball.y + ball.r > floorY) { ball.y = floorY - ball.r; if (Math.abs(ball.vy) > 30 * U) { bounceSound(Math.abs(ball.vy)); } ball.vy = -ball.vy * e; ball.vx *= 0.985; if (Math.abs(ball.vy) < 25 * U) { ball.vy = 0; } }
      if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = -ball.vx * 0.7; }
      if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -ball.vx * 0.7; }
      if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = -ball.vy * 0.6; }
      hoopPhysics(0); hoopPhysics(1);
      // catching and knocking
      for (s = 0; s < 2; s += 1) {
        for (i = 0; i < teams[s].length; i += 1) {
          p = teams[s][i];
          var cx = p.x, cy = p.y - p.r * p.bodyK * 0.5, rr = p.r * 1.15 + ball.r, ddx = ball.x - cx, ddy = ball.y - cy;   // arms up: the reach is a little above the body
          if (ddx * ddx + ddy * ddy < rr * rr) {
            if (ball.thrower === p && t - ball.lastThrow < 0.5) { continue; }   // your own shot does not come back into your hands
            if (t - ball.lastThrow < 0.4) { continue; }                           // a shot just released is in flight for everyone
            if (ball.vy < -140 * U && t - ball.lastThrow < 1.2) { continue; }    // nobody plucks a rising shot out of the air
            giveBall(p); break;
          }
        }
        if (ball.holder) { break; }
      }
      // parked on the rim or the backboard: shake it loose
      if (Math.abs(ball.vx) < 40 * U && Math.abs(ball.vy) < 40 * U && ball.y + ball.r < floorY - 2 * U) { stuck += dt; if (stuck > 1.2) { ball.vx = (Math.random() < 0.5 ? -1 : 1) * 90 * U; ball.vy = -120 * U; stuck = 0; } } else { stuck = 0; }
    } else {
      // a jumping defender who lands on the holder knocks it loose
      var hd = ball.holder;
      for (i = 0; i < teams[1 - hd.side].length; i += 1) {
        var d = teams[1 - hd.side][i], ex = d.x - hd.x, ey = d.y - hd.y;
        if (!d.ground && d.vy > 0 && ex * ex + ey * ey < (d.r + hd.r) * (d.r + hd.r) * 0.8) { loose(-hd.facing * 160 * U * (0.5 + Math.random()), -300 * U); beep(240, 60, "square", 0.04); break; }
      }
    }
    // particles
    for (i = particles.length - 1; i >= 0; i -= 1) { var q = particles[i]; q.vy += 700 * U * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if (q.life <= 0) { particles.splice(i, 1); } }
  }
  // Rim = two small pegs the ball can hit; backboard = a wall; a ball dropping between the pegs is a basket.
  function hoopPhysics(side) {
    var hx = hoopX(side), dir = side === 0 ? 1 : -1;   // side 0's hoop is on the right, its backboard further right
    var bx = hx + dir * (rimHalf + 4 * U), pegs = [hx - rimHalf, hx + rimHalf], i;
    for (i = 0; i < 2; i += 1) {
      var px = pegs[i], py = rimY, dx = ball.x - px, dy = ball.y - py, rr = ball.r + 1.5 * U, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 0) {
        var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) { ball.vx -= 1.6 * dot * nx; ball.vy -= 1.6 * dot * ny; ball.vx *= 0.8; ball.vy *= 0.8; beep(900, 25, "square", 0.02); }
        ball.x = px + nx * rr; ball.y = py + ny * rr;
      }
    }
    // backboard: a vertical wall from above the rim to a bit below it
    var top = rimY - 60 * U, bot = rimY + 12 * U;
    if (ball.y > top && ball.y < bot) {
      if (dir === 1 && ball.x + ball.r > bx && ball.x < bx + 10 * U && ball.vx > 0) { ball.x = bx - ball.r; ball.vx = -ball.vx * 0.55; beep(700, 30, "square", 0.02); }
      if (dir === -1 && ball.x - ball.r < bx && ball.x > bx - 10 * U && ball.vx < 0) { ball.x = bx + ball.r; ball.vx = -ball.vx * 0.55; beep(700, 30, "square", 0.02); }
    }
    if (ball.shot && ball.shot.side === side && ball.shot.at === null && ball.vy > 0 && ball.y > rimY && ball.y - ball.vy * 0.02 <= rimY + ball.r) { ball.shot.at = Math.round((ball.x - hx) / U); }
    // the basket: through the rim, moving down, centre between the pegs
    if (ball.vy > 0 && ball.y - ball.vy * 0.016 <= rimY && ball.y > rimY && Math.abs(ball.x - hx) < rimHalf - ball.r * 0.5 && ball.r < rimHalf) {
      basket(side);
    }
  }
  function basket(side) {
    // side = whose hoop it is (the side that ATTACKS it scores); an own-basket counts for the other team, like real life
    var scorer = side, pts = 1;
    if (ball.thrower && ball.thrower.side === side && Math.abs(ball.thrower.x - hoopX(side)) > W * 0.42) { pts = 2; }   // from way downtown
    score[scorer] += pts; if (scorer === 0) { totalPts += pts; } makes[scorer] += 1; lastScorer = scorer; sinceBasket = 0; if (ball.shot) { ball.shot.result = "in"; } freeze = 1.3; matchOver = "";
    banner = scorer === 0 ? (pts === 2 ? "FROM DOWNTOWN!" : (ball.thrower && Math.abs(ball.thrower.x - hoopX(0)) < 70 * U ? "SLAM!" : "SWISH!")) : opp.name + " SCORE";
    bannerT = 1.3; swish(); confetti(hoopX(side), rimY, scorer === 0 ? HOME.colors[1] : opp.colors[0]);
    ball.vx = 0; ball.vy = 0; ball.thrower = null;
    if (score[scorer] >= TO_WIN) {
      matchOver = scorer === 0 ? "win" : "loss"; freeze = 2.2;
      if (scorer === 0) { streak += 1; if (streak > bestStreak) { bestStreak = streak; } banner = "PACERS WIN " + score[0] + "–" + score[1] + "!"; buzzer(); }
      else { banner = opp.name + " WIN " + score[1] + "–" + score[0]; buzzer(); }
      bannerT = 2.2;
    } else { window.setTimeout(function () { if (running && !over) { newRules(false); } }, 900); }
    hud();
  }
  function confetti(x, y, c) { if (reducedMotion) { return; } var i; for (i = 0; i < 26; i += 1) { var a = Math.random() * Math.PI * 2, v = (80 + Math.random() * 160) * U; particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100 * U, life: 0.8 + Math.random() * 0.6, c: Math.random() < 0.35 ? "#ffffff" : c }); } }
  function nextOpponent() {
    oppIdx += 1; opp = TEAMS[oppIdx % TEAMS.length]; loadLogo(opp.abbr);
    score = [0, 0]; round += 1;
    teams[1] = [makePlayer(1, 0, duo(opp.abbr)[0], W * 0.72), makePlayer(1, 1, duo(opp.abbr)[1], W * 0.6)];
    newRules(true); placeAll(0); ruleCard = 1.4; ruleText = "Game " + (oppIdx + 1) + " · " + opp.name + " come to town"; hud();
  }

  /* ---------- HUD, overlay, board ---------- */
  function hud() {
    ui.score.textContent = "IND " + score[0] + " · " + opp.abbr + " " + score[1];
    ui.streak.textContent = "Streak " + streak;
    ui.best.textContent = "Best " + Math.max(best.streak, bestStreak) + (Math.max(best.streak, bestStreak) === 1 ? " win" : " wins");
    ui.drive.textContent = "Game " + (oppIdx + 1) + " · Pacers vs " + opp.name.charAt(0) + opp.name.slice(1).toLowerCase() + " · first to " + TO_WIN + (twoP ? " · 2 players" : "");
    ui.pause.textContent = paused ? "Resume" : "Pause";
    ui.pause.disabled = !running || over;
    ui.jump.textContent = (!running || over) ? "TAP TO START" : (paused ? "RESUME" : "JUMP / SHOOT");
  }
  function renderBoard(preview) {
    var list = ui.boardList, rows = board.slice(0), i, you = -1;
    while (list.firstChild) { list.removeChild(list.firstChild); }
    if (preview) { you = placeOf(preview); rows.splice(you, 0, preview); rows = rows.slice(0, BOARD_MAX); }
    else if (pendingScore) { you = pendingScore.placed; }
    if (!rows.length) { var li0 = document.createElement("li"); li0.className = "board-empty"; li0.appendChild(document.createTextNode("No streaks yet — be the first on the board.")); list.appendChild(li0); return; }
    for (i = 0; i < rows.length; i += 1) {
      var s = rows[i], li = document.createElement("li");
      if (i === you) { li.className = "board-you"; }
      var rank = document.createElement("span"); rank.className = "board-rank"; rank.appendChild(document.createTextNode(String(i + 1)));
      var ini = document.createElement("span"); ini.className = "board-ini"; ini.appendChild(document.createTextNode(s.ini || "___"));
      var sc = document.createElement("span"); sc.className = "board-score"; sc.appendChild(document.createTextNode(s.streak + (s.streak === 1 ? " win" : " wins") + " · " + (s.pts || 0) + " pts"));
      li.appendChild(rank); li.appendChild(ini); li.appendChild(sc); list.appendChild(li);
    }
  }
  function overlay(kind) {
    var box = ui.overlay, title = ui.overlayTitle, copy = ui.overlayCopy, btn = ui.overlayBtn;
    ui.initials.hidden = kind !== "initials";
    if (kind === "ready" || kind === "over" || kind === "initials") { ui.boardWrap.hidden = false; ui.scores.setAttribute("aria-expanded", "true"); }
    if (!kind) { box.hidden = true; return; }
    box.hidden = false;
    if (kind === "ready") { title.textContent = "Janafari Jam"; copy.textContent = "Two-on-two, one button. Tap to jump; tap with the ball to shoot. Your two Pacers run on their own — you time the jumps. Every basket changes the rules: beach balls, bowling balls, moon gravity, giants, big heads. First to " + TO_WIN + " wins. Beat a team and the next one comes to town; lose once and your streak goes on the board."; btn.textContent = "Tip-off"; renderBoard(null); }
    else if (kind === "paused") { title.textContent = "Timeout"; copy.textContent = "Take a breath. The score is safe."; btn.textContent = "Resume"; }
    else if (kind === "initials") {
      title.textContent = "FINAL — " + streak + (streak === 1 ? " WIN" : " WINS") + " IN A ROW"; copy.textContent = lossLine() + " It makes the board — initials?"; btn.textContent = "Play again";
      ui.iniInput.value = ""; renderBoard({ ini: "", streak: streak, pts: totalPts }); window.setTimeout(function () { try { ui.iniInput.focus(); } catch (e) {} }, 40); return;
    }
    else if (kind === "over") { title.textContent = "FINAL — " + streak + (streak === 1 ? " WIN" : " WINS") + " IN A ROW"; copy.textContent = (newBest ? "NEW BEST STREAK! " : "") + lossLine(); btn.textContent = "Play again"; renderBoard(null); }
    window.setTimeout(function () { try { btn.focus(); } catch (e) {} }, 30);
  }
  function lossLine() {
    var who = opp.name.charAt(0) + opp.name.slice(1).toLowerCase();
    if (streak === 0) { return "The " + who + " got you " + score[1] + "–" + score[0] + ". Tap when the ball is near your player — and shoot from closer in until you find the range."; }
    return "The " + who + " ended it " + score[1] + "–" + score[0] + " after " + streak + (streak === 1 ? " win." : " straight wins.");
  }
  function saveInitials() {
    var ini = String(ui.iniInput.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
    if (!ini) { ini = "JAN"; }
    var s = { ini: ini, streak: streak, pts: totalPts, date: new Date().toISOString().slice(0, 10) }, placed = placeOf(s);
    board.splice(placed, 0, s); board = board.slice(0, BOARD_MAX); writeBoard();
    pendingScore = { placed: placed }; beep(1046, 80, "triangle"); window.setTimeout(function () { beep(1318, 160, "triangle"); }, 90);
    overlay("over"); ui.overlayCopy.textContent = "Saved: " + ini + " · #" + (placed + 1) + " on the board. " + lossLine();
  }
  function endRun() {
    over = true; cancel(); newBest = false;
    if (streak > best.streak) { best.streak = streak; writeBest(); newBest = true; }
    var s = { ini: "", streak: streak, pts: totalPts };
    if (streak > 0 && qualifies(s)) { overlay("initials"); } else { overlay("over"); }
    hud(); draw();
  }

  function start() {
    if (running && !over) { return; }
    buildRoster();
    running = true; over = false; paused = false; t = 0; streak = 0; bestStreak = 0; totalPts = 0; sinceBasket = 0; loosFor = 0; shots = [0, 0]; makes = [0, 0]; oppIdx = 0; opp = TEAMS[0]; score = [0, 0]; round = 0; pendingScore = null; particles = []; freeze = 0; matchOver = ""; banner = ""; bannerT = 0;
    ball = { x: 0, y: 0, vx: 0, vy: 0, r: 11 * U, holder: null, spin: 0, lastThrow: -9, thrower: null };
    var mine = duo(HOME_ABBR), theirs = duo(opp.abbr);
    teams = [[makePlayer(0, 0, mine[0], W * 0.28), makePlayer(0, 1, mine[1], W * 0.4)], [makePlayer(1, 0, theirs[0], W * 0.72), makePlayer(1, 1, theirs[1], W * 0.6)]];
    loadLogo(HOME.abbr); loadLogo(opp.abbr);
    newRules(true); placeAll(0); ruleCard = 1.4; ruleText = "Game 1 · " + opp.name + " at Indianapolis";   // the home team gets the tip
    overlay(null); hud(); last = 0; loop(); beep(660, 90, "triangle");
  }
  function pause() { if (!running || over) { return; } paused = true; cancel(); overlay("paused"); hud(); }
  function resume() { if (!running || !paused || over) { return; } paused = false; overlay(null); hud(); last = 0; loop(); }

  /* ---------- drawing ---------- */
  function draw() {
    if (!ctx) { return; }
    var night = rules && rules.sky.id === "night", snow = rules && rules.sky.id === "snow", rain = rules && rules.sky.id === "rain", i;
    // arena wall in the opponent's colour, with a crowd band
    ctx.fillStyle = night ? "#05101f" : "#0b2340"; ctx.fillRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, 0, floorY); g.addColorStop(0, night ? "#05101f" : opp.colors[0]); g.addColorStop(1, night ? "#0b1a30" : "#0b2340");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, floorY);
    // crowd: two rows of dots
    for (i = 0; i < 2; i += 1) {
      var y0 = H * (0.14 + i * 0.09), n = Math.floor(W / (9 * U)), k;
      for (k = 0; k < n; k += 1) { var rx = k * 9 * U + ((k + i) % 2) * 4 * U; ctx.fillStyle = night ? "rgba(255,255,255,.08)" : ((k * 7 + i * 3) % 5 === 0 ? opp.colors[1] : "rgba(255,255,255," + (0.35 + ((k * 13) % 4) / 10) + ")"); ctx.beginPath(); ctx.arc(rx, y0 + ((k * 5) % 3) * U, 3.2 * U, 0, Math.PI * 2); ctx.fill(); }
    }
    // scoreboard banner
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(W * 0.5 - 62 * U, 6 * U, 124 * U, 18 * U);
    ctx.fillStyle = "#fff"; ctx.font = "bold " + (11 * U) + "px 'Courier New', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("IND " + score[0] + "   " + opp.abbr + " " + score[1], W * 0.5, 15 * U);
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = "bold " + (8 * U) + "px 'Courier New', monospace"; ctx.fillText(opp.city.toUpperCase(), W * 0.5, 30 * U);
    // spotlights when the lights are out
    if (night) { ctx.fillStyle = "rgba(255,255,220,.06)"; for (i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.moveTo(W * (0.2 + i * 0.3), 0); ctx.lineTo(W * (0.05 + i * 0.3), floorY); ctx.lineTo(W * (0.35 + i * 0.3), floorY); ctx.closePath(); ctx.fill(); } }
    // the floor: hardwood with the home key and centre circle
    ctx.fillStyle = "#c98a4b"; ctx.fillRect(0, floorY, W, H - floorY);
    ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = 1; for (i = 0; i < W; i += 14 * U) { ctx.beginPath(); ctx.moveTo(i, floorY); ctx.lineTo(i, H); ctx.stroke(); }
    ctx.fillStyle = HOME.colors[0]; ctx.globalAlpha = 0.85; ctx.fillRect(0, floorY, W, 3 * U); ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2 * U; ctx.beginPath(); ellipse(W / 2, floorY + (H - floorY) * 0.5, 34 * U, 6 * U); ctx.stroke();
    drawLogo(HOME.abbr, W / 2, floorY + (H - floorY) * 0.5, 22 * U, 0.55);
    // hoops
    drawHoop(0); drawHoop(1);
    // players (far side first so the ball handler reads on top)
    var all = teams[0].concat(teams[1]).slice(0); all.sort(function (a, b) { return (a.hold ? 1 : 0) - (b.hold ? 1 : 0); });
    for (i = 0; i < all.length; i += 1) { drawPlayer(all[i]); }
    if (ball) { drawBall(); }
    // weather
    if (snow || rain) {
      ctx.fillStyle = snow ? "rgba(255,255,255,.85)" : "rgba(180,200,255,.5)";
      for (i = 0; i < flakes.length; i += 1) { var f = flakes[i]; var fy = ((f.y + t * f.v * (snow ? 0.08 : 0.5)) % 1) * floorY, fx = (f.x + (snow ? Math.sin(t + i) * 0.01 : 0)) * W; if (snow) { ctx.beginPath(); ctx.arc(fx, fy, 1.6 * U * f.v, 0, Math.PI * 2); ctx.fill(); } else { ctx.fillRect(fx, fy, 1 * U, 7 * U); } }
    }
    // confetti
    for (i = 0; i < particles.length; i += 1) { var q = particles[i]; ctx.globalAlpha = Math.max(0, Math.min(1, q.life)); ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, 4 * U, 4 * U); }
    ctx.globalAlpha = 1;
    // shot clock while someone holds the ball
    if (ball && ball.holder && running && !over) { ctx.fillStyle = clock < 3 ? "#ff5a36" : "rgba(255,255,255,.75)"; ctx.font = "bold " + (12 * U) + "px 'Courier New', monospace"; ctx.textAlign = "right"; ctx.fillText(Math.ceil(clock) + "", W - 8 * U, 15 * U); }
    // banner and the rule card
    if (bannerT > 0 && banner) { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, H * 0.3, W, 34 * U); ctx.fillStyle = "#fdbb30"; ctx.font = "900 " + (20 * U) + "px 'Arial Narrow', Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText(banner, W / 2, H * 0.3 + 17 * U); }
    if (ruleCard > 0 && ruleText) { ctx.fillStyle = "rgba(253,187,48,.92)"; ctx.fillRect(W * 0.5 - 90 * U, H * 0.55, 180 * U, 24 * U); ctx.fillStyle = "#0b1f3a"; ctx.font = "bold " + (10 * U) + "px Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText(ruleText, W / 2, H * 0.55 + 12 * U); }
  }
  function drawHoop(side) {
    var hx = hoopX(side), dir = side === 0 ? 1 : -1, bx = hx + dir * (rimHalf + 4 * U);
    // pole + backboard
    ctx.fillStyle = "#8b96a5"; ctx.fillRect(bx + dir * 2 * U - 2 * U, rimY - 10 * U, 4 * U, floorY - rimY + 10 * U);
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(bx - (dir === 1 ? 0 : 5 * U), rimY - 60 * U, 5 * U, 72 * U);
    ctx.strokeStyle = side === 0 ? HOME.colors[1] : opp.colors[1]; ctx.lineWidth = 1.5 * U; ctx.strokeRect(bx - (dir === 1 ? 0 : 5 * U) - dir * 1 * U, rimY - 22 * U, 5 * U, 22 * U);
    // rim + net
    ctx.strokeStyle = "#ff6a2b"; ctx.lineWidth = 3 * U; ctx.beginPath(); ctx.moveTo(hx - rimHalf, rimY); ctx.lineTo(hx + rimHalf, rimY); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 1 * U; var i;
    for (i = 0; i <= 4; i += 1) { var x0 = hx - rimHalf + (rimHalf * 2) * i / 4, x1 = hx - rimHalf * 0.6 + (rimHalf * 1.2) * i / 4; ctx.beginPath(); ctx.moveTo(x0, rimY); ctx.lineTo(x1, rimY + 18 * U); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(hx - rimHalf * 0.6, rimY + 18 * U); ctx.lineTo(hx + rimHalf * 0.6, rimY + 18 * U); ctx.stroke();
  }
  function drawPlayer(p) {
    var colors = p.side === 0 ? HOME.colors : opp.colors, hK = p.bodyK, headR = 7 * U * p.head, bodyH = 22 * U * hK, legH = 14 * U * hK;
    var x = p.x, baseY = p.y + p.r * hK, hipY = baseY - legH, shoulderY = hipY - bodyH, headY = shoulderY - headR - 2 * U;
    var swing = p.ground && Math.abs(p.run) > 0 ? Math.sin(p.run) : 0, air = !p.ground;
    ctx.save(); ctx.translate(x, baseY); ctx.rotate(p.tilt); ctx.translate(-x, -baseY);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // legs
    ctx.strokeStyle = "#e0b08a"; ctx.lineWidth = 4 * U;
    ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x + (air ? -6 * U : swing * 8 * U), baseY); ctx.moveTo(x, hipY); ctx.lineTo(x + (air ? 6 * U : -swing * 8 * U), baseY); ctx.stroke();
    // shorts
    ctx.fillStyle = colors[0]; ctx.fillRect(x - 7 * U, hipY - 6 * U, 14 * U, 8 * U);
    // jersey
    ctx.fillStyle = colors[0]; ctx.beginPath(); ctx.moveTo(x - 8 * U, shoulderY); ctx.lineTo(x + 8 * U, shoulderY); ctx.lineTo(x + 7 * U, hipY - 4 * U); ctx.lineTo(x - 7 * U, hipY - 4 * U); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = colors[1]; ctx.lineWidth = 1.2 * U; ctx.stroke();
    ctx.fillStyle = colors[1]; ctx.font = "bold " + Math.max(6, 7 * U * Math.min(1.4, hK)) + "px Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(p.info.jersey || ""), x, shoulderY + bodyH * 0.45);
    // arms: up when in the air or holding, swinging when running
    ctx.strokeStyle = "#e0b08a"; ctx.lineWidth = 3.5 * U;
    var ax = p.facing;
    if (air || p.hold) { ctx.beginPath(); ctx.moveTo(x - 7 * U, shoulderY + 2 * U); ctx.lineTo(x - 12 * U, shoulderY - 12 * U * hK); ctx.moveTo(x + 7 * U, shoulderY + 2 * U); ctx.lineTo(x + ax * 12 * U, shoulderY - 12 * U * hK); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(x - 7 * U, shoulderY + 2 * U); ctx.lineTo(x - 7 * U - swing * 7 * U, shoulderY + 12 * U); ctx.moveTo(x + 7 * U, shoulderY + 2 * U); ctx.lineTo(x + 7 * U + swing * 7 * U, shoulderY + 12 * U); ctx.stroke(); }
    // head
    ctx.fillStyle = "#e0b08a"; ctx.beginPath(); ctx.arc(x, headY, headR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = colors[0]; ctx.beginPath(); ctx.arc(x, headY - headR * 0.35, headR * 0.95, Math.PI, Math.PI * 2); ctx.fill();   // headband/hair
    ctx.fillStyle = "#1b1006"; ctx.beginPath(); ctx.arc(x + ax * headR * 0.35, headY, headR * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // name over the head
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "bold " + (7 * U) + "px Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(String(p.info.name || "").split(" ").pop().toUpperCase(), x, headY - headR - 3 * U);
  }
  function drawBall() {
    var b = ball, id = rules ? rules.ball.id : "ball";
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin);
    if (id === "beach") { var i; for (i = 0; i < 6; i += 1) { ctx.fillStyle = ["#ff5a36", "#fff", "#2f80ed", "#fff", "#f9c80e", "#fff"][i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, b.r, i * Math.PI / 3, (i + 1) * Math.PI / 3); ctx.closePath(); ctx.fill(); } }
    else if (id === "bowling") { ctx.fillStyle = "#1b1b2b"; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#444"; ctx.beginPath(); ctx.arc(-b.r * 0.3, -b.r * 0.2, b.r * 0.12, 0, Math.PI * 2); ctx.arc(b.r * 0.05, -b.r * 0.4, b.r * 0.12, 0, Math.PI * 2); ctx.fill(); }
    else if (id === "football") { ctx.fillStyle = "#8a4b25"; ctx.beginPath(); ellipse(0, 0, b.r * 1.35, b.r * 0.85); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.2 * U; ctx.beginPath(); ctx.moveTo(-b.r * 0.5, 0); ctx.lineTo(b.r * 0.5, 0); ctx.stroke(); }
    else {
      ctx.fillStyle = "#e8792b"; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1b1006"; ctx.lineWidth = Math.max(1, 1.1 * U); ctx.beginPath(); ctx.moveTo(-b.r, 0); ctx.lineTo(b.r, 0); ctx.moveTo(0, -b.r); ctx.lineTo(0, b.r); ctx.stroke();
      ctx.beginPath(); ctx.arc(-b.r * 1.1, 0, b.r * 0.9, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke(); ctx.beginPath(); ctx.arc(b.r * 1.1, 0, b.r * 0.9, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- wiring ---------- */
  function onVisibility() { if (document.hidden && running && !paused && !over) { pause(); } }
  function onKey(e) {
    if (isHidden()) { return; }
    var tg = e.target, k = e.keyCode;
    if (tg === ui.iniInput) { if (k === 13) { e.preventDefault(); saveInitials(); } return; }
    if ((k === 32 || k === 87 || k === 38) && tg && tg !== document.body && tg !== canvas && tg !== ui.jump && /^(BUTTON|INPUT|SELECT|A)$/.test(tg.tagName) && k !== 38) { return; }
    if (k === 32 || k === 87) { if (!running || over) { if (!ui.initials.hidden) { return; } e.preventDefault(); start(); } else if (paused) { e.preventDefault(); resume(); } else { e.preventDefault(); press(0); } }
    else if (k === 38) { e.preventDefault(); if (twoP && running && !paused && !over) { press(1); } else if (running && !over && !paused) { press(0); } }
    else if (k === 80) { e.preventDefault(); if (paused) { resume(); } else { pause(); } }
  }
  function bindOnce() {
    if (ui.bound) { return; }
    ui.bound = true;
    canvas = el("hoopsCanvas"); ctx = canvas.getContext("2d");
    ui.score = el("hoopsScore"); ui.streak = el("hoopsStreak"); ui.best = el("hoopsBest"); ui.drive = el("hoopsDrive");
    ui.jump = el("hoopsJump"); ui.pause = el("hoopsPause"); ui.restart = el("hoopsRestart"); ui.sound = el("hoopsSound"); ui.exit = el("hoopsExit"); ui.two = el("hoopsTwo");
    ui.overlay = el("hoopsOverlay"); ui.overlayTitle = el("hoopsOverlayTitle"); ui.overlayCopy = el("hoopsOverlayCopy"); ui.overlayBtn = el("hoopsOverlayBtn");
    ui.initials = el("hoopsInitials"); ui.iniInput = el("hoopsIni"); ui.iniSkip = el("hoopsIniSkip"); ui.iniSave = el("hoopsIniSave"); ui.boardWrap = el("hoopsBoard"); ui.boardList = el("hoopsBoardList"); ui.scores = el("hoopsScores");
    var press0 = function (e) { if (e && e.preventDefault && e.type === "touchstart") { e.preventDefault(); } if (!ui.initials.hidden) { return; } if (!running || over) { running = false; start(); } else if (paused) { resume(); } else { press(0); } };
    var stageTap = function (e) {
      if (e && e.preventDefault && e.type === "touchstart") { e.preventDefault(); }
      if (!ui.initials.hidden) { return; }
      if (!running || over) { running = false; start(); return; }
      if (paused) { resume(); return; }
      if (twoP) {   // two players on one screen: left half is you, right half is them
        var rect = canvas.getBoundingClientRect(), px = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX) - rect.left;
        press(px < rect.width / 2 ? 0 : 1);
      } else { press(0); }
    };
    ui.jump.addEventListener("touchstart", press0); ui.jump.addEventListener("mousedown", press0);
    ui.jump.addEventListener("keydown", function (e) { if (e.keyCode === 13) { e.preventDefault(); press0(); } });
    canvas.addEventListener("touchstart", stageTap); canvas.addEventListener("mousedown", stageTap);
    ui.pause.addEventListener("click", function () { if (paused) { resume(); } else { pause(); } });
    ui.restart.addEventListener("click", function () { running = false; start(); });
    ui.two.addEventListener("click", function () { twoP = !twoP; ui.two.setAttribute("aria-pressed", twoP ? "true" : "false"); ui.two.textContent = twoP ? "2 players: on" : "2 players: off"; hud(); });
    ui.overlayBtn.addEventListener("click", function () { if (paused && running && !over) { resume(); } else { running = false; start(); } });
    ui.iniSave.addEventListener("click", saveInitials);
    ui.overlay.addEventListener("click", function (e) { if (e.target === ui.overlay && ui.initials.hidden) { if (paused && running && !over) { resume(); } else if (!running || over) { running = false; start(); } } });
    ui.iniSkip.addEventListener("click", function () { pendingScore = null; overlay("over"); });
    ui.scores.addEventListener("click", function () { var show = ui.boardWrap.hidden; if (show) { renderBoard(null); } ui.boardWrap.hidden = !show; ui.scores.setAttribute("aria-expanded", show ? "true" : "false"); });
    ui.iniInput.addEventListener("input", function () { this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3); renderBoard({ ini: this.value, streak: streak, pts: totalPts }); });
    ui.sound.addEventListener("click", function () { soundOn = !soundOn; ui.sound.setAttribute("aria-pressed", soundOn ? "true" : "false"); ui.sound.textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off"; if (soundOn) { beep(660, 60, "triangle"); } });
    ui.exit.addEventListener("click", function () { if (bridge) { bridge.close("hoopsModal"); } });
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", function () { if (!isHidden()) { resize(); } });
    try { reducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { reducedMotion = false; }
  }
  function open(opener, api) {
    bridge = api; bindOnce(); readBest(); buildRoster();
    running = false; paused = false; over = false; particles = []; score = [0, 0]; streak = 0; oppIdx = 0; opp = TEAMS[0]; pendingScore = null; banner = ""; bannerT = 0; ruleCard = 0;
    loadLogo(HOME.abbr); loadLogo(opp.abbr);
    ball = { x: 0, y: 0, vx: 0, vy: 0, r: 11 * U, holder: null, spin: 0, lastThrow: -9, thrower: null };
    var mine = duo(HOME_ABBR), theirs = duo(opp.abbr);
    teams = [[makePlayer(0, 0, mine[0], 0), makePlayer(0, 1, mine[1], 0)], [makePlayer(1, 0, theirs[0], 0), makePlayer(1, 1, theirs[1], 0)]];
    rules = { ball: BALLS[0], grav: GRAVS[0], body: BODIES[0], sky: SKIES[0] }; gravity = 1500 * U;
    bridge.show("hoopsModal", opener);
    window.setTimeout(function () { resize(); placeAll(); hud(); overlay("ready"); draw(); }, 40);
  }
  function stop() { cancel(); running = false; paused = false; particles = []; try { if (actx && actx.suspend) { actx.suspend(); } } catch (e) {} }
  // peek() is for tests and reviewers: a read-only snapshot of the match (the page never calls it).
  function peek() { return { lastShots: lastShots, frames: frames, matchOver: matchOver, holder: ball && ball.holder ? ball.holder.info.name : "", clock: clock, shots: shots, makes: makes, running: running, paused: paused, over: over, score: score.slice(0), streak: streak, opp: opp.abbr, rules: rules, ball: ball ? { x: ball.x, y: ball.y, held: !!ball.holder } : null, players: teams.length ? teams[0].concat(teams[1]).map(function (p) { return { side: p.side, x: Math.round(p.x), y: Math.round(p.y), vy: Math.round(p.vy), ground: p.ground, hold: p.hold, shootAt: p.shootAt, bodyK: Math.round(p.bodyK * 100) / 100, name: p.info.name }; }) : [] }; }
  window.JanafariHoops = { open: open, stop: stop, peek: peek };
}());

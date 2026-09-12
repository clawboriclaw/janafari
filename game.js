/* End Zone Run — Janafari's one-button football mini-game.
   Loaded lazily by app.js the first time someone taps Play; nothing here runs on the ratings page.
   Canvas 2D, ES5, no assets: the player, defenders and cones are drawn with paths.
   Rules of the house: the loop only runs while the sheet is open AND the game is running; the tab
   going hidden pauses it; Exit stops the loop and any sound; sound is OFF until the switch is
   pressed; best distance lives in its own key (janafari-ezr-best-v1) with best-effort writes;
   reduced-motion requests get no confetti and no screen flash. */
(function () {
  "use strict";
  var BEST_KEY = "janafari-ezr-best-v1";
  var YARDS_TOTAL = 100;
  var GROUND = 0.72;          // ground line as a fraction of canvas height
  var LIVES = 3;

  var canvas, ctx, W = 0, H = 0, dpr = 1, raf = 0, last = 0;
  var U = 1;                  // size unit: everything scales with canvas width so a phone and an iPad play the same game
  var PPY = 60;               // pixels per yard (W/6): the field and the obstacles move at ONE speed, so nothing skates
  var lastMiss = "";          // "early" (landed on it) or "late" (ran into it) — the loss screen coaches the right way
  var running = false, paused = false, over = false, won = false;
  var yards = 0, speed = 0, lives = LIVES, t = 0, best = 0, spawnAt = 0, hurt = 0;
  var player = { y: 0, vy: 0, jumps: 0 };
  var obs = [];               // {type:'cone'|'def', x, w, h, hit:false}
  var particles = [];
  var soundOn = false, actx = null;
  var reducedMotion = false;
  var bridge = null;          // {show, close, toast} from app.js
  var ui = {};

  function el(id) { return document.getElementById(id); }
  function readBest() { try { best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { best = 0; } }
  function writeBest() { try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} }

  /* ---------- sound: three short beeps from an oscillator, only when the switch is on ---------- */
  function beep(freq, ms, type) {
    if (!soundOn) { return; }
    try {
      if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) { return; } actx = new AC(); }
      if (actx.state === "suspended" && actx.resume) { actx.resume(); }
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || "square"; o.frequency.value = freq;
      g.gain.value = 0.05; o.connect(g); g.connect(actx.destination);
      var now = actx.currentTime; o.start(now); g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.0005, now + ms / 1000); o.stop(now + ms / 1000);
    } catch (e) {}
  }

  /* ---------- sizing ---------- */
  function resize() {
    var stage = el("gameStage"); if (!stage) { return; }
    var cw = stage.clientWidth, ch = Math.max(180, Math.min(Math.round(cw * 0.56), Math.round(window.innerHeight * 0.45)));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cw; H = ch; U = W / 358; PPY = W / 6;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  /* ---------- game state ---------- */
  function reset() {
    yards = 0; speed = 2.4 * PPY; lives = LIVES; t = 0; spawnAt = 3.0; hurt = 0; lastMiss = "";   // the first obstacle comes after three quiet seconds
    player.y = 0; player.vy = 0; player.jumps = 0;
    obs = []; particles = []; over = false; won = false; paused = false;
    hud();
  }
  function hud() {
    ui.yards.textContent = Math.floor(yards) + " yd";
    var hearts = "", i; for (i = 0; i < LIVES; i += 1) { hearts += i < lives ? "♥" : "♡"; }
    ui.lives.textContent = hearts; ui.lives.setAttribute("aria-label", lives + " chances left");
    ui.best.textContent = "Best " + best + " yd";
    ui.pause.textContent = paused ? "Resume" : "Pause";
    ui.pause.disabled = !running || over; ui.jump.disabled = false;
    ui.jump.textContent = (!running || over) ? "TAP TO START" : (paused ? "RESUME" : "JUMP");
  }
  function overlay(kind) {
    var box = ui.overlay, title = ui.overlayTitle, copy = ui.overlayCopy, btn = ui.overlayBtn;
    if (!kind) { box.hidden = true; return; }
    box.hidden = false;
    if (kind === "ready") { title.textContent = "End Zone Run"; copy.textContent = "Tap the big button to start. Then tap it (or press Space) to hop over cones and defenders. 100 yards is a touchdown. Three chances."; btn.textContent = "Start"; }
    else if (kind === "paused") { title.textContent = "Paused"; copy.textContent = "Take a breath. Your yards are safe."; btn.textContent = "Resume"; }
    else if (kind === "touchdown") { title.textContent = "TOUCHDOWN!"; copy.textContent = "100 yards. " + (newBest ? "New best!" : "Best is " + best + " yd."); btn.textContent = "Play again"; }
    else if (kind === "over") { title.textContent = "Tackled at " + Math.floor(yards) + " yards"; copy.textContent = (newBest ? "That's your best run yet. " : "") + (lastMiss === "early" ? "You jumped a little early — wait until it's closer." : "Jump a bit sooner next time."); btn.textContent = "Play again"; }
    window.setTimeout(function () { try { btn.focus(); } catch (e) {} }, 30);
  }

  function start() {
    if (running && !over) { return; }
    reset(); running = true; overlay(null); hud();
    last = 0; loop();
    beep(660, 90, "triangle");
  }
  function pause() {
    if (!running || over) { return; }
    paused = true; cancel(); overlay("paused"); hud();
  }
  function resume() {
    if (!running || !paused || over) { return; }
    paused = false; overlay(null); hud(); last = 0; loop();
  }
  function jump() {
    if (!running || paused || over) { return; }
    if (player.jumps < 1) { player.vy = -470 * U; player.jumps += 1; beep(880, 70, "square"); }
  }
  var newBest = false;
  function endRun(win) {
    over = true; won = win; cancel();
    var d = Math.floor(yards); newBest = d > best; if (newBest) { best = d; writeBest(); }
    if (win) { beep(523, 120, "triangle"); window.setTimeout(function () { beep(659, 120, "triangle"); }, 130); window.setTimeout(function () { beep(784, 220, "triangle"); }, 260); if (!reducedMotion) { burst(); } }
    else { beep(160, 220, "sawtooth"); }
    hud(); draw(); overlay(win ? "touchdown" : "over");
  }
  function burst() {
    var i; for (i = 0; i < 70; i += 1) { particles.push({ x: W * 0.5, y: H * 0.4, vx: (Math.random() - 0.5) * 500, vy: -Math.random() * 500, life: 1.2 + Math.random(), c: i % 3 === 0 ? "#fdbb30" : (i % 3 === 1 ? "#ffffff" : "#0057b8") }); }
    raf = window.requestAnimationFrame(confettiLoop); last = 0;
  }
  function confettiLoop(now) {
    if (!last) { last = now; }
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var alive = false, i;
    for (i = 0; i < particles.length; i += 1) { var p = particles[i]; p.life -= dt; if (p.life > 0) { alive = true; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } }
    draw();
    if (alive && !isHidden()) { raf = window.requestAnimationFrame(confettiLoop); } else { particles = []; raf = 0; draw(); }
  }
  function cancel() { if (raf) { window.cancelAnimationFrame(raf); raf = 0; } }
  function isHidden() { return el("gameModal").hidden; }

  /* ---------- the loop ---------- */
  function loop() { cancel(); raf = window.requestAnimationFrame(frame); }
  function frame(now) {
    if (!running || paused || over || isHidden()) { raf = 0; return; }
    if (!last) { last = now; }
    var dt = Math.min(0.04, (now - last) / 1000); last = now;
    t += dt;
    // pace: ~2.4 yards/s at the start, ~3.4 near the end → a run is about 35 s; an obstacle's approach time
    // goes from ~1.9 s to ~1.3 s on EVERY screen size because speed is yards × (W/6)
    var yps = 2.4 + (yards / YARDS_TOTAL) * 1.0;
    yards += yps * dt; speed = yps * PPY;
    // player physics (scaled with the canvas so the arc is the same shape on a phone and an iPad)
    player.vy += 1150 * U * dt; player.y += player.vy * dt;
    if (player.y > 0) { player.y = 0; player.vy = 0; player.jumps = 0; }
    if (hurt > 0) { hurt -= dt; }
    // obstacles
    spawnAt -= dt;
    if (spawnAt <= 0 && yards < YARDS_TOTAL - 6) {
      var def = yards > 25 && Math.random() < 0.45;
      obs.push({ type: def ? "def" : "cone", x: W + 40 * U, w: (def ? 30 : 18) * U, h: (def ? 44 : 22) * U, hit: false });
      spawnAt = Math.max(1.1, 2.6 - yards * 0.013) + Math.random() * 0.7;   // gentle at first, never faster than ~1.1 s apart
    }
    var i, px = W * 0.22, pw = 22 * U, ph = 40 * U, gy = H * GROUND;
    for (i = obs.length - 1; i >= 0; i -= 1) {
      var o = obs[i]; o.x -= speed * dt;
      if (o.x + o.w < -10) { obs.splice(i, 1); continue; }
      // forgiving boxes: the player's box is shrunk by a third, the obstacle's by a fifth
      var pl = px - pw / 2 + 4 * U, pr = px + pw / 2 - 4 * U, pt = gy - ph + player.y + 8 * U, pb = gy + player.y - 2 * U;
      var ol = o.x + o.w * 0.1, orr = o.x + o.w * 0.9, ot = gy - o.h + 3 * U;
      if (!o.hit && hurt <= 0 && pr > ol && pl < orr && pb > ot) {
        o.hit = true; lives -= 1; hurt = 1.2; lastMiss = player.y < -2 ? "early" : "late"; beep(200, 160, "sawtooth"); hud();
        if (lives <= 0) { endRun(false); return; }
      }
    }
    if (yards >= YARDS_TOTAL) { yards = YARDS_TOTAL; endRun(true); return; }
    hud(); draw();
    raf = window.requestAnimationFrame(frame);
  }

  /* ---------- drawing ---------- */
  function draw() {
    if (!ctx) { return; }
    var gy = H * GROUND, i, u = U;
    // sky, then the stands along the TOP edge (away from the sprites), then the field
    ctx.fillStyle = "#0b2a4f"; ctx.fillRect(0, 0, W, gy);
    ctx.fillStyle = "#143a66"; ctx.fillRect(0, 0, W, 22 * u);
    var so = (yards * PPY * 0.35) % (24 * u), k; ctx.fillStyle = "rgba(255,255,255,.14)";
    for (k = -1; k < W / (24 * u) + 1; k += 1) { ctx.fillRect(k * 24 * u - so, 6 * u, 10 * u, 5 * u); ctx.fillRect(k * 24 * u - so + 12 * u, 14 * u, 10 * u, 5 * u); }
    ctx.fillStyle = "#1f7a3a"; ctx.fillRect(0, gy, W, H - gy);
    // yard lines every 5 yards, numbers every 10 — the same PPY the obstacles use, so the grass never slides under them
    var step = 5 * PPY, off = (yards * PPY) % step, px0 = W * 0.22;
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2;
    for (i = -1; i < W / step + 2; i += 1) { var x = i * step - off; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "bold " + Math.round(11 * u) + "px Arial, sans-serif"; ctx.textAlign = "center";
    for (i = -1; i < W / step + 2; i += 1) { var xx = i * step - off, yd = Math.round(yards + (xx - px0) / PPY); if (yd >= 0 && yd <= 100 && yd % 10 === 0) { ctx.fillText(String(yd), xx, H - 6 * u); } }
    // end zone rolls in over the last yards
    var ezx = px0 + (YARDS_TOTAL - yards) * PPY;
    if (ezx < W + 20) { ctx.fillStyle = "#fdbb30"; ctx.fillRect(ezx, gy, W - ezx + 20, H - gy); ctx.fillStyle = "#041c38"; ctx.font = "bold " + Math.round(14 * u) + "px Arial, sans-serif"; ctx.fillText("END ZONE", Math.min(ezx + 60 * u, W - 40 * u), gy + 22 * u); }
    // obstacles: every shape gets a white outline so it reads on the grass in any colour vision
    ctx.lineWidth = 2 * u; ctx.strokeStyle = "#fff";
    for (i = 0; i < obs.length; i += 1) {
      var o = obs[i];
      if (o.type === "cone") {
        ctx.fillStyle = "#ff7a1a"; ctx.beginPath(); ctx.moveTo(o.x, gy); ctx.lineTo(o.x + o.w / 2, gy - o.h); ctx.lineTo(o.x + o.w, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.fillRect(o.x + 4 * u, gy - o.h * 0.45, o.w - 8 * u, 3 * u);
      } else {
        // a defender: wide stance, arms out, dark helmet — a different silhouette from the runner
        var cx = o.x + o.w / 2, top = gy - o.h;
        ctx.globalAlpha = o.hit ? 0.5 : 1;
        ctx.fillStyle = "#7a1f2b"; ctx.beginPath(); ctx.rect(cx - 8 * u, top + 12 * u, 16 * u, 18 * u); ctx.fill(); ctx.stroke();
        ctx.fillRect(o.x - 4 * u, top + 15 * u, o.w + 8 * u, 5 * u); ctx.strokeRect(o.x - 4 * u, top + 15 * u, o.w + 8 * u, 5 * u);
        ctx.fillStyle = "#333"; ctx.fillRect(cx - 9 * u, gy - 14 * u, 6 * u, 14 * u); ctx.fillRect(cx + 3 * u, gy - 14 * u, 6 * u, 14 * u);
        ctx.beginPath(); ctx.arc(cx, top + 5 * u, 7 * u, 0, Math.PI * 2); ctx.fillStyle = "#3a0d14"; ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.fillRect(cx - 7 * u, top + 6 * u, 14 * u, 2 * u);
        ctx.globalAlpha = 1;
      }
    }
    // the runner: gold jersey with the navy J, white outline, gold helmet — the brightest thing on the field
    var px = W * 0.22, ph = 40 * u, py = gy + player.y, blink = hurt > 0 && Math.floor(t * 12) % 2 === 0;
    if (!blink) {
      var swing = player.y ? 0 : Math.sin(yards * 6) * 6 * u;
      ctx.fillStyle = "#e8c39e"; ctx.fillRect(px - 8 * u, py - 12 * u, 5 * u, 12 * u + swing); ctx.fillRect(px + 3 * u, py - 12 * u, 5 * u, 12 * u - swing);
      ctx.fillStyle = "#fdbb30"; ctx.beginPath(); ctx.rect(px - 11 * u, py - ph + 12 * u, 22 * u, 18 * u); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#041c38"; ctx.font = "bold " + Math.round(12 * u) + "px Arial, sans-serif"; ctx.fillText("J", px, py - ph + 26 * u);
      ctx.beginPath(); ctx.arc(px, py - ph + 2 * u, 9 * u, 0, Math.PI * 2); ctx.fillStyle = "#fdbb30"; ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#041c38"; ctx.fillRect(px - 9 * u, py - ph + 1 * u, 18 * u, 3 * u);
    }
    // confetti
    for (i = 0; i < particles.length; i += 1) { var p = particles[i]; if (p.life > 0) { ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 5 * u, 8 * u); } }
  }

  /* ---------- open / close ---------- */
  function onVisibility() { if (document.hidden && running && !paused && !over) { pause(); } }
  function onKey(e) {
    if (isHidden()) { return; }
    // Space on a focused button/link must keep its native action (Sound, Restart, Exit, ✕) — K3
    var tg = e.target; if (e.keyCode === 32 && tg && tg !== document.body && tg !== canvas && tg !== ui.jump && /^(BUTTON|INPUT|SELECT|A)$/.test(tg.tagName)) { return; }
    if (e.keyCode === 32) { if (!running || over) { e.preventDefault(); start(); } else if (paused) { e.preventDefault(); resume(); } else { e.preventDefault(); jump(); } }
    else if (e.keyCode === 80) { e.preventDefault(); if (paused) { resume(); } else { pause(); } }
  }
  function bindOnce() {
    if (ui.bound) { return; }
    ui.bound = true;
    canvas = el("gameCanvas"); ctx = canvas.getContext("2d");
    ui.yards = el("gameYards"); ui.lives = el("gameLives"); ui.best = el("gameBest");
    ui.jump = el("gameJump"); ui.pause = el("gamePause"); ui.restart = el("gameRestart"); ui.sound = el("gameSound"); ui.exit = el("gameExit");
    ui.overlay = el("gameOverlay"); ui.overlayTitle = el("gameOverlayTitle"); ui.overlayCopy = el("gameOverlayCopy"); ui.overlayBtn = el("gameOverlayBtn");
    var press = function (fn) { return function (e) { if (e && e.preventDefault && e.type === "touchstart") { e.preventDefault(); } fn(); }; };
    // the biggest button is never dead: before a run it starts one, after a run it starts another (Ava)
    var jumpOrStart = function () { if (!running || over) { running = false; start(); } else if (paused) { resume(); } else { jump(); } };
    ui.jump.addEventListener("touchstart", press(jumpOrStart)); ui.jump.addEventListener("mousedown", press(jumpOrStart));
    ui.jump.addEventListener("keydown", function (e) { if (e.keyCode === 13) { e.preventDefault(); jumpOrStart(); } });
    canvas.addEventListener("touchstart", press(jumpOrStart)); canvas.addEventListener("mousedown", press(jumpOrStart));
    ui.pause.addEventListener("click", function () { if (paused) { resume(); } else { pause(); } });
    ui.restart.addEventListener("click", function () { running = false; start(); });
    ui.overlayBtn.addEventListener("click", function () { if (paused && running && !over) { resume(); } else { running = false; start(); } });
    ui.overlay.addEventListener("click", function (e) { if (e.target === ui.overlay) { if (paused && running && !over) { resume(); } else if (!running || over) { running = false; start(); } } });
    ui.sound.addEventListener("click", function () { soundOn = !soundOn; ui.sound.setAttribute("aria-pressed", soundOn ? "true" : "false"); ui.sound.textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off"; if (soundOn) { beep(660, 60, "triangle"); } });
    ui.exit.addEventListener("click", function () { if (bridge) { bridge.close("gameModal"); } });
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", function () { if (!isHidden()) { resize(); } });
    try { reducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { reducedMotion = false; }
  }
  function open(opener, api) {
    bridge = api; bindOnce(); readBest();
    running = false; paused = false; over = false; obs = []; particles = []; yards = 0; lives = LIVES;
    bridge.show("gameModal", opener);
    window.setTimeout(function () { resize(); hud(); overlay("ready"); }, 40);
  }
  function stop() {   // called by app.js whenever the sheet closes (Exit, Escape, backdrop)
    cancel(); running = false; paused = false; particles = [];
    try { if (actx && actx.suspend) { actx.suspend(); } } catch (e) {}
  }
  // read-only peek for automated play-tests (no writes, nothing the page relies on)
  function peek() { return { yards: yards, speed: speed, lives: lives, running: running, paused: paused, over: over, won: won, playerX: W * 0.22, playerY: player.y, obstacles: obs.map(function (o) { return { x: o.x, w: o.w, h: o.h, type: o.type }; }) }; }
  window.JanafariGame = { open: open, stop: stop, peek: peek };
}());

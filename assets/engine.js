'use strict';
/* GGF 게임 허브 공용 엔진
 * 각 게임은 GAME({...}) 하나로 정의한다.
 *   title, w, h        : 논리 해상도 (화면에 맞춰 자동 확대)
 *   bg                 : 배경색
 *   controls           : 'dpad' | 'ab' | 'dpad+ab' | 'lr+ab' | 'none' (모바일 가상 패드)
 *   help               : 조작법 문자열
 *   lower              : true면 낮은 점수가 기록 (시간 기록 게임)
 *   init(g), update(g, dt), draw(g, ctx)
 */
(function () {
  const U = (window.U = {
    rand: (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
    randi: (a, b) => (b === undefined ? Math.floor(Math.random() * a) : a + Math.floor(Math.random() * (b - a + 1))),
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle: (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    rectHit: (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y,
    circHit: (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r,
    circRect: (c, r) => {
      const nx = U.clamp(c.x, r.x, r.x + r.w), ny = U.clamp(c.y, r.y, r.y + r.h);
      return (c.x - nx) ** 2 + (c.y - ny) ** 2 < c.r * c.r;
    },
    angle: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    grid: (w, h, v) => Array.from({ length: h }, () => Array.from({ length: w }, () => (typeof v === 'function' ? v() : v))),
    hsl: (h, s = 80, l = 60) => `hsl(${h},${s}%,${l}%)`,
    fmtTime: (t) => {
      const m = Math.floor(t / 60), s = Math.floor(t % 60);
      return m + ':' + String(s).padStart(2, '0');
    },
  });

  /* ---------- 사운드 (WebAudio 합성) ---------- */
  let AC = null;
  let muted = false;
  try { muted = localStorage.getItem('hub_mute') === '1'; } catch (e) {}
  function ac() {
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(f, d = 0.1, type = 'square', v = 0.06, f2 = null, delay = 0) {
    if (muted) return;
    const a = ac();
    if (!a) return;
    const t = a.currentTime + delay, o = a.createOscillator(), gn = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + d);
    gn.gain.setValueAtTime(v, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(gn).connect(a.destination);
    o.start(t);
    o.stop(t + d + 0.02);
  }
  function noise(d = 0.3, v = 0.15, delay = 0) {
    if (muted) return;
    const a = ac();
    if (!a) return;
    const len = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, len, a.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(), gn = a.createGain(), t = a.currentTime + delay;
    src.buffer = buf;
    gn.gain.setValueAtTime(v, t);
    src.connect(gn).connect(a.destination);
    src.start(t);
  }
  const SFX = {
    click: () => tone(660, 0.05, 'square', 0.04),
    move: () => tone(240, 0.04, 'triangle', 0.05),
    coin: () => { tone(988, 0.07, 'square', 0.05); tone(1319, 0.14, 'square', 0.05, null, 0.07); },
    jump: () => tone(280, 0.15, 'square', 0.05, 720),
    shoot: () => tone(880, 0.09, 'sawtooth', 0.035, 180),
    hit: () => tone(220, 0.12, 'square', 0.07, 70),
    explode: () => { noise(0.45, 0.22); tone(120, 0.3, 'sawtooth', 0.05, 30); },
    power: () => [0, 1, 2, 3].forEach((i) => tone(400 + i * 200, 0.08, 'square', 0.045, null, i * 0.06)),
    lose: () => [0, 1, 2, 3].forEach((i) => tone(440 - i * 90, 0.22, 'triangle', 0.08, null, i * 0.17)),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.08, null, i * 0.1)),
    pop: () => tone(480, 0.07, 'sine', 0.08, 1100),
    drop: () => tone(160, 0.08, 'triangle', 0.08, 80),
    bounce: () => tone(520, 0.05, 'sine', 0.06),
    beep: (f = 440, d = 0.15) => tone(f, d, 'sine', 0.08),
    tone, noise,
  };

  /* ---------- 저장 ---------- */
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    },
  };
  window.HubStore = store;

  /* ---------- 입력 매핑 ---------- */
  const MAP = {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    a: ['Space', 'KeyZ', 'Enter', 'KeyJ'],
    b: ['KeyX', 'ShiftLeft', 'ShiftRight', 'KeyK'],
  };
  const CODE2BTN = {};
  for (const b in MAP) for (const c of MAP[b]) (CODE2BTN[c] = CODE2BTN[c] || []).push(b);

  window.GAME = function (def) {
    const id = new URLSearchParams(location.search).get('g') || def.id || 'game';
    const meta = (window.GAMES || []).find((x) => x.id === id) || { t: def.title, e: '🎮', d: '' };
    def.w = def.w || 800;
    def.h = def.h || 600;
    def.bg = def.bg || '#0b0f1a';
    document.title = (meta.t || def.title) + ' · GGF 게임 허브';

    /* DOM */
    document.body.innerHTML = `
      <div id="bar">
        <a id="back" href="index.html" title="허브로">◀ 허브</a>
        <div id="ttl"><span>${meta.e || '🎮'}</span> ${meta.t || def.title}</div>
        <div id="hud"><span id="info"></span><span class="pill">점수 <b id="score">0</b></span><span class="pill gold">최고 <b id="best">-</b></span></div>
        <div id="btns">
          <button id="bRestart" title="다시 시작 (R)">↻</button>
          <button id="bPause" title="일시정지 (P/Esc)">❚❚</button>
          <button id="bMute" title="소리">🔊</button>
          <button id="bFull" title="전체화면 (F)">⛶</button>
        </div>
      </div>
      <div id="stage"><canvas id="cv"></canvas>
        <div id="ov" class="ov"></div>
        <div id="pad"></div>
      </div>`;
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'), stage = document.getElementById('stage');
    const ov = document.getElementById('ov'), pad = document.getElementById('pad');
    const elScore = document.getElementById('score'), elBest = document.getElementById('best'), elInfo = document.getElementById('info');
    const bestKey = 'hub_best_' + id;

    /* 상태 */
    let state = 'menu', scale = 1, shakeT = 0, shakeA = 0, last = performance.now();
    const held = {}, just = {}, rawHeld = {}, rawJust = {};
    const parts = [], floats = [], timers = [], emojiCache = new Map();
    const mouse = { x: 0, y: 0, down: false, clicked: false, released: false, rclick: false, moved: false };

    const g = {
      id, W: def.w, H: def.h, ctx, U, sfx: SFX, mouse, store,
      score: 0, info: '', time: 0, frame: 0,
      held: (b) => !!held[b],
      pressed: (b) => !!just[b],
      key: (c) => !!rawHeld[c],
      keyp: (c) => !!rawJust[c],
      get left() { return !!held.left; }, get right() { return !!held.right; },
      get up() { return !!held.up; }, get down() { return !!held.down; },
      get a() { return !!held.a; }, get b() { return !!held.b; },
      lastKey: null,
      add(n, x, y) {
        g.score += n;
        if (x !== undefined) g.float(x, y, (n > 0 ? '+' : '') + n, '#ffe066');
      },
      over(msg) { endGame(false, msg); },
      win(msg) { endGame(true, msg); },
      shake(a = 6, t = 0.25) { shakeA = Math.max(shakeA, a); shakeT = Math.max(shakeT, t); },
      burst(x, y, color = '#fff', n = 14, sp = 220, life = 0.6, size = 3) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, s = sp * (0.3 + Math.random() * 0.7);
          parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.4), max: life, color: Array.isArray(color) ? U.choice(color) : color, size });
        }
      },
      float(x, y, text, color = '#fff', size = 22) { floats.push({ x, y, text, color, size, life: 1 }); },
      later(fn, sec) { timers.push({ fn, t: sec }); },
      inRect(x, y, w, h, p = mouse) { return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h; },
      load(k, d) { return store.get('hub_data_' + id + '_' + k, d); },
      save(k, v) { store.set('hub_data_' + id + '_' + k, v); },
      get best() { return store.get(bestKey, null); },
      /* 그리기 도우미 */
      rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); },
      stroke(x, y, w, h, c, lw = 2) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); },
      circle(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fill(); },
      ring(x, y, r, c, lw = 2) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.stroke(); },
      line(x1, y1, x2, y2, c, lw = 2) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); },
      rrect(x, y, w, h, r, c, strokeC, lw = 2) {
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
        if (c) { ctx.fillStyle = c; ctx.fill(); }
        if (strokeC) { ctx.strokeStyle = strokeC; ctx.lineWidth = lw; ctx.stroke(); }
      },
      poly(pts, c, strokeC, lw = 2) {
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        if (c) { ctx.fillStyle = c; ctx.fill(); }
        if (strokeC) { ctx.strokeStyle = strokeC; ctx.lineWidth = lw; ctx.stroke(); }
      },
      text(s, x, y, size = 20, c = '#fff', align = 'center', weight = 'bold') {
        ctx.font = `${weight} ${size}px "Pretendard", system-ui, -apple-system, "Segoe UI", sans-serif`;
        ctx.fillStyle = c;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillText(s, x, y);
      },
      emoji(s, x, y, size = 32) {
        const sz = Math.max(4, Math.round(size));
        const key = s + '|' + sz;
        let im = emojiCache.get(key);
        if (!im) {
          const q = 2, w = Math.ceil(sz * 1.5);
          im = document.createElement('canvas');
          im.width = im.height = w * q;
          const ic = im.getContext('2d');
          ic.scale(q, q);
          ic.font = `${sz}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
          ic.textAlign = 'center';
          ic.textBaseline = 'middle';
          ic.fillText(s, w / 2, w / 2 + sz * 0.06);
          im.w = w;
          if (emojiCache.size > 600) emojiCache.clear();
          emojiCache.set(key, im);
        }
        ctx.drawImage(im, x - im.w / 2, y - im.w / 2, im.w, im.w);
      },
      /* 캔버스 안 버튼: draw에서 그리고, update에서 g.btnHit로 판정 */
      button(x, y, w, h, label, c = '#2b3a67', size = 20) {
        const hov = g.inRect(x, y, w, h);
        g.rrect(x, y, w, h, 10, hov ? lighten(c) : c, 'rgba(255,255,255,.25)');
        g.text(label, x + w / 2, y + h / 2 + 1, size, '#fff');
      },
      clickIn(x, y, w, h) { return mouse.clicked && g.inRect(x, y, w, h); },
    };
    function lighten(c) { return c.startsWith('#') && c.length === 7 ? '#' + c.slice(1).match(/../g).map((h) => Math.min(255, parseInt(h, 16) + 30).toString(16).padStart(2, '0')).join('') : c; }

    /* 크기 */
    function resize() {
      const r = stage.getBoundingClientRect();
      const sc = Math.min(r.width / def.w, r.height / def.h);
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      cv.style.width = def.w * sc + 'px';
      cv.style.height = def.h * sc + 'px';
      cv.width = Math.round(def.w * sc * dpr);
      cv.height = Math.round(def.h * sc * dpr);
      scale = sc * dpr;
    }
    window.addEventListener('resize', resize);
    document.addEventListener('fullscreenchange', () => setTimeout(resize, 50));

    /* 키보드 */
    const isTyping = () => document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    window.addEventListener('keydown', (e) => {
      if (isTyping()) return;
      const c = e.code;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) e.preventDefault();
      ac();
      if (!e.repeat) {
        if (state === 'menu' && (c === 'Space' || c === 'Enter')) { start(); return; }
        if (state === 'over' && (c === 'Space' || c === 'Enter' || c === 'KeyR')) { start(); return; }
        if (c === 'Escape' || c === 'KeyP') { togglePause(); return; }
        if (state === 'pause' && (c === 'Space' || c === 'Enter')) { togglePause(); return; }
        if (c === 'KeyF' && !def.typing) { toggleFull(); return; }
        if (c === 'KeyR' && state === 'play' && !def.noRKey) { start(); return; }
        rawJust[c] = true;
        g.lastKey = e.key;
        (CODE2BTN[c] || []).forEach((b) => (just[b] = true));
      }
      rawHeld[c] = true;
      (CODE2BTN[c] || []).forEach((b) => (held[b] = true));
    });
    window.addEventListener('keyup', (e) => {
      rawHeld[e.code] = false;
      (CODE2BTN[e.code] || []).forEach((b) => (held[b] = MAP[b].some((k) => rawHeld[k]) || padHeld[b]));
    });
    window.addEventListener('blur', () => {
      for (const k in rawHeld) rawHeld[k] = false;
      for (const k in held) held[k] = false;
      if (state === 'play' && !def.noAutoPause) togglePause();
    });

    /* 마우스/터치 */
    let swipe = null;
    function toLocal(e) {
      const r = cv.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * def.w;
      mouse.y = ((e.clientY - r.top) / r.height) * def.h;
    }
    cv.addEventListener('pointerdown', (e) => {
      ac();
      toLocal(e);
      if (e.button === 2) { mouse.rclick = true; return; }
      mouse.down = true;
      mouse.clicked = true;
      swipe = { x: e.clientX, y: e.clientY, t: performance.now() };
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    });
    cv.addEventListener('pointermove', (e) => { toLocal(e); mouse.moved = true; });
    const up = (e) => {
      toLocal(e);
      if (mouse.down) mouse.released = true;
      mouse.down = false;
      if (swipe) {
        const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 30 && performance.now() - swipe.t < 500) {
          const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
          just[d] = true;
          g.swiped = d;
        }
        swipe = null;
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());

    /* 가상 패드 (터치 기기) */
    const padHeld = {};
    const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const ctrl = def.controls || 'none';
    if (touch && ctrl !== 'none') {
      let html = '';
      if (ctrl.includes('dpad')) html += `<div class="dpad"><button data-b="up">▲</button><button data-b="left">◀</button><button data-b="right">▶</button><button data-b="down">▼</button></div>`;
      if (ctrl.includes('lr')) html += `<div class="lr"><button data-b="left">◀</button><button data-b="right">▶</button></div>`;
      if (ctrl.includes('ab')) html += `<div class="ab"><button data-b="b">${def.bLabel || 'B'}</button><button data-b="a">${def.aLabel || 'A'}</button></div>`;
      pad.innerHTML = html;
      pad.querySelectorAll('button').forEach((bt) => {
        const b = bt.dataset.b;
        const on = (e) => { e.preventDefault(); ac(); padHeld[b] = true; held[b] = true; just[b] = true; bt.classList.add('on'); };
        const off = (e) => { e.preventDefault(); padHeld[b] = false; held[b] = MAP[b].some((k) => rawHeld[k]); bt.classList.remove('on'); };
        bt.addEventListener('pointerdown', on);
        bt.addEventListener('pointerup', off);
        bt.addEventListener('pointerleave', off);
        bt.addEventListener('pointercancel', off);
      });
    }

    /* 버튼 */
    const $ = (s) => document.getElementById(s);
    const bMute = $('bMute');
    const syncMute = () => (bMute.textContent = muted ? '🔇' : '🔊');
    syncMute();
    bMute.onclick = () => { muted = !muted; store.set('hub_mute', muted ? 1 : 0); try { localStorage.setItem('hub_mute', muted ? '1' : '0'); } catch (e) {} syncMute(); bMute.blur(); };
    $('bFull').onclick = (e) => { toggleFull(); e.target.blur(); };
    $('bPause').onclick = (e) => { togglePause(); e.target.blur(); };
    $('bRestart').onclick = (e) => { start(); e.target.blur(); };
    function toggleFull() {
      if (document.fullscreenElement) document.exitFullscreen();
      else (document.documentElement.requestFullscreen || (() => {})).call(document.documentElement).catch?.(() => {});
    }

    /* 화면 흐름 */
    function showBest() {
      const b = g.best;
      elBest.textContent = b === null ? '-' : Math.round(b).toLocaleString();
    }
    function overlay(html) {
      ov.innerHTML = html;
      ov.style.display = html ? 'flex' : 'none';
      ov.querySelectorAll('[data-act]').forEach((el) => {
        el.onclick = (e) => {
          e.stopPropagation();
          const a = el.dataset.act;
          if (a === 'start') start();
          if (a === 'resume') togglePause();
          if (a === 'hub') location.href = 'index.html';
        };
      });
    }
    const helpHtml = (def.help || '').split('\n').map((l) => `<li>${l}</li>`).join('');
    function menu() {
      state = 'menu';
      overlay(`<div class="card"><div class="big">${meta.e || '🎮'}</div><h1>${meta.t || def.title}</h1>
        <p class="desc">${meta.d || ''}</p><ul class="help">${helpHtml}</ul>
        <button class="go" data-act="start">▶ 게임 시작</button><div class="hint">Space / Enter / 클릭</div></div>`);
    }
    function clearInput() {
      for (const k in just) just[k] = false;
      for (const k in rawJust) rawJust[k] = false;
      mouse.clicked = mouse.released = mouse.rclick = false;
    }
    function start() {
      parts.length = floats.length = timers.length = 0;
      g.score = 0;
      g.time = 0;
      g.frame = 0;
      g.info = '';
      g.ended = false;
      def.init(g);
      state = 'play';
      overlay('');
      clearInput();
      // 시작에 쓴 키가 계속 눌린 것으로 처리되지 않도록
      for (const k in held) held[k] = !!padHeld[k];
      for (const k in rawHeld) rawHeld[k] = false;
      const rec = store.get('hub_recent', []).filter((x) => x !== id);
      rec.unshift(id);
      store.set('hub_recent', rec.slice(0, 12));
      const plays = store.get('hub_plays', {});
      plays[id] = (plays[id] || 0) + 1;
      store.set('hub_plays', plays);
    }
    function endGame(won, msg) {
      if (state !== 'play') return;
      state = 'over';
      g.ended = true;
      const sc = Math.round(g.score);
      const prev = g.best;
      let rec = false;
      if (sc > 0 || def.lower) {
        if (prev === null || (def.lower ? sc < prev : sc > prev)) {
          if (!(def.lower && sc <= 0)) { store.set(bestKey, sc); rec = prev !== null || sc > 0; }
        }
      }
      showBest();
      won ? SFX.win() : !def.quietOver && SFX.lose();
      setTimeout(() => {
        if (state !== 'over') return;
        overlay(`<div class="card"><div class="big">${won ? '🏆' : '💀'}</div><h1>${won ? '클리어!' : '게임 오버'}</h1>
          ${msg ? `<p class="desc">${msg}</p>` : ''}
          <div class="final">${sc.toLocaleString()}</div>${rec ? '<div class="rec">🎉 신기록!</div>' : ''}
          <div class="row"><button class="go" data-act="start">↻ 다시 하기</button><button class="sub" data-act="hub">허브로</button></div>
          <div class="hint">Space / Enter / R</div></div>`);
      }, 600);
    }
    function togglePause() {
      if (state === 'play') {
        state = 'pause';
        overlay(`<div class="card"><div class="big">⏸️</div><h1>일시정지</h1><div class="row"><button class="go" data-act="resume">계속하기</button><button class="sub" data-act="start">처음부터</button></div><div class="hint">P / Esc</div></div>`);
      } else if (state === 'pause') {
        state = 'play';
        overlay('');
        clearInput();
        last = performance.now();
      }
    }
    ov.addEventListener('click', (e) => {
      if (e.target === ov && state === 'menu') start();
    });

    /* 루프 */
    let lastScore = null, lastInfo = null;
    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (state === 'play') {
        g.time += dt;
        g.frame++;
        try { def.update(g, dt); } catch (err) { console.error(err); }
        for (let i = timers.length - 1; i >= 0; i--) {
          if ((timers[i].t -= dt) <= 0) { const f = timers[i].fn; timers.splice(i, 1); try { f(); } catch (err) { console.error(err); } }
        }
      }
      if (state !== 'pause') {
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.vy += (def.particleGravity || 0) * dt;
          if ((p.life -= dt) <= 0) parts.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i--) {
          const f = floats[i];
          f.y -= 50 * dt;
          if ((f.life -= dt) <= 0) floats.splice(i, 1);
        }
        if (shakeT > 0) shakeT -= dt; else shakeA = 0;
      }
      render();
      if (g.score !== lastScore) { elScore.textContent = Math.round(g.score).toLocaleString(); lastScore = g.score; }
      if (g.info !== lastInfo) { elInfo.textContent = g.info; elInfo.style.display = g.info ? '' : 'none'; lastInfo = g.info; }
      clearInput();
      g.swiped = null;
      requestAnimationFrame(frame);
    }
    function render() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = def.bg;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      if (shakeA > 0 && state === 'play') ctx.translate((Math.random() - 0.5) * shakeA * 2, (Math.random() - 0.5) * shakeA * 2);
      ctx.save();
      try { def.draw(g, ctx); } catch (err) { console.error(err); }
      ctx.restore();
      for (const p of parts) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      for (const f of floats) {
        ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.5));
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,.6)';
        ctx.font = `bold ${f.size}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    }

    resize();
    showBest();
    g.score = 0;
    def.init(g);
    menu();
    g.start = start;
    requestAnimationFrame((t) => { last = t; frame(t); });
    window.__game = g;
    window.__def = def;
    window.__start = start;
    window.__state = () => state;
  };
})();

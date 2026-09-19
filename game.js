/* ══════════════════════════════════════════════════════════
   GGF 파크 나이트게임 — 9이닝 야구 시뮬레이션
   좌표계: 홈플레이트 원점, +y = 중견수 방향, +x = 1루 방향(우익).
   거리 단위는 피트, 시간은 초.
   ══════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ── 상수 ─────────────────────────────────────────────── */
var BASE = [                        // 0=홈 1=1루 2=2루 3=3루
  { x: 0, y: 0 }, { x: 63.64, y: 63.64 }, { x: 0, y: 127.28 }, { x: -63.64, y: 63.64 }
];
var MOUND = { x: 0, y: 60.5 };
var G = 32.174;                     // ft/s^2
var DRAG_PER_SEC = 0.855;           // 타구 공기저항
var WALL_H = 9;                     // 펜스 높이(ft)
var FOUL = Math.PI / 4;             // 파울라인 각도

var C = {
  sky0: '#070b11', sky1: '#0b131c',
  stand: '#0d151e', crowd: '#1b2736',
  grass0: '#1d5f35', grass1: '#226d3c', grass2: '#1a5530',
  track: '#6f4a2c', dirt: '#8a5a34', dirtDark: '#7a4e2c',
  chalk: '#e9e6dc', wall: '#121a24', wallTop: '#26313f',
  away: '#ffb63d', home: '#e0474c', ump: '#2a3442',
  ball: '#f2efe6', led: '#ffb63d'
};

/* 수비 기본 위치 */
var POS = [
  { k: 'P',  x: 0,    y: 58  }, { k: 'C',  x: 0,    y: -4  },
  { k: '1B', x: 52,   y: 82  }, { k: '2B', x: 32,   y: 132 },
  { k: 'SS', x: -32,  y: 132 }, { k: '3B', x: -52,  y: 82  },
  { k: 'LF', x: -150, y: 250 }, { k: 'CF', x: 0,    y: 296 }, { k: 'RF', x: 150, y: 250 }
];

var ARSENAL = [
  { k: 'FF', name: '포심',    mph: 94, dur: 0.94, bx: 0,    bz: 0.30, w: 34 },
  { k: 'SL', name: '슬라이더', mph: 86, dur: 1.02, bx: 1.6,  bz: 0.75, w: 24 },
  { k: 'CB', name: '커브',    mph: 78, dur: 1.22, bx: 0.5,  bz: 2.10, w: 17 },
  { k: 'CH', name: '체인지업', mph: 83, dur: 1.10, bx: -0.6, bz: 1.00, w: 25 }
];

var LEVELS = {
  easy:   { win: 0.250, cpu: 0.74, label: '연습' },        // cpu = 상대 타자 스윙 오차폭(초)
  normal: { win: 0.190, cpu: 0.62, label: '정규' },
  hard:   { win: 0.148, cpu: 0.50, label: '포스트시즌' }
};

var TEAMS = [
  { name: 'GGF 유니콘스', short: 'GGF', color: C.away,
    lineup: ['김도현','박서준','이준호','최민석','정우진','강태양','윤시우','임건우','한지훈'],
    pitcher: '류현성' },
  { name: '블랙 베어스', short: 'BRS', color: C.home,
    lineup: ['오성민','배준영','신재호','문태경','조현우','장민혁','서동건','노진우','홍상수'],
    pitcher: '고우석민' }
];

/* ── 헬퍼 ─────────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function sprayOf(x, y) { return Math.atan2(-x, y); }       // +면 좌익, -면 우익
function fenceAt(phi) {
  var t = Math.min(1, Math.abs(phi) / FOUL);
  return 400 - 72 * Math.pow(t, 1.6);
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ══════════════════════════════════════════════════════════
   화면 변환 + 정적 필드 렌더
   ══════════════════════════════════════════════════════════ */
var cv = $('cv'), ctx = cv.getContext('2d');
var VW = 0, VH = 0, DPR = 1, SCALE = 1, SQUASH = 0.6, CX = 0, CY = 0;
var bg = document.createElement('canvas'), bgc = bg.getContext('2d');

function sx(fx) { return CX + fx * SCALE; }
function sy(fy, fz) { return CY - fy * SCALE * SQUASH - (fz || 0) * SCALE * 0.58; }

function resize() {
  var r = cv.getBoundingClientRect();
  if (!r.width) return;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = Math.round(r.width); VH = Math.round(r.height);
  cv.width = VW * DPR; cv.height = VH * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  SCALE = (VW / 2 - 10) / 238;
  SQUASH = clamp((VH - 40 - 70) / (434 * SCALE), 0.45, 0.80);
  CY = VH - 14 - 34 * SCALE * SQUASH;
  CX = VW / 2;

  bg.width = VW * DPR; bg.height = VH * DPR;
  bgc.setTransform(DPR, 0, 0, DPR, 0, 0);
  paintField(bgc);
}

/* 잔디·파울지역 외곽 반경 */
function edgeAt(phi) {
  var a = Math.abs(phi);
  if (a <= FOUL) return fenceAt(phi);
  var k = (a - FOUL) / (0.22);                 // 파울지역 바깥으로 완만히 축소
  return Math.max(120, fenceAt(FOUL) * (1 - 0.62 * Math.min(1, k)));
}

function sectorPath(c, r0, r1, spread, step) {
  c.beginPath();
  var a, p;
  for (a = -spread; a <= spread + 1e-6; a += step) {
    p = r1(a);
    c[a === -spread ? 'moveTo' : 'lineTo'](sx(-Math.sin(a) * p), sy(Math.cos(a) * p, 0));
  }
  for (a = spread; a >= -spread - 1e-6; a -= step) {
    p = r0(a);
    c.lineTo(sx(-Math.sin(a) * p), sy(Math.cos(a) * p, 0));
  }
  c.closePath();
}

function paintField(c) {
  c.clearRect(0, 0, VW, VH);

  /* 밤하늘 + 관중석 */
  var g = c.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, C.sky0); g.addColorStop(1, C.sky1);
  c.fillStyle = g; c.fillRect(0, 0, VW, VH);

  var horizon = sy(430, 0);
  c.fillStyle = C.stand;
  c.beginPath();
  c.moveTo(0, 0); c.lineTo(VW, 0); c.lineTo(VW, horizon + 26); c.lineTo(0, horizon + 26);
  c.closePath(); c.fill();

  /* 관중 실루엣 */
  c.save();
  c.beginPath(); c.rect(0, Math.max(0, horizon - 58), VW, 84); c.clip();
  for (var row = 0; row < 7; row++) {
    var yy = horizon + 20 - row * 11;
    c.fillStyle = 'rgba(70,90,118,' + (0.10 + row * 0.035) + ')';
    for (var i = 0; i < VW; i += 7) {
      c.beginPath();
      c.arc(i + (row % 2) * 3.5, yy + Math.sin(i * 0.7 + row) * 1.2, 2.1, 0, 6.284);
      c.fill();
    }
  }
  c.restore();

  /* 조명 글로우 */
  var lg = c.createRadialGradient(CX, horizon - 30, 10, CX, horizon + 60, VW * 0.72);
  lg.addColorStop(0, 'rgba(255,214,140,.13)'); lg.addColorStop(1, 'rgba(255,214,140,0)');
  c.fillStyle = lg; c.fillRect(0, 0, VW, VH);

  /* 잔디 */
  var zero = function () { return 0; };
  sectorPath(c, zero, edgeAt, FOUL + 0.22, 0.012);
  c.save(); c.clip();
  c.fillStyle = C.grass1; c.fillRect(0, 0, VW, VH);
  /* 모잉 스트라이프 */
  var bandW = Math.max(18, 44 * SCALE / 1.6);
  for (var bx = -Math.ceil(VW / bandW) * bandW; bx < VW * 2; bx += bandW * 2) {
    c.fillStyle = C.grass0; c.fillRect(CX + bx, 0, bandW, VH);
  }
  /* 외야 그라데이션 */
  var og = c.createLinearGradient(0, sy(400, 0), 0, sy(0, 0));
  og.addColorStop(0, 'rgba(0,0,0,.30)'); og.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = og; c.fillRect(0, 0, VW, VH);
  c.restore();

  /* 워닝트랙 */
  sectorPath(c, function (a) { return edgeAt(a) - 16; }, edgeAt, FOUL + 0.22, 0.012);
  c.fillStyle = C.track; c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1;

  /* 내야 흙 */
  sectorPath(c, zero, function () { return 127; }, 0.80, 0.02);
  c.fillStyle = C.dirt; c.fill();

  /* 내야 잔디 다이아몬드 */
  c.beginPath();
  var inset = 7.5, dpts = [
    { x: 0, y: inset * 1.4 }, { x: 63.64 - inset, y: 63.64 },
    { x: 0, y: 127.28 - inset * 1.4 }, { x: -63.64 + inset, y: 63.64 }
  ];
  dpts.forEach(function (p, i) { c[i ? 'lineTo' : 'moveTo'](sx(p.x), sy(p.y, 0)); });
  c.closePath();
  c.fillStyle = C.grass2; c.fill();

  /* 마운드 */
  c.beginPath();
  c.ellipse(sx(MOUND.x), sy(MOUND.y, 0), 9 * SCALE, 9 * SCALE * SQUASH, 0, 0, 6.284);
  c.fillStyle = C.dirtDark; c.fill();
  c.fillStyle = C.chalk;
  c.fillRect(sx(-1) , sy(MOUND.y + 0.5, 0) - 1, 2 * SCALE, Math.max(1.5, 1.2 * SCALE * SQUASH));

  /* 홈플레이트 서클 */
  c.beginPath();
  c.ellipse(sx(0), sy(0, 0), 13 * SCALE, 13 * SCALE * SQUASH, 0, 0, 6.284);
  c.fillStyle = C.dirtDark; c.fill();

  /* 파울라인 */
  c.strokeStyle = C.chalk; c.lineWidth = Math.max(1.2, 1.6 * SCALE / 1.6);
  [-1, 1].forEach(function (s) {
    var d = fenceAt(FOUL);
    c.beginPath();
    c.moveTo(sx(0), sy(0, 0));
    c.lineTo(sx(-s * Math.sin(FOUL) * d), sy(Math.cos(FOUL) * d, 0));
    c.stroke();
  });

  /* 베이스 */
  BASE.forEach(function (b, i) { drawBase(c, b, i === 0); });

  /* 펜스 */
  c.lineWidth = Math.max(2, 3.4 * SCALE / 1.6);
  c.beginPath();
  for (var a = -FOUL; a <= FOUL + 1e-6; a += 0.012) {
    var d = fenceAt(a);
    var px = sx(-Math.sin(a) * d), py = sy(Math.cos(a) * d, 0);
    c[a === -FOUL ? 'moveTo' : 'lineTo'](px, py);
  }
  c.strokeStyle = C.wall; c.stroke();
  c.lineWidth = Math.max(1, 1.4 * SCALE / 1.6);
  c.strokeStyle = C.wallTop; c.stroke();

  /* 거리 표기 */
  c.fillStyle = 'rgba(233,230,220,.35)';
  c.font = Math.round(clamp(9 * SCALE / 1.6, 8, 12)) + "px 'DotGothic16', monospace";
  c.textAlign = 'center';
  [[-FOUL * 0.93, '328'], [0, '400'], [FOUL * 0.93, '328']].forEach(function (m) {
    var d = fenceAt(m[0]) - 9;
    c.fillText(m[1], sx(-Math.sin(m[0]) * d), sy(Math.cos(m[0]) * d, 0) + 4);
  });
}

function drawBase(c, b, isHome) {
  var s = Math.max(3, 4.2 * SCALE / 1.6);
  c.save();
  c.translate(sx(b.x), sy(b.y, 0));
  c.fillStyle = C.chalk;
  if (isHome) {
    c.beginPath();
    c.moveTo(-s, -s * SQUASH); c.lineTo(s, -s * SQUASH);
    c.lineTo(s, s * SQUASH * 0.3); c.lineTo(0, s * SQUASH * 1.2); c.lineTo(-s, s * SQUASH * 0.3);
    c.closePath(); c.fill();
  } else {
    c.beginPath();
    c.moveTo(0, -s * SQUASH * 1.5); c.lineTo(s * 1.1, 0);
    c.lineTo(0, s * SQUASH * 1.5); c.lineTo(-s * 1.1, 0);
    c.closePath(); c.fill();
  }
  c.restore();
}

/* ── 선수/공 렌더 ─────────────────────────────────────── */
function drawGuy(c, fx, fy, color, opt) {
  opt = opt || {};
  var U = clamp(SCALE, 0.5, 2.4);
  var X = sx(fx), Y = sy(fy, 0);
  var w = 3.1 * U, h = 5.2 * U, hr = 2.15 * U;

  c.save();
  c.fillStyle = 'rgba(0,0,0,.42)';
  c.beginPath(); c.ellipse(X + 1.2 * U, Y + 0.6 * U, w * 1.15, w * 0.62, 0, 0, 6.284); c.fill();

  if (opt.glow) {
    c.shadowColor = color; c.shadowBlur = 12 * U / 1.6;
  }
  /* 몸통 */
  c.fillStyle = color;
  roundRect(c, X - w / 2, Y - h - hr * 1.1, w, h, w * 0.42);
  c.fill();
  c.shadowBlur = 0;
  /* 머리 */
  c.fillStyle = opt.helmet || '#e8ded0';
  c.beginPath(); c.arc(X, Y - h - hr * 1.35, hr, 0, 6.284); c.fill();
  /* 모자 챙 */
  c.fillStyle = color;
  c.beginPath();
  c.arc(X, Y - h - hr * 1.35, hr, Math.PI, 6.284);
  c.closePath(); c.fill();

  if (opt.bat) {
    c.strokeStyle = '#d8b271'; c.lineWidth = 1.5 * U; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(X + (opt.bat > 0 ? w * 0.5 : -w * 0.5), Y - h * 0.9);
    c.lineTo(X + (opt.bat > 0 ? w * 2.3 : -w * 2.3), Y - h * 1.9 - (opt.swing ? -2 * U : 3.2 * U));
    c.stroke();
  }
  if (opt.label) {
    c.fillStyle = 'rgba(233,230,220,.8)';
    c.font = Math.round(clamp(8 * U / 1.6, 7, 11)) + "px 'DotGothic16', monospace";
    c.textAlign = 'center';
    c.fillText(opt.label, X, Y - h - hr * 2.9);
  }
  c.restore();
}

function roundRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r); c.closePath();
}

function drawBall(c, p, trail) {
  var U = clamp(SCALE, 0.5, 2.4);
  var X = sx(p.x), Y = sy(p.y, p.z);
  var gy = sy(p.y, 0);
  var lift = clamp(p.z / 45, 0, 1);

  if (trail && trail.length > 1) {
    c.save();
    c.strokeStyle = 'rgba(255,255,255,.28)';
    c.lineWidth = 1.6 * U * 0.7; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    for (var i = 0; i < trail.length; i++) {
      var t = trail[i];
      c[i ? 'lineTo' : 'moveTo'](sx(t.x), sy(t.y, t.z));
    }
    c.stroke(); c.restore();
  }
  /* 그림자 */
  c.fillStyle = 'rgba(0,0,0,' + (0.38 - lift * 0.26) + ')';
  c.beginPath();
  c.ellipse(gy === Y ? X : X + 1.5 * U, gy, (2.2 + lift * 2.4) * U, (1.2 + lift * 1.3) * U * 0.75, 0, 0, 6.284);
  c.fill();
  /* 공 */
  var r = (2.05 + lift * 1.15) * U;
  c.save();
  c.shadowColor = 'rgba(255,255,255,.55)'; c.shadowBlur = 7 * U / 1.6;
  c.fillStyle = C.ball;
  c.beginPath(); c.arc(X, Y, r, 0, 6.284); c.fill();
  c.restore();
}

/* ── 포수 시점 인셋: 스트라이크존 + 투구 트래킹 ─────────
   탑다운 필드만으로는 공의 높이가 보이지 않아 타이밍 판단이 불가능하다.
   실제 중계처럼 홈플레이트 정면 뷰를 따로 띄운다. */
function drawCatcherView(c, ball, u, log, live) {
  var w = clamp(VW * (VW < 520 ? 0.245 : 0.185), 92, 168), h = w * 1.45;
  var x0 = VW - w - 12, y0 = VH - h - 12;
  var padB = h * 0.15;
  var ppf = (h - padB - 18) / 4.6;
  var zx = function (fx) { return x0 + w / 2 + fx * ppf; };
  var zy = function (fz) { return y0 + h - padB - fz * ppf; };

  c.save();
  c.globalAlpha = live ? 1 : 0.86;
  c.fillStyle = 'rgba(6,9,14,.82)';
  roundRect(c, x0, y0, w, h, 4); c.fill();
  c.strokeStyle = 'rgba(35,44,58,.95)'; c.lineWidth = 1; c.stroke();

  /* 홈플레이트 */
  var hp = ppf * 0.72;
  c.fillStyle = 'rgba(233,230,220,.30)';
  c.beginPath();
  c.moveTo(zx(0) - hp, zy(0.12)); c.lineTo(zx(0) + hp, zy(0.12));
  c.lineTo(zx(0) + hp * 0.7, zy(0.12) + hp * 0.42);
  c.lineTo(zx(0), zy(0.12) + hp * 0.7);
  c.lineTo(zx(0) - hp * 0.7, zy(0.12) + hp * 0.42);
  c.closePath(); c.fill();

  /* 존 */
  var zl = zx(-0.85), zr = zx(0.85), zt = zy(3.45), zb = zy(1.65);
  c.strokeStyle = 'rgba(233,230,220,.20)'; c.lineWidth = 1;
  c.beginPath();
  for (var i = 1; i < 3; i++) {
    c.moveTo(zl + (zr - zl) * i / 3, zt); c.lineTo(zl + (zr - zl) * i / 3, zb);
    c.moveTo(zl, zt + (zb - zt) * i / 3); c.lineTo(zr, zt + (zb - zt) * i / 3);
  }
  c.stroke();
  c.strokeStyle = 'rgba(233,230,220,.62)'; c.lineWidth = 1.4;
  c.strokeRect(zl, zt, zr - zl, zb - zt);

  /* 지난 투구 트래킹 */
  for (i = 0; i < log.length; i++) {
    var q = log[i];
    c.beginPath(); c.arc(zx(q.x), zy(q.z), ppf * 0.19, 0, 6.284);
    c.fillStyle = q.hit ? 'rgba(255,182,61,.85)' : q.strike ? 'rgba(224,71,76,.72)' : 'rgba(61,220,132,.62)';
    c.fill();
    c.fillStyle = 'rgba(8,11,16,.9)';
    c.font = Math.round(ppf * 0.26) + "px 'DotGothic16', monospace";
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(i + 1), zx(q.x), zy(q.z) + 0.5);
  }
  c.textBaseline = 'alphabetic';

  /* 날아오는 공 */
  if (ball && live) {
    var r = ppf * (0.08 + u * 0.20);
    c.save();
    c.shadowColor = 'rgba(255,255,255,.7)'; c.shadowBlur = 9;
    c.fillStyle = C.ball;
    c.beginPath(); c.arc(zx(ball.x), zy(ball.z), r, 0, 6.284); c.fill();
    c.restore();
  }

  c.fillStyle = 'rgba(125,136,153,.75)';
  c.font = Math.round(clamp(ppf * 0.30, 7, 11)) + "px 'DotGothic16', monospace";
  c.textAlign = 'left';
  c.fillText('STRIKE ZONE', x0 + 8, y0 + 13);
  c.restore();
}

/* 모듈 밖으로 노출 */
window.__GGF_RENDER__ = {
  resize: resize, ctx: ctx, bg: bg,
  drawGuy: drawGuy, drawBall: drawBall, drawCatcherView: drawCatcherView,
  roundRect: roundRect,
  sx: sx, sy: sy,
  view: function () { return { VW: VW, VH: VH, SCALE: SCALE, SQUASH: SQUASH, CX: CX, CY: CY }; }
};
window.__GGF_CONST__ = {
  BASE: BASE, MOUND: MOUND, G: G, DRAG_PER_SEC: DRAG_PER_SEC, WALL_H: WALL_H, FOUL: FOUL,
  C: C, POS: POS, ARSENAL: ARSENAL, LEVELS: LEVELS, TEAMS: TEAMS,
  $: $, clamp: clamp, rnd: rnd, gauss: gauss, dist: dist, sprayOf: sprayOf,
  fenceAt: fenceAt, pick: pick
};
})();

/* ══════════════════════════════════════════════════════════
   게임 로직
   ══════════════════════════════════════════════════════════ */
(function () {
'use strict';
var R = window.__GGF_RENDER__, K = window.__GGF_CONST__;
var BASE = K.BASE, POS = K.POS, ARSENAL = K.ARSENAL, LEVELS = K.LEVELS, TEAMS = K.TEAMS, C = K.C;
var $ = K.$, clamp = K.clamp, rnd = K.rnd, gauss = K.gauss, dist = K.dist;
var sprayOf = K.sprayOf, fenceAt = K.fenceAt, G = K.G;
var ctx = R.ctx;

/* ── 튜닝 상수 ────────────────────────────────────────── */
var FIELDER_SPD = 20.5;     // ft/s (가속 구간 포함 평균)
var REACT = 0.50;           // 타구 판단 + 첫 스텝
var ROUTE = 1.12;           // 직선이 아닌 실제 주로 계수
var ARM = 116;              // 송구 ft/s
var TRANSFER = 0.55;        // 포구→릴리스
var CUTOFF = 1.10;          // 외야 중계 추가 시간
var CORNER = 0.85;          // 펜스 근처 처리 지연
var RUN_1B = 4.30, RUN_2B = 6.40, RUN_3B = 12.4;
var WALL_H = K.WALL_H;

/* ── 상태 ─────────────────────────────────────────────── */
var G_ = null;              // 경기 상태
var level = 'normal';
var sound = true;
var aim = 0;                // -1 당겨치기, 0, +1 밀어치기
var upper = false;
var phase = 'ready', phaseT = 0, timeScale = 1;
var pitch = null, play = null, trail = [];
var fielders = [], runners = [], runT = 0, swingAnim = 0;
var autoSwingAt = -1;
var pitchLog = [];      // 이번 타석 투구 위치 (포수 시점 트래킹)
var autoBat = false;   // 자동 관전(데모/테스트)
var stepsPerFrame = 1; // 테스트 배속 (물리는 그대로, 스텝만 반복)

try {
  var raw = localStorage.getItem('ggf-park-v1');
  if (raw) { var d = JSON.parse(raw); if (d) { level = LEVELS[d.level] ? d.level : 'normal'; sound = d.sound !== false; } }
} catch (e) {}
function savePrefs() {
  try { localStorage.setItem('ggf-park-v1', JSON.stringify({ level: level, sound: sound })); } catch (e) {}
}

/* ── 사운드 ───────────────────────────────────────────── */
var ac = null;
function actx() {
  if (!sound) return null;
  try {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch (e) { return null; }
}
function tone(f, dur, type, gain, delay) {
  var c = actx(); if (!c) return;
  var t = c.currentTime + (delay || 0);
  var o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain || 0.07, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, freq, gain, delay, sweep) {
  var c = actx(); if (!c) return;
  var t = c.currentTime + (delay || 0);
  var n = Math.max(1, Math.floor(c.sampleRate * dur));
  var buf = c.createBuffer(1, n, c.sampleRate), ch = buf.getChannelData(0);
  for (var i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  var src = c.createBufferSource(); src.buffer = buf;
  var f = c.createBiquadFilter(); f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  f.Q.value = 0.85;
  var g = c.createGain();
  g.gain.setValueAtTime(gain || 0.18, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(c.destination);
  src.start(t); src.stop(t + dur);
}
var SFX = {
  mitt:  function () { noise(0.07, 1300, 0.22); tone(210, 0.05, 'triangle', 0.05); },
  crack: function (p) { noise(0.10, 2600, 0.20 + 0.2 * p); tone(150 + 90 * p, 0.10, 'triangle', 0.10 + 0.1 * p); },
  whiff: function () { noise(0.16, 900, 0.10, 0, 260); },
  call:  function () { tone(520, 0.1, 'square', 0.05); tone(390, 0.12, 'square', 0.045, 0.09); },
  crowd: function (big) { noise(big ? 1.9 : 0.8, 620, big ? 0.13 : 0.07, 0.04, big ? 1900 : 1100); },
  horn:  function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.24, 'triangle', 0.09, i * 0.085); }); },
  sad:   function () { [392, 330, 262].forEach(function (f, i) { tone(f, 0.28, 'sawtooth', 0.07, i * 0.12); }); }
};

/* ══════════════════════════════════════════════════════════
   타구 물리
   ══════════════════════════════════════════════════════════ */
function simFlight(ev, la, sprayDeg) {
  var v = ev * 1.467;
  var rad = la * Math.PI / 180, ph = sprayDeg * Math.PI / 180;
  var vz = v * Math.sin(rad), vh = v * Math.cos(rad);
  var vx = -Math.sin(ph) * vh, vy = Math.cos(ph) * vh;
  var x = 0, y = 0, z = 3.1, t = 0;
  var dt = 1 / 120, drag = Math.pow(K.DRAG_PER_SEC, dt), roll = Math.pow(0.42, dt);
  var pts = [{ t: 0, x: 0, y: 0, z: z }];
  var landed = false, landT = 0, landX = 0, landY = 0, hr = false, wall = false;
  var n = 0;

  while (t < 14) {
    vx *= drag; vy *= drag; vz = vz * drag - G * dt;
    x += vx * dt; y += vy * dt; z += vz * dt; t += dt;

    var d = Math.hypot(x, y), fence = fenceAt(sprayOf(x, y));
    if (Math.abs(sprayOf(x, y)) <= K.FOUL && d >= fence) {
      if (z > WALL_H && !landed) { hr = true; pts.push({ t: t, x: x, y: y, z: z }); break; }
      if (!wall) {
        wall = true;
        var back = fence / d;
        x *= back; y *= back;
        vx = -vx * 0.34; vy = -vy * 0.34; vz = Math.abs(vz) * 0.25;
      }
    }
    if (z <= 0) {
      z = 0;
      if (!landed) { landed = true; landT = t; landX = x; landY = y; }
      if (vz < -3.5) { vz = -vz * 0.30; vx *= 0.76; vy *= 0.76; }
      else { vz = 0; vx *= roll; vy *= roll; }
    }
    if (++n % 2 === 0) pts.push({ t: t, x: x, y: y, z: z });
    if (landed && z === 0 && Math.hypot(vx, vy) < 4) break;
  }
  if (!landed) { landT = t; landX = x; landY = y; }
  var last = pts[pts.length - 1];
  return {
    pts: pts, hr: hr, wall: wall, hang: landT,
    landX: landX, landY: landY, landD: Math.hypot(landX, landY),
    endX: last.x, endY: last.y, endT: last.t,
    foul: Math.abs(sprayOf(landX, landY)) > K.FOUL && !hr
  };
}

/* 가장 먼저 닿는 야수 */
function reachTime(p, i) {
  return REACT + Math.hypot(POS[i].x - p.x, POS[i].y - p.y) * ROUTE / FIELDER_SPD;
}
function planDefense(fl, la) {
  var i, j, p, best = null;
  if (!fl.hr && !fl.foul && la >= 7) {
    for (i = 0; i < fl.pts.length; i++) {
      p = fl.pts[i];
      if (p.z <= 0.2 || p.z > 13) continue;
      for (j = 0; j < POS.length; j++) {
        if (reachTime(p, j) <= p.t) { best = { idx: j, t: p.t, x: p.x, y: p.y, caught: true }; break; }
      }
      if (best) break;
    }
    if (best) return best;
  }
  for (i = 0; i < fl.pts.length; i++) {
    p = fl.pts[i];
    for (j = 0; j < POS.length; j++) {
      if (reachTime(p, j) <= p.t) return { idx: j, t: p.t, x: p.x, y: p.y, caught: false };
    }
  }
  var last = fl.pts[fl.pts.length - 1], bi = 0, bd = 1e9;
  for (j = 0; j < POS.length; j++) {
    var dd = Math.hypot(POS[j].x - last.x, POS[j].y - last.y);
    if (dd < bd) { bd = dd; bi = j; }
  }
  return { idx: bi, t: last.t + bd * ROUTE / FIELDER_SPD, x: last.x, y: last.y, caught: false };
}

/* 타구 → 결과 */
function resolveBattedBall(ev, la, sprayDeg) {
  var fl = simFlight(ev, la, sprayDeg);
  var def = planDefense(fl, la);
  var from = { x: def.x, y: def.y };
  var fd = Math.hypot(def.x, def.y);
  var cut = fd > 160 ? CUTOFF : 0;
  var corner = (fd > fenceAt(sprayOf(def.x, def.y)) - 34) ? CORNER : 0;
  var hold = def.t + corner;

  if (fl.hr) return { code: 'HR', fl: fl, def: def, adv: 4 };
  if (fl.foul) return { code: 'FOUL', fl: fl, def: def, adv: 0 };

  if (def.caught) {
    var deep = fd > 205;
    return { code: la < 13 ? 'LO' : 'FO', fl: fl, def: def, adv: 0, deep: deep, fd: fd };
  }
  /* 내야 땅볼 송구 */
  var to1 = dist(from, BASE[1]) / ARM + TRANSFER;
  if (la < 12 && fd < 165 && hold + to1 < RUN_1B + gauss() * 0.18) {
    return { code: 'GO', fl: fl, def: def, adv: 0, fd: fd, throwTo: 1, throwT: to1 };
  }
  var to2 = dist(from, BASE[2]) / ARM + TRANSFER + cut;
  var to3 = dist(from, BASE[3]) / ARM + TRANSFER + cut;
  var adv = 1;
  if (hold + to2 > RUN_2B) adv = 2;
  if (hold + to3 > RUN_3B && fl.landD > 280) adv = 3;
  return { code: adv === 1 ? '1B' : adv === 2 ? '2B' : '3B', fl: fl, def: def, adv: adv, fd: fd };
}

/* ══════════════════════════════════════════════════════════
   경기 상태
   ══════════════════════════════════════════════════════════ */
function newGame() {
  G_ = {
    inning: 1, half: 0, outs: 0, balls: 0, strikes: 0,
    bases: [null, null, null],
    runs: [[], []], hits: [0, 0],
    order: [0, 0], over: false, result: null
  };
  phase = 'ready'; phaseT = 0; pitch = null; play = null; runners = []; trail = []; pitchLog = [];
  resetFielders();
  clearFeed();
  say('1회 초, GGF 유니콘스 공격. 초구를 기다리는 중.', '', 'quiet');
  buildScoreboard(); syncHUD();
}
function battingTeam() { return G_.half; }
function fieldingTeam() { return 1 - G_.half; }
function isPlayerBatting() { return G_.half === 0; }
function curBatter() {
  var t = TEAMS[battingTeam()];
  return { name: t.lineup[G_.order[battingTeam()]], team: t, slot: G_.order[battingTeam()] + 1 };
}
function runsOf(i) { return G_.runs[i].reduce(function (a, b) { return a + b; }, 0); }
function curInningRuns() {
  var arr = G_.runs[G_.half];
  while (arr.length < G_.inning) arr.push(0);
  return arr;
}
function addRuns(n) {
  if (!n) return;
  var arr = curInningRuns();
  arr[G_.inning - 1] += n;
}

function resetFielders() {
  fielders = POS.map(function (p) { return { k: p.k, x: p.x, y: p.y, tx: p.x, ty: p.y, hold: false }; });
}

/* ══════════════════════════════════════════════════════════
   투구
   ══════════════════════════════════════════════════════════ */
function startPitch() {
  var w = 0, i;
  for (i = 0; i < ARSENAL.length; i++) w += ARSENAL[i].w;
  var r = Math.random() * w, a = ARSENAL[0];
  for (i = 0; i < ARSENAL.length; i++) { r -= ARSENAL[i].w; if (r <= 0) { a = ARSENAL[i]; break; } }

  var ahead = G_.strikes > G_.balls;
  var inZone = Math.random() < (ahead ? 0.44 : 0.68);
  var px, pz;
  if (inZone) { px = rnd(-0.72, 0.72); pz = rnd(1.78, 3.30); }
  else if (Math.random() < 0.5) { px = (Math.random() < 0.5 ? -1 : 1) * rnd(1.0, 1.75); pz = rnd(1.5, 3.5); }
  else { px = rnd(-1.0, 1.0); pz = Math.random() < 0.5 ? rnd(0.7, 1.45) : rnd(3.7, 4.5); }

  var lv = LEVELS[level];
  var durScale = isPlayerBatting() ? (level === 'easy' ? 1.22 : level === 'hard' ? 0.88 : 1) : 0.94;
  pitch = {
    a: a, t: 0, dur: a.dur * durScale,
    x0: rnd(-1.4, 1.4) * 0.3, z0: 6.0,
    px: px, pz: pz,
    bx: a.bx * (Math.random() < 0.5 ? -1 : 1) * rnd(0.7, 1.25),
    bz: a.bz * rnd(0.8, 1.2),
    strike: Math.abs(px) <= 0.85 && pz >= 1.65 && pz <= 3.45,
    swung: false, swingT: -1
  };
  trail = [];
  runners = [];
  swingAnim = 0;

  if (!isPlayerBatting() || autoBat) {
    var noise2 = LEVELS[level].cpu;
    var wantSwing = pitch.strike ? 0.74 : 0.26;
    if (G_.strikes === 2) wantSwing = pitch.strike ? 0.93 : 0.45;
    if (G_.balls === 3 && !pitch.strike) wantSwing = 0.14;
    autoSwingAt = Math.random() < wantSwing ? pitch.dur + gauss() * noise2 : -1;
  } else {
    autoSwingAt = -1;
  }
  setDeck(curBatter().name + ' · ' + a.name);
}

function ballPos() {
  var u = clamp(pitch.t / pitch.dur, 0, 1.18);
  var arc = u * u - u;
  return {
    x: pitch.x0 + (pitch.px - pitch.x0) * u + pitch.bx * arc,
    y: 54 * (1 - u),
    z: pitch.z0 + (pitch.pz - pitch.z0) * u + pitch.bz * arc
  };
}

function swing() {
  if (phase !== 'pitch' || pitch.swung) return;
  pitch.swung = true;
  pitch.swingT = pitch.t;
  swingAnim = 0.22;
  resolveSwing();
}

function resolveSwing() {
  var W = LEVELS[level].win * (upper ? 0.80 : 1);
  var dt = pitch.swingT - pitch.dur;
  var zx = Math.max(0, Math.abs(pitch.px) - 0.85);
  var zz = Math.max(0, 1.65 - pitch.pz, pitch.pz - 3.45);
  var miss = zx + zz;
  var score = Math.abs(dt) + miss * 0.058;

  if (miss > 0.95 || score >= W) { SFX.whiff(); logPitch(false); return afterPitch('swstrike', null); }

  var q = score < W * 0.18 ? 2 : score < W * 0.52 ? 1 : 0;
  var bias = clamp(dt / W, -1, 1);
  var bb = makeContact(q, bias, miss, aim, upper);

  logPitch(true);
  SFX.crack((bb.ev - 50) / 60);
  showTiming(q === 2 ? 'PERFECT' : q === 1 ? 'GOOD' : 'CONTACT', q);
  startPlay(resolveBattedBall(bb.ev, bb.la, bb.spray), bb.ev, bb.la);
}

/* 컨택 품질 → 타구 (실제 타구 분포에 맞춘 정규분포)
   q: 2=PERFECT 1=GOOD 0=CONTACT, bias: 음수=일찍(당겨), 양수=늦게(밀어) */
function makeContact(q, bias, miss, aimV, up) {
  var ev, la, sd;
  if (q === 2)      { ev = 101 + gauss() * 21; la = 25 + gauss() * 24; sd = 22; }
  else if (q === 1) { ev =  89 + gauss() * 33; la = 13 + gauss() * 48; sd = 40; }
  else              { ev =  71 + gauss() * 45; la = 10 + gauss() * 66; sd = 62; }
  if (up) { la += 9; ev += 3; }
  ev = clamp(ev - (miss || 0) * 9, 38, 116);
  la = clamp(la - bias * 7, -26, 70);
  var spray = clamp(-(aimV || 0) * 17 - bias * 30 + gauss() * sd, -75, 75);
  /* 컨택이 빗맞으면 상당수가 파울로 흐른다 */
  var foulRoll = q === 2 ? 0.05 : q === 1 ? 0.14 : 0.30;
  if (Math.random() < foulRoll) {
    var side = spray >= 0 ? 1 : -1;
    spray = side * rnd(47, 68);
    ev = clamp(ev * 0.9, 38, 110);
  }
  return { ev: ev, la: la, spray: spray };
}

/* 스윙 없이 지나간 공 */
function takePitch() {
  SFX.mitt();
  logPitch(false);
  afterPitch(pitch.strike ? 'strike' : 'ball', null);
}
function logPitch(hit) {
  pitchLog.push({ x: pitch.px, z: pitch.pz, strike: pitch.strike, hit: hit });
  if (pitchLog.length > 12) pitchLog.shift();
}

/* ══════════════════════════════════════════════════════════
   타석 결과 처리
   ══════════════════════════════════════════════════════════ */
function afterPitch(kind, _) {
  var b = curBatter();
  if (kind === 'ball') {
    G_.balls++;
    if (G_.balls >= 4) { SFX.call(); return finishAB({ code: 'BB', adv: 1 }, b); }
    syncHUD(); return rest(0.75);
  }
  if (kind === 'strike' || kind === 'swstrike') {
    G_.strikes++;
    if (G_.strikes >= 3) { SFX.call(); return finishAB({ code: 'K' }, b); }
    syncHUD(); return rest(0.75);
  }
  if (kind === 'foul') {
    if (G_.strikes < 2) G_.strikes++;
    syncHUD(); return rest(0.8);
  }
}
function rest(sec) { phase = 'result'; phaseT = -sec; }

/* 인플레이 타구 시작 */
function startPlay(res, ev, la) {
  if (res.code === 'FOUL') {
    play = { res: res, t: 0, dur: Math.min(res.fl.endT, 2.4), foulOnly: true };
    phase = 'live';
    return;
  }
  var b = curBatter();
  var plans = [], runs = 0, outs = 0, note = '';
  var snap = G_.bases.slice();
  var newBases = [null, null, null];
  var i, r, to;

  function moveRunner(r, from, extra) {
    var t2 = from + extra;
    if (t2 >= 4) { runs++; plans.push({ r: r, from: from, to: 4 }); }
    else { newBases[t2 - 1] = r; plans.push({ r: r, from: from, to: t2 }); }
  }

  if (res.code === 'HR') {
    for (i = 2; i >= 0; i--) if (snap[i]) moveRunner(snap[i], i + 1, 4);
    moveRunner({ name: b.name }, 0, 4);
    note = (runs === 4 ? '만루 홈런!' : runs === 3 ? '쓰리런 홈런!' : runs === 2 ? '투런 홈런!' : '솔로 홈런!');
    G_.hits[battingTeam()]++;
  } else if (res.code === '1B' || res.code === '2B' || res.code === '3B') {
    var n = res.adv;
    for (i = 2; i >= 0; i--) {
      if (!snap[i]) continue;
      var bonus = 0;
      if (n === 1 && i === 1 && res.fd > 195) bonus = 1;           // 2루주자 홈 쇄도
      if (n === 1 && i === 0 && res.fd > 250) bonus = 1;
      moveRunner(snap[i], i + 1, n + bonus);
    }
    moveRunner({ name: b.name }, 0, n);
    note = n === 1 ? '안타!' : n === 2 ? '2루타!' : '3루타!';
    G_.hits[battingTeam()]++;
  } else if (res.code === 'FO' || res.code === 'LO') {
    outs = 1;
    var sac = res.code === 'FO' && res.deep && G_.outs < 2 && snap[2] && Math.random() < 0.72;
    for (i = 2; i >= 0; i--) {
      if (!snap[i]) continue;
      if (sac && i === 2) { runs++; plans.push({ r: snap[i], from: 3, to: 4 }); }
      else { newBases[i] = snap[i]; }
    }
    note = sac ? '희생플라이, 1점!' : (res.code === 'LO' ? '라인드라이브 아웃.' : '뜬공 아웃.');
  } else if (res.code === 'GO') {
    var dp = snap[0] && G_.outs < 2 && res.def.t < 1.9 && res.fd < 150 && Math.random() < 0.52;
    if (dp) {
      outs = 2; note = '병살타!';
      for (i = 2; i >= 1; i--) if (snap[i]) newBases[i] = snap[i];
    } else {
      outs = 1;
      var forced = !!snap[0];
      for (i = 2; i >= 0; i--) {
        if (!snap[i]) continue;
        if (forced && i === 0) continue;                           // 1루주자 봉살
        if (i === 2 && G_.outs + outs < 3 && Math.random() < 0.55) { runs++; plans.push({ r: snap[i], from: 3, to: 4 }); }
        else newBases[i] = snap[i];
      }
      if (forced) { newBases[0] = { name: b.name }; plans.push({ r: { name: b.name }, from: 0, to: 1 }); note = '땅볼, 1루주자 봉살.'; }
      else note = '땅볼 아웃.';
    }
  }

  G_.bases = newBases;
  play = {
    res: res, t: 0, plans: plans, runs: runs, outs: outs, note: note,
    ev: ev, la: la, batter: b,
    dur: playDuration(res), applied: false
  };
  /* 주자 애니메이션 길이 정규화 */
  var maxSeg = 0;
  plans.forEach(function (p) { maxSeg = Math.max(maxSeg, p.to - p.from); });
  plans.forEach(function (p) {
    p.t0 = 0.12 * (p.from === 0 ? 0 : 1);
    p.dur = maxSeg ? (play.dur - 0.25) * ((p.to - p.from) / maxSeg) : 0.6;
    p.dur = Math.max(0.45, p.dur);
  });
  runners = plans; runT = 0;
  fielders.forEach(function (f, i) { f.tx = POS[i].x; f.ty = POS[i].y; });
  var d = res.def;
  if (d && fielders[d.idx]) { fielders[d.idx].tx = d.x; fielders[d.idx].ty = d.y; }
  phase = 'live'; phaseT = 0;
  if (res.code === 'HR') { SFX.crowd(true); setTimeout(function () { SFX.horn(); }, 260); shake(); }
  else if (res.adv > 0) SFX.crowd(false);
}

function playDuration(res) {
  if (res.code === 'HR') return Math.max(3.4, Math.min(res.fl.pts[res.fl.pts.length - 1].t, 4.4)) + 1.9;
  if (res.code === 'GO') return Math.max(2.2, (res.def.t + (res.throwT || 0.9)) * 0.92);
  if (res.code === 'FO' || res.code === 'LO') return Math.max(1.5, res.def.t + 0.5);
  return Math.max(2.4, Math.min(res.def.t + 1.5, 5.2));
}

function finishPlay() {
  var p = play;
  if (p.applied) return;
  p.applied = true;
  var b = p.batter;

  addRuns(p.runs);
  G_.outs += p.outs;

  var tag = { HR: '홈런', '1B': '안타', '2B': '2루타', '3B': '3루타',
              FO: '뜬공', LO: '직선타', GO: '땅볼' }[p.res.code] || p.res.code;
  var cls = p.res.code === 'HR' ? 'hr' : p.res.adv > 0 ? 'hit' : 'out';
  var detail = b.name + ' — ' + p.note +
    ' (타구 ' + Math.round(p.ev) + 'mph · ' + Math.round(p.la) + '° · ' + Math.round(p.res.fl.landD) + 'ft)';
  if (p.runs) { detail += ' ' + p.runs + '점'; cls = p.res.code === 'HR' ? 'hr' : 'run'; }
  say(detail, tag, cls);

  bigToast(p.res.code === 'HR' ? '홈런' : p.note.replace(/[.!]$/, ''),
           p.res.code === 'HR' ? 'hr' : p.outs ? 'bad' : '');
  nextBatter();
}

/* 삼진/볼넷 등 타석 종료 */
function finishAB(res, b) {
  if (res.code === 'K') {
    G_.outs++;
    say(b.name + ' — 삼진 아웃.', '삼진', 'out');
    bigToast('삼진', 'bad');
  } else if (res.code === 'BB') {
    var snap = G_.bases.slice(), plans = [], runs = 0;
    var occupied = function (i) { return !!snap[i]; };
    /* 밀어내기 */
    var push = true, chain = [];
    for (var i = 0; i < 3 && push; i++) { if (occupied(i)) chain.push(i); else push = false; }
    var nb = snap.slice();
    for (var j = chain.length - 1; j >= 0; j--) {
      var from = chain[j] + 1;
      if (from + 1 >= 4) { runs++; nb[chain[j]] = null; plans.push({ r: snap[chain[j]], from: from, to: 4 }); }
      else { nb[from] = snap[chain[j]]; nb[chain[j]] = null; plans.push({ r: snap[chain[j]], from: from, to: from + 1 }); }
    }
    nb[0] = { name: b.name };
    plans.push({ r: nb[0], from: 0, to: 1 });
    G_.bases = nb;
    addRuns(runs);
    say(b.name + ' — 볼넷' + (runs ? ', 밀어내기 ' + runs + '점' : '') + '.', '볼넷', runs ? 'run' : 'hit');
    bigToast(runs ? '밀어내기' : '볼넷', '');
    plans.forEach(function (p) { p.t0 = 0; p.dur = 0.7; });
    runners = plans; runT = 0;
  }
  nextBatter();
}

function nextBatter() {
  G_.balls = 0; G_.strikes = 0; pitchLog = [];
  G_.order[battingTeam()] = (G_.order[battingTeam()] + 1) % 9;
  syncHUD(); buildScoreboard();

  if (checkWalkoff()) return;
  if (G_.outs >= 3) { phase = 'change'; phaseT = 0; return; }
  phase = 'result'; phaseT = -1.15;
}

function checkWalkoff() {
  var away = runsOf(0), home = runsOf(1);
  if (G_.half === 1 && G_.inning >= 9 && home > away) { endGame(); return true; }
  return false;
}

function changeHalf() {
  G_.outs = 0; G_.balls = 0; G_.strikes = 0;
  G_.bases = [null, null, null];
  runners = []; resetFielders();

  var away = runsOf(0), home = runsOf(1);
  if (G_.half === 1) {
    if (G_.inning >= 9 && away !== home) { endGame(); return; }
    if (G_.inning >= 12) { endGame(); return; }
    G_.inning++; G_.half = 0;
  } else {
    if (G_.inning >= 9 && home > away) { endGame(); return; }
    G_.half = 1;
  }
  curInningRuns();
  say(G_.inning + '회 ' + (G_.half ? '말' : '초') + ', ' + TEAMS[battingTeam()].name + ' 공격.', '공수교대', '');
  buildScoreboard(); syncHUD();
  phase = 'result'; phaseT = -1.0;
}

function endGame() {
  G_.over = true; phase = 'over';
  var away = runsOf(0), home = runsOf(1);
  var win = away > home, tie = away === home;
  say('경기 종료 — ' + TEAMS[0].short + ' ' + away + ' : ' + home + ' ' + TEAMS[1].short, 'FINAL', win ? 'hr' : 'out');
  if (win) { SFX.horn(); confetti(); } else SFX.sad();

  var old = document.querySelector('.final'); if (old) old.remove();
  var wrap = document.createElement('div');
  wrap.className = 'final';
  wrap.innerHTML =
    '<div class="final__card" role="dialog" aria-modal="true" aria-label="경기 결과">' +
      '<p class="final__k">FINAL · ' + G_.inning + '회 종료</p>' +
      '<h2 class="final__t ' + (win ? 'win' : 'lose') + '">' +
        (tie ? '무승부' : win ? '승리' : '패배') + '</h2>' +
      '<p class="final__s">' + TEAMS[0].short + ' ' + away + ' : ' + home + ' ' + TEAMS[1].short + '</p>' +
      '<p class="final__k" style="letter-spacing:.08em">안타 ' + G_.hits[0] + ' : ' + G_.hits[1] + '</p>' +
      '<button class="final__btn" type="button" id="btnAgain" style="margin-top:16px">다시 한 경기</button>' +
    '</div>';
  document.body.appendChild(wrap);
  var again = $('btnAgain');
  again.focus();
  again.addEventListener('click', function () { wrap.remove(); newGame(); });
}

/* ══════════════════════════════════════════════════════════
   메인 루프
   ══════════════════════════════════════════════════════════ */
var last = 0, reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function update(dt) {
  if (G_.over) return;
  timeScale = isPlayerBatting() ? 1 : 1.5;
  phaseT += dt;

  if (phase === 'ready') {
    if (phaseT > (isPlayerBatting() ? 0.85 : 0.45)) { phase = 'wind'; phaseT = 0; }
  } else if (phase === 'wind') {
    if (phaseT > 0.5) { phase = 'pitch'; phaseT = 0; startPitch(); }
  } else if (phase === 'pitch') {
    pitch.t += dt;
    var p = ballPos();
    trail.push(p); if (trail.length > 10) trail.shift();
    if (autoSwingAt > 0 && !pitch.swung && pitch.t >= autoSwingAt) swing();
    if (!pitch.swung && pitch.t > pitch.dur + 0.34) takePitch();
  } else if (phase === 'live') {
    play.t += dt;
    if (play.foulOnly) {
      if (play.t > play.dur) { SFX.mitt(); afterPitch('foul', null); }
    } else if (play.t > play.dur) {
      finishPlay();
    }
  } else if (phase === 'result') {
    if (phaseT > 0) {
      if (G_.outs >= 3) { phase = 'change'; phaseT = 0; }
      else { phase = 'ready'; phaseT = 0; setDeck(isPlayerBatting() ? '타석' : 'CPU 공격'); }
    }
  } else if (phase === 'change') {
    if (phaseT > 1.2) { changeHalf(); }
  }

  /* 야수 이동 */
  for (var i = 0; i < fielders.length; i++) {
    var f = fielders[i];
    var dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
    if (d > 0.4) {
      var step = Math.min(d, FIELDER_SPD * dt);
      f.x += dx / d * step; f.y += dy / d * step;
    }
  }
  if (swingAnim > 0) swingAnim -= dt;
  if (runners.length) runT += dt;
}

function ballNow() {
  if (phase === 'pitch') return ballPos();
  if (phase === 'live' && play) {
    var pts = play.res.fl.pts, t = play.t;
    if (t >= pts[pts.length - 1].t) {
      var e = pts[pts.length - 1];
      if (play.res.code === 'HR') return null;
      return { x: e.x, y: e.y, z: e.z + 2.5 };
    }
    var lo = 0, hi = pts.length - 1;
    while (lo < hi - 1) { var m = (lo + hi) >> 1; if (pts[m].t < t) lo = m; else hi = m; }
    var a = pts[lo], b = pts[hi], u = (t - a.t) / Math.max(1e-6, b.t - a.t);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u };
  }
  return null;
}

function runnerPos(p, t) {
  var u = clamp((t - p.t0) / p.dur, 0, 1);
  var total = p.to - p.from;
  if (total <= 0) return BASE[p.from % 4];
  var seg = u * total;
  var i = Math.min(Math.floor(seg), total - 1), f = seg - i;
  var a = BASE[(p.from + i) % 4], b = BASE[(p.from + i + 1) % 4];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

function render() {
  var v = R.view();
  ctx.drawImage(R.bg, 0, 0, v.VW, v.VH);
  var batTeam = TEAMS[battingTeam()], fldTeam = TEAMS[fieldingTeam()];

  /* 수비 9명 */
  for (var i = 1; i < fielders.length; i++) {      // 0번(투수)은 아래에서 따로
    var f = fielders[i];
    var isTarget = play && !play.foulOnly && play.res.def && play.res.def.idx === i && phase === 'live';
    R.drawGuy(ctx, f.x, f.y, fldTeam.color, { glow: isTarget, label: f.k });
  }
  /* 포수 · 주심 */
  R.drawGuy(ctx, 0.5, -11.5, fldTeam.color, { helmet: '#cfd6df' });
  R.drawGuy(ctx, 11.0, -20.5, C.ump, {});

  /* 주자 */
  var t = runT;
  var shown = {};
  if (runners.length) {
    for (i = 0; i < runners.length; i++) {
      var rp = runnerPos(runners[i], t);
      shown[runners[i].to] = 1;
      R.drawGuy(ctx, rp.x, rp.y, batTeam.color, { helmet: '#f0e4cd' });
    }
  }
  for (i = 0; i < 3; i++) {
    if (G_.bases[i] && !shown[i + 1]) {
      R.drawGuy(ctx, BASE[i + 1].x - 2.5, BASE[i + 1].y - 2, batTeam.color, { helmet: '#f0e4cd' });
    }
  }

  /* 타자 */
  if (phase !== 'live' || (play && play.foulOnly)) {
    R.drawGuy(ctx, -11.5, -1.5, batTeam.color, { helmet: '#f0e4cd', bat: 1, swing: swingAnim > 0 });
  }
  /* 투수 */
  var wind = phase === 'wind' ? Math.sin(phaseT / 0.5 * Math.PI) * 1.8 : 0;
  var pGlow = play && !play.foulOnly && play.res.def && play.res.def.idx === 0 && phase === 'live';
  R.drawGuy(ctx, fielders[0].x, fielders[0].y + wind, fldTeam.color, { label: 'P', glow: pGlow });

  /* 공 */
  var b = ballNow();
  if (b) R.drawBall(ctx, b, phase === 'pitch' ? trail : null);

  /* 포수 시점 인셋 — 공의 높이/코스는 여기서만 읽을 수 있다 */
  var livePitch = phase === 'pitch';
  if (livePitch || pitchLog.length) {
    R.drawCatcherView(ctx, livePitch ? ballPos() : null,
      livePitch ? clamp(pitch.t / pitch.dur, 0, 1) : 0, pitchLog, livePitch);
  }
}

function frame(now) {
  if (!last) last = now;
  var dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  for (var s = 0; s < stepsPerFrame; s++) update(dt * timeScale);
  render();
  requestAnimationFrame(frame);
}

/* ══════════════════════════════════════════════════════════
   UI
   ══════════════════════════════════════════════════════════ */
function buildScoreboard() {
  var innings = Math.max(9, G_.inning);
  var head = $('sbHead');
  head.innerHTML = '<th class="team">TEAM</th>';
  for (var i = 1; i <= innings; i++) head.innerHTML += '<th class="ing">' + i + '</th>';
  head.innerHTML += '<th>R</th><th>H</th>';

  [0, 1].forEach(function (ti) {
    var row = $(ti ? 'sbHome' : 'sbAway');
    var html = '<td class="team' + (battingTeam() === ti && !G_.over ? ' bat' : '') + '"><i></i>' + TEAMS[ti].name + '</td>';
    for (var i = 0; i < innings; i++) {
      var v = G_.runs[ti][i];
      var live = (G_.inning - 1 === i && G_.half === ti && !G_.over);
      var txt = v === undefined ? (live ? '0' : (G_.inning - 1 > i || (G_.inning - 1 === i && G_.half > ti) ? '0' : '·')) : v;
      html += '<td class="ing ' + (live ? 'live' : '') + '">' + txt + '</td>';
    }
    html += '<td class="tot">' + runsOf(ti) + '</td><td class="tot">' + G_.hits[ti] + '</td>';
    row.innerHTML = html;
  });
}

function dots(el, n, total, cls) {
  var h = '';
  for (var i = 0; i < total; i++) h += '<i class="dot' + (i < n ? ' ' + cls : '') + '"></i>';
  el.innerHTML = h;
}
function syncHUD() {
  dots($('dotsB'), G_.balls, 3, 'b');
  dots($('dotsS'), G_.strikes, 2, 's');
  dots($('dotsO'), G_.outs, 2, 'o');
  for (var i = 0; i < 3; i++) $('base' + (i + 1)).classList.toggle('on', !!G_.bases[i]);
  $('innTag').textContent = G_.inning + '회 ' + (G_.half ? '말' : '초') + ' · ' + TEAMS[battingTeam()].short + ' 공격';
  var b = curBatter();
  $('batterName').textContent = b.name;
  $('batterLine').textContent = b.slot + '번 타자 · ' + G_.balls + '-' + G_.strikes;
  $('pitcherLine').textContent = 'P · ' + TEAMS[fieldingTeam()].pitcher;
  $('btnSwing').disabled = !isPlayerBatting() || G_.over;
  $('aimL').disabled = !isPlayerBatting() || G_.over;
  $('aimR').disabled = !isPlayerBatting() || G_.over;
}
function setDeck(s) { $('deckState').textContent = s; }

function clearFeed() { $('feed').innerHTML = ''; }
function say(text, tag, cls) {
  var ol = $('feed');
  var q = ol.querySelector('.quiet'); if (q) q.remove();
  var li = document.createElement('li');
  if (cls === 'quiet') { li.className = 'quiet'; li.textContent = text; }
  else {
    li.className = 'ev' + (cls ? ' ev--' + cls : '');
    li.innerHTML = '<span class="ev__t">' + G_.inning + (G_.half ? '말' : '초') + '</span>' +
      '<span>' + text + '</span>' +
      '<span class="ev__tag">' + (tag || '') + '</span>';
  }
  ol.insertBefore(li, ol.firstChild);
  while (ol.children.length > 40) ol.removeChild(ol.lastChild);
  $('live').textContent = text;
}

var toastTimer = 0;
function bigToast(text, cls) {
  var el = $('toast');
  el.className = 'toast';
  void el.offsetWidth;
  el.textContent = text;
  el.className = 'toast show ' + (cls || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.className = 'toast'; }, 1600);
}
function showTiming(text, q) {
  var el = $('timing');
  el.className = 'timing'; void el.offsetWidth;
  el.textContent = text;
  el.style.color = q === 2 ? C.led : q === 1 ? '#3ddc84' : '#7d8899';
  el.className = 'timing show';
}
function shake() {
  if (reduced) return;
  var s = $('stage');
  s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake');
  setTimeout(function () { s.classList.remove('shake'); }, 380);
}

function confetti() {
  if (reduced) return;
  var cvf = $('fx'), c = cvf.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = cvf.width = innerWidth * dpr, H = cvf.height = innerHeight * dpr;
  cvf.style.width = innerWidth + 'px'; cvf.style.height = innerHeight + 'px';
  var cols = ['#ffb63d', '#e9e6dc', '#3ddc84', '#e0474c'], ps = [];
  for (var i = 0; i < 150; i++) {
    ps.push({
      x: W * (0.15 + Math.random() * 0.7), y: H * (0.3 + Math.random() * 0.22),
      vx: (Math.random() - 0.5) * 11 * dpr, vy: (-7 - Math.random() * 9) * dpr,
      w: (4 + Math.random() * 5) * dpr, h: (7 + Math.random() * 8) * dpr,
      a: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.3, c: cols[i % 4]
    });
  }
  var t0 = performance.now();
  (function f(t) {
    var age = t - t0;
    c.clearRect(0, 0, W, H);
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      p.vy += 0.34 * dpr; p.x += p.vx; p.y += p.vy; p.a += p.va;
      c.save(); c.globalAlpha = Math.max(0, 1 - age / 2600);
      c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.c;
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore();
    }
    if (age < 2700) requestAnimationFrame(f); else c.clearRect(0, 0, W, H);
  })(t0);
}

/* ══════════════════════════════════════════════════════════
   입력
   ══════════════════════════════════════════════════════════ */
function setAim(v) {
  aim = aim === v ? 0 : v;
  $('aimL').setAttribute('aria-pressed', String(aim === -1));
  $('aimR').setAttribute('aria-pressed', String(aim === 1));
}
function skipWait() {
  if (phase === 'ready' && phaseT < 0.85) phaseT = 0.85;
  else if (phase === 'result' && phaseT < 0) phaseT = 0;
}

$('btnSwing').addEventListener('click', function () { if (isPlayerBatting()) swing(); });
$('aimL').addEventListener('click', function () { setAim(-1); });
$('aimR').addEventListener('click', function () { setAim(1); });
$('cv').addEventListener('pointerdown', function (e) {
  e.preventDefault();
  if (isPlayerBatting() && phase === 'pitch') swing(); else skipWait();
});
$('btnNew').addEventListener('click', function () {
  var f = document.querySelector('.final'); if (f) f.remove();
  newGame();
});
$('btnSound').addEventListener('click', function () {
  sound = !sound; savePrefs();
  this.textContent = sound ? '사운드 ON' : '사운드 OFF';
  this.setAttribute('aria-pressed', String(sound));
  if (sound) SFX.mitt();
});
document.querySelector('.seg').addEventListener('click', function (e) {
  var b = e.target.closest('[data-lv]'); if (!b) return;
  level = b.dataset.lv; savePrefs();
  Array.prototype.forEach.call(this.children, function (c) {
    c.setAttribute('aria-pressed', String(c.dataset.lv === level));
  });
});
document.addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  var fin = document.querySelector('.final');
  if (fin) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fin.remove(); newGame(); }
    return;
  }
  if (e.key === ' ') { e.preventDefault(); if (isPlayerBatting()) { if (phase === 'pitch') swing(); else skipWait(); } }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); setAim(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); setAim(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); upper = !upper; setDeck(upper ? '어퍼스윙' : '정상 스윙'); }
  else if (e.key === 'Enter') { e.preventDefault(); skipWait(); }
});
window.addEventListener('resize', R.resize);

/* ── 부팅 ─────────────────────────────────────────────── */
Array.prototype.forEach.call(document.querySelectorAll('.seg [data-lv]'), function (c) {
  c.setAttribute('aria-pressed', String(c.dataset.lv === level));
});
$('btnSound').textContent = sound ? '사운드 ON' : '사운드 OFF';
$('btnSound').setAttribute('aria-pressed', String(sound));

function boot() {
  R.resize();
  newGame();
  requestAnimationFrame(frame);
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(R.resize);
boot();

/* 테스트 훅 (헤드리스 밸런스 측정용) */
window.__GGF_SIM__ = {
  resolveBattedBall: resolveBattedBall, simFlight: simFlight,
  makeContact: makeContact, state: function () { return G_; },
  phase: function () { return phase; },
  autoBat: function (v) { autoBat = !!v; },
  speed: function (v) { stepsPerFrame = Math.max(1, Math.min(24, v | 0)); }
};
})();

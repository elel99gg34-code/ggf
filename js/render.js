/* =========================================================
 *  render.js - 로블록스풍 블록 캐릭터 / 닭 / 알 / 아우라 / 러닝머신
 * ========================================================= */

/* 폼별 대략 높이(로컬) — 펫 크기 정규화용 */
const FORM_H  = { chicken:46, rooster:52, duck:56, scorpion:52, tiger:53, whale:52, dino:78, skeleton:84 };
const FORM_FIT= { chicken:1.00, rooster:0.90, duck:0.84, scorpion:0.90, tiger:0.88, whale:0.78, dino:0.60, skeleton:0.56 };

const Draw = {

/* ---------------------------------------------------------
 *  아바타 (로블록스 R6 스타일 블록 인간)
 *  a = {x,y,facing,phase,scale,skin,shirt,pants,hat,carry,stunned}
 * ------------------------------------------------------- */
avatar(ctx, a) {
  const s = a.scale || 1;
  const f = a.facing || 'down';
  const p = a.phase || 0;
  const moving = !!a.moving;
  const swing = moving ? Math.sin(p) : 0;
  const bob = moving ? Math.abs(Math.sin(p)) * 2.2 : Math.sin(p * 0.25) * 0.8;

  const skin  = a.skin  || '#ffd54a';
  const shirt = a.shirt || '#2f7dff';
  const pants = a.pants || '#2b3140';

  ctx.save();
  ctx.translate(a.x, a.y);
  shadowEllipse(ctx, 0, 0, 20 * s, 8 * s, 0.28);
  ctx.scale(s, s);
  if (a.stunned) ctx.rotate(Math.sin(now() * 26) * 0.09);
  ctx.translate(0, -bob);

  const side = (f === 'left' || f === 'right');
  const dir = f === 'left' ? -1 : 1;

  /* --- 다리 --- */
  const legSwing = swing * (side ? 7 : 3.2);
  const legs = [[-7, -legSwing], [7, legSwing]];
  for (const [lx, off] of legs) {
    const x = side ? off * dir : lx;
    const w = side ? 12 : 12;
    block(ctx, x - w / 2 + (side ? 0 : 0), -26, w, 26, pants, { outline: true });
    block(ctx, x - w / 2, -6, w, 6, '#20242e', { top: false });
  }

  /* --- 뒤쪽 팔 (측면일 때) --- */
  const armSwing = -swing * (side ? 8 : 3);
  if (side) {
    block(ctx, -5 + (-armSwing) * dir, -56, 10, 30, shade(shirt, -0.22), { outline: true });
  } else {
    const bx = f === 'up' ? 1 : -1;
    block(ctx, bx * 14 - 5.5 - armSwing, -56, 11, 30, shade(shirt, -0.14), { outline: true });
  }

  /* --- 몸통 --- */
  block(ctx, -14, -56, 28, 30, shirt, { outline: true });
  // 셔츠 무늬
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.fillRect(-14, -44, 28, 5);

  /* --- 앞쪽 팔 --- */
  if (a.carry) {
    // 알을 안고 있을 때: 두 팔을 앞으로
    block(ctx, -20, -50, 11, 22, skin, { outline: true });
    block(ctx, 9, -50, 11, 22, skin, { outline: true });
  } else if (side) {
    block(ctx, -5 + armSwing * dir, -56, 10, 30, skin, { outline: true });
  } else {
    const fx = f === 'up' ? -1 : 1;
    block(ctx, fx * 14 - 5.5 + armSwing, -56, 11, 30, skin, { outline: true });
    block(ctx, -fx * 14 - 5.5 - armSwing, -56, 11, 30, skin, { outline: true });
  }

  /* --- 머리 --- */
  block(ctx, -12, -78, 24, 22, skin, { outline: true });

  /* --- 얼굴 --- */
  if (f !== 'up') {
    const ex = side ? dir * 3 : 0;
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(-6 + ex, -71, 4, 6);
    if (!side) ctx.fillRect(2, -71, 4, 6);
    // 입
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    if (a.stunned) { ctx.arc(ex, -60, 4, Math.PI, 0); }
    else { ctx.arc(ex, -63, 5, 0.15 * Math.PI, 0.85 * Math.PI); }
    ctx.stroke();
    // 볼터치
    ctx.fillStyle = 'rgba(255,120,120,0.35)';
    ctx.fillRect(-11 + ex, -66, 4, 3);
    if (!side) ctx.fillRect(7, -66, 4, 3);
  }

  /* --- 모자 --- */
  if (a.hat !== false) {
    const hc = a.hatColor || '#e33b3b';
    block(ctx, -13, -86, 26, 9, hc, { outline: true });
    const px = f === 'up' ? -1 : (side ? dir : 0);
    if (f === 'up') block(ctx, -13, -80, 26, 4, shade(hc, -0.2));
    else block(ctx, -13 + px * 9, -79, side ? 20 : 26, 4, shade(hc, -0.2));
  }

  /* --- 기절 별 --- */
  if (a.stunned) {
    const t = now();
    for (let i = 0; i < 3; i++) {
      const ang = t * 5 + i * 2.1;
      star(ctx, Math.cos(ang) * 16, -94 + Math.sin(ang * 2) * 4, 5, '#ffd54a');
    }
  }

  ctx.restore();
},

/* ---------------------------------------------------------
 *  둥지 — 알이 들어있으면 등급 아우라가 보인다
 * ------------------------------------------------------- */
nest(ctx, n, t) {
  const x = n.x, y = n.y;
  ctx.save();
  shadowEllipse(ctx, x, y + 4, 30, 10, 0.26);
  // 짚
  ctx.fillStyle = '#b9873f';
  ctx.beginPath(); ctx.ellipse(x, y, 30, 15, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#8f6626';
  ctx.beginPath(); ctx.ellipse(x, y + 1, 21, 9, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#d3a05a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const a1 = i * 0.7 + 0.2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a1) * 12, y + Math.sin(a1) * 6);
    ctx.lineTo(x + Math.cos(a1 + 0.5) * 31, y + Math.sin(a1 + 0.5) * 15);
    ctx.stroke();
  }
  ctx.restore();

  if (n.eggs.length) {
    /* 뒤에서 앞으로 — 0번(다음에 훔칠 알)이 가장 앞·가장 크게 */
    const slot = [[-15, -14], [15, -13], [-10, -3], [10, -2]];
    for (let k = n.eggs.length - 1; k >= 0; k--) {
      const e = n.eggs[k];
      const [ex, ey] = slot[k % 4];
      const front = k === 0;
      const bob = Math.sin(t * 1.6 + n.i + k) * 1.1;
      this.egg(ctx, x + ex, y + ey + bob, front ? 22 : 17, e.rarity, e.variant, t, true);
    }
    /* 라벨은 전부 둥지 아래로 — 위쪽은 [E] 프롬프트와 💤 자리 */
    ctx.save();
    ctx.globalAlpha = 0.92;
    outlineText(ctx, '🥚 ' + n.eggs.length + '개', x, y + 28, 13, '#ffe8bf', '#000');
    ctx.restore();
    const top = this.n_topTier(n);
    if (top >= ANNOUNCE_TIER) {
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(t * 4 + n.i) * 0.45;
      outlineText(ctx, '🚨 ' + RARITIES[top].name, x, y + 47, 14, RARITIES[top].glow, '#000');
      ctx.restore();
    }
  } else {
    ctx.save();
    ctx.globalAlpha = 0.5;
    outlineText(ctx, '빈 둥지 · ' + Math.ceil(n.respawn) + '초', x, y + 28, 13, '#e6ecf5', '#000');
    ctx.restore();
  }
},

n_topTier(n) {
  let t = -1;
  for (const e of n.eggs) t = Math.max(t, RARITY_BY_ID[e.rarity].tier);
  return t;
},

/* ---------------------------------------------------------
 *  파수꾼 — 자거나(💤) 쫓아온다(!)
 * ------------------------------------------------------- */
guardian(ctx, n, t) {
  const g = n.guard, sp = n.sp;
  const dir = g.faceX < 0 ? -1 : 1;
  const s = (sp.scale || 1) * (n.gs || 1);
  const asleep = g.state === 'sleep';
  const chase = g.state === 'chase';
  const breathe = asleep ? Math.sin(t * 1.5 + g.seed) * 1.6 : 0;
  const bob = g.startle > 0
    ? Math.abs(Math.sin(t * 26)) * 9
    : (g.moving ? Math.abs(Math.sin(g.phase)) * 3.2 : breathe);

  ctx.save();
  ctx.translate(g.x, g.y);
  shadowEllipse(ctx, 0, 0, 19 * s, 7 * s, 0.26);
  ctx.scale(s * dir, s);
  ctx.translate(0, -bob);
  if (asleep) ctx.rotate(0.10);

  if (chase) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22 + Math.sin(t * 9) * 0.10;
    const gr = ctx.createRadialGradient(0, -26, 3, 0, -26, 54);
    gr.addColorStop(0, '#ff4d4d'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(0, -26, 54, 44, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  const fake = { moving: g.moving, phase: g.phase, seed: g.seed, state: g.state };
  const F = this['form_' + sp.form] || this.form_chicken;
  F.call(this, ctx, fake, sp, t);
  ctx.restore();

  const top = g.y - (24 + 46 * s);
  outlineText(ctx, sp.name, g.x, g.y + 28, 14, '#ffe8bf', '#000');
  if (asleep) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const q = ((t * 0.55 + i * 0.33) % 1);
      ctx.globalAlpha = (1 - q) * 0.9;
      outlineText(ctx, '💤', g.x + 22 + q * 20, top - q * 26, 13 + q * 8, '#bfe4ff', '#0b2033');
    }
    ctx.restore();
  }
},

/* 추격 표시는 캐릭터에 가리지 않도록 마지막에 따로 그린다 */
guardianTag(ctx, n, t) {
  const g = n.guard;
  if (g.state !== 'chase') return;
  const top = g.y - (24 + 46 * (n.sp.scale || 1));
  const waking = g.startle > 0;
  ctx.save();
  ctx.globalAlpha = 0.6 + Math.sin(t * 18) * 0.4;
  outlineText(ctx, '❗', g.x, top, waking ? 40 : 30, '#ff2b4d', '#000');
  ctx.restore();
  outlineText(ctx, waking ? '깼다! 도망쳐!' : n.sp.name + ' 추격!',
    g.x, top + (waking ? 30 : 22), waking ? 16 : 13, waking ? '#ffd54a' : '#ff8b96', '#000');
},

/* ---------------------------------------------------------
 *  울타리 / 울타리 안의 알
 * ------------------------------------------------------- */
penFence(ctx, p, t) {
  const post = (x, y) => {
    block(ctx, x - 5, y - 40, 10, 44, '#c9a06a', { outline: true });
  };
  const rail = (x, y, w) => {
    ctx.fillStyle = '#b08b57';
    ctx.fillRect(x, y - 30, w, 7); ctx.fillRect(x, y - 17, w, 7);
  };
  // 위/아래 가로
  rail(p.x, p.y, p.w);
  ctx.fillStyle = '#b08b57';
  ctx.fillRect(p.x, p.y + p.h - 30, p.gapX - p.x, 7);
  ctx.fillRect(p.x, p.y + p.h - 17, p.gapX - p.x, 7);
  ctx.fillRect(p.gapX + p.gapW, p.y + p.h - 30, p.x + p.w - p.gapX - p.gapW, 7);
  ctx.fillRect(p.gapX + p.gapW, p.y + p.h - 17, p.x + p.w - p.gapX - p.gapW, 7);
  for (let x = p.x; x <= p.x + p.w; x += 46) {
    post(x, p.y);
    if (x < p.gapX - 10 || x > p.gapX + p.gapW + 10) post(x, p.y + p.h);
  }
  // 세로
  for (let y = p.y; y <= p.y + p.h; y += 46) { post(p.x, y); post(p.x + p.w, y); }
  // 게이트 표지
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.2;
  outlineText(ctx, '▼ 알 넣는 곳', p.gapX + p.gapW / 2, p.y + p.h + 26, 14, '#8ed2ff', '#000');
  ctx.restore();
},

penEgg(ctx, e, t) {
  const p = clamp(e.t / CONFIG.hatch.time, 0, 1);
  const shake = Math.sin(t * (3 + p * 14)) * (0.8 + p * 2.4);
  this.egg(ctx, e.x + shake, e.y - 12, 22, e.egg.rarity, e.egg.variant, t, true);
  this.bar(ctx, e.x, e.y - 48, 46, 7, p, '#ffd54a');
},

/* ============ 종족별 실루엣 ============ */
form_chicken(ctx, c, sp, t) {
  const boss = c.boss, ls = c.moving ? Math.sin(c.phase) * 3.5 : 0;
  ctx.fillStyle = sp.beak;
  ctx.fillRect(-6 + ls, -9, 3, 9); ctx.fillRect(3 - ls, -9, 3, 9);
  ctx.fillRect(-9 + ls, -2, 9, 3); ctx.fillRect(0 - ls, -2, 9, 3);
  block(ctx, -20, -33, 11, 14, sp.body2, { outline: true });          // 꼬리
  block(ctx, -13, -31, 26, 23, sp.body, { outline: true });           // 몸통
  block(ctx, -6, -26, 14, 11, sp.body2, { outline: true });           // 날개
  block(ctx, 5, -46, 15, 15, sp.body, { outline: true });             // 머리
  ctx.fillStyle = sp.accent;
  if (boss) { ctx.fillRect(5, -56, 5, 11); ctx.fillRect(11, -60, 5, 15); ctx.fillRect(17, -55, 4, 10); }
  else { ctx.fillRect(7, -51, 4, 5); ctx.fillRect(12, -53, 4, 7); ctx.fillRect(17, -50, 3, 4); }
  ctx.fillStyle = sp.beak; ctx.fillRect(20, -39, 7, 5);
  ctx.fillStyle = sp.accent; ctx.fillRect(17, -34, 4, 5);
  this.eyes(ctx, c, 12, -41, 4);
},
form_rooster(ctx, c, sp, t) {
  // 큰 꼬리깃
  ctx.save();
  for (let i = 0; i < 4; i++) {
    ctx.save(); ctx.translate(-16, -30); ctx.rotate(-0.5 - i * 0.30 + Math.sin(t * 2 + i) * 0.05);
    ctx.fillStyle = i % 2 ? sp.body2 : sp.accent;
    ctx.beginPath(); ctx.ellipse(-16, 0, 18, 4.4, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  this.form_chicken(ctx, c, sp, t);
  // 망토
  ctx.save();
  ctx.fillStyle = sp.accent;
  ctx.beginPath(); ctx.moveTo(-12, -34); ctx.lineTo(6, -34); ctx.lineTo(2, -8); ctx.lineTo(-18, -12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#ffd54a'; ctx.fillRect(-13, -36, 20, 5);
  ctx.restore();
},

form_duck(ctx, c, sp, t) {
  const ls = c.moving ? Math.sin(c.phase) * 3 : 0;
  ctx.fillStyle = sp.beak;
  ctx.fillRect(-5 + ls, -8, 4, 8); ctx.fillRect(3 - ls, -8, 4, 8);
  ctx.fillRect(-10 + ls, -2, 11, 3); ctx.fillRect(0 - ls, -2, 11, 3);
  block(ctx, -22, -28, 12, 13, sp.body2, { outline: true });          // 꼬리
  block(ctx, -16, -26, 30, 19, sp.body, { outline: true });           // 몸통
  block(ctx, -7, -22, 15, 9, sp.body2, { outline: true });            // 날개
  block(ctx, 6, -44, 9, 20, sp.body, { outline: true });              // 목
  block(ctx, 4, -55, 15, 13, sp.body, { outline: true });             // 머리
  ctx.fillStyle = sp.beak; ctx.fillRect(18, -50, 11, 6);              // 부리
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(18, -46, 11, 2);
  this.eyes(ctx, c, 11, -51, 4);
},

form_scorpion(ctx, c, sp, t) {
  const ls = c.moving ? Math.sin(c.phase * 1.6) * 2.4 : 0;
  ctx.fillStyle = sp.body2;
  for (let i = 0; i < 4; i++) {
    const x = -14 + i * 8;
    ctx.fillRect(x, -8, 3, 8 + (i % 2 ? ls : -ls));
    ctx.fillRect(x + 2, -3, 6, 3);
  }
  block(ctx, -20, -20, 16, 13, sp.body2, { outline: true });
  block(ctx, -8, -22, 20, 15, sp.body, { outline: true });
  block(ctx, 8, -21, 12, 13, sp.body, { outline: true });             // 머리
  // 집게
  block(ctx, 18, -24, 13, 8, sp.body2, { outline: true });
  block(ctx, 28, -27, 9, 6, sp.body, { outline: true });
  block(ctx, 28, -20, 9, 5, sp.body, { outline: true });
  // 꼬리 (등 위로 아치를 그리며 앞을 겨눔)
  ctx.save();
  const wig = Math.sin(t * 3 + c.seed) * 1.6;
  const pts = [[-19,-27],[-24,-35],[-22,-44],[-14,-51],[-3,-55],[7,-53]];
  pts.forEach(([px, py], i) => {
    const w = 9 - i * 0.9;
    block(ctx, px - w / 2, py - w / 2 + wig * (i / 5), w, w,
      i % 2 ? sp.body : sp.body2, { outline: true });
  });
  ctx.fillStyle = sp.accent;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(9, -56 + wig); ctx.lineTo(20, -49 + wig); ctx.lineTo(9, -47 + wig);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  this.eyes(ctx, c, 12, -18, 3.4, sp.accent);
},

form_tiger(ctx, c, sp, t) {
  const ls = c.moving ? Math.sin(c.phase) * 5 : 0;
  ctx.fillStyle = sp.body2;
  ctx.fillRect(-14 + ls, -12, 6, 12); ctx.fillRect(8 - ls, -12, 6, 12);
  ctx.fillRect(-8 - ls, -12, 6, 12); ctx.fillRect(2 + ls, -12, 6, 12);
  // 꼬리
  ctx.save(); ctx.translate(-20, -30); ctx.rotate(Math.sin(t * 3) * 0.3);
  block(ctx, -16, -3, 18, 7, sp.body, { outline: true });
  ctx.fillStyle = sp.accent; ctx.fillRect(-16, -3, 5, 7);
  ctx.restore();
  block(ctx, -20, -34, 40, 24, sp.body, { outline: true });           // 몸통
  ctx.fillStyle = sp.accent;                                          // 줄무늬
  for (let i = 0; i < 4; i++) ctx.fillRect(-14 + i * 9, -33, 3.4, 16);
  block(ctx, 14, -46, 22, 20, sp.body, { outline: true });            // 머리
  ctx.fillStyle = sp.body2;                                           // 귀
  ctx.fillRect(15, -53, 8, 8); ctx.fillRect(27, -53, 8, 8);
  ctx.fillStyle = sp.beak; ctx.fillRect(30, -34, 8, 7);               // 주둥이
  ctx.fillStyle = '#1b1b1b'; ctx.fillRect(34, -33, 4, 3);
  this.eyes(ctx, c, 22, -41, 4.4, '#ffe066');
  // 이빨
  ctx.fillStyle = '#fff'; ctx.fillRect(31, -28, 2.4, 4); ctx.fillRect(35, -28, 2.4, 4);
},

form_whale(ctx, c, sp, t) {
  const sway = Math.sin(t * 2 + c.seed) * 0.10;
  ctx.save(); ctx.rotate(sway);
  const OL = () => { ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.lineWidth = 2.4; ctx.stroke(); };

  // 꼬리
  ctx.save(); ctx.translate(-30, -28); ctx.rotate(Math.sin(t * 3) * 0.32);
  ctx.fillStyle = sp.body2;
  ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-22, -16); ctx.lineTo(-12, 0); ctx.lineTo(-22, 16);
  ctx.closePath(); ctx.fill(); OL();
  ctx.restore();

  // 몸통
  ctx.fillStyle = sp.body;
  ctx.beginPath(); ctx.ellipse(0, -28, 34, 19, 0, 0, 7); ctx.fill(); OL();
  // 배
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, -28, 34, 19, 0, 0, 7); ctx.clip();
  ctx.fillStyle = sp.accent;
  ctx.beginPath(); ctx.ellipse(2, -14, 30, 11, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.ellipse(-2, -40, 26, 8, 0, 0, 7); ctx.fill();
  ctx.restore();

  // 머리 + 입
  ctx.fillStyle = sp.body;
  ctx.beginPath(); ctx.ellipse(28, -28, 14, 15, 0, 0, 7); ctx.fill(); OL();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(28, -26, 12, -0.15, 0.95); ctx.stroke();

  // 가슴지느러미
  ctx.fillStyle = sp.body2;
  ctx.beginPath(); ctx.ellipse(4, -14, 12, 6, 0.5, 0, 7); ctx.fill(); OL();

  // 물보라
  if (sp.spout) {
    ctx.save(); ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.28;
    ctx.fillStyle = '#cfeeff';
    for (let i = 0; i < 6; i++) {
      const q = ((t * 0.75 + i * 0.17) % 1);
      ctx.beginPath();
      ctx.arc(4 + Math.sin(i * 2.1 + t * 2) * (3 + q * 9), -46 - q * 34, 4.4 - q * 3.4, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  }
  // 눈
  const looking = c.state === 'look';
  ctx.fillStyle = looking ? '#fff' : '#101018';
  ctx.beginPath(); ctx.arc(30, -34, looking ? 4.6 : 3.4, 0, 7); ctx.fill();
  if (looking) { ctx.fillStyle = '#e01f3d'; ctx.beginPath(); ctx.arc(30, -34, 2.6, 0, 7); ctx.fill(); }
  ctx.restore();
},

form_dino(ctx, c, sp, t) {
  const ls = c.moving ? Math.sin(c.phase) * 6 : 0;
  ctx.fillStyle = sp.body2;
  ctx.fillRect(-8 + ls, -18, 11, 18); ctx.fillRect(4 - ls, -18, 11, 18);
  // 꼬리
  ctx.save(); ctx.translate(-24, -40); ctx.rotate(Math.sin(t * 2.2) * 0.22);
  ctx.fillStyle = sp.body;
  ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(-34, 2); ctx.lineTo(4, 10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  block(ctx, -24, -54, 46, 34, sp.body, { outline: true });           // 몸통
  ctx.fillStyle = sp.beak; ctx.fillRect(-18, -30, 34, 8);             // 배
  // 등 가시
  ctx.fillStyle = sp.accent;
  for (let i = 0; i < 5; i++) {
    const x = -20 + i * 9;
    ctx.beginPath(); ctx.moveTo(x, -54); ctx.lineTo(x + 5, -66); ctx.lineTo(x + 10, -54); ctx.closePath(); ctx.fill();
  }
  block(ctx, 12, -50, 12, 12, sp.body, { outline: true });            // 작은 팔
  block(ctx, 16, -76, 28, 24, sp.body, { outline: true });            // 머리
  ctx.fillStyle = sp.body2; ctx.fillRect(38, -66, 12, 12);            // 주둥이
  ctx.fillStyle = '#fff';                                              // 이빨
  for (let i = 0; i < 4; i++) ctx.fillRect(38 + i * 3, -55, 2.2, 5);
  this.eyes(ctx, c, 24, -70, 4.6, '#ffd54a');
},

form_skeleton(ctx, c, sp, t) {
  const ls = c.moving ? Math.sin(c.phase) * 5 : 0;
  const fl = Math.sin(t * 1.8 + c.seed) * 2;
  ctx.translate(0, -fl);
  ctx.fillStyle = sp.body;                                            // 다리뼈
  ctx.fillRect(-7 + ls, -26, 5, 26); ctx.fillRect(3 - ls, -26, 5, 26);
  ctx.fillRect(-9 + ls, -3, 9, 4); ctx.fillRect(1 - ls, -3, 9, 4);
  // 갈비뼈
  block(ctx, -12, -58, 24, 32, sp.body2, { outline: true });
  ctx.fillStyle = sp.body;
  for (let i = 0; i < 4; i++) ctx.fillRect(-11, -55 + i * 7, 22, 3.4);
  ctx.fillRect(-2.5, -58, 5, 32);
  // 어깨 갑옷
  ctx.fillStyle = sp.accent;
  ctx.fillRect(-19, -60, 10, 9); ctx.fillRect(9, -60, 10, 9);
  // 팔 + 검
  ctx.fillStyle = sp.body;
  ctx.fillRect(13, -56, 5, 22);
  ctx.save(); ctx.translate(18, -52); ctx.rotate(-0.5 + Math.sin(t * 2) * 0.12);
  ctx.fillStyle = sp.accent; ctx.fillRect(-3, -34, 6, 36);
  ctx.fillStyle = sp.body2; ctx.fillRect(-9, 0, 18, 5);
  ctx.restore();
  // 두개골
  block(ctx, -11, -82, 22, 22, sp.body, { outline: true });
  ctx.fillStyle = '#101018';
  ctx.fillRect(-8, -76, 6, 7); ctx.fillRect(2, -76, 6, 7);
  ctx.fillStyle = sp.accent;
  const gl = 0.5 + Math.abs(Math.sin(t * 3 + c.seed)) * 0.5;
  ctx.globalAlpha = gl;
  ctx.fillRect(-7, -75, 4, 5); ctx.fillRect(3, -75, 4, 5);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#101018';
  for (let i = 0; i < 4; i++) ctx.fillRect(-7 + i * 4, -64, 2.4, 4);
},

eyes(ctx, c, x, y, sz, color) {
  if (c.state === 'sleep') {                       // 감은 눈
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = Math.max(1.6, sz * 0.5);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 0.5, y + sz * 0.5);
    ctx.lineTo(x + sz + 1, y + sz * 0.5);
    ctx.stroke();
    return;
  }
  if (c.state === 'chase') {                       // 분노
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, sz + 3, sz + 3);
    ctx.fillStyle = '#e01f3d'; ctx.fillRect(x + 0.6, y + 0.6, sz, sz);
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 2, y - 3); ctx.lineTo(x + sz + 2, y + 1); ctx.stroke();
    return;
  }
  ctx.fillStyle = color || '#1b1b1b';
  ctx.fillRect(x, y, sz, sz);
},

/* ---------------------------------------------------------
 *  알
 * ------------------------------------------------------- */
egg(ctx, x, y, size, rarityId, variantId, t, small) {
  const r = RARITY_BY_ID[rarityId] || RARITY_BY_ID.common;
  const v = VARIANT_BY_ID[variantId] || VARIANT_BY_ID.normal;
  const w = size, h = size * 1.32;

  if (!small) shadowEllipse(ctx, x, y + h * 0.5, w * 0.8, w * 0.32, 0.25);
  this.aura(ctx, x, y - h * 0.1, size * (small ? 1.15 : 1.7), r, v, t);

  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createLinearGradient(0, -h, 0, h * 0.7);
  g.addColorStop(0, v.id === 'rainbow' ? rainbow(t * 1.2, 75) : r.c2);
  g.addColorStop(1, v.id === 'rainbow' ? rainbow(t * 1.2 + 1.5, 45) : r.c1);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.62, h * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1.2, size * 0.09); ctx.stroke();

  // 반점
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  const sd = (rarityId ? rarityId.length : 3);
  for (let i = 0; i < 5; i++) {
    const a = i * 2.3 + sd;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * w * 0.26, Math.sin(a * 1.7) * h * 0.28, w * 0.09, w * 0.07, a, 0, 7);
    ctx.fill();
  }
  // 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.2, -h * 0.28, w * 0.15, h * 0.13, -0.5, 0, 7);
  ctx.fill();
  ctx.restore();
},

/* ---------------------------------------------------------
 *  아우라 (등급별 이펙트)
 * ------------------------------------------------------- */
aura(ctx, x, y, R, r, v, t) {
  const kind = r.aura;
  if (kind === 'none' && v.id === 'normal') return;
  ctx.save();
  ctx.translate(x, y);

  const glowRing = (rad, col, a) => {
    const g = ctx.createRadialGradient(0, 0, rad * 0.15, 0, 0, rad);
    g.addColorStop(0, col.replace('ALPHA', a));
    g.addColorStop(1, col.replace('ALPHA', '0'));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, 7); ctx.fill();
  };
  const hex = c => {
    const n = parseInt(c.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  };
  const rgb = hex(r.glow);

  ctx.globalCompositeOperation = 'lighter';

  if (kind === 'bubble') {
    glowRing(R * 1.05, `rgba(${rgb},ALPHA)`, '0.30');
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.55 + i / 6) % 1;
      const bx = Math.sin(i * 4.1 + t * 1.3) * R * 0.5;
      ctx.globalAlpha = (1 - p) * 0.85;
      ctx.fillStyle = r.c2;
      ctx.beginPath(); ctx.arc(bx, R * 0.7 - p * R * 1.7, 2.2 + (1 - p) * 2.4, 0, 7); ctx.fill();
    }
  } else if (kind === 'spark') {
    glowRing(R * 1.10, `rgba(${rgb},ALPHA)`, '0.34');
    for (let i = 0; i < 7; i++) {
      const a = t * 2.0 + i * (Math.PI * 2 / 7);
      const rr = R * (0.72 + Math.sin(t * 3 + i) * 0.14);
      ctx.globalAlpha = 0.9;
      star(ctx, Math.cos(a) * rr, Math.sin(a) * rr * 0.62, 3.4, r.c2);
    }
  } else if (kind === 'shadow') {
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.15);
    g.addColorStop(0, 'rgba(20,0,8,0.55)');
    g.addColorStop(1, 'rgba(20,0,8,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 1.15, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) {
      const a = -t * 1.6 + i * 0.785;
      const rr = R * (0.85 + ((i % 3) * 0.13));
      ctx.globalAlpha = 0.35 + Math.abs(Math.sin(t * 9 + i)) * 0.6;
      ctx.fillStyle = '#ff2b4d';
      ctx.save();
      ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr * 0.68);
      ctx.rotate(a);
      ctx.fillRect(-1.6, -6, 3.2, 12);
      ctx.restore();
    }
  } else if (kind === 'halo') {
    glowRing(R * 1.15, 'rgba(255,212,71,ALPHA)', '0.34');
    ctx.globalAlpha = 0.17;
    ctx.fillStyle = '#ffe27a';
    for (let i = 0; i < 10; i++) {
      const a = t * 0.7 + i * (Math.PI / 5);
      ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(R * 1.12, -R * 0.07); ctx.lineTo(R * 1.12, R * 0.07);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#fff3ae'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.ellipse(0, -R * 0.92, R * 0.5, R * 0.16, 0, 0, 7); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = -t * 1.4 + i * 1.25;
      star(ctx, Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.58, 3.2, '#fff6c8');
    }
  } else if (kind === 'nebula') {
    glowRing(R * 1.30, 'rgba(122,92,255,ALPHA)', '0.38');
    for (let i = 0; i < 4; i++) {
      const a = t * 0.5 + i * 1.57;
      ctx.globalAlpha = 0.30;
      ctx.fillStyle = i % 2 ? '#43e8ff' : '#a06bff';
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.34, R * 0.62, R * 0.32, a, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(120,230,255,0.9)'; ctx.lineWidth = 2.4;
    ctx.save(); ctx.rotate(Math.sin(t * 0.5) * 0.4);
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.25, R * 0.38, 0, 0, 7); ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 10; i++) {
      const a = t * 1.1 + i * 0.628;
      const rr = R * (0.5 + ((i * 37) % 10) / 10 * 0.9);
      ctx.globalAlpha = 0.5 + Math.abs(Math.sin(t * 4 + i)) * 0.5;
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.cos(a) * rr, Math.sin(a) * rr * 0.6, 2, 2);
    }
  } else if (kind === 'eternal') {
    const c1 = rainbow(t * 1.6, 65);
    glowRing(R * 1.35, 'rgba(255,255,255,ALPHA)', '0.26');
    ctx.globalAlpha = 0.62;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = rainbow(t * 1.6 + i * 0.8, 65);
      ctx.lineWidth = 2.8;
      ctx.save(); ctx.rotate(t * (0.6 + i * 0.25) + i * 2);
      ctx.beginPath(); ctx.ellipse(0, 0, R * (1.12 - i * 0.15), R * (0.30 + i * 0.12), 0, 0, 7); ctx.stroke();
      ctx.restore();
    }
    // 빛기둥
    ctx.globalAlpha = 0.13;
    const lg = ctx.createLinearGradient(0, -R * 2.0, 0, R * 0.6);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(1, c1);
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(-R * 0.42, R * 0.4); ctx.lineTo(R * 0.42, R * 0.4);
    ctx.lineTo(R * 0.18, -R * 2.0); ctx.lineTo(-R * 0.18, -R * 2.0); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 8; i++) {
      const a = -t * 1.9 + i * 0.785;
      star(ctx, Math.cos(a) * R * 1.05, Math.sin(a) * R * 0.7, 4.4, rainbow(t * 2 + i * 0.4, 78));
    }
  } else if (kind === 'transcend') {
    /* 균열 — 현실이 찢어진 듯한 최상위 아우라 */
    R *= 1.45;
    ctx.globalCompositeOperation = 'source-over';
    const core = ctx.createRadialGradient(0, 0, R * 0.05, 0, 0, R * 0.95);
    core.addColorStop(0, 'rgba(4,4,10,0.92)');
    core.addColorStop(0.55, 'rgba(10,6,26,0.55)');
    core.addColorStop(1, 'rgba(10,6,26,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, 7); ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    /* 색수차 링 3겹 */
    const rings = [['#ff2fd0', -1], ['#5cf0ff', 0], ['#c9a2ff', 1]];
    rings.forEach(([col, off], i) => {
      ctx.save();
      ctx.rotate(t * (0.9 + i * 0.35) + i * 2.1);
      ctx.strokeStyle = col; ctx.lineWidth = 3.6;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.ellipse(off * 3, 0, R * (1.02 + i * 0.12), R * (0.30 + i * 0.12), 0, 0.3, 5.6);
      ctx.stroke();
      ctx.restore();
    });
    /* 바깥 후광 */
    ctx.globalAlpha = 0.5;
    const halo = ctx.createRadialGradient(0, 0, R * 0.55, 0, 0, R * 1.55);
    halo.addColorStop(0, 'rgba(201,162,255,0)');
    halo.addColorStop(0.6, 'rgba(201,162,255,0.45)');
    halo.addColorStop(1, 'rgba(92,240,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.55, 0, 7); ctx.fill();

    /* 찢어진 균열 조각 */
    ctx.globalAlpha = 1;
    for (let i = 0; i < 9; i++) {
      const a = -t * 1.25 + i * (Math.PI * 2 / 9);
      const rr = R * (1.05 + Math.sin(t * 2.4 + i * 1.7) * 0.18);
      ctx.save();
      ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr * 0.66);
      ctx.rotate(a + t * 1.6);
      ctx.fillStyle = i % 2 ? '#e7ccff' : '#8df5ff';
      ctx.beginPath();
      ctx.moveTo(0, -11); ctx.lineTo(4.8, -2); ctx.lineTo(2.2, 11);
      ctx.lineTo(-3.2, 1.8); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    /* 세로 균열선 — 주기적으로 번쩍 */
    const flash = Math.max(0, Math.sin(t * 2.1));
    ctx.globalAlpha = flash * 0.9;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const a = t * 0.55 + i * 1.57;
      ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(0, 0);
      let px = 0, py = 0;
      for (let k = 0; k < 4; k++) {
        px += R * 0.34; py += (k % 2 ? 1 : -1) * R * 0.16;
        ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.restore();
    }
    ctx.globalAlpha = flash * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.26 * flash, 0, 7); ctx.fill();
  }

  /* 변형 오버레이 */
  ctx.globalAlpha = 1;
  if (v.id === 'shiny') {
    for (let i = 0; i < 5; i++) {
      const a = t * 2.6 + i * 1.256;
      const rr = R * (0.95 + Math.sin(t * 3 + i) * 0.12);
      star(ctx, Math.cos(a) * rr, Math.sin(a) * rr * 0.66, 4.2, '#ffffff');
    }
  } else if (v.id === 'rainbow') {
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = rainbow(t * 2 + i * 0.9, 62);
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(0, 0, R * (0.95 + i * 0.12), t * 2 + i, t * 2 + i + 1.6);
      ctx.stroke();
    }
  }
  ctx.restore();
},

/* ---------------------------------------------------------
 *  펫 = 종족의 아기 버전 + 등급 색 + 아우라
 * ------------------------------------------------------- */
pet(ctx, x, y, pet, t, scale, running) {
  const r = RARITY_BY_ID[pet.rarity];
  const v = VARIANT_BY_ID[pet.variant];
  const sp = SPECIES[pet.species] || SPECIES.chicken;
  const fit = FORM_FIT[sp.form] || 1;
  const s = (scale || 1) * 0.82 * fit;
  const hh = (FORM_H[sp.form] || 50) * s;

  this.aura(ctx, x, y - hh * 0.52, Math.max(24, hh * 0.72), r, v, t);

  const rb = v.id === 'rainbow' ? rainbow(t * 1.4, 66) : mixColor(sp.body, r.c2, 0.55);
  const rb2 = v.id === 'rainbow' ? rainbow(t * 1.4 + 1.4, 44) : mixColor(sp.body2, r.c1, 0.55);
  const tinted = Object.assign({}, sp, { body: rb, body2: rb2 });

  const fake = {
    moving: !!running,
    phase: t * 11 + pet.seed,
    seed: pet.seed,
    state: 'calm', boss: false
  };

  ctx.save();
  ctx.translate(x, y);
  shadowEllipse(ctx, 0, 0, 14 * (scale || 1), 5 * (scale || 1), 0.25);
  ctx.scale(s, s);
  const bob = running ? Math.abs(Math.sin(fake.phase)) * 3 : Math.sin(t * 2.2 + pet.seed) * 1.6;
  ctx.translate(0, -bob);
  const F = this['form_' + sp.form] || this.form_chicken;
  F.call(this, ctx, fake, tinted, t);
  ctx.restore();
},

/* ---------------------------------------------------------
 *  게이지 바
 * ------------------------------------------------------- */
bar(ctx, x, y, w, h, p, color) {
  ctx.save();
  roundRect(ctx, x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, (h + 4) / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fill();
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill();
  if (p > 0) {
    ctx.save();
    roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.clip();
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y - h / 2, w * clamp(p, 0, 1), h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x - w / 2, y - h / 2, w * clamp(p, 0, 1), h * 0.4);
    ctx.restore();
  }
  ctx.restore();
},

/* ---------------------------------------------------------
 *  장식물 / 표지판
 * ------------------------------------------------------- */
prop(ctx, p, t) {
  const T = p.type;
  if (T === 'sign')      return this.sign(ctx, p, t);
  if (T === 'treadmill') return this.gym(ctx, p, t);
  if (T === 'penPad')    return this.padPlate(ctx, p, t);
  if (T === 'spawnPad')  return this.spawnPad(ctx, p, t);

  const s = p.s || 1;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);
  const sway = Math.sin(t * 1.2 + (p.seed || 0)) * 3;

  if (T === 'tree') {
    shadowEllipse(ctx, 0, 0, 26, 9, 0.26);
    block(ctx, -9, -72, 18, 72, '#8a5a32', { outline: true });
    block(ctx, -34 + sway, -104, 68, 44, '#3f9b3f', { outline: true });
    block(ctx, -25 + sway, -128, 50, 30, '#4fb14f', { outline: true });
    block(ctx, -15 + sway, -146, 30, 24, '#5cc45c', { outline: true });
  } else if (T === 'reed') {
    shadowEllipse(ctx, 0, 0, 18, 6, 0.2);
    for (let i = 0; i < 5; i++) {
      const x = -14 + i * 7, h = 40 + (i % 3) * 16;
      ctx.save(); ctx.translate(x, 0); ctx.rotate(Math.sin(t * 1.6 + i) * 0.09);
      ctx.fillStyle = '#4e9a5a'; ctx.fillRect(-2, -h, 4, h);
      ctx.fillStyle = '#7a5230'; ctx.fillRect(-3.5, -h - 12, 7, 13);
      ctx.restore();
    }
  } else if (T === 'cactus') {
    shadowEllipse(ctx, 0, 0, 20, 7, 0.24);
    block(ctx, -10, -70, 20, 70, '#4f9d54', { outline: true });
    block(ctx, -26, -56, 16, 12, '#4f9d54', { outline: true });
    block(ctx, -26, -80, 12, 26, '#4f9d54', { outline: true });
    block(ctx, 10, -46, 15, 11, '#4f9d54', { outline: true });
    block(ctx, 14, -66, 11, 22, '#4f9d54', { outline: true });
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 6; i++) ctx.fillRect(-2, -66 + i * 10, 2, 6);
  } else if (T === 'jungle') {
    shadowEllipse(ctx, 0, 0, 30, 10, 0.3);
    block(ctx, -10, -76, 20, 76, '#5b3d24', { outline: true });
    for (let i = 0; i < 6; i++) {
      const a = -0.35 + i * 0.62;
      ctx.save(); ctx.translate(0, -78); ctx.rotate(a + Math.sin(t * 1.1 + i) * 0.05);
      ctx.fillStyle = i % 2 ? '#2f8f45' : '#3fae55';
      ctx.beginPath(); ctx.ellipse(38, 0, 40, 13, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  } else if (T === 'coral') {
    shadowEllipse(ctx, 0, 0, 22, 8, 0.25);
    const cols = ['#ff7a9c', '#ffb347', '#7af0ff'];
    for (let i = 0; i < 4; i++) {
      const x = -16 + i * 10, h = 32 + (i % 3) * 18;
      ctx.save(); ctx.translate(x, 0); ctx.rotate(Math.sin(t * 1.3 + i) * 0.12);
      block(ctx, -4, -h, 8, h, cols[i % 3], { outline: true });
      block(ctx, -9, -h - 8, 18, 10, cols[(i + 1) % 3], { outline: true });
      ctx.restore();
    }
  } else if (T === 'volcano') {
    shadowEllipse(ctx, 0, 0, 34, 11, 0.3);
    ctx.fillStyle = '#4a2c1c';
    ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-16, -58); ctx.lineTo(16, -58); ctx.lineTo(40, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#ff5722'; ctx.fillRect(-16, -62, 32, 8);
    ctx.save(); ctx.globalAlpha = 0.55 + Math.sin(t * 3) * 0.3;
    ctx.fillStyle = '#ffb300';
    for (let i = 0; i < 4; i++) {
      const q = (t * 0.5 + i * 0.25) % 1;
      ctx.beginPath(); ctx.arc(Math.sin(i * 3 + t) * 12, -66 - q * 42, 5 - q * 4, 0, 7); ctx.fill();
    }
    ctx.restore();
  } else if (T === 'crystal') {
    shadowEllipse(ctx, 0, 0, 20, 7, 0.3);
    const hue = 200 + (p.seed || 0) * 14;
    for (let i = 0; i < 3; i++) {
      const x = -14 + i * 13, h = 40 + (i % 2) * 26;
      ctx.save(); ctx.translate(x, 0);
      ctx.fillStyle = `hsl(${hue + i * 22},80%,${58 + Math.sin(t * 2 + i) * 8}%)`;
      ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(8, -h * 0.4); ctx.lineTo(5, 0); ctx.lineTo(-5, 0); ctx.lineTo(-8, -h * 0.4); ctx.closePath();
      ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
},

sign(ctx, p, t) {
  const z = ZONE_BY_ID[p.zone];
  if (!z) return;
  const ok = Game.speed() >= z.need;
  ctx.save(); ctx.translate(p.x, p.y);
  shadowEllipse(ctx, 0, 0, 22, 7, 0.25);
  block(ctx, -5, -54, 10, 54, '#7a5230', { outline: true });
  const cap = RARITIES[z.maxTier];
  block(ctx, -76, -124, 152, 72, '#3a4152', { outline: true });
  ctx.strokeStyle = ok ? 'rgba(57,255,154,0.7)' : '#ff9f43';
  ctx.lineWidth = 3; ctx.strokeRect(-76, -124, 152, 72);
  outlineText(ctx, z.emoji + ' ' + z.name, 0, -106, 17, '#fff', '#000');
  outlineText(ctx, '펫 수익 ' + fmtMoney(z.speed) + '/초', 0, -87, 12, '#39ff9a', '#000');
  outlineText(ctx, '최고 등급 ' + cap.name, 0, -72, 12, cap.glow, '#000');
  outlineText(ctx, '권장 속도 ' + z.need + (ok ? ' ✔' : ' ⚠'), 0, -57, 12, ok ? '#8ed2ff' : '#ff9f43', '#000');
  ctx.restore();
},

gym(ctx, p, t) {
  const x = p.x, y = p.y;
  const on = Game.running;
  ctx.save();
  ctx.translate(x, y);
  shadowEllipse(ctx, 0, 30, 74, 19, 0.28);
  // 데크 (플레이어가 올라선다)
  block(ctx, -66, -10, 132, 50, '#39404f', { outline: true });
  ctx.save();
  ctx.beginPath(); ctx.rect(-64, -8, 128, 46); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  const off = on ? (t * 240) % 22 : 0;
  for (let i = -1; i < 9; i++) ctx.fillRect(-64 + i * 22 + off, -8, 10, 46);
  ctx.restore();
  // 레일
  block(ctx, -76, -20, 13, 66, '#8e9bb0', { outline: true });
  block(ctx, 63, -20, 13, 66, '#8e9bb0', { outline: true });
  // 콘솔
  block(ctx, -34, -86, 68, 32, '#8e9bb0', { outline: true });
  block(ctx, -9, -56, 18, 40, '#6d7a8d', { outline: true });
  ctx.fillStyle = on ? '#0d2c1e' : '#1b1f27';
  ctx.fillRect(-25, -79, 50, 19);
  outlineText(ctx, on ? Math.round(Game.speed()) + ' px/s' : 'READY',
    0, -69.5, on ? 12 : 11, on ? '#39ff9a' : '#5b6472', '#06140d', 900);
  outlineText(ctx, '🏃 러닝머신', 0, -156, 17, '#ffd54a', '#000');
  // 속도선
  if (on) {
    ctx.save();
    ctx.strokeStyle = '#8ef0ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const q = ((t * 2.2 + i * 0.2) % 1);
      ctx.globalAlpha = 1 - q;
      const yy = -40 + i * 11;
      ctx.beginPath(); ctx.moveTo(38 - q * 74, yy); ctx.lineTo(64 - q * 74, yy); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
},

/* 쓰러진 플레이어 */
downed(ctx, p, downT, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  shadowEllipse(ctx, 0, 0, 26, 9, 0.30);
  ctx.rotate(Math.PI / 2 * 0.92);
  ctx.scale(0.96, 0.96);
  block(ctx, -14, -56, 28, 30, '#2f7dff', { outline: true });
  block(ctx, -25, -56, 11, 30, '#ffd54a', { outline: true });
  block(ctx, 14, -56, 11, 30, '#ffd54a', { outline: true });
  block(ctx, -13, -26, 12, 26, '#2b3140', { outline: true });
  block(ctx, 1, -26, 12, 26, '#2b3140', { outline: true });
  block(ctx, -12, -78, 24, 22, '#ffd54a', { outline: true });
  ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, -72); ctx.lineTo(-2, -66);
  ctx.moveTo(-2, -72); ctx.lineTo(-8, -66);
  ctx.moveTo(2, -72); ctx.lineTo(8, -66);
  ctx.moveTo(8, -72); ctx.lineTo(2, -66);
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const a = t * 4.5 + i * 2.1;
    star(ctx, p.x + Math.cos(a) * 22, p.y - 62 + Math.sin(a * 2) * 6, 6, '#ffd54a');
  }
},

/* 리스폰 지점 */
spawnPad(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const pulse = 0.5 + Math.sin(t * 2.2) * 0.22;
  ctx.globalAlpha = pulse * 0.55;
  ctx.fillStyle = '#39ff9a';
  ctx.beginPath(); ctx.ellipse(0, 0, 54, 26, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#39ff9a'; ctx.lineWidth = 3;
  ctx.setLineDash([12, 9]); ctx.lineDashOffset = -t * 22;
  ctx.beginPath(); ctx.ellipse(0, 0, 54, 26, 0, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 4; i++) {
    const q = ((t * 0.7 + i * 0.25) % 1);
    ctx.globalAlpha = (1 - q) * 0.7;
    ctx.strokeStyle = '#a9ffd2'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -q * 46, 40 * (1 - q * 0.5), 18 * (1 - q * 0.5), 0, 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  outlineText(ctx, '⛑ 리스폰 지점', 0, -50, 13, '#a9ffd2', '#04231a');
  ctx.restore();
},

padPlate(ctx, p, t) {
  const x = p.x, y = p.y;
  const can = Game.penSlots < CONFIG.pen.maxSlots;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.55 + Math.sin(t * 2.4) * 0.18;
  ctx.fillStyle = can ? '#39ff9a' : '#5b6472';
  roundRect(ctx, -52, -44, 104, 88, 12); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = can ? '#a9ffd2' : '#5b6472'; ctx.lineWidth = 3;
  roundRect(ctx, -52, -44, 104, 88, 12); ctx.stroke();
  outlineText(ctx, '울타리 확장', 0, -62, 14, '#fff', '#000');
  outlineText(ctx, can ? fmtMoney(Game.nextPenCost()) + '원' : 'MAX',
    0, 0, 17, can ? '#0b2018' : '#cfd6e0', can ? '#a9ffd2' : '#000');
  outlineText(ctx, `${Game.penUsed()} / ${Game.penSlots} 칸`, 0, 60, 13, '#cfd6e0', '#000');
  ctx.restore();
}

};

/* ---------- 보조 ---------- */
function shade(hexColor, amt) {
  const n = parseInt(hexColor.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= (1 + amt); g *= (1 + amt); b *= (1 + amt); }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function star(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.36;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

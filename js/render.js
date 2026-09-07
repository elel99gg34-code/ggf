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
 *  생물 (일반 몹 + 보스 공용)
 *  c = {x,y,sp,faceX,phase,moving,state,scale,boss,hasEgg,eggRarity,eggVariant}
 * ------------------------------------------------------- */
creature(ctx, c, t) {
  const sp = c.sp;
  const dir = c.faceX < 0 ? -1 : 1;
  const s = (c.scale || 1) * (sp.scale || 1);
  const float = sp.form === 'whale' || sp.form === 'skeleton';
  const bob = c.moving ? Math.abs(Math.sin(c.phase)) * 2.6 : Math.sin(t * (float ? 1.5 : 2) + c.seed) * (float ? 3.2 : 1.1);

  /* 알 — 몸 뒤 둥지 */
  if (c.hasEgg) {
    const ex = c.x - 22 * dir * Math.min(1.9, s);
    const ey = c.y - 6 - 12 * Math.max(0, s - 1);
    this.egg(ctx, ex, ey, 11 * Math.min(1.7, s), c.eggRarity, c.eggVariant, t, true);
  }

  ctx.save();
  ctx.translate(c.x, c.y);
  shadowEllipse(ctx, 0, 0, 19 * s, 7 * s, 0.26);
  ctx.scale(s * dir, s);
  ctx.translate(0, -bob);

  // 종족 오라
  if (c.boss || sp.glowAura) this.mobGlow(ctx, c.boss ? sp.glow : sp.accent, c.boss ? 62 : 40, t);
  else if (sp.id === 'skeleton' || sp.id === 'skullKing') this.mobGlow(ctx, sp.accent, 38, t);

  const F = this['form_' + sp.form] || this.form_chicken;
  F.call(this, ctx, c, sp, t);

  ctx.restore();

  /* 경고 */
  if (c.state === 'warn' || c.state === 'look') {
    const looking = c.state === 'look';
    ctx.save();
    ctx.globalAlpha = looking ? 1 : (0.5 + Math.sin(t * 30) * 0.5);
    outlineText(ctx, '❗', c.x, c.y - (26 + 52 * s), 26 + 14 * (c.boss ? 1 : 0),
      looking ? '#ff2b4d' : '#ffd54a', '#000');
    ctx.restore();
  }

  /* 보스 표식 */
  if (c.boss) this.bossPlate(ctx, c, t);
},

mobGlow(ctx, color, r, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const a = 0.34 + Math.sin(t * 2.4) * 0.08;
  const g = ctx.createRadialGradient(0, -r * 0.55, r * 0.08, 0, -r * 0.55, r);
  g.addColorStop(0, color);
  g.addColorStop(0.45, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r, r * 0.8, 0, 0, 7); ctx.fill();
  ctx.restore();
},

bossPlate(ctx, c, t) {
  const sp = c.sp;
  const S = (c.scale || 1) * (sp.scale || 1);
  const a = c.y - 60 * S - 26;          // 머리 위 기준선

  ctx.save();
  ctx.translate(c.x, a - 66);
  ctx.fillStyle = '#ffd54a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-18, 7); ctx.lineTo(-18, -7); ctx.lineTo(-9, 1); ctx.lineTo(0, -11);
  ctx.lineTo(9, 1); ctx.lineTo(18, -7); ctx.lineTo(18, 7);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();

  outlineText(ctx, sp.name, c.x, a - 42, 19, '#fff', '#000', 900);
  outlineText(ctx, sp.title, c.x, a - 22, 12, sp.glow, '#000', 800);

  const total = sp.eggs, left = c.eggsLeft;
  const bw = 17, gap = 5, W = total * bw + (total - 1) * gap;
  for (let i = 0; i < total; i++) {
    ctx.save();
    ctx.globalAlpha = i < left ? 1 : 0.22;
    outlineText(ctx, '🥚', c.x - W / 2 + i * (bw + gap) + bw / 2, a - 1, 17, '#fff', '#000');
    ctx.restore();
  }
  if (c.rage > 0) {
    ctx.save();
    ctx.globalAlpha = 0.65 + Math.sin(t * 9) * 0.35;
    outlineText(ctx, '분노 ' + '🔥'.repeat(c.rage), c.x, a + 20, 13, '#ff6b3d', '#000');
    ctx.restore();
  }
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
  const looking = c.state === 'look', warn = c.state === 'warn';
  if (looking) {
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, sz + 3, sz + 3);
    ctx.fillStyle = '#e01f3d'; ctx.fillRect(x + 0.6, y + 0.6, sz, sz);
  } else {
    ctx.fillStyle = warn ? '#ffd54a' : (color || '#1b1b1b');
    ctx.fillRect(x, y, sz, sz);
  }
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
 *  러닝머신
 * ------------------------------------------------------- */
treadmill(ctx, tm, t) {
  const cfg = TREADMILL_BY_ID[tm.kind];
  const x = tm.x, y = tm.y;
  ctx.save();
  ctx.translate(x, y);
  shadowEllipse(ctx, 0, 4, 40, 12, 0.28);

  // 벨트 바닥
  block(ctx, -34, -20, 68, 26, cfg.belt, { outline: true });
  // 움직이는 줄무늬
  ctx.save();
  ctx.beginPath(); ctx.rect(-33, -19, 66, 24); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  const off = (tm.pet ? (t * 90) % 16 : 0);
  for (let i = -1; i < 6; i++) ctx.fillRect(-33 + i * 16 + off, -19, 7, 24);
  ctx.restore();

  // 사이드 레일
  block(ctx, -40, -24, 8, 32, cfg.frame, { outline: true });
  block(ctx, 32, -24, 8, 32, cfg.frame, { outline: true });
  // 콘솔 (뒤쪽 · 위로)
  block(ctx, -19, -74, 38, 22, cfg.frame, { outline: true });
  block(ctx, -23, -54, 46, 7, shade(cfg.frame, -0.25), { outline: true });
  ctx.fillStyle = shade(cfg.frame, -0.4);
  ctx.fillRect(-4, -52, 8, 30);
  ctx.fillStyle = tm.pet ? '#0d2c1e' : '#1b1f27';
  ctx.fillRect(-14, -70, 28, 14);
  ctx.fillStyle = tm.pet ? '#39ff9a' : '#5b6472';
  for (let i = 0; i < 3; i++) ctx.fillRect(-10 + i * 8, -66 + (tm.pet ? (i * 3) % 5 : 2), 5, 5);
  ctx.restore();

  // 펫
  if (tm.pet) {
    this.pet(ctx, x, y - 10, tm.pet, t, 1.05, true);
    const inc = petIncome(tm.pet) * cfg.mult;
    const lab = ' ' + fmtMoney(inc) + '/초 ';
    ctx.save();
    ctx.font = '900 12px "Pretendard",system-ui,sans-serif';
    const w = ctx.measureText(lab).width + 8;
    roundRect(ctx, x - w / 2, y - 106, w, 20, 7);
    ctx.fillStyle = 'rgba(6,24,16,0.85)'; ctx.fill();
    ctx.strokeStyle = cfg.frame; ctx.lineWidth = 1.6; ctx.stroke();
    outlineText(ctx, lab, x, y - 96, 12, '#39ff9a', 'rgba(0,0,0,0)', 900);
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = 0.45 + Math.sin(t * 3) * 0.18;
    outlineText(ctx, '＋', x, y - 28, 26, '#fff', '#000');
    ctx.restore();
  }
},

/* ---------------------------------------------------------
 *  부화기
 * ------------------------------------------------------- */
incubator(ctx, inc, t) {
  const x = inc.x, y = inc.y;
  ctx.save();
  ctx.translate(x, y);
  shadowEllipse(ctx, 0, 4, 34, 11, 0.26);
  block(ctx, -30, -16, 60, 22, '#7c8798', { outline: true });
  block(ctx, -34, -22, 68, 8, '#9aa6b8', { outline: true });
  ctx.restore();

  /* 유리 돔 — 알 뒤 */
  ctx.save();
  ctx.globalAlpha = 0.30;
  const g = ctx.createLinearGradient(0, y - 60, 0, y - 10);
  g.addColorStop(0, 'rgba(190,225,255,0.35)');
  g.addColorStop(1, 'rgba(190,225,255,0.02)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y - 28, 27, 34, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(220,240,255,0.45)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  if (inc.egg) {
    const p = clamp(inc.grow / CONFIG.incubator.growTime, 0, 1);
    const shake = inc.ready ? Math.sin(t * 24) * 3 : Math.sin(t * (3 + p * 8)) * (1 + p * 1.6);
    this.egg(ctx, x + shake, y - 32 + Math.sin(t * 2) * 2, 22 + p * 6, inc.egg.rarity, inc.egg.variant, t, true);
    this.bar(ctx, x, y - 84, 58, 8, p, inc.ready ? '#39ff9a' : '#ffd54a');
    if (inc.ready) {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(t * 8) * 0.4;
      outlineText(ctx, '부화 준비!', x, y - 100, 13, '#39ff9a', '#062015');
      ctx.restore();
    }
  } else {
    ctx.save();
    ctx.globalAlpha = 0.45 + Math.sin(t * 3) * 0.18;
    outlineText(ctx, '＋', x, y - 34, 24, '#fff', '#000');
    ctx.restore();
  }
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
  if (T === 'fenceLine') return this.fenceLine(ctx, p);
  if (T === 'sign')      return this.sign(ctx, p, t);
  if (T === 'shop')      return this.shop(ctx, p, t);

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
  const unlocked = Game.unlocked[p.zone];
  ctx.save(); ctx.translate(p.x, p.y);
  shadowEllipse(ctx, 0, 0, 22, 7, 0.25);
  block(ctx, -5, -54, 10, 54, '#7a5230', { outline: true });
  block(ctx, -62, -102, 124, 52, unlocked ? '#3a4152' : '#2a2130', { outline: true });
  ctx.strokeStyle = unlocked ? 'rgba(255,255,255,0.35)' : '#ff5a5a';
  ctx.lineWidth = 3; ctx.strokeRect(-62, -102, 124, 52);
  outlineText(ctx, z.emoji + ' ' + z.name, 0, -84, 17, unlocked ? '#fff' : '#ff9a9a', '#000');
  outlineText(ctx, unlocked ? ('속도 ' + fmtMoney(z.speed) + '/초') : ('🔒 ' + fmtMoney(z.cost) + '원'),
    0, -64, 13, unlocked ? '#39ff9a' : '#ffd54a', '#000');
  ctx.restore();
},

shop(ctx, p, t) {
  ctx.save(); ctx.translate(p.x, p.y);
  shadowEllipse(ctx, 0, 0, 60, 16, 0.28);
  block(ctx, -54, -58, 108, 58, '#3a4152', { outline: true });
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#ff5a5a' : '#ffffff';
    ctx.fillRect(-60 + i * 20, -72, 20, 16);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(-60, -72, 120, 16);
  block(ctx, -42, -40, 84, 30, '#222834', { outline: true });
  outlineText(ctx, '상점', 0, -25, 18, '#ffd54a', '#000');
  ctx.save(); ctx.globalAlpha = 0.6 + Math.sin(t * 3) * 0.4;
  outlineText(ctx, '[B]', 0, -88, 15, '#fff', '#000');
  ctx.restore();
  ctx.restore();
},

fenceLine(ctx, p) {
  const inGap = o => p.gaps.some(([at, len]) => o >= at - 8 && o <= at + len + 4);
  for (let o = 0; o < p.len; o += 34) {
    if (inGap(o)) continue;
    if (p.horiz) {
      block(ctx, p.x + o, p.y - 34, 9, 40, '#c9a06a');
      ctx.fillStyle = '#b08b57';
      ctx.fillRect(p.x + o, p.y - 26, 34, 6); ctx.fillRect(p.x + o, p.y - 14, 34, 6);
    } else {
      block(ctx, p.x - 5, p.y + o, 9, 40, '#c9a06a');
      ctx.fillStyle = '#b08b57'; ctx.fillRect(p.x - 12, p.y + o + 10, 24, 6);
    }
  }
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

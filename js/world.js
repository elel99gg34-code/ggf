/* =========================================================
 *  world.js - 맵 레이아웃 / 충돌 / 지면 프리렌더
 *
 *  기지(울타리 · 러닝머신 · 확장 패드) 왼쪽,
 *  그 오른쪽으로 구역 7개가 벽 없이 이어진다. 어디든 자유롭게 갈 수 있다.
 * ========================================================= */

const ZONE_THEME = {
  farm:   { floor:'#7cc054', floor2:'#6bab48', fog:null,                     prop:'tree'    },
  pond:   { floor:'#5fb8d8', floor2:'#4aa3c6', fog:'rgba(60,180,220,0.10)',  prop:'reed'    },
  desert: { floor:'#e6c98a', floor2:'#d8b872', fog:'rgba(255,220,150,0.10)', prop:'cactus'  },
  jungle: { floor:'#2f6b3a', floor2:'#255a30', fog:'rgba(20,90,40,0.18)',    prop:'jungle'  },
  ocean:  { floor:'#1d4e86', floor2:'#173f6e', fog:'rgba(30,110,190,0.22)',  prop:'coral'   },
  dino:   { floor:'#6b4230', floor2:'#57351f', fog:'rgba(180,60,20,0.14)',   prop:'volcano' },
  space:  { floor:'#181334', floor2:'#110e26', fog:'rgba(70,40,160,0.20)',   prop:'crystal' }
};

const World = {
  w: CONFIG.world.w,
  h: CONFIG.world.h,

  base: { x: 60, y: 70, w: 900, h: 1260 },
  pen:  { x: 130, y: 160, w: 430, h: 700, gate: { x: 345, y: 860 } },
  treadmill: { x: 780, y: 400 },
  penPad:    { x: 780, y: 760 },
  spawn:     { x: 760, y: 1060 },

  zones: [],
  solids: [],
  props: [],
  nestSpots: [],
  ground: null,

  /* ---------------- 초기화 ---------------- */
  init() {
    const ZW = 770, ZH = 1260, ZY = 70;
    let x = 960;

    this.zones.push(Object.assign({ id: 'base', name: '내 기지' }, this.base,
      { floor: '#6f7d92', floor2: '#5d6a7d' }));

    for (const z of ZONES) {
      const th = ZONE_THEME[z.id];
      this.zones.push({
        id: z.id, name: z.name, x, y: ZY, w: ZW, h: ZH,
        floor: th.floor, floor2: th.floor2, fog: th.fog, prop: th.prop, cfg: z
      });
      x += ZW;
    }
    this.w = x + 70;
    CONFIG.world.w = this.w;

    /* 바깥 경계만 막는다 — 구역 사이엔 벽이 없다 */
    this.solids.push({ x: -60, y: -60, w: this.w + 120, h: 60 });
    this.solids.push({ x: -60, y: this.h, w: this.w + 120, h: 60 });
    this.solids.push({ x: -60, y: -60, w: 60, h: this.h + 120 });
    this.solids.push({ x: this.w, y: -60, w: 60, h: this.h + 120 });

    /* 울타리 — 아래쪽 게이트만 열려 있다 */
    const P = this.pen, T = 20;
    const gw = 96, gx = P.gate.x - gw / 2;
    this.solids.push({ x: P.x, y: P.y - T / 2, w: P.w, h: T });
    this.solids.push({ x: P.x - T / 2, y: P.y, w: T, h: P.h });
    this.solids.push({ x: P.x + P.w - T / 2, y: P.y, w: T, h: P.h });
    this.solids.push({ x: P.x, y: P.y + P.h - T / 2, w: gx - P.x, h: T });
    this.solids.push({ x: gx + gw, y: P.y + P.h - T / 2, w: P.x + P.w - gx - gw, h: T });
    this.props.push({ type: 'penFence', ...P, gapX: gx, gapW: gw });

    /* 기지 설비 */
    /* 둘 다 바닥 설비라 플레이어보다 먼저 그린다 (sort 키를 앞당김) */
    this.props.push({ type: 'treadmill', x: this.treadmill.x, y: this.treadmill.y, sort: this.treadmill.y - 70 });
    this.props.push({ type: 'penPad', x: this.penPad.x, y: this.penPad.y, sort: this.penPad.y - 90 });

    /* 구역별 둥지 + 장식 */
    for (const z of this.zones) {
      if (z.id === 'base') continue;
      const cols = [z.x + 150, z.x + 385, z.x + 620];
      const rows = [z.y + 190, z.y + 620, z.y + 1050];
      let k = 0;
      rows.forEach((ry, ri) => cols.forEach((cx, ci) => {
        if (ri === 1 && ci === 1) return;               // 가운데는 비워 통로
        const elite = (ri + ci) % 3 === 2;
        this.nestSpots.push({
          zone: z.id, spId: z.cfg.mobs[elite ? 1 : 0],
          x: cx + rand(-26, 26), y: ry + rand(-22, 22), i: k++
        });
      }));

      for (let i = 0; i < 9; i++) {
        const px = z.x + rand(60, z.w - 60), py = z.y + rand(60, z.h - 60);
        if (this.nestSpots.some(n => n.zone === z.id && dist2(n.x, n.y, px, py) < 150 * 150)) continue;
        this.props.push({ type: z.prop, x: px, y: py, s: rand(0.75, 1.3), seed: rand(0, 10) });
      }
      this.props.push({ type: 'sign', x: z.x + 66, y: z.y + z.h - 70, zone: z.id });
    }

    this.buildGround();
  },

  zoneAt(x, y) {
    for (const z of this.zones) if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z;
    return null;
  },
  zoneDef(id) { return this.zones.find(z => z.id === id); },
  inPen(x, y) {
    const P = this.pen;
    return x > P.x && x < P.x + P.w && y > P.y && y < P.y + P.h;
  },

  /* 원 vs 사각형 충돌 */
  resolve(p, r) {
    for (let pass = 0; pass < 2; pass++) {
      for (const s of this.solids) {
        const cx = clamp(p.x, s.x, s.x + s.w);
        const cy = clamp(p.y, s.y, s.y + s.h);
        const dx = p.x - cx, dy = p.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          p.x = cx + (dx / d) * r; p.y = cy + (dy / d) * r;
        } else {
          const l = p.x - s.x, rr = s.x + s.w - p.x, t = p.y - s.y, b = s.y + s.h - p.y;
          const m = Math.min(l, rr, t, b);
          if (m === l) p.x = s.x - r; else if (m === rr) p.x = s.x + s.w + r;
          else if (m === t) p.y = s.y - r; else p.y = s.y + s.h + r;
        }
      }
    }
    p.x = clamp(p.x, 20, this.w - 20);
    p.y = clamp(p.y, 20, this.h - 20);
  },

  /* ---------------- 지면 ---------------- */
  buildGround() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const g = c.getContext('2d');

    g.fillStyle = '#5c9b3e'; g.fillRect(0, 0, this.w, this.h);
    for (let i = 0; i < 3500; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      g.fillRect(Math.random() * this.w, Math.random() * this.h, rand(6, 22), rand(3, 7));
    }

    for (const z of this.zones) {
      g.fillStyle = z.floor; g.fillRect(z.x, z.y, z.w, z.h);
      g.fillStyle = z.floor2;
      const tile = 68;
      for (let ty = 0; ty < z.h; ty += tile)
        for (let tx = 0; tx < z.w; tx += tile)
          if (((tx / tile | 0) + (ty / tile | 0)) % 2)
            g.fillRect(z.x + tx, z.y + ty, Math.min(tile, z.w - tx), Math.min(tile, z.h - ty));
      for (let i = 0; i < 1100; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        g.fillRect(z.x + Math.random() * z.w, z.y + Math.random() * z.h, rand(5, 16), rand(3, 6));
      }
      this.themeGround(g, z);

      /* 구역 경계는 벽이 아니라 색 띠로만 표시 */
      if (z.id !== 'base') {
        const grd = g.createLinearGradient(z.x - 26, 0, z.x + 26, 0);
        grd.addColorStop(0, 'rgba(0,0,0,0.20)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.fillRect(z.x - 26, z.y, 52, z.h);
      }
    }

    /* 기지 바닥 격자 */
    const B = this.zoneDef('base');
    g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 3;
    for (let ty = B.y; ty < B.y + B.h; ty += 96) { g.beginPath(); g.moveTo(B.x, ty); g.lineTo(B.x + B.w, ty); g.stroke(); }
    for (let tx = B.x; tx < B.x + B.w; tx += 96) { g.beginPath(); g.moveTo(tx, B.y); g.lineTo(tx, B.y + B.h); g.stroke(); }

    /* 울타리 안쪽 잔디 */
    const P = this.pen;
    g.fillStyle = '#7ab74e';
    g.fillRect(P.x, P.y, P.w, P.h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
      g.fillRect(P.x + Math.random() * P.w, P.y + Math.random() * P.h, rand(5, 15), rand(3, 6));
    }

    /* 설비 발판 */
    const pad = (x, y, w, h, col) => {
      g.fillStyle = col; roundRect(g, x - w / 2, y - h / 2, w, h, 12); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.30)'; g.lineWidth = 3;
      g.setLineDash([10, 8]); g.stroke(); g.setLineDash([]);
    };
    pad(this.treadmill.x, this.treadmill.y + 16, 168, 140, 'rgba(0,0,0,0.20)');
    pad(this.penPad.x, this.penPad.y, 120, 108, 'rgba(57,255,154,0.14)');

    this.ground = c;
  },

  themeGround(g, z) {
    const R = (n, f) => { for (let i = 0; i < n; i++) f(z.x + Math.random() * z.w, z.y + Math.random() * z.h); };
    if (z.id === 'pond') {
      R(24, (x, y) => { g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.ellipse(x, y, rand(30, 90), rand(10, 26), 0, 0, 7); g.fill(); });
    } else if (z.id === 'desert') {
      R(38, (x, y) => { g.strokeStyle = 'rgba(180,140,80,0.35)'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, rand(40, 110), rand(8, 20), rand(-0.3, 0.3), 0, 7); g.stroke(); });
    } else if (z.id === 'jungle') {
      R(120, (x, y) => { g.fillStyle = `rgba(${randInt(40,90)},${randInt(120,190)},${randInt(50,90)},0.5)`; g.beginPath(); g.ellipse(x, y, rand(10, 26), rand(5, 12), rand(0, 3), 0, 7); g.fill(); });
    } else if (z.id === 'ocean') {
      R(48, (x, y) => { g.strokeStyle = 'rgba(140,215,255,0.22)'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, rand(20, 70), 0.2, 2.6); g.stroke(); });
      R(150, (x, y) => { g.fillStyle = 'rgba(255,255,255,0.30)'; g.fillRect(x, y, 3, 3); });
    } else if (z.id === 'dino') {
      R(28, (x, y) => { g.fillStyle = 'rgba(255,90,20,0.30)'; g.beginPath(); g.ellipse(x, y, rand(24, 70), rand(10, 26), rand(0, 3), 0, 7); g.fill(); });
      R(60, (x, y) => { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x, y, rand(8, 22), rand(5, 10)); });
    } else if (z.id === 'space') {
      R(700, (x, y) => { const s = rand(1, 3.4); g.fillStyle = `rgba(255,255,255,${rand(0.25,0.95)})`; g.fillRect(x, y, s, s); });
      R(6, (x, y) => {
        const gr = g.createRadialGradient(x, y, 4, x, y, 220);
        gr.addColorStop(0, `rgba(${randInt(80,200)},${randInt(60,160)},255,0.30)`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, 220, 0, 7); g.fill();
      });
    }
  }
};

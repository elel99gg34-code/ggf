/* =========================================================
 *  game.js - 상태 / 입력 / 게임 루프
 *
 *  둥지에서 알을 들면 자던 파수꾼이 깨어나 쫓아온다.
 *  잡히면 알을 떨어뜨린다. 도망쳐서 기지 울타리에 넣으면 부화,
 *  울타리 안의 펫이 돈을 벌고, 그 돈으로 러닝머신을 타서 속도를 올린다.
 * ========================================================= */

const Game = {
  money: 0, totalEarned: 0, stolen: 0, hatched: 0, caught: 0,
  best: null, speedLv: 0, penSlots: CONFIG.pen.baseSlots,
  carrying: null,          // {species,rarity,variant,fromNest}
  penEggs: [], penPets: [],
  dex: {}, tutorial: 0, lastSave: 0,
  runFill: 0,
  invuln: 0, downT: 0, deaths: 0,

  player: {
    x: World.spawn ? World.spawn.x : 700, y: 1080,
    facing: 'down', phase: 0, moving: false,
    stun: 0, kx: 0, ky: 0, shirt: '#2f7dff', hatColor: '#e33b3b'
  },

  nests: [], particles: [],
  cam: { x: 700, y: 1080, scale: 1 },
  time: 0, target: null, stealing: null, chasers: 0,

  /* ================= 초기화 ================= */
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    World.init();
    this.player.x = World.spawn.x; this.player.y = World.spawn.y;
    this.cam.x = this.player.x; this.cam.y = this.player.y;
    this.buildNests();
    this.load();
    Input.init(canvas);
    UI.init(this);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.lastT = now();
    requestAnimationFrame(() => this.loop());
  },

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));
    this.dpr = dpr; this.vw = w; this.vh = h;
    this.cam.scale = clamp(Math.min(w / 1420, h / 800), 0.48, 1.15);
  },

  buildNests() {
    this.nests = World.nestSpots.map((s, i) => {
      const sp = SPECIES[s.spId];
      const n = {
        i, zone: s.zone, spId: s.spId, sp,
        maxTier: ZONE_BY_ID[s.zone].maxTier,
        x: s.x, y: s.y, eggs: [], respawn: 0,
        gs: CONFIG.nest.guardScale,
        guard: {
          x: s.x + 78, y: s.y + 16, hx: s.x + 78, hy: s.y + 16,
          state: 'sleep', chaseT: 0, sleepT: 0,
          faceX: -1, phase: rand(0, 6), seed: rand(0, 10), moving: false
        }
      };
      this.rollNest(n);
      return n;
    });
  },

  /* 둥지를 알 4개로 채운다. 알마다 등급을 따로 굴린다 */
  rollNest(n) {
    n.eggs = [];
    for (let k = 0; k < CONFIG.nest.eggs; k++) n.eggs.push(this.rollEgg(n));
  },
  rollEgg(n) {
    const r = rollRarity(n.sp.luck, n.maxTier);
    const v = rollVariant();
    return { species: n.spId, rarity: r.id, variant: v.id };
  },
  /* 둥지 안에서 가장 높은 등급 (표시용) */
  nestTopTier(n) {
    let t = -1;
    for (const e of n.eggs) t = Math.max(t, RARITY_BY_ID[e.rarity].tier);
    return t;
  },

  /* ================= 저장 ================= */
  save() {
    try {
      localStorage.setItem(CONFIG.save.key, JSON.stringify({
        money: this.money, totalEarned: this.totalEarned, stolen: this.stolen,
        hatched: this.hatched, caught: this.caught, best: this.best,
        speedLv: this.speedLv, penSlots: this.penSlots, tutorial: this.tutorial,
        deaths: this.deaths,
        carrying: this.carrying, dex: this.dex,
        penEggs: this.penEggs.map(e => ({ egg: e.egg, t: e.t })),
        penPets: this.penPets.map(p => p.pet),
        px: this.player.x, py: this.player.y,
        savedAt: Date.now(), seq: _petSeq
      }));
    } catch (e) {}
  },

  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(CONFIG.save.key) || 'null'); } catch (e) {}
    if (!d) return;
    this.money = d.money || 0; this.totalEarned = d.totalEarned || 0;
    this.stolen = d.stolen || 0; this.hatched = d.hatched || 0;
    this.caught = d.caught || 0; this.best = d.best ?? null;
    this.deaths = d.deaths || 0;
    this.speedLv = d.speedLv || 0;
    this.penSlots = d.penSlots || CONFIG.pen.baseSlots;
    this.tutorial = d.tutorial || 0;
    this.carrying = d.carrying || null;
    this.dex = d.dex || {};
    _petSeq = d.seq || 1;
    (d.penEggs || []).forEach(e => this.addPenEgg(e.egg, e.t));
    (d.penPets || []).forEach(p => this.addPenPet(p));
    this.player.x = d.px || World.spawn.x; this.player.y = d.py || World.spawn.y;
    this.cam.x = this.player.x; this.cam.y = this.player.y;
    if (d.savedAt) {
      const secs = clamp((Date.now() - d.savedAt) / 1000, 0, CONFIG.offline.capHours * 3600);
      const gain = Math.floor(this.income() * secs * CONFIG.offline.rate);
      if (gain > 0 && secs > 30) {
        this.money += gain; this.totalEarned += gain;
        setTimeout(() => UI.toast(`오프라인 ${fmtTime(secs)} 동안 +${fmtMoney(gain)}원 💤`, '#39ff9a'), 500);
      }
    }
  },
  reset() { try { localStorage.removeItem(CONFIG.save.key); } catch (e) {} location.reload(); },

  /* ================= 파생 수치 ================= */
  speed() { return CONFIG.player.baseSpeed * (1 + CONFIG.player.perLevel * this.speedLv); },
  income() { return this.penPets.reduce((s, p) => s + petIncome(p.pet), 0); },
  nextSpeedCost() { return CONFIG.treadmill.cost(this.speedLv); },
  nextPenCost() { return CONFIG.pen.cost(this.penSlots); },
  penUsed() { return this.penEggs.length + this.penPets.length; },

  pop(x, y, text, color, size = 16) {
    this.particles.push({ x, y, vy: -46, life: 1.15, max: 1.15, text, color, size });
  },
  burst(x, y, color, n = 18, spread = 150) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, 6.283), sp = rand(40, spread);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: rand(0.5, 1.1), max: 1.1, color, size: rand(3, 7), box: true });
    }
  },

  /* ================= 업데이트 ================= */
  update(dt) {
    this.time += dt;
    this.updatePlayer(dt);
    this.updateNests(dt);
    this.updatePen(dt);
    this.updateStations(dt);
    this.updateSteal(dt);
    this.updateVitals(dt);
    this.updateParticles(dt);
    this.pickTarget();
    this.checkTutorial();

    const k = 1 - Math.pow(0.0015, dt);
    this.cam.x = lerp(this.cam.x, this.player.x, k);
    this.cam.y = lerp(this.cam.y, this.player.y - 40, k);
    const hw = this.canvas.width / (2 * this.cam.scale * this.dpr);
    const hh = this.canvas.height / (2 * this.cam.scale * this.dpr);
    this.cam.x = hw * 2 >= World.w ? World.w / 2 : clamp(this.cam.x, hw, World.w - hw);
    this.cam.y = hh * 2 >= World.h ? World.h / 2 : clamp(this.cam.y, hh, World.h - hh);

    if (this.time - this.lastSave > CONFIG.save.interval) { this.lastSave = this.time; this.save(); }
  },

  updatePlayer(dt) {
    const p = this.player;
    if (Math.abs(p.kx) + Math.abs(p.ky) > 1) {
      p.x += p.kx * dt; p.y += p.ky * dt;
      p.kx *= Math.pow(0.02, dt); p.ky *= Math.pow(0.02, dt);
      World.resolve(p, CONFIG.player.radius);
    }
    if (this.downT > 0 || p.stun > 0) { p.stun -= dt; p.moving = false; p.phase += dt * 20; return; }

    let ax = Input.dirX, ay = Input.dirY;
    const len = Math.hypot(ax, ay);
    if (len > 1) { ax /= len; ay /= len; }
    const busy = this.stealing || this.onTreadmill();
    const sp = busy ? 0 : this.speed() * (this.carrying ? CONFIG.player.carryPenalty : 1);
    p.x += ax * sp * dt; p.y += ay * sp * dt;
    p.moving = len > 0.06 && !busy;
    if (p.moving) {
      p.phase += dt * 12;
      if (Math.abs(ax) > Math.abs(ay)) p.facing = ax > 0 ? 'right' : 'left';
      else p.facing = ay > 0 ? 'down' : 'up';
    } else p.phase += dt * (this.running ? 16 : 2);
    World.resolve(p, CONFIG.player.radius);
  },

  /* ---------- 둥지 + 파수꾼 ---------- */
  updateNests(dt) {
    const p = this.player;
    let chasing = 0;

    for (const n of this.nests) {
      if (!n.eggs.length) { n.respawn -= dt; if (n.respawn <= 0) this.rollNest(n); }
      const g = n.guard, sp = n.sp;
      const far = Math.abs(n.x - this.cam.x) > 1500;

      if (g.state === 'chase') {
        chasing++;
        const d = dist(g.x, g.y, p.x, p.y);
        const a = Math.atan2(p.y - g.y, p.x - g.x);
        if (g.startle > 0) {            // 벌떡 일어나는 중 — 아직 못 움직인다
          g.startle -= dt;
          g.moving = false; g.faceX = Math.cos(a);
          continue;
        }
        g.chaseT -= dt;
        g.x += Math.cos(a) * sp.chase * dt;
        g.y += Math.sin(a) * sp.chase * dt;
        g.moving = true; g.phase += dt * 15; g.faceX = Math.cos(a);
        if (sp.quake && d < 420) UI.shake(Math.min(0.12, (420 - d) / 3600));
        if (d < CONFIG.steal.catchDist && p.stun <= 0 && this.invuln <= 0 && this.downT <= 0) this.getCaught(n);
        else if (g.chaseT <= 0 || d > 1400) {
          g.state = 'return';
          this.pop(g.x, g.y - 70, '...', '#cfd6e0', 18);
        }
        continue;
      }

      if (far) continue;

      if (g.state === 'return') {
        const d = dist(g.x, g.y, g.hx, g.hy);
        if (d > 8) {
          const a = Math.atan2(g.hy - g.y, g.hx - g.x);
          g.x += Math.cos(a) * sp.chase * 0.55 * dt;
          g.y += Math.sin(a) * sp.chase * 0.55 * dt;
          g.moving = true; g.phase += dt * 11; g.faceX = Math.cos(a);
        } else {
          g.moving = false;
          g.sleepT = (g.sleepT || 0) + dt;
          if (g.sleepT > CONFIG.steal.sleepAgain) {
            g.state = 'sleep'; g.sleepT = 0; g.x = g.hx; g.y = g.hy; g.faceX = -1;
            this.pop(g.x, g.y - 60, '💤', '#8ed2ff', 20);
          }
        }
      } else {  // sleep
        g.moving = false;
        g.phase += dt * 1.2;
      }
    }
    this.chasers = chasing;
  },

  wake(n, hard) {
    const g = n.guard;
    if (g.state === 'chase') { g.chaseT = Math.max(g.chaseT, n.sp.rage); return; }
    g.state = 'chase'; g.chaseT = n.sp.rage; g.sleepT = 0;
    g.startle = CONFIG.steal.startle;
    this.pop(g.x, g.y - 74, hard ? '꽥!!' : '음?', '#ff4d4d', hard ? 22 : 17);
    this.burst(g.x, g.y - 30, '#ffd54a', 10, 90);
    Sfx.play(hard ? 'wake' : 'tick');
  },

  getCaught(n) {
    const p = this.player;
    if (this.invuln > 0 || this.downT > 0) return;
    this.stealing = null;
    const a = Math.atan2(p.y - n.guard.y, p.x - n.guard.x);
    p.kx = Math.cos(a) * 620; p.ky = Math.sin(a) * 620;
    this.caught++;
    if (this.carrying) {
      const home = this.nests.find(q => q.i === this.carrying.fromNest) || n;
      /* 둥지는 항상 최대 4개까지만 — 그 사이 다시 찼으면 알은 그대로 사라진다 */
      if (home.eggs.length < CONFIG.nest.eggs) {
        home.eggs.unshift({ species: this.carrying.species, rarity: this.carrying.rarity, variant: this.carrying.variant });
        home.respawn = 0;
      }
      this.carrying = null;
      this.pop(p.x, p.y - 100, '알을 뺏겼다!', '#ff4d4d', 21);
    } else this.pop(p.x, p.y - 100, '잡혔다!', '#ff4d4d', 20);
    this.burst(p.x, p.y - 40, '#ff4d4d', 20, 190);
    n.guard.state = 'return';
    UI.shake(0.6);
    this.goDown();
    UI.refresh();
  },

  /* ---------- 쓰러짐 → 리스폰 ---------- */
  goDown() {
    const p = this.player;
    this.deaths++;
    this.downT = CONFIG.player.downTime;
    p.stun = CONFIG.player.downTime + 0.2;
    this.stealing = null;
    /* 들고 있던 알은 둥지로 되돌린다 */
    if (this.carrying) {
      const home = this.nests.find(q => q.i === this.carrying.fromNest);
      if (home && home.eggs.length < CONFIG.nest.eggs) {
        home.eggs.unshift({ species: this.carrying.species, rarity: this.carrying.rarity, variant: this.carrying.variant });
        home.respawn = 0;
      }
      this.carrying = null;
    }
    /* 추격 전부 해제 */
    for (const n of this.nests) if (n.guard.state === 'chase') n.guard.state = 'return';
    this.burst(p.x, p.y - 40, '#ff2b4d', 40, 300);
    UI.shake(0.8);
    UI.downOverlay(true);
    Sfx.play('down');
  },

  respawn() {
    const p = this.player;
    this.downT = 0;
    this.invuln = CONFIG.player.respawnGrace;
    p.stun = 0; p.kx = 0; p.ky = 0;
    p.x = World.spawn.x; p.y = World.spawn.y;
    this.cam.x = p.x; this.cam.y = p.y - 40;
    this.burst(p.x, p.y - 40, '#39ff9a', 30, 240);
    this.pop(p.x, p.y - 120, '리스폰!', '#39ff9a', 22);
    UI.downOverlay(false);
    UI.toast('기지에서 리스폰했어', '#39ff9a');
    Sfx.play('respawn');
    UI.refresh();
  },

  updateVitals(dt) {
    if (this.invuln > 0) this.invuln -= dt;
    if (this.downT > 0) {
      this.downT -= dt;
      if (this.downT <= 0) this.respawn();
    }
  },

  /* ---------- 훔치기 ---------- */
  updateSteal(dt) {
    const p = this.player;
    const holding = Input.action && p.stun <= 0;

    if (this.stealing) {
      const n = this.stealing.nest;
      if (!n.eggs.length || !holding || dist(n.x, n.y, p.x, p.y) > CONFIG.steal.reach * 1.4) {
        this.stealing = null; return;
      }
      this.stealing.t += dt;
      if (this.stealing.t >= n.sp.wake) this.takeEgg(n);
    } else if (holding && this.target && this.target.kind === 'nest') {
      if (this.carrying) {
        if (!this._w || this.time - this._w > 2) { this._w = this.time; UI.toast('알은 한 번에 하나만! 울타리에 먼저 넣어', '#ff9f43'); }
      } else this.stealing = { nest: this.target.ref, t: 0 };
    }
  },

  takeEgg(n) {
    const p = this.player;
    this.stealing = null;
    const egg = n.eggs.shift();
    this.carrying = Object.assign({}, egg, { fromNest: n.i });
    if (!n.eggs.length) n.respawn = CONFIG.nest.respawn;
    this.stolen++;
    const r = RARITY_BY_ID[this.carrying.rarity];
    this.pop(p.x, p.y - 100, r.name + ' 알 획득!', r.glow, 20);
    this.burst(n.x, n.y - 16, r.glow, 20, 170);
    Sfx.play('get');
    if (r.tier >= ANNOUNCE_TIER) UI.announce(this.carrying, '발견');
    if (n.eggs.length) this.pop(n.x, n.y - 34, `남은 알 ${n.eggs.length}개`, '#cfd6e0', 13);
    this.wake(n, true);
    UI.refresh();
  },

  /* ---------- 울타리 ---------- */
  addPenEgg(egg, t) {
    const P = World.pen;
    this.penEggs.push({
      egg, t: t || 0,
      x: P.x + rand(60, P.w - 60), y: P.y + rand(70, P.h - 90)
    });
  },
  addPenPet(pet) {
    const P = World.pen;
    const x = P.x + rand(60, P.w - 60), y = P.y + rand(70, P.h - 90);
    this.penPets.push({ pet, x, y, tx: x, ty: y, waitT: rand(0.5, 3), faceX: 1, phase: rand(0, 6), moving: false });
  },

  depositEgg() {
    if (!this.carrying) return;
    if (this.penUsed() >= this.penSlots) { UI.toast('울타리가 꽉 찼어! 확장 패드에서 넓혀', '#ff9f43'); return; }
    this.addPenEgg({ species: this.carrying.species, rarity: this.carrying.rarity, variant: this.carrying.variant }, 0);
    this.carrying = null;
    this.pop(World.pen.gate.x, World.pen.gate.y - 60, '울타리에 넣었다', '#8ed2ff', 15);
    Sfx.play('place');
    UI.refresh();
  },

  updatePen(dt) {
    /* 부화 */
    for (let i = this.penEggs.length - 1; i >= 0; i--) {
      const e = this.penEggs[i];
      e.t += dt;
      if (e.t < CONFIG.hatch.time) continue;
      this.penEggs.splice(i, 1);
      const pet = makePet(e.egg.species, e.egg.rarity, e.egg.variant);
      this.addPenPet(pet);
      this.hatched++;
      const key = pet.species + ':' + pet.rarity;
      this.dex[key] = (this.dex[key] || 0) + 1;
      const r = RARITY_BY_ID[pet.rarity];
      if (this.best === null || r.tier > this.best) this.best = r.tier;
      this.burst(e.x, e.y - 20, r.glow, 30, 220);
      if (r.tier >= ANNOUNCE_TIER) { UI.announce(e.egg, '부화'); UI.shake(0.4); }
      UI.showReveal(pet);
      Sfx.play(r.tier >= ANNOUNCE_TIER ? 'rare' : 'hatch');
      UI.refresh();
    }

    /* 펫 배회 */
    const P = World.pen;
    for (const q of this.penPets) {
      q.waitT -= dt;
      if (q.waitT <= 0) {
        q.tx = clamp(q.x + rand(-140, 140), P.x + 45, P.x + P.w - 45);
        q.ty = clamp(q.y + rand(-120, 120), P.y + 55, P.y + P.h - 45);
        q.waitT = rand(1.2, 4);
      }
      const d = dist(q.x, q.y, q.tx, q.ty);
      if (d > 5) {
        const a = Math.atan2(q.ty - q.y, q.tx - q.x);
        q.x += Math.cos(a) * 52 * dt; q.y += Math.sin(a) * 52 * dt;
        q.moving = true; q.phase += dt * 12; q.faceX = Math.cos(a);
      } else q.moving = false;
    }

    /* 수익 */
    const inc = this.income();
    if (inc > 0) {
      this.money += inc * dt; this.totalEarned += inc * dt;
      this._mt = (this._mt || 0) + dt;
      if (this._mt > 1.2 && this.penPets.length) {
        this._mt = 0;
        const q = pick(this.penPets);
        this.pop(q.x, q.y - 44, '+' + fmtMoney(petIncome(q.pet)), '#39ff9a', 13);
      }
    }
  },

  /* ---------- 러닝머신 / 확장 패드 ---------- */
  onTreadmill() { return dist(this.player.x, this.player.y, World.treadmill.x, World.treadmill.y) < 62; },
  onPenPad()    { return dist(this.player.x, this.player.y, World.penPad.x, World.penPad.y) < 66; },

  updateStations(dt) {
    this.running = false;
    if (!(this.onTreadmill() && Input.action && this.player.stun <= 0)) { return; }

    const cost = this.nextSpeedCost();
    const drain = cost / CONFIG.treadmill.fillTime;
    if (this.money < drain * dt) {
      if (!this._nm || this.time - this._nm > 1.6) {
        this._nm = this.time;
        UI.toast(`돈이 부족해 — 다음 속도까지 ${fmtMoney(cost)}원`, '#ff6b6b');
      }
      return;
    }
    this.running = true;
    this.money -= drain * dt;
    this.runFill += dt / CONFIG.treadmill.fillTime;
    if (this.runFill >= 1) {
      this.runFill = 0;
      this.speedLv++;
      this.pop(World.treadmill.x, World.treadmill.y - 90, `속도 Lv.${this.speedLv}!`, '#39ff9a', 20);
      this.burst(World.treadmill.x, World.treadmill.y - 40, '#39ff9a', 24, 200);
      UI.toast(`속도 Lv.${this.speedLv} — ${Math.round(this.speed())} px/s`, '#39ff9a');
      Sfx.play('buy'); UI.refresh();
    }
  },

  expandPen() {
    if (this.penSlots >= CONFIG.pen.maxSlots) { UI.toast('울타리가 최대야', '#ff9f43'); return; }
    const c = this.nextPenCost();
    if (this.money < c) { UI.toast(`${fmtMoney(c)}원 필요해`, '#ff6b6b'); return; }
    this.money -= c; this.penSlots++;
    this.pop(World.penPad.x, World.penPad.y - 70, `울타리 ${this.penSlots}칸!`, '#39ff9a', 18);
    UI.toast(`울타리 확장 — ${this.penSlots}칸`, '#39ff9a');
    Sfx.play('buy'); UI.refresh();
  },

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life -= dt;
      if (q.life <= 0) { this.particles.splice(i, 1); continue; }
      if (q.box) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 420 * dt; }
      else { q.y += q.vy * dt; q.vy += 34 * dt; }
    }
  },

  /* ---------- 상호작용 ---------- */
  pickTarget() {
    const p = this.player;
    let best = null;
    const C = (kind, ref, x, y, label, range) => {
      const d = dist(p.x, p.y, x, y);
      if (d > range) return;
      if (!best || d < best.dist) best = { kind, ref, label, dist: d, x, y };
    };
    for (const n of this.nests) {
      if (!n.eggs.length) continue;
      if (Math.abs(n.x - this.cam.x) > 1200) continue;
      const r = RARITY_BY_ID[n.eggs[0].rarity];
      C('nest', n, n.x, n.y, `${r.name} 알 훔치기 (남은 ${n.eggs.length})`, CONFIG.steal.reach);
    }
    const G = World.pen.gate;
    if (this.carrying) C('pen', null, G.x, G.y, '울타리에 넣기', 90);
    C('run', null, World.treadmill.x, World.treadmill.y,
      `달리기 — Lv.${this.speedLv + 1} ${fmtMoney(this.nextSpeedCost())}원`, 62);
    if (this.penSlots < CONFIG.pen.maxSlots)
      C('pad', null, World.penPad.x, World.penPad.y, `울타리 확장 ${fmtMoney(this.nextPenCost())}원`, 66);
    this.target = best;
  },

  interact() {
    const t = this.target;
    if (!t || this.player.stun > 0) return;
    if (t.kind === 'pen') this.depositEgg();
    else if (t.kind === 'pad') this.expandPen();
  },

  /* ---------- 튜토리얼 ---------- */
  checkTutorial() {
    const s = TUTORIAL[this.tutorial];
    if (!s) return;
    let done = false;
    switch (s.id) {
      case 'move':   done = (this._moved || 0) > 240; break;
      case 'goFarm': done = World.zoneAt(this.player.x, this.player.y)?.id === 'farm'; break;
      case 'steal':  done = this.stolen > 0; break;
      case 'escape': done = !!this.carrying && World.zoneAt(this.player.x, this.player.y)?.id === 'base'; break;
      case 'pen':    done = this.penUsed() > 0; break;
      case 'run':    done = this.speedLv > 0; break;
      case 'far':    done = this.stolen > 3 && this.speedLv > 1; break;
    }
    if (!done) return;
    this.tutorial++;
    UI.refresh();
    if (this.tutorial >= TUTORIAL.length) { UI.toast('튜토리얼 완료! 더 먼 구역을 노려봐 👑', '#ffd54a'); Sfx.play('rare'); }
    else Sfx.play('ready');
  },

  tutorialTarget() {
    const s = TUTORIAL[this.tutorial];
    if (!s) return null;
    switch (s.id) {
      case 'goFarm':
      case 'steal': {
        let b = null, bd = 1e9;
        for (const n of this.nests) {
          if (n.zone !== 'farm' || !n.eggs.length) continue;
          const d = dist2(n.x, n.y, this.player.x, this.player.y);
          if (d < bd) { bd = d; b = n; }
        }
        return b;
      }
      case 'escape':
      case 'pen': return World.pen.gate;
      case 'run': return World.treadmill;
      case 'far': {
        const z = World.zoneDef('pond');
        return { x: z.x + z.w / 2, y: z.y + z.h / 2 };
      }
    }
    return null;
  },

  /* ================= 렌더 ================= */
  render() {
    const ctx = this.ctx, t = this.time;
    const S = this.cam.scale * this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0e16';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const sh = UI.shakeAmt;
    const ox = this.canvas.width / 2 - this.cam.x * S + (sh ? rand(-10, 10) * sh : 0);
    const oy = this.canvas.height / 2 - this.cam.y * S + (sh ? rand(-10, 10) * sh : 0);
    ctx.setTransform(S, 0, 0, S, ox, oy);
    ctx.drawImage(World.ground, 0, 0);

    for (const z of World.zones) {
      if (z.id === 'base' || !z.fog) continue;
      ctx.fillStyle = z.fog; ctx.fillRect(z.x, z.y, z.w, z.h);
    }

    const vis = 1050 / this.cam.scale;
    const near = (x, y) => Math.abs(x - this.cam.x) < vis && Math.abs(y - this.cam.y) < vis;
    const list = [];

    for (const p of World.props) {
      if (p.type === 'penFence') { Draw.penFence(ctx, p, t); continue; }
      if (!near(p.x, p.y)) continue;
      list.push({ y: p.sort ?? p.y, f: () => Draw.prop(ctx, p, t) });
    }
    for (const n of this.nests) {
      if (!near(n.x, n.y)) continue;
      list.push({ y: n.y + 2, f: () => Draw.nest(ctx, n, t) });
      const g = n.guard;
      list.push({ y: g.y, f: () => Draw.guardian(ctx, n, t) });
    }
    for (const e of this.penEggs) {
      list.push({ y: e.y, f: () => Draw.penEgg(ctx, e, t) });
    }
    for (const q of this.penPets) {
      list.push({ y: q.y, f: () => Draw.pet(ctx, q.x, q.y, q.pet, t, 1.0, q.moving) });
    }
    const p = this.player;
    const blink = this.invuln > 0 && Math.floor(this.time * 12) % 2 === 0;
    if (this.downT <= 0) list.push({ y: p.y, f: () => {
      if (blink) ctx.globalAlpha = 0.35;
      Draw.avatar(ctx, {
        x: p.x, y: p.y, facing: p.facing, phase: p.phase,
        moving: p.moving || this.running, shirt: p.shirt, hatColor: p.hatColor,
        carry: !!this.carrying, stunned: p.stun > 0
      });
      ctx.globalAlpha = 1;
    } });
    else list.push({ y: p.y, f: () => Draw.downed(ctx, p, this.downT, t) });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.f();

    for (const n of this.nests) {
      if (n.guard.state === 'chase' && near(n.guard.x, n.guard.y)) Draw.guardianTag(ctx, n, t);
    }

    if (this.carrying) {
      Draw.egg(ctx, p.x, p.y - 56 + Math.sin(t * 3) * 1.5, 21, this.carrying.rarity, this.carrying.variant, t, true);
    }

    /* 훔치는 중 게이지 */
    if (this.stealing) {
      const n = this.stealing.nest;
      Draw.bar(ctx, n.x, n.y - 62, 84, 10, this.stealing.t / n.sp.wake, '#ffd54a');
      outlineText(ctx, '조용히...', n.x, n.y - 80, 14, '#ffd54a', '#000');
    }

    /* 러닝머신 게이지 */
    if (this.onTreadmill()) {
      const T = World.treadmill;
      Draw.bar(ctx, T.x, T.y - 108, 118, 11, this.runFill, this.running ? '#39ff9a' : '#5b6472');
      outlineText(ctx, `Lv.${this.speedLv} → ${this.speedLv + 1}`, T.x, T.y - 128, 14, '#fff', '#000');
    }

    /* 상호작용 프롬프트 */
    if (this.target && !this.stealing) {
      const tg = this.target;
      const y = tg.y - (tg.kind === 'nest' ? 56 : 74);
      const label = ` [E] ${tg.label} `;
      ctx.save();
      ctx.font = '800 15px "Pretendard",system-ui,sans-serif';
      const w = ctx.measureText(label).width + 14;
      roundRect(ctx, tg.x - w / 2, y - 15, w, 29, 9);
      ctx.fillStyle = 'rgba(10,12,18,0.88)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
      outlineText(ctx, label, tg.x, y, 15, '#fff', 'rgba(0,0,0,0)');
      ctx.restore();
    }

    const tt = this.tutorialTarget();
    if (tt && dist(p.x, p.y, tt.x, tt.y) > 110) {
      const a = Math.atan2(tt.y - p.y, tt.x - p.x);
      const rr = 66 + Math.sin(t * 5) * 8;
      ctx.save();
      ctx.translate(p.x + Math.cos(a) * rr, p.y - 40 + Math.sin(a) * rr);
      ctx.rotate(a);
      ctx.fillStyle = '#ffd54a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-10, -13); ctx.lineTo(-4, 0); ctx.lineTo(-10, 13);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    for (const q of this.particles) {
      ctx.save(); ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
      if (q.box) { ctx.fillStyle = q.color; ctx.fillRect(q.x, q.y, q.size, q.size); }
      else outlineText(ctx, q.text, q.x, q.y, q.size, q.color, '#000');
      ctx.restore();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.renderMinimap();
  },

  renderMinimap() {
    const mm = UI.minimap; if (!mm) return;
    const g = mm.getContext('2d');
    const W = mm.width, H = mm.height;
    const sx = W / World.w, sy = H / World.h;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(12,15,22,0.9)'; g.fillRect(0, 0, W, H);
    for (const z of World.zones) {
      g.fillStyle = z.floor;
      g.fillRect(z.x * sx, z.y * sy, z.w * sx, z.h * sy);
    }
    for (const n of this.nests) {
      if (!n.eggs.length) continue;
      const t = this.nestTopTier(n);
      const big = t >= ANNOUNCE_TIER;
      g.fillStyle = RARITIES[t].glow;
      g.fillRect(n.x * sx - (big ? 2 : 1), n.y * sy - (big ? 2 : 1), big ? 5 : 3, big ? 5 : 3);
    }
    for (const n of this.nests) {
      if (n.guard.state !== 'chase') continue;
      g.fillStyle = '#ff3b3b';
      g.fillRect(n.guard.x * sx - 2, n.guard.y * sy - 2, 4, 4);
    }
    const p = this.player;
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(p.x * sx, p.y * sy, 3.6, 0, 7); g.fill();
    g.strokeStyle = '#000'; g.lineWidth = 1.4; g.stroke();
  },

  loop() {
    const t = now();
    let dt = Math.min(t - this.lastT, 0.05);
    this.lastT = t;
    Input.update();
    if (this.player.moving) this._moved = (this._moved || 0) + this.speed() * dt;
    this.update(dt);
    UI.tick(dt);
    this.render();
    UI.fastRefresh();
    requestAnimationFrame(() => this.loop());
  }
};

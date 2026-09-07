/* =========================================================
 *  sfx.js - WebAudio 간이 효과음
 * ========================================================= */
const Sfx = {
  ctx: null, muted: false,
  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur, type = 'square', vol = 0.16, when = 0, slide = 0) {
    const c = this.ensure(); if (!c || this.muted) return;
    const t0 = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  play(name) {
    if (this.muted) return;
    switch (name) {
      case 'tick':  this.tone(560, 0.05, 'square', 0.08); break;
      case 'get':   this.tone(660, 0.09); this.tone(880, 0.11, 'square', 0.14, 0.08); break;
      case 'place': this.tone(420, 0.08); this.tone(560, 0.10, 'triangle', 0.12, 0.07); break;
      case 'ready': this.tone(740, 0.09, 'triangle'); this.tone(980, 0.12, 'triangle', 0.13, 0.09); break;
      case 'buy':   this.tone(520, 0.08); this.tone(700, 0.08, 'square', 0.14, 0.07); this.tone(940, 0.14, 'square', 0.14, 0.14); break;
      case 'fail':  this.tone(220, 0.20, 'sawtooth', 0.15, 0, 0.4); break;
      case 'boss':  this.tone(110, 0.35, 'sawtooth', 0.20, 0, 0.6); this.tone(160, 0.30, 'square', 0.10, 0.05, 0.5); break;
      case 'hatch': [523, 659, 784].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.14, i * 0.08)); break;
      case 'rare':  [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.17, 'triangle', 0.16, i * 0.09)); break;
    }
  }
};

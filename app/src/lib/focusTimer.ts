// 집중 타이머 상태. 페이지를 옮겨도 계속 돌도록 화면 밖(모듈)에서 관리한다.
import { api } from "./api";

export type Running = { id: number; kind: "focus" | "break"; label: string; endsAt: number; minutes: number };
const KEY = "lb-focus-running";
const listeners = new Set<() => void>();

function read(): Running | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

function write(r: Running | null) {
  try {
    if (r) localStorage.setItem(KEY, JSON.stringify(r));
    else localStorage.removeItem(KEY);
  } catch {
    /* 저장소를 못 쓰면 이번 실행 동안만 유지 */
  }
  memo = r;
  listeners.forEach((l) => l());
}

let memo: Running | null = read();

export const focusTimer = {
  get: () => memo,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  async start(kind: "focus" | "break", minutes: number, label: string) {
    const s = await api.post<{ id: number }>("/focus/start", { kind, planned_minutes: minutes, label });
    write({ id: s.id, kind, label, minutes, endsAt: Date.now() + minutes * 60_000 });
  },
  async stop(completed: boolean) {
    const r = memo;
    write(null);
    if (r) await api.post(`/focus/${r.id}/stop`, { completed }).catch(() => {});
  },
};

function chime() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = [660, 880, 990][i];
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.25);
    });
  } catch {
    /* 소리를 못 내도 괜찮다 */
  }
}

let started = false;
export function runFocusWatcher(onFinish: (r: Running) => void) {
  if (started) return;
  started = true;
  window.setInterval(() => {
    const r = memo;
    if (r && Date.now() >= r.endsAt) {
      focusTimer.stop(true);
      chime();
      onFinish(r);
    }
    listeners.forEach((l) => l());
  }, 1000);
}

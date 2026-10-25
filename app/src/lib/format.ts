export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export function won(n: number | null | undefined): string {
  return n == null ? "-" : `${n.toLocaleString("ko-KR")}원`;
}

export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString("ko-KR", {
    year: sameYear ? undefined : "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: iso.length > 10 ? "2-digit" : undefined,
    minute: iso.length > 10 ? "2-digit" : undefined,
  });
}

export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

export function dueLabel(due: string | null | undefined): { text: string; tone: "late" | "today" | "soon" | "" } {
  if (!due) return { text: "", tone: "" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due.slice(0, 10) + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { text: `${-diff}일 지남`, tone: "late" };
  if (diff === 0) return { text: "오늘", tone: "today" };
  if (diff === 1) return { text: "내일", tone: "soon" };
  if (diff < 7) return { text: `${diff}일 뒤`, tone: "soon" };
  return { text: dateTime(due), tone: "" };
}

/** 브라우저 현지 시간 기준 YYYY-MM-DD (toISOString은 UTC라 아침에 하루가 밀린다). */
export function localDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

import { engineInfo, isTauri } from "./platform";

let base = (import.meta.env.VITE_ENGINE_URL as string | undefined) ?? "http://127.0.0.1:8765";
let token = (import.meta.env.VITE_ENGINE_TOKEN as string | undefined) ?? "";

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
  get component(): string | undefined {
    return this.data.component as string | undefined;
  }
}

export async function initEngine(): Promise<void> {
  if (isTauri) {
    const info = await engineInfo();
    base = info.url;
    token = info.token;
  }
  // 엔진이 막 떠서 아직 준비 중일 수 있으니 잠깐 기다린다.
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) return;
    } catch {
      /* 아직 안 떴음 */
    }
    await new Promise((res) => setTimeout(res, 200));
  }
  throw new Error("엔진에 연결하지 못했어요. 앱을 다시 실행해 주세요.");
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-Biseo-Token": token },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("엔진과 연결이 끊겼어요.", 0);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 402) window.dispatchEvent(new Event("lb-license-required"));
    throw new ApiError((data && data.error) || `오류 (${res.status})`, res.status, data || {});
  }
  return data as T;
}

export const api = {
  get: <T,>(path: string, params?: Record<string, string | number | undefined>) => {
    const q = params
      ? "?" +
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    return request<T>("GET", path + q);
  },
  post: <T,>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  put: <T,>(path: string, body: unknown = {}) => request<T>("PUT", path, body),
  patch: <T,>(path: string, body: unknown = {}) => request<T>("PATCH", path, body),
  del: <T,>(path: string) => request<T>("DELETE", path),
};

export type Job<R = any> = {
  id: string;
  kind: string;
  title: string;
  status: "queued" | "running" | "done" | "error" | "cancelled";
  progress: number;
  message: string;
  result: R | null;
  error: string | null;
};

export type JobRef = { job_id: string; job: Job };

export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

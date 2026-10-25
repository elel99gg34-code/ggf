// 데스크톱(Tauri)과 브라우저 개발 모드 사이의 차이를 감춘다.
import { invoke } from "@tauri-apps/api/core";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export type Filter = { name: string; extensions: string[] };

function promptPaths(message: string, multiple: boolean): string[] {
  const raw = window.prompt(`${message}\n(브라우저 개발 모드: 전체 경로를 입력${multiple ? ", 여러 개는 ; 로 구분" : ""})`);
  if (!raw) return [];
  return raw
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function pickFiles(opts: { multiple?: boolean; filters?: Filter[]; directory?: boolean; title?: string } = {}): Promise<string[]> {
  if (!isTauri) return promptPaths(opts.directory ? "폴더 경로" : "파일 경로", !!opts.multiple);
  const { open } = await import("@tauri-apps/plugin-dialog");
  const res = await open({ multiple: !!opts.multiple, directory: !!opts.directory, filters: opts.filters, title: opts.title });
  if (!res) return [];
  return Array.isArray(res) ? res : [res];
}

export async function pickSavePath(defaultPath: string, filters?: Filter[]): Promise<string | null> {
  if (!isTauri) return promptPaths(`저장할 경로 (기본: ${defaultPath})`, false)[0] ?? null;
  const { save } = await import("@tauri-apps/plugin-dialog");
  return save({ defaultPath, filters });
}

export async function reveal(path: string): Promise<void> {
  if (!isTauri) {
    await copyText(path);
    return;
  }
  const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
  await revealItemInDir(path);
}

export async function openPath(path: string): Promise<void> {
  if (!isTauri) {
    await copyText(path);
    return;
  }
  const { openPath: op } = await import("@tauri-apps/plugin-opener");
  await op(path);
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export async function captureScreen(): Promise<string> {
  if (!isTauri) throw new Error("화면 캡처는 데스크톱 앱에서만 돼요. 이미지 파일을 골라 주세요.");
  return invoke<string>("capture_screen");
}

export async function engineInfo(): Promise<{ url: string; token: string }> {
  return invoke("engine_info");
}

type DropHandler = (paths: string[]) => void;
const dropHandlers: DropHandler[] = [];

/** 창에 파일을 끌어다 놓으면 가장 최근에 등록한 받는 곳으로 전달한다. */
export function onFileDrop(handler: DropHandler): () => void {
  dropHandlers.push(handler);
  return () => {
    const i = dropHandlers.lastIndexOf(handler);
    if (i >= 0) dropHandlers.splice(i, 1);
  };
}

export async function installDropListener(onHover: (hovering: boolean) => void): Promise<void> {
  if (!isTauri) return;
  const { getCurrentWebview } = await import("@tauri-apps/api/webview");
  await getCurrentWebview().onDragDropEvent((event) => {
    const p = event.payload;
    if (p.type === "enter" || p.type === "over") onHover(true);
    else if (p.type === "leave") onHover(false);
    else if (p.type === "drop") {
      onHover(false);
      const h = dropHandlers[dropHandlers.length - 1];
      if (h && p.paths.length) h(p.paths);
    }
  });
}

export async function listen<T>(event: string, cb: (payload: T) => void): Promise<() => void> {
  if (!isTauri) return () => {};
  const { listen: l } = await import("@tauri-apps/api/event");
  return l<T>(event, (e) => cb(e.payload));
}

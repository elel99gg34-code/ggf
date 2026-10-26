import { createContext, useContext, useEffect, type ReactNode } from "react";
import { api } from "../lib/api";
import { useData } from "../lib/hooks";
import { Notice } from "./ui";

export type ComponentStatus = { key: string; label: string; available: boolean; used_by: string; extra: string };
export type License = {
  status: "unlicensed" | "licensed" | "invalid";
  holder?: string;
  id?: string;
  edition?: string;
  edition_label?: string;
  expires?: string | null;
  error?: string;
};
export type SystemStatus = {
  version: string;
  os: string;
  data_dir: string;
  components: ComponentStatus[];
  ffmpeg: boolean;
  ocr_backend: string | null;
  korean_font: string | null;
  llm_model: string | null;
  license: License;
};

type Ctx = {
  status: SystemStatus | null;
  reload: () => void;
  navigate: (page: string) => void;
  has: (key: string) => boolean;
};

const SystemCtx = createContext<Ctx>({ status: null, reload: () => {}, navigate: () => {}, has: () => false });

export function SystemProvider({ children, navigate }: { children: ReactNode; navigate: (p: string) => void }) {
  const { data, reload } = useData(() => api.get<SystemStatus>("/system/status"));
  // 쓰는 도중에 키가 막히면(예: 개발자 키 기한 끝) 상태를 다시 읽어 키 입력 화면으로 돌아간다.
  useEffect(() => {
    window.addEventListener("lb-license-required", reload);
    return () => window.removeEventListener("lb-license-required", reload);
  }, [reload]);
  const has = (key: string) => (key === "ffmpeg" ? !!data?.ffmpeg : !!data?.components.find((c) => c.key === key)?.available);
  return <SystemCtx.Provider value={{ status: data, reload, navigate, has }}>{children}</SystemCtx.Provider>;
}

export const useSystem = () => useContext(SystemCtx);

/** 선택 구성요소가 없을 때 안내. */
export function NeedsComponent({ keys, children }: { keys: string[]; children?: ReactNode }) {
  const { status, has, navigate } = useSystem();
  if (!status) return null;
  const missing = keys.filter((k) => !has(k));
  if (!missing.length) return null;
  const labels = missing.map((k) => (k === "ffmpeg" ? "ffmpeg" : status.components.find((c) => c.key === k)?.label ?? k));
  return (
    <Notice tone="warn">
      <span>
        <b>{labels.join(", ")}</b> 구성요소가 아직 없어요. {children}
        <button className="linklike" onClick={() => navigate("settings")}>
          설정 &gt; 구성요소
        </button>
        에서 확인해 주세요.
      </span>
    </Notice>
  );
}

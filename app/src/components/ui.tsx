import { CircleAlert, FolderOpen, Copy, Loader2, Plus, Upload, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, type Job } from "../lib/api";
import { baseName } from "../lib/format";
import { copyText, isTauri, onFileDrop, openPath, pickFiles, reveal, type Filter } from "../lib/platform";

export function Page({ title, desc, actions, children }: { title: string; desc?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          {desc && <p className="muted">{desc}</p>}
        </div>
        {actions && <div className="row">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Card({ title, right, children, className = "" }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "default"; busy?: boolean; icon?: ReactNode; small?: boolean };

export function Button({ variant = "default", busy, icon, small, children, className = "", disabled, ...rest }: BtnProps) {
  return (
    <button className={`btn btn-${variant} ${small ? "btn-sm" : ""} ${className}`} disabled={disabled || busy} {...rest}>
      {busy ? <Loader2 size={16} className="spin" /> : icon}
      {children && <span>{children}</span>}
    </button>
  );
}

export function Field({ label, hint, children, inline }: { label: string; hint?: ReactNode; children: ReactNode; inline?: boolean }) {
  return (
    <label className={`field ${inline ? "field-inline" : ""}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
      <span>{label}</span>
    </label>
  );
}

export function Tabs<K extends string>({ tabs, value, onChange }: { tabs: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} className={value === t.key ? "active" : ""} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function ErrorBox({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return (
    <div className="alert alert-error" role="alert">
      <CircleAlert size={16} />
      <span>{error}</span>
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" | "ok" }) {
  return <div className={`alert alert-${tone}`}>{children}</div>;
}

export function Empty({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <div>{children}</div>
    </div>
  );
}

export function Badge({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone ? `badge-${tone}` : ""}`}>{children}</span>;
}

export function JobBar({ job, error, onCancel }: { job: Job | null; error?: string | null; onCancel?: () => void }) {
  if (error && (!job || job.status !== "running")) return <ErrorBox error={error} />;
  if (!job || job.status === "done") return null;
  if (job.status === "cancelled") return <Notice tone="warn">작업을 취소했어요.</Notice>;
  return (
    <div className="jobbar">
      <div className="jobbar-top">
        <span>
          <Loader2 size={14} className="spin" /> {job.message || job.title}
        </span>
        <span className="muted">{Math.round(job.progress * 100)}%</span>
        {onCancel && (
          <Button small variant="ghost" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
      <div className="progress">
        <div style={{ width: `${Math.max(3, job.progress * 100)}%` }} />
      </div>
    </div>
  );
}

/** 엔진이 만든 이미지 파일의 작은 미리보기. */
export function Thumb({ path, size = 220 }: { path: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    api
      .post<{ data_url: string }>("/ocr/preview", { path, max_size: size * 2 })
      .then((r) => alive && setSrc(r.data_url))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [path, size]);
  return src ? <img className="thumb" src={src} alt={baseName(path)} style={{ maxWidth: size, maxHeight: size }} /> : <div className="thumb thumb-empty" style={{ width: size * 0.75, height: size * 0.75 }} />;
}

export function PathLink({ path, label }: { path: string; label?: string }) {
  return (
    <span className="pathlink">
      <button className="linklike" title={path} onClick={() => openPath(path)}>
        {label ?? baseName(path)}
      </button>
      <button className="iconbtn" title={isTauri ? "폴더에서 보기" : "경로 복사"} onClick={() => reveal(path)}>
        {isTauri ? <FolderOpen size={14} /> : <Copy size={14} />}
      </button>
    </span>
  );
}

/** 파일/폴더 고르기 + 끌어다 놓기. */
export function PathPicker({
  value,
  onChange,
  multiple,
  directory,
  filters,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  multiple?: boolean;
  directory?: boolean;
  filters?: Filter[];
  placeholder?: string;
}) {
  const ref = useRef(value);
  ref.current = value;
  useEffect(
    () =>
      onFileDrop((paths) => {
        const next = multiple ? Array.from(new Set([...ref.current, ...paths])) : paths.slice(0, 1);
        onChange(next);
      }),
    [multiple, onChange],
  );
  const add = async () => {
    const picked = await pickFiles({ multiple, directory, filters });
    if (!picked.length) return;
    onChange(multiple ? Array.from(new Set([...value, ...picked])) : picked.slice(0, 1));
  };
  return (
    <div className="picker">
      {value.length === 0 ? (
        <button className="dropzone" onClick={add}>
          <Upload size={22} />
          <span>{placeholder ?? (directory ? "폴더를 고르거나 끌어다 놓으세요" : "파일을 고르거나 여기로 끌어다 놓으세요")}</span>
        </button>
      ) : (
        <div className="picker-list">
          {value.map((p) => (
            <div key={p} className="picker-item" title={p}>
              <span className="truncate">{baseName(p)}</span>
              <span className="muted truncate small">{p}</span>
              <button className="iconbtn" onClick={() => onChange(value.filter((x) => x !== p))} aria-label="빼기">
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="row">
            {(multiple || value.length === 0) && (
              <Button small icon={<Plus size={14} />} onClick={add}>
                더 넣기
              </Button>
            )}
            <Button small variant="ghost" onClick={() => onChange([])}>
              모두 빼기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      small
      icon={<Copy size={14} />}
      onClick={async () => {
        await copyText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? "복사했어요" : label}
    </Button>
  );
}

// --- 토스트 ---
type Toast = { id: number; text: string; tone: "ok" | "error" };
const ToastCtx = createContext<(text: string, tone?: "ok" | "error") => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

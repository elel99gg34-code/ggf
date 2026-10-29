import { Command, Loader2, Search as SearchIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import LicenseGate from "./components/LicenseGate";
import { SystemProvider, useSystem } from "./components/system";
import { ToastProvider, useToast } from "./components/ui";
import { api, errorText, initEngine } from "./lib/api";
import { runFocusWatcher } from "./lib/focusTimer";
import { installDropListener, listen } from "./lib/platform";
import { ALL_ITEMS, NAV } from "./nav";
import Actions from "./pages/Actions";
import Automation from "./pages/Automation";
import Clipboard from "./pages/Clipboard";
import Dedupe from "./pages/Dedupe";
import Focus from "./pages/Focus";
import Home from "./pages/Home";
import Mask from "./pages/Mask";
import Media from "./pages/Media";
import Notes from "./pages/Notes";
import Ocr from "./pages/Ocr";
import Papers from "./pages/Papers";
import Pdf from "./pages/Pdf";
import Rename from "./pages/Rename";
import Schedule from "./pages/Schedule";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import Tools from "./pages/Tools";
import Transcribe from "./pages/Transcribe";
import Translate from "./pages/Translate";
import Writing from "./pages/Writing";

const PAGES: Record<string, ComponentType> = {
  home: Home, auto: Automation, transcribe: Transcribe, mask: Mask, media: Media, actions: Actions, schedule: Schedule, notes: Notes,
  clipboard: Clipboard, ocr: Ocr, papers: Papers, translate: Translate, writing: Writing, rename: Rename, dedupe: Dedupe,
  pdf: Pdf, focus: Focus, search: Search, tools: Tools, settings: Settings,
};

function pageFromHash(): string {
  const key = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return PAGES[key] ? key : "home";
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [page, setPage] = useState(pageFromHash);

  useEffect(() => {
    initEngine()
      .then(() => setReady(true))
      .catch((e) => setBootError(errorText(e)));
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((key: string) => {
    window.location.hash = `/${key}`;
    setPage(key);
  }, []);

  if (!ready) {
    return (
      <div className="splash">
        <div className="logo">로컬비서</div>
        {bootError ? <p className="error-text">{bootError}</p> : <p className="muted"><Loader2 size={16} className="spin" /> 엔진을 깨우는 중…</p>}
      </div>
    );
  }
  return (
    <ToastProvider>
      <SystemProvider navigate={navigate}>
        <Gate page={page} navigate={navigate} />
      </SystemProvider>
    </ToastProvider>
  );
}

/** 라이선스 키가 등록돼 있어야 앱이 열린다. */
function Gate({ page, navigate }: { page: string; navigate: (k: string) => void }) {
  const { status, reload } = useSystem();
  if (!status) {
    return (
      <div className="splash">
        <div className="logo">로컬비서</div>
        <p className="muted"><Loader2 size={16} className="spin" /> 불러오는 중…</p>
      </div>
    );
  }
  if (status.license.status !== "licensed") return <LicenseGate license={status.license} version={status.version} onDone={reload} />;
  return <Shell page={page} navigate={navigate} />;
}

function Shell({ page, navigate }: { page: string; navigate: (k: string) => void }) {
  const [palette, setPalette] = useState(false);
  const [dropping, setDropping] = useState(false);
  const { status } = useSystem();
  const toast = useToast();
  const Current = PAGES[page];

  useEffect(() => {
    runFocusWatcher((r) => toast(r.kind === "focus" ? `${r.minutes}분 집중 끝! 잠깐 쉬어요.` : "쉬는 시간 끝! 다시 집중해 볼까요?"));
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if (e.key === "Escape") setPalette(false);
    };
    window.addEventListener("keydown", onKey);
    installDropListener(setDropping);
    const offs = [
      listen("open-palette", () => setPalette(true)),
      listen<string>("screen-captured", (path) => {
        sessionStorage.setItem("lb-captured", path);
        navigate("ocr");
        window.dispatchEvent(new CustomEvent("lb-captured", { detail: path }));
      }),
      // 앱 셸이 복사 내용을 알려주면 기록한다 (설정에서 끌 수 있다).
      listen<string>("clipboard-text", (text) => {
        api.post("/clipboard", { text }).catch(() => {});
        window.dispatchEvent(new CustomEvent("lb-clipboard"));
      }),
    ];
    return () => {
      window.removeEventListener("keydown", onKey);
      offs.forEach((p) => p.then((off) => off()));
    };
  }, [navigate]);

  const lic = status?.license;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">비</span>
          <span>로컬비서</span>
        </div>
        <button className="palette-trigger" onClick={() => setPalette(true)}>
          <SearchIcon size={15} />
          <span>찾기·이동</span>
          <kbd>Ctrl K</kbd>
        </button>
        <nav>
          {NAV.map((g, gi) => (
            <div key={gi} className="nav-group">
              {g.title && <div className="nav-title">{g.title}</div>}
              {g.items.map((it) => (
                <button key={it.key} className={`nav-item ${page === it.key ? "active" : ""}`} onClick={() => navigate(it.key)}>
                  <it.icon size={17} />
                  <span>{it.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          {lic && (
            <button className="linklike small" onClick={() => navigate("settings")}>
              {lic.edition_label} · {lic.holder || lic.id}
              {lic.expires ? ` · ${lic.expires}까지` : ""}
            </button>
          )}
          <span className="muted small">v{status?.version}</span>
        </div>
      </aside>
      <main className="main">
        <Current key={page} />
      </main>
      {palette && <Palette onClose={() => setPalette(false)} navigate={navigate} />}
      {dropping && <div className="drop-overlay">여기에 놓으세요</div>}
    </div>
  );
}

type SearchHit = { kind: string; kind_label: string; ref: string; title: string; snippet: string };
const KIND_PAGE: Record<string, string> = { note: "notes", todo: "notes", clip: "clipboard", transcript: "transcribe", file: "search", contact: "papers" };

function Palette({ onClose, navigate }: { onClose: () => void; navigate: (k: string) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const pages = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ALL_ITEMS.filter((it) => !s || `${it.label} ${it.desc} ${it.keywords ?? ""}`.toLowerCase().includes(s));
  }, [q]);
  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get<{ results: SearchHit[] }>("/search", { q, limit: 8 })
        .then((r) => setHits(r.results))
        .catch(() => setHits([]));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);
  const rows = [
    ...pages.map((p) => ({ id: `p-${p.key}`, label: p.label, sub: p.desc, icon: p.icon, go: () => navigate(p.key) })),
    ...hits.map((h) => ({
      id: `h-${h.kind}-${h.ref}`,
      label: h.title,
      sub: `${h.kind_label} · ${h.snippet}`,
      icon: SearchIcon,
      go: () => {
        sessionStorage.setItem("lb-open", JSON.stringify(h));
        navigate(KIND_PAGE[h.kind] ?? "search");
      },
    })),
  ];
  const choose = (i: number) => {
    rows[i]?.go();
    onClose();
  };
  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="찾기">
        <div className="palette-input">
          <Command size={16} />
          <input
            ref={input}
            value={q}
            placeholder="기능 이름이나 찾을 내용을 입력하세요"
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") (e.preventDefault(), setSel((s) => Math.min(rows.length - 1, s + 1)));
              if (e.key === "ArrowUp") (e.preventDefault(), setSel((s) => Math.max(0, s - 1)));
              if (e.key === "Enter") choose(sel);
            }}
          />
        </div>
        <div className="palette-list">
          {rows.length === 0 && <div className="muted pad">결과가 없어요</div>}
          {rows.map((r, i) => (
            <button key={r.id} className={`palette-row ${i === sel ? "sel" : ""}`} onMouseEnter={() => setSel(i)} onClick={() => choose(i)}>
              <r.icon size={16} />
              <span className="palette-label">{r.label}</span>
              <span className="muted truncate small">{r.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

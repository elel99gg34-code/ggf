import {
  ArrowLeftRight, BadgeCheck, CalendarDays, Calculator, Eraser, KeyRound, Keyboard, QrCode, Ruler, Sheet, Type, type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Badge, Button, Card, CopyButton, ErrorBox, Field, Notice, Page, PathLink, PathPicker, Tabs, Toggle } from "../components/ui";
import { api } from "../lib/api";
import { useAction } from "../lib/hooks";

type Tool = { key: string; label: string; icon: LucideIcon; desc: string; view: () => ReactNode };

const TOOLS: Tool[] = [
  { key: "count", label: "글자 수 세기", icon: Type, desc: "공백 포함·제외, 바이트, 원고지 매수", view: () => <CountTool /> },
  { key: "money", label: "금액 한글·부가세", icon: Calculator, desc: "일금 ○○원정, 공급가·부가세 나누기", view: () => <MoneyTool /> },
  { key: "date", label: "날짜 계산", icon: CalendarDays, desc: "D-day, 며칠 뒤, 공휴일 뺀 영업일", view: () => <DateTool /> },
  { key: "qr", label: "QR 코드", icon: QrCode, desc: "주소·글·와이파이를 QR 그림으로", view: () => <QrTool /> },
  { key: "password", label: "비밀번호 만들기", icon: KeyRound, desc: "헷갈리는 글자 뺀 안전한 비밀번호", view: () => <PasswordTool /> },
  { key: "keyboard", label: "한영 타자 변환", icon: Keyboard, desc: "dkssud → 안녕, 한/영 안 바꾸고 친 글", view: () => <KeyboardTool /> },
  { key: "clean", label: "글 정리", icon: Eraser, desc: "PDF 줄바꿈 합치기, 공백·빈 줄·중복 정리", view: () => <CleanTool /> },
  { key: "units", label: "단위 변환", icon: Ruler, desc: "평↔㎡, 근·돈, 인치, 화씨", view: () => <UnitTool /> },
  { key: "check", label: "번호 확인", icon: BadgeCheck, desc: "사업자·주민·법인·카드 번호가 맞는지", view: () => <CheckTool /> },
  { key: "merge", label: "엑셀·CSV 합치기", icon: Sheet, desc: "여러 표를 제목 줄 맞춰 하나로", view: () => <MergeTool /> },
];

export default function Tools() {
  const [key, setKey] = useState(() => {
    try {
      return localStorage.getItem("lb-tool") ?? "count";
    } catch {
      return "count";
    }
  });
  const pick = (k: string) => {
    setKey(k);
    try {
      localStorage.setItem("lb-tool", k);
    } catch {
      /* 저장 못 해도 괜찮다 */
    }
  };
  const tool = TOOLS.find((t) => t.key === key) ?? TOOLS[0];
  return (
    <Page title="작은 도구" desc="일하다 자주 찾게 되는 계산·변환 10가지. 인터넷 없이 이 PC에서 바로 돼요.">
      <div className="tool-grid">
        {TOOLS.map((t) => (
          <button key={t.key} className={`tool-tile ${t.key === tool.key ? "on" : ""}`} onClick={() => pick(t.key)}>
            <t.icon size={18} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <Card title={<><tool.icon size={16} /> {tool.label}</>} right={<span className="muted small">{tool.desc}</span>}>
        <div key={tool.key}>{tool.view()}</div>
      </Card>
    </Page>
  );
}

function Stats({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="kv-grid">
      {items.map(([k, v]) => (
        <div key={k} className="kv">
          <span className="muted small">{k}</span>
          <b>{v}</b>
        </div>
      ))}
    </div>
  );
}

const n = (x: number) => x.toLocaleString("ko-KR");

// --- 1. 글자 수 ---
type Count = { chars: number; chars_no_space: number; words: number; lines: number; paragraphs: number; bytes_utf8: number; bytes_ko: number; manuscript_pages: number; reading_minutes: number };

function CountTool() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<Count | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => api.post<Count>("/tools/count", { text }).then(setRes).catch(() => {}), 150);
    return () => window.clearTimeout(t);
  }, [text]);
  return (
    <div className="stack">
      <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="자기소개서, 상세페이지 문구, 공문… 글을 붙여넣으면 바로 세어요." />
      {res && (
        <Stats
          items={[
            ["공백 포함", `${n(res.chars)}자`],
            ["공백 제외", `${n(res.chars_no_space)}자`],
            ["바이트 (한글 2)", `${n(res.bytes_ko)}`],
            ["바이트 (UTF-8)", `${n(res.bytes_utf8)}`],
            ["낱말", n(res.words)],
            ["줄 / 문단", `${n(res.lines)} / ${n(res.paragraphs)}`],
            ["원고지 (200자)", `약 ${n(res.manuscript_pages)}매`],
            ["읽는 시간", `약 ${res.reading_minutes}분`],
          ]}
        />
      )}
    </div>
  );
}

// --- 2. 금액 ---
type Money = { formatted: string; short: string; reading: string; formal: string; vat?: { supply: number; tax: number; total: number } };

function MoneyTool() {
  const [amount, setAmount] = useState("");
  const [vat, setVat] = useState("none");
  const [res, setRes] = useState<Money | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!amount.trim()) return setRes(null);
    const t = window.setTimeout(() => {
      api.post<Money>("/tools/money", { amount, vat }).then((r) => (setRes(r), setError(null))).catch((e) => setError(e.message));
    }, 150);
    return () => window.clearTimeout(t);
  }, [amount, vat]);
  return (
    <div className="stack">
      <div className="row wrap">
        <input className="w-lg" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액 (예: 1,234,000)" inputMode="numeric" />
        <Tabs tabs={[{ key: "none", label: "금액만" }, { key: "add", label: "공급가 + 부가세" }, { key: "split", label: "합계에서 나누기" }]} value={vat} onChange={setVat} />
      </div>
      <ErrorBox error={error} />
      {res && (
        <>
          <div className="big-line">
            <span>{res.formal}</span>
            <CopyButton text={res.formal} />
          </div>
          <Stats items={[["숫자", res.formatted], ["줄여 쓰기", res.short], ["읽는 말", res.reading]]} />
          {res.vat && (
            <Stats
              items={[
                ["공급가액", `${n(res.vat.supply)}원`],
                ["부가세 (10%)", `${n(res.vat.tax)}원`],
                ["합계", `${n(res.vat.total)}원`],
              ]}
            />
          )}
          {res.vat && <p className="muted small">부가세는 원 단위 아래를 버렸어요. 합계에서 나눌 때는 합계 ÷ 1.1을 반올림해 공급가액으로 잡았어요.</p>}
        </>
      )}
    </div>
  );
}

// --- 3. 날짜 ---
type Day = { date: string; weekday: string; holiday: string | null };
type DateRes = {
  days: number;
  days_inclusive?: number;
  weeks?: string;
  workdays?: number | boolean;
  holidays?: Day[];
  result?: Day;
  label?: string;
  target?: Day;
  notes: string[];
};
const today = () => new Date().toLocaleDateString("sv-SE");
const dayText = (d: Day) => `${d.date} (${d.weekday})${d.holiday ? ` · ${d.holiday}` : ""}`;

function DateTool() {
  const [mode, setMode] = useState<"dday" | "add" | "between">("dday");
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [days, setDays] = useState(7);
  const [workdays, setWorkdays] = useState(false);
  const [res, setRes] = useState<DateRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const body = mode === "dday" ? { mode, end } : mode === "add" ? { mode, start, days, workdays } : { mode, start, end };
    api.post<DateRes>("/tools/date", body).then((r) => (setRes(r), setError(null))).catch((e) => setError(e.message));
  }, [mode, start, end, days, workdays]);
  return (
    <div className="stack">
      <Tabs tabs={[{ key: "dday", label: "D-day" }, { key: "add", label: "며칠 뒤" }, { key: "between", label: "두 날짜 사이" }]} value={mode} onChange={setMode} />
      <div className="row wrap">
        {mode !== "dday" && <Field label={mode === "add" ? "기준일" : "시작일"} inline><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>}
        {mode !== "add" && <Field label={mode === "dday" ? "목표일" : "끝날"} inline><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>}
        {mode === "add" && (
          <>
            <Field label="며칠 (앞은 -)" inline><input type="number" value={days} onChange={(e) => setDays(+e.target.value)} /></Field>
            <Toggle checked={workdays} onChange={setWorkdays} label="주말·공휴일 빼고 (영업일)" />
          </>
        )}
      </div>
      <ErrorBox error={error} />
      {res && mode === "dday" && res.target && (
        <Stats items={[["목표일", dayText(res.target)], ["남은 날", <span className="accent">{res.label}</span>], ["그 사이 영업일", `${res.workdays}일`]]} />
      )}
      {res && mode === "add" && res.result && <Stats items={[["결과", dayText(res.result)]]} />}
      {res && mode === "between" && (
        <>
          <Stats
            items={[
              ["차이", `${n(res.days)}일`],
              ["처음·끝 포함", `${n(res.days_inclusive ?? 0)}일`],
              ["주로", res.weeks ?? ""],
              ["영업일 (처음·끝 포함)", `${n(Number(res.workdays))}일`],
            ]}
          />
          {!!res.holidays?.length && (
            <div className="row wrap">
              {res.holidays.map((h) => <Badge key={h.date}>{h.date.slice(5)} {h.holiday}</Badge>)}
            </div>
          )}
        </>
      )}
      {res?.notes.map((t) => <Notice key={t} tone="warn">{t}</Notice>)}
      <p className="muted small">공휴일은 2025~2027년 관공서 공휴일(대체공휴일, 2026년부터 노동절·제헌절 포함) 기준이에요. 회사 쉬는 날과 다를 수 있어요.</p>
    </div>
  );
}

// --- 4. QR ---
function QrTool() {
  const [kind, setKind] = useState<"text" | "wifi">("text");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState({ ssid: "", password: "", security: "WPA" });
  const [res, setRes] = useState<{ dst: string; data_url: string } | null>(null);
  const act = useAction();
  const make = async () => setRes((await act.run(() => api.post<{ dst: string; data_url: string }>("/tools/qr", { kind, text, ...wifi }))) ?? null);
  return (
    <div className="grid-2">
      <div className="stack">
        <Tabs tabs={[{ key: "text", label: "주소·글" }, { key: "wifi", label: "와이파이" }]} value={kind} onChange={(k) => (setKind(k), setRes(null))} />
        {kind === "text" ? (
          <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="https://www.wadiz.kr/… 또는 매장 안내 글" />
        ) : (
          <>
            <Field label="와이파이 이름 (SSID)"><input value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} /></Field>
            <Field label="비밀번호"><input value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} /></Field>
            <select value={wifi.security} onChange={(e) => setWifi({ ...wifi, security: e.target.value })}>
              <option value="WPA">WPA/WPA2 (보통)</option>
              <option value="WEP">WEP</option>
              <option value="nopass">비밀번호 없음</option>
            </select>
            <p className="muted small">손님이 휴대폰 카메라로 찍으면 비밀번호 없이 바로 연결돼요.</p>
          </>
        )}
        <Button variant="primary" busy={act.busy} onClick={make}>QR 만들기</Button>
        <ErrorBox error={act.error} />
      </div>
      <div className="stack qr-box">
        {res ? (
          <>
            <img src={res.data_url} alt="QR 코드" />
            <span className="small">저장했어요: <PathLink path={res.dst} /></span>
          </>
        ) : (
          <QrCode size={64} className="muted" />
        )}
      </div>
    </div>
  );
}

// --- 5. 비밀번호 ---
function PasswordTool() {
  const [o, setO] = useState({ length: 16, count: 5, upper: true, digits: true, symbols: true, avoid_ambiguous: true });
  const [res, setRes] = useState<{ passwords: string[]; bits: number; strength: string } | null>(null);
  const act = useAction();
  const make = async () => setRes((await act.run(() => api.post<{ passwords: string[]; bits: number; strength: string }>("/tools/password", o))) ?? null);
  useEffect(() => {
    make();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o]);
  return (
    <div className="stack">
      <Field label={`길이 ${o.length}자`}>
        <input type="range" min={8} max={40} value={o.length} onChange={(e) => setO({ ...o, length: +e.target.value })} />
      </Field>
      <div className="row wrap">
        <Toggle checked={o.upper} onChange={(v) => setO({ ...o, upper: v })} label="대문자" />
        <Toggle checked={o.digits} onChange={(v) => setO({ ...o, digits: v })} label="숫자" />
        <Toggle checked={o.symbols} onChange={(v) => setO({ ...o, symbols: v })} label="특수문자" />
        <Toggle checked={o.avoid_ambiguous} onChange={(v) => setO({ ...o, avoid_ambiguous: v })} label="헷갈리는 글자 빼기 (l 1 O 0)" />
        <Button small onClick={make}>다시 만들기</Button>
      </div>
      <ErrorBox error={act.error} />
      {res && (
        <>
          <p className="small">세기: <Badge tone={res.strength === "강함" ? "ok" : res.strength === "보통" ? "soon" : "late"}>{res.strength}</Badge> <span className="muted">({res.bits}비트)</span></p>
          <ul className="list compact">
            {res.passwords.map((p) => (
              <li key={p} className="list-row">
                <code className="grow mono">{p}</code>
                <CopyButton text={p} />
              </li>
            ))}
          </ul>
          <p className="muted small">만든 비밀번호는 어디에도 저장하지 않아요.</p>
        </>
      )}
    </div>
  );
}

// --- 6. 한영 타자 ---
function KeyboardTool() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<{ direction: string; text: string } | null>(null);
  useEffect(() => {
    if (!text) return setRes(null);
    const t = window.setTimeout(() => api.post<{ direction: string; text: string }>("/tools/keyboard", { text }).then(setRes).catch(() => {}), 120);
    return () => window.clearTimeout(t);
  }, [text]);
  return (
    <div className="grid-2">
      <Field label="잘못 친 글">
        <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="dkssudgktpdy  또는  ㅗ디ㅣㅐ" />
      </Field>
      <div className="stack">
        <Field label={res ? (res.direction === "en2ko" ? "한글로 바꾼 글" : "영문으로 바꾼 글") : "바꾼 글"}>
          <textarea rows={6} readOnly value={res?.text ?? ""} />
        </Field>
        {res?.text && <div className="row"><CopyButton text={res.text} /></div>}
      </div>
    </div>
  );
}

// --- 7. 글 정리 ---
const CLEAN = [
  ["join_lines", "줄바꿈 합치기 (PDF에서 복사한 글)"],
  ["trim", "줄 앞뒤 공백 지우기"],
  ["spaces", "겹친 띄어쓰기 하나로"],
  ["blank", "빈 줄 지우기"],
  ["bullets", "앞머리 기호·번호 지우기"],
  ["dedupe", "같은 줄 지우기"],
  ["sort", "가나다순 정렬"],
  ["number", "줄 번호 붙이기"],
  ["halfwidth", "전각 글자를 반각으로 (１２３ → 123)"],
  ["emoji", "이모지 지우기"],
] as const;

function CleanTool() {
  const [text, setText] = useState("");
  const [ops, setOps] = useState<string[]>(["trim", "spaces"]);
  const [res, setRes] = useState<{ text: string } | null>(null);
  const act = useAction();
  const run = async () => setRes((await act.run(() => api.post<{ text: string }>("/tools/clean", { text, ops }))) ?? null);
  return (
    <div className="stack">
      <div className="checks checks-3">
        {CLEAN.map(([k, label]) => (
          <label key={k} className="check-label">
            <input type="checkbox" checked={ops.includes(k)} onChange={(e) => setOps(e.target.checked ? [...ops, k] : ops.filter((x) => x !== k))} />
            {label}
          </label>
        ))}
      </div>
      <div className="grid-2">
        <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="정리할 글을 붙여넣으세요." />
        <textarea rows={10} readOnly value={res?.text ?? ""} placeholder="정리한 글" />
      </div>
      <div className="row">
        <Button variant="primary" busy={act.busy} disabled={!text || !ops.length} onClick={run}>정리하기</Button>
        {res && <CopyButton text={res.text} />}
      </div>
      <ErrorBox error={act.error} />
    </div>
  );
}

// --- 8. 단위 ---
function UnitTool() {
  const [cats, setCats] = useState<Record<string, string[]>>({});
  const [cat, setCat] = useState("넓이");
  const [unit, setUnit] = useState("평");
  const [value, setValue] = useState("1");
  const [res, setRes] = useState<{ unit: string; value: number; note?: string | null }[]>([]);
  useEffect(() => {
    api.get<Record<string, string[]>>("/tools/units").then(setCats).catch(() => {});
  }, []);
  useEffect(() => {
    const v = parseFloat(value.replace(/,/g, ""));
    if (Number.isNaN(v)) return setRes([]);
    api.post<{ results: typeof res }>("/tools/units", { value: v, unit }).then((r) => setRes(r.results)).catch(() => setRes([]));
  }, [value, unit]);
  return (
    <div className="stack">
      <Tabs tabs={Object.keys(cats).map((c) => ({ key: c, label: c }))} value={cat} onChange={(c) => (setCat(c), setUnit(cats[c][0]))} />
      <div className="row">
        <input className="w-md" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" />
        <select className="w-sm" value={unit} onChange={(e) => setUnit(e.target.value)}>
          {(cats[cat] ?? []).map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <ArrowLeftRight size={16} className="muted" />
      </div>
      <Stats items={res.filter((r) => r.unit !== unit).map((r) => [r.note ? `${r.unit} · ${r.note}` : r.unit, `${n(r.value)} ${r.unit}`])} />
    </div>
  );
}

// --- 9. 번호 확인 ---
type Check = { kind: string; valid: boolean; checksum?: boolean; formatted: string; detail: string; note: string };

function CheckTool() {
  const [value, setValue] = useState("");
  const [res, setRes] = useState<Check | null>(null);
  useEffect(() => {
    if (!value.trim()) return setRes(null);
    const t = window.setTimeout(() => api.post<Check>("/tools/check", { value }).then(setRes).catch(() => {}), 150);
    return () => window.clearTimeout(t);
  }, [value]);
  return (
    <div className="stack">
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="사업자등록번호, 주민·법인등록번호, 카드번호, 전화번호" />
      {res && res.kind && (
        <div className="row wrap">
          <Badge tone="accent">{res.kind}</Badge>
          {res.valid ? <Badge tone="ok">형식이 맞아요</Badge> : <Badge tone="late">틀린 번호예요</Badge>}
          <code className="mono">{res.formatted}</code>
          {res.detail && <span className="small">{res.detail}</span>}
        </div>
      )}
      {res?.note && <p className="muted small">{res.note}</p>}
      <p className="muted small">번호의 검증 숫자만 계산해요. 실제로 등록된 번호인지(휴·폐업 등)는 국세청 홈택스에서 확인해야 해요. 넣은 번호는 저장하지 않아요.</p>
    </div>
  );
}

// --- 10. 표 합치기 ---
type MergeRes = { dst: string; rows: number; columns: number; files: { source: string; rows: number }[] };

function MergeTool() {
  const [paths, setPaths] = useState<string[]>([]);
  const [header, setHeader] = useState(true);
  const [source, setSource] = useState(true);
  const [allSheets, setAllSheets] = useState(false);
  const [res, setRes] = useState<MergeRes | null>(null);
  const act = useAction();
  const run = async () =>
    setRes((await act.run(() => api.post<MergeRes>("/tools/merge-tables", { paths, header, source_column: source, all_sheets: allSheets }))) ?? null);
  return (
    <div className="stack">
      <PathPicker value={paths} onChange={setPaths} multiple filters={[{ name: "엑셀·CSV", extensions: ["xlsx", "xlsm", "csv", "tsv"] }]} placeholder="합칠 엑셀·CSV 파일(또는 폴더)을 고르거나 끌어다 놓으세요" />
      <div className="row wrap">
        <Toggle checked={header} onChange={setHeader} label="첫 줄은 제목 (같은 제목끼리 맞추기)" />
        <Toggle checked={source} onChange={setSource} label="'출처' 열 넣기" />
        <Toggle checked={allSheets} onChange={setAllSheets} label="엑셀은 모든 시트" />
      </div>
      <Button variant="primary" busy={act.busy} disabled={!paths.length} onClick={run}>합치기</Button>
      <ErrorBox error={act.error} />
      {res && (
        <Notice tone="ok">
          <span>
            {res.files.length}개 표, {n(res.rows)}줄을 합쳤어요: <PathLink path={res.dst} />
            <div className="small">{res.files.map((f) => `${f.source} ${f.rows}줄`).join(" · ")}</div>
          </span>
        </Notice>
      )}
    </div>
  );
}

import { FolderSync, Play, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { NeedsComponent } from "../components/system";
import { Badge, Button, Card, Empty, ErrorBox, Field, Notice, Page, PathLink, PathPicker, Toggle, useToast } from "../components/ui";
import { api } from "../lib/api";
import { baseName, dateTime } from "../lib/format";
import { useAction, useData } from "../lib/hooks";
import { pickFiles } from "../lib/platform";

type Action = { key: string; label: string; desc: string; exts: string[]; needs: string[]; ready: boolean };
type Rule = {
  id: number;
  name: string;
  folder: string;
  action: string;
  action_label: string;
  options: Record<string, unknown>;
  out_dir: string | null;
  out_dir_resolved: string;
  after: "keep" | "move";
  enabled: boolean;
  error: string;
  last_run_at: string | null;
  done: number;
  errors: number;
  running: number;
};
type LogRow = { id: number; automation_id: number; automation_name: string; action_label: string; name: string; src: string; dst: string | null; status: "running" | "done" | "error"; message: string; created_at: string };
type Kind = { key: string; label: string; default: boolean };
type Preset = { key: string; label: string };

const EXAMPLES: Record<string, string> = {
  mask: "예) 고객이 보낸 서류를 '받은 서류' 폴더에 넣으면 → 개인정보 가린 사본이 '처리됨'에",
  image: "예) 휴대폰에서 옮긴 상품 사진을 넣으면 → 스마트스토어 규격 + 워터마크로",
  receipt: "예) 영수증을 찍어 넣으면 → 경비 장부에 날짜·가맹점·금액이 적혀요",
  card: "예) 받은 명함을 찍어 넣으면 → 연락처에 이름·회사·전화번호가 들어가요",
  ocr: "예) 스캔한 문서를 넣으면 → 글자만 뽑은 .txt 파일이 생겨요",
  transcribe: "예) 녹음 파일을 넣어 두고 퇴근하면 → 회의록(.docx)과 할 일이 만들어져요",
  pdf_compress: "예) 메일에 안 붙는 큰 PDF를 넣으면 → 용량을 줄인 사본이 생겨요",
};

export default function Automation() {
  const rules = useData(() => api.get<Rule[]>("/automations"));
  const log = useData(() => api.get<LogRow[]>("/automations/log", { limit: 60 }));
  const [creating, setCreating] = useState(false);
  const busy = (rules.data ?? []).some((r) => r.running > 0) || (log.data ?? []).some((l) => l.status === "running");

  // 규칙이 있으면 몇 초마다 새 기록을 읽어 온다.
  useEffect(() => {
    if (!rules.data?.length) return;
    const t = window.setInterval(() => {
      rules.reload();
      log.reload();
    }, busy ? 2000 : 5000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules.data?.length, busy]);

  const reloadAll = () => {
    rules.reload();
    log.reload();
  };
  return (
    <Page
      title="자동 처리"
      desc="폴더를 정해 두면 새 파일이 들어올 때마다 알아서 처리해요. 로컬비서가 켜져 있는 동안 움직여요 (창을 닫아도 트레이에서 계속)."
      actions={!creating && <Button variant="primary" icon={<FolderSync size={16} />} onClick={() => setCreating(true)}>새 규칙</Button>}
    >
      {creating && <NewRule onDone={() => { setCreating(false); reloadAll(); }} onCancel={() => setCreating(false)} />}
      <Card title={`규칙 ${rules.data?.length ?? 0}개`}>
        <ErrorBox error={rules.error} />
        {rules.data && !rules.data.length && !creating && (
          <Empty icon={<FolderSync size={28} />}>
            아직 규칙이 없어요. <b>새 규칙</b>을 눌러 지켜볼 폴더와 할 일을 정해 보세요.
            <div className="muted small" style={{ marginTop: 6 }}>{EXAMPLES.mask}</div>
          </Empty>
        )}
        <div className="stack">
          {rules.data?.map((r) => <RuleRow key={r.id} rule={r} onChange={reloadAll} />)}
        </div>
      </Card>
      <LogCard rows={log.data} onChange={reloadAll} />
    </Page>
  );
}

function RuleRow({ rule, onChange }: { rule: Rule; onChange: () => void }) {
  const act = useAction();
  const toast = useToast();
  const toggle = () => act.run(() => api.put(`/automations/${rule.id}`, { enabled: !rule.enabled })).then(onChange);
  const runNow = async (all: boolean) => {
    const r = await act.run(() => api.post<{ submitted: number }>(`/automations/${rule.id}/run`, { all }));
    if (r) toast(r.submitted ? `${r.submitted}개 파일을 처리하기 시작했어요.` : "새로 처리할 파일이 없어요.");
    onChange();
  };
  const remove = async () => {
    if (!window.confirm(`'${rule.name || rule.action_label}' 규칙을 지울까요? 이미 만든 결과 파일은 그대로 남아요.`)) return;
    await act.run(() => api.del(`/automations/${rule.id}`));
    onChange();
  };
  return (
    <div className={`rule ${rule.enabled ? "" : "rule-off"}`}>
      <div className="rule-main">
        <div className="row wrap">
          <b>{rule.name || rule.action_label}</b>
          {rule.name && <Badge tone="accent">{rule.action_label}</Badge>}
          {rule.running > 0 && <Badge tone="soon">처리 중 {rule.running}</Badge>}
          <Badge tone="ok">완료 {rule.done}</Badge>
          {rule.errors > 0 && <Badge tone="late">실패 {rule.errors}</Badge>}
        </div>
        <div className="small rule-paths">
          <span className="muted">지켜보는 폴더</span> <PathLink path={rule.folder} label={rule.folder} />
          <span className="muted">결과</span> <PathLink path={rule.out_dir_resolved} label={rule.out_dir_resolved} />
          {rule.after === "move" && <><span className="muted">원본</span> <span>처리 후 '원본' 폴더로 옮김</span></>}
        </div>
        {rule.error && rule.enabled && <div className="error-text small">{rule.error}</div>}
        <ErrorBox error={act.error} />
      </div>
      <div className="rule-side">
        <Toggle checked={rule.enabled} onChange={toggle} label={rule.enabled ? "켜짐" : "꺼짐"} />
        <div className="row">
          <Button small icon={<Play size={14} />} disabled={!rule.enabled} busy={act.busy} onClick={() => runNow(false)} title="기다리지 않고 지금 폴더 확인">지금 확인</Button>
          <Button small variant="ghost" disabled={!rule.enabled} onClick={() => window.confirm("폴더에 있는 파일을 이미 처리한 것까지 모두 다시 처리할까요?") && runNow(true)} title="이미 처리한 파일까지 다시">
            모두 다시
          </Button>
          <button className="iconbtn" onClick={remove} aria-label="규칙 지우기"><Trash2 size={15} /></button>
        </div>
      </div>
    </div>
  );
}

function LogCard({ rows, onChange }: { rows: LogRow[] | null; onChange: () => void }) {
  const act = useAction();
  const retry = async (id: number) => {
    await act.run(() => api.post(`/automations/log/${id}/retry`));
    onChange();
  };
  const clear = async () => {
    await act.run(() => api.del("/automations/log"));
    onChange();
  };
  return (
    <Card title="최근 처리 기록" right={rows?.length ? <button className="linklike" onClick={clear}>기록 지우기</button> : null}>
      <ErrorBox error={act.error} />
      {rows && !rows.length && <p className="muted small">아직 처리한 파일이 없어요. 지켜보는 폴더에 파일을 넣으면 몇 초 뒤에 여기 나타나요.</p>}
      {!!rows?.length && (
        <table className="table">
          <thead>
            <tr><th>때</th><th>규칙</th><th>파일</th><th>결과</th></tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className={l.status === "error" ? "row-error" : ""}>
                <td className="nowrap muted">{dateTime(l.created_at)}</td>
                <td>{l.automation_name || l.action_label}</td>
                <td title={l.src}>{baseName(l.src)}</td>
                <td>
                  {l.status === "running" && <Badge tone="soon">처리 중</Badge>}
                  {l.status === "done" && <Badge tone="ok">완료</Badge>}
                  {l.status === "error" && <Badge tone="late">실패</Badge>}
                  <span className="small">{l.message}</span>
                  {l.dst && <div><PathLink path={l.dst} /></div>}
                  {l.status === "error" && <div><button className="linklike small" onClick={() => retry(l.id)}><RotateCcw size={12} /> 다시 시도</button></div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function NewRule({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const actions = useData(() => api.get<Action[]>("/automations/actions"));
  const [action, setAction] = useState("mask");
  const [folder, setFolder] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [outDir, setOutDir] = useState("");
  const [after, setAfter] = useState<"keep" | "move">("keep");
  const [existing, setExisting] = useState(false);
  const [options, setOptions] = useState<Record<string, unknown>>({});
  const act = useAction();
  const chosen = actions.data?.find((a) => a.key === action);
  const save = async () => {
    const r = await act.run(() =>
      api.post("/automations", { name, folder: folder[0], action, options, out_dir: outDir || null, after, include_existing: existing }),
    );
    if (r) onDone();
  };
  return (
    <Card title="새 규칙" right={<Button small variant="ghost" onClick={onCancel}>닫기</Button>}>
      <Field label="1. 무엇을 할까요?">
        <div className="action-grid">
          {actions.data?.map((a) => (
            <button key={a.key} className={`action-tile ${a.key === action ? "on" : ""}`} onClick={() => { setAction(a.key); setOptions({}); }}>
              <b>{a.label}</b>
              <span className="muted small">{a.desc}</span>
              {!a.ready && <span className="small warn-text">구성요소 필요</span>}
            </button>
          ))}
        </div>
      </Field>
      {chosen && <p className="muted small">{EXAMPLES[chosen.key]} · 다루는 파일: {chosen.exts.join(" ")}</p>}
      {chosen && !chosen.ready && <NeedsComponent keys={chosen.needs} />}
      <Field label="2. 어느 폴더를 지켜볼까요?" hint="폴더 맨 위 칸에 새로 들어오는 파일만 봐요. 안쪽 폴더는 건드리지 않아요.">
        <PathPicker value={folder} onChange={setFolder} directory placeholder="지켜볼 폴더를 고르거나 끌어다 놓으세요" />
      </Field>
      <Field label="3. 어떻게 처리할까요?">
        <ActionOptions action={action} options={options} setOptions={setOptions} />
      </Field>
      <div className="form-grid">
        <Field label="규칙 이름 (선택)">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={chosen?.label} />
        </Field>
        <Field label="결과 폴더 (비우면 '처리됨')">
          <div className="row">
            <input value={outDir} onChange={(e) => setOutDir(e.target.value)} placeholder={folder[0] ? `${folder[0]}/처리됨` : "지켜보는 폴더 안 '처리됨'"} />
            <Button small onClick={async () => setOutDir((await pickFiles({ directory: true }))[0] ?? outDir)}>고르기</Button>
          </div>
        </Field>
      </div>
      <div className="row wrap">
        <label className="check-label">
          <input type="radio" checked={after === "keep"} onChange={() => setAfter("keep")} /> 원본은 그대로 두기
        </label>
        <label className="check-label">
          <input type="radio" checked={after === "move"} onChange={() => setAfter("move")} /> 처리한 원본은 '원본' 폴더로 옮기기
        </label>
        <Toggle checked={existing} onChange={setExisting} label="지금 폴더에 있는 파일도 처리" />
      </div>
      <ErrorBox error={act.error} />
      <div className="row">
        <Button variant="primary" busy={act.busy} disabled={!folder.length} onClick={save}>규칙 만들기</Button>
        <span className="muted small">만들면 바로 지켜보기 시작해요.</span>
      </div>
    </Card>
  );
}

function ActionOptions({ action, options, setOptions }: { action: string; options: Record<string, unknown>; setOptions: (o: Record<string, unknown>) => void }) {
  const set = (k: string, v: unknown) => setOptions({ ...options, [k]: v });
  const kinds = useData(() => (action === "mask" ? api.get<{ kinds: Kind[] }>("/mask/kinds") : Promise.resolve(null)), [action]);
  const presets = useData(() => (action === "image" ? api.get<{ presets: Preset[] }>("/media/presets") : Promise.resolve(null)), [action]);
  const models = useData(() => (action === "transcribe" ? api.get<{ sizes: Preset[] }>("/transcribe/models") : Promise.resolve(null)), [action]);

  if (action === "mask") {
    const all = kinds.data?.kinds ?? [];
    const active = (options.kinds as string[] | undefined) ?? all.filter((k) => k.default).map((k) => k.key);
    return (
      <div className="stack">
        <div className="checks checks-4">
          {all.map((k) => (
            <label key={k.key} className="check-label">
              <input type="checkbox" checked={active.includes(k.key)} onChange={(e) => set("kinds", e.target.checked ? [...active, k.key] : active.filter((x) => x !== k.key))} />
              {k.label}
            </label>
          ))}
        </div>
        <div className="row wrap">
          <select className="w-lg" value={(options.mode as string) ?? "partial"} onChange={(e) => set("mode", e.target.value)}>
            <option value="partial">일부만 가리기</option>
            <option value="full">전부 가리기</option>
            <option value="tag">항목 이름으로</option>
          </select>
          <Toggle checked={(options.faces as boolean) ?? true} onChange={(v) => set("faces", v)} label="사진 속 얼굴도" />
        </div>
        <p className="muted small">'개인정보 가리기' 화면에 저장한 '항상 가릴 말'·'가리지 않을 말'도 함께 써요.</p>
      </div>
    );
  }
  if (action === "image") {
    return (
      <div className="stack">
        <div className="row wrap">
          <select className="w-lg" value={(options.preset as string) ?? "smartstore_main"} onChange={(e) => set("preset", e.target.value)}>
            {presets.data?.presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <select className="w-sm" value={(options.format as string) ?? "jpg"} onChange={(e) => set("format", e.target.value)}>
            <option value="jpg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WEBP</option>
          </select>
          <Toggle checked={!!options.enhance} onChange={(v) => set("enhance", v)} label="자동 보정" />
        </div>
        <input value={(options.watermark as string) ?? ""} onChange={(e) => set("watermark", e.target.value)} placeholder="워터마크 글자 (선택, 예: @내가게)" />
      </div>
    );
  }
  if (action === "transcribe") {
    return (
      <div className="row wrap">
        <select className="w-lg" value={(options.model as string) ?? "small"} onChange={(e) => set("model", e.target.value)}>
          {models.data?.sizes.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <Toggle checked={(options.auto_todos as boolean) ?? true} onChange={(v) => set("auto_todos", v)} label="할 일 자동 추가" />
        <Toggle checked={(options.docx as boolean) ?? true} onChange={(v) => set("docx", v)} label="워드 파일로도 저장" />
      </div>
    );
  }
  if (action === "pdf_compress") {
    const q = (options.quality as number) ?? 60;
    return (
      <Field label={`사진 화질 ${q}% (낮을수록 작아져요)`}>
        <input type="range" min={30} max={90} value={q} onChange={(e) => set("quality", +e.target.value)} />
      </Field>
    );
  }
  return <Notice>따로 정할 것이 없어요. 결과는 {action === "ocr" ? "'처리됨' 폴더의 .txt 파일" : action === "card" ? "연락처" : "경비 장부"}에서 볼 수 있어요.</Notice>;
}

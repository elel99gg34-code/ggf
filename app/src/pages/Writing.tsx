import { Mail, SpellCheck, WandSparkles } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, CopyButton, ErrorBox, Field, Page, Tabs } from "../components/ui";
import { api } from "../lib/api";
import { useAction, useData } from "../lib/hooks";

type Change = { before: string; after: string; reason: string; count: number };

export default function Writing() {
  const [tab, setTab] = useState<"spell" | "tone" | "email">("spell");
  return (
    <Page title="글다듬기" desc="자주 틀리는 맞춤법을 고치고, 해요체·합니다체·공문체로 바꾸고, 업무 메일 틀을 만들어요.">
      <Tabs tabs={[{ key: "spell", label: "맞춤법" }, { key: "tone", label: "문체 바꾸기" }, { key: "email", label: "이메일 틀" }]} value={tab} onChange={setTab} />
      {tab === "spell" && <Spell />}
      {tab === "tone" && <Tone />}
      {tab === "email" && <Email />}
    </Page>
  );
}

function Spell() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<{ text: string; changes: Change[] } | null>(null);
  const act = useAction();
  return (
    <div className="grid-2">
      <Card>
        <textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 몇일 뒤에 연락드릴께요. 그건 안되요." />
        <Button variant="primary" icon={<SpellCheck size={16} />} busy={act.busy} disabled={!text.trim()} onClick={async () => setRes((await act.run(() => api.post("/writing/spell", { text }))) ?? null)}>
          고치기
        </Button>
        <ErrorBox error={act.error} />
      </Card>
      <Card title={res ? `고친 곳 ${res.changes.reduce((s, c) => s + c.count, 0)}` : "결과"} right={res ? <div className="row"><CopyButton text={res.text} /><Button small onClick={() => setText(res.text)}>원문에 적용</Button></div> : null}>
        {res && (
          <>
            <textarea rows={8} readOnly value={res.text} />
            <ul className="list compact">
              {res.changes.map((c, i) => (
                <li key={i} className="list-row">
                  <span className="strike">{c.before}</span> → <b>{c.after}</b>
                  <span className="muted small grow">{c.reason}</span>
                  {c.count > 1 && <Badge>{c.count}곳</Badge>}
                </li>
              ))}
            </ul>
            {!res.changes.length && <p className="muted">고칠 곳을 찾지 못했어요.</p>}
          </>
        )}
      </Card>
    </div>
  );
}

function Tone() {
  const [text, setText] = useState("");
  const [style, setStyle] = useState("formal");
  const [useAi, setUseAi] = useState(false);
  const [res, setRes] = useState<{ text: string; changed: number } | null>(null);
  const llm = useData(() => api.get<{ llm: boolean }>("/translate/status"));
  const act = useAction();
  return (
    <div className="grid-2">
      <Card>
        <textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 내일 회의 자료 보내드려요. 확인해 주세요." />
        <div className="row wrap">
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="formal">합니다체 (보고·안내)</option>
            <option value="polite">해요체 (부드럽게)</option>
            <option value="official">공문체 (~함, ~임)</option>
          </select>
          {llm.data?.llm && (
            <label className="check-label">
              <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} /> 로컬 AI로 자연스럽게
            </label>
          )}
          <Button variant="primary" icon={<WandSparkles size={16} />} busy={act.busy} disabled={!text.trim()} onClick={async () => setRes((await act.run(() => api.post("/writing/tone", { text, style, use_ai: useAi }))) ?? null)}>
            바꾸기
          </Button>
        </div>
        <ErrorBox error={act.error} />
      </Card>
      <Card title="결과" right={res ? <CopyButton text={res.text} /> : null}>
        <textarea rows={14} readOnly value={res?.text ?? ""} />
        {res && res.changed >= 0 && <p className="muted small">문장 끝 {res.changed}곳을 바꿨어요. 어색한 곳은 직접 다듬어 주세요.</p>}
      </Card>
    </div>
  );
}

function Email() {
  const settings = useData(() => api.get<Record<string, string>>("/system/settings"));
  const [form, setForm] = useState({ recipient: "", subject: "", body: "", style: "formal" });
  const [res, setRes] = useState<{ subject: string; text: string } | null>(null);
  const act = useAction();
  const sender = settings.data?.user_name ?? "";
  const company = settings.data?.company ?? "";
  return (
    <div className="grid-2">
      <Card>
        <div className="form-grid">
          <Field label="받는 분"><input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="김민수" /></Field>
          <Field label="제목"><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
        </div>
        <Field label="하고 싶은 말" hint={sender ? `보내는 사람: ${company} ${sender}` : "설정에서 내 이름·회사를 넣으면 서명이 들어가요."}>
          <textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="회의 자료 보내드려요. 금요일까지 검토해 주세요." />
        </Field>
        <Button variant="primary" icon={<Mail size={16} />} busy={act.busy} disabled={!form.body.trim()} onClick={async () => setRes((await act.run(() => api.post("/writing/email", { ...form, sender, company }))) ?? null)}>
          메일 만들기
        </Button>
      </Card>
      <Card title={res?.subject ? `제목: ${res.subject}` : "결과"} right={res ? <CopyButton text={res.text} /> : null}>
        <textarea rows={16} readOnly value={res?.text ?? ""} />
      </Card>
    </div>
  );
}

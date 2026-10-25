import { Check, Pin, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Empty, Page, Tabs } from "../components/ui";
import { api } from "../lib/api";
import { dateTime, dueLabel } from "../lib/format";
import { useData } from "../lib/hooks";

type Todo = { id: number; text: string; done: number; due: string | null; assignee: string | null; source: string | null };
type Note = { id: number; title: string; body: string; tags: string; pinned: number; updated_at: string };

export default function Notes() {
  const [tab, setTab] = useState<"todo" | "note">(() => {
    const hit = sessionStorage.getItem("lb-open");
    return hit && JSON.parse(hit).kind === "note" ? "note" : "todo";
  });
  return (
    <Page title="메모·할 일" desc="할 일은 회의록이나 글에서 자동으로 들어오기도 해요.">
      <Tabs tabs={[{ key: "todo", label: "할 일" }, { key: "note", label: "메모" }]} value={tab} onChange={setTab} />
      {tab === "todo" ? <Todos /> : <NotesView />}
    </Page>
  );
}

function Todos() {
  const [status, setStatus] = useState<"open" | "done">("open");
  const { data, reload } = useData(() => api.get<Todo[]>("/todos", { status }), [status]);
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const add = async () => {
    if (!text.trim()) return;
    await api.post("/todos", { text, due: due || null });
    setText("");
    setDue("");
    reload();
  };
  const toggle = async (t: Todo) => {
    await api.patch(`/todos/${t.id}`, { done: !t.done });
    reload();
  };
  return (
    <Card>
      <div className="edit-row">
        <input className="grow" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="할 일을 적고 Enter" />
        <input className="w-md" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <Button variant="primary" icon={<Plus size={15} />} onClick={add}>추가</Button>
      </div>
      <div className="row">
        <Tabs tabs={[{ key: "open", label: "남은 일" }, { key: "done", label: "끝낸 일" }]} value={status} onChange={setStatus} />
      </div>
      {data && !data.length && <Empty>{status === "open" ? "남은 일이 없어요 🎉" : "아직 끝낸 일이 없어요."}</Empty>}
      <ul className="list">
        {data?.map((t) => {
          const d = dueLabel(t.due);
          return (
            <li key={t.id} className={`list-row ${t.done ? "done" : ""}`}>
              <button className={`check ${t.done ? "on" : ""}`} onClick={() => toggle(t)} aria-label="완료 표시">
                <Check size={13} />
              </button>
              <span className="grow">{t.text}</span>
              {t.source?.startsWith("transcript:") && <Badge>회의록</Badge>}
              {t.assignee && <Badge>{t.assignee}</Badge>}
              {d.text && !t.done && <Badge tone={d.tone}>{d.text}</Badge>}
              <button className="iconbtn" aria-label="삭제" onClick={async () => (await api.del(`/todos/${t.id}`), reload())}>
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function NotesView() {
  const [q, setQ] = useState("");
  const { data, reload } = useData(() => api.get<Note[]>("/notes", { q }), [q]);
  const [sel, setSel] = useState<Note | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "", tags: "", pinned: false });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const hit = sessionStorage.getItem("lb-open");
    if (hit && data) {
      const h = JSON.parse(hit);
      if (h.kind === "note") {
        sessionStorage.removeItem("lb-open");
        const n = data.find((x) => String(x.id) === h.ref);
        if (n) open(n);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const open = (n: Note | null) => {
    setSel(n);
    setDraft(n ? { title: n.title, body: n.body, tags: n.tags, pinned: !!n.pinned } : { title: "", body: "", tags: "", pinned: false });
    setDirty(false);
  };
  const save = async () => {
    const saved = sel ? await api.put<Note>(`/notes/${sel.id}`, draft) : await api.post<Note>("/notes", draft);
    setSel(saved);
    setDirty(false);
    reload();
  };
  return (
    <div className="grid-2 notes">
      <Card>
        <div className="edit-row">
          <input className="grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="메모 찾기" />
          <Button icon={<Plus size={15} />} onClick={() => open(null)}>새 메모</Button>
        </div>
        {data && !data.length && <Empty>메모가 없어요.</Empty>}
        <ul className="list">
          {data?.map((n) => (
            <li key={n.id} className={`list-row clickable ${sel?.id === n.id ? "selected" : ""}`} onClick={() => open(n)}>
              {n.pinned ? <Pin size={13} className="accent" /> : null}
              <span className="grow truncate">{n.title || n.body.slice(0, 30) || "(빈 메모)"}</span>
              <span className="muted small">{dateTime(n.updated_at)}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <input className="title-input" value={draft.title} placeholder="제목" onChange={(e) => (setDraft({ ...draft, title: e.target.value }), setDirty(true))} />
        <textarea rows={16} value={draft.body} placeholder="내용" onChange={(e) => (setDraft({ ...draft, body: e.target.value }), setDirty(true))} />
        <div className="edit-row">
          <input className="grow" value={draft.tags} placeholder="태그 (쉼표로 구분)" onChange={(e) => (setDraft({ ...draft, tags: e.target.value }), setDirty(true))} />
          <Button small icon={<Pin size={14} />} variant={draft.pinned ? "primary" : "default"} onClick={() => (setDraft({ ...draft, pinned: !draft.pinned }), setDirty(true))}>
            고정
          </Button>
        </div>
        <div className="row">
          <Button variant="primary" disabled={!dirty} onClick={save}>저장</Button>
          {sel && (
            <Button variant="danger" onClick={async () => { if (confirm("이 메모를 지울까요?")) { await api.del(`/notes/${sel.id}`); open(null); reload(); } }}>
              삭제
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

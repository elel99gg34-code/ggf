import { ArrowRight, Check } from "lucide-react";
import { useSystem } from "../components/system";
import { Badge, Card, Empty, Page } from "../components/ui";
import { api } from "../lib/api";
import { dateTime, dueLabel } from "../lib/format";
import { useData } from "../lib/hooks";
import { NAV } from "../nav";

type Todo = { id: number; text: string; due: string | null; assignee: string | null };
type Dash = {
  todos_open: number;
  todos_due_today: number;
  notes: number;
  clips: number;
  transcripts: number;
  contacts: number;
  focus_today: number;
  recent_transcripts: { id: number; title: string; created_at: string }[];
  upcoming_todos: Todo[];
};

export default function Home() {
  const { navigate } = useSystem();
  const { data, reload } = useData(() => api.get<Dash>("/dashboard"));
  const hour = new Date().getHours();
  const greet = hour < 12 ? "좋은 아침이에요" : hour < 18 ? "좋은 오후예요" : "오늘도 수고했어요";
  const done = async (id: number) => {
    await api.patch(`/todos/${id}`, { done: true });
    reload();
  };
  return (
    <Page title={greet} desc="모든 처리는 이 PC 안에서만 이뤄져요. 파일이 밖으로 나가지 않아요.">
      <div className="stats">
        <Stat label="남은 할 일" value={data?.todos_open} sub={data?.todos_due_today ? `오늘까지 ${data.todos_due_today}개` : undefined} onClick={() => navigate("notes")} />
        <Stat label="오늘 집중" value={data ? `${data.focus_today}분` : undefined} onClick={() => navigate("focus")} />
        <Stat label="회의록" value={data?.transcripts} onClick={() => navigate("transcribe")} />
        <Stat label="메모" value={data?.notes} onClick={() => navigate("notes")} />
      </div>
      <div className="grid-2">
        <Card title="다가오는 할 일" right={<button className="linklike" onClick={() => navigate("notes")}>전체 보기</button>}>
          {data && data.upcoming_todos.length === 0 && <Empty>할 일이 없어요. 회의록이나 글에서 자동으로 뽑아 보세요.</Empty>}
          <ul className="list">
            {data?.upcoming_todos.map((t) => {
              const d = dueLabel(t.due);
              return (
                <li key={t.id} className="list-row">
                  <button className="check" onClick={() => done(t.id)} aria-label="완료">
                    <Check size={13} />
                  </button>
                  <span className="grow">{t.text}</span>
                  {t.assignee && <Badge>{t.assignee}</Badge>}
                  {d.text && <Badge tone={d.tone}>{d.text}</Badge>}
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title="최근 회의록" right={<button className="linklike" onClick={() => navigate("transcribe")}>새로 만들기</button>}>
          {data && data.recent_transcripts.length === 0 && <Empty>녹음 파일을 넣으면 회의록·요약·할 일이 한 번에 만들어져요.</Empty>}
          <ul className="list">
            {data?.recent_transcripts.map((t) => (
              <li key={t.id} className="list-row clickable" onClick={() => (sessionStorage.setItem("lb-open-transcript", String(t.id)), navigate("transcribe"))}>
                <span className="grow">{t.title}</span>
                <span className="muted small">{dateTime(t.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <h3 className="section-title">모든 기능</h3>
      <div className="feature-grid">
        {NAV.slice(1, 3).flatMap((g) =>
          g.items.map((it) => (
            <button key={it.key} className="feature" onClick={() => navigate(it.key)}>
              <it.icon size={20} />
              <div>
                <b>{it.label}</b>
                <span className="muted small">{it.desc}</span>
              </div>
              <ArrowRight size={15} className="muted" />
            </button>
          )),
        )}
      </div>
    </Page>
  );
}

function Stat({ label, value, sub, onClick }: { label: string; value: number | string | undefined; sub?: string; onClick?: () => void }) {
  return (
    <button className="stat" onClick={onClick}>
      <span className="muted small">{label}</span>
      <b>{value ?? "–"}</b>
      {sub && <span className="small accent">{sub}</span>}
    </button>
  );
}

import { Coffee, Play, Square } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button, Card, CopyButton, Field, Page } from "../components/ui";
import { api } from "../lib/api";
import { focusTimer } from "../lib/focusTimer";
import { localDate } from "../lib/format";
import { useData } from "../lib/hooks";

type Report = { week_start: string; days: { date: string; label: string; minutes: number; sessions: number }[]; labels: { label: string; minutes: number }[]; total_minutes: number; done_todos: number; markdown: string };

function mondayOf(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return localDate(x);
}

export default function Focus() {
  const running = useSyncExternalStore(focusTimer.subscribe, focusTimer.get);
  const [, force] = useState(0);
  useSyncExternalStore(focusTimer.subscribe, () => Math.floor(Date.now() / 1000));
  const settings = useData(() => api.get<Record<string, number>>("/system/settings"));
  const [label, setLabel] = useState("");
  const focusMin = settings.data?.focus_minutes ?? 25;
  const breakMin = settings.data?.break_minutes ?? 5;
  const [week, setWeek] = useState(mondayOf(new Date()));
  const report = useData(() => api.get<Report>("/focus/report", { week }), [week, running?.id]);
  const today = useData(() => api.get<{ minutes: number; completed: number }>("/focus/today"), [running?.id]);

  const left = running ? Math.max(0, Math.round((running.endsAt - Date.now()) / 1000)) : focusMin * 60;
  const total = running ? running.minutes * 60 : focusMin * 60;
  const pct = 1 - left / total;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const max = Math.max(60, ...(report.data?.days.map((d) => d.minutes) ?? [0]));
  const shift = (n: number) => {
    const d = new Date(week + "T00:00:00");
    d.setDate(d.getDate() + n * 7);
    setWeek(localDate(d));
  };

  return (
    <Page title="집중 타이머" desc={`${focusMin}분 집중하고 ${breakMin}분 쉬어요. 다른 화면으로 가도 계속 돌아가고, 끝나면 알림 소리가 나요.`}>
      <div className="grid-2">
        <Card>
          <div className={`timer ${running?.kind === "break" ? "break" : ""}`} style={{ ["--pct" as string]: pct }}>
            <div className="timer-ring">
              <div className="timer-text">
                <b>{mm}:{ss}</b>
                <span className="muted small">{running ? (running.kind === "focus" ? running.label || "집중 중" : "쉬는 중") : "준비"}</span>
              </div>
            </div>
          </div>
          {!running ? (
            <>
              <Field label="지금 할 일">
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 기획서 쓰기" />
              </Field>
              <div className="row">
                <Button variant="primary" icon={<Play size={16} />} onClick={async () => (await focusTimer.start("focus", focusMin, label), force((x) => x + 1))}>
                  {focusMin}분 집중
                </Button>
                <Button icon={<Coffee size={16} />} onClick={() => focusTimer.start("break", breakMin, "")}>
                  {breakMin}분 쉬기
                </Button>
              </div>
            </>
          ) : (
            <Button variant="danger" icon={<Square size={16} />} onClick={() => focusTimer.stop(false)}>
              그만하기
            </Button>
          )}
          <p className="muted small">오늘 {today.data?.minutes ?? 0}분 집중 · 끝까지 마친 세션 {today.data?.completed ?? 0}회</p>
        </Card>
        <Card
          title={`주간 리포트 · ${Math.floor((report.data?.total_minutes ?? 0) / 60)}시간 ${(report.data?.total_minutes ?? 0) % 60}분`}
          right={
            <div className="row">
              <Button small variant="ghost" onClick={() => shift(-1)}>◀</Button>
              <span className="small">{week.slice(5)} 주</span>
              <Button small variant="ghost" onClick={() => shift(1)}>▶</Button>
              {report.data && <CopyButton text={report.data.markdown} label="리포트 복사" />}
            </div>
          }
        >
          <div className="bars">
            {report.data?.days.map((d) => (
              <div key={d.date} className="bar-col" title={`${d.minutes}분`}>
                <div className="bar" style={{ height: `${(d.minutes / max) * 100}%` }} />
                <span className="small">{d.label}</span>
                <span className="muted small">{d.minutes ? `${d.minutes}분` : ""}</span>
              </div>
            ))}
          </div>
          {report.data?.labels.length ? (
            <ul className="list compact">
              {report.data.labels.slice(0, 6).map((l) => (
                <li key={l.label} className="list-row">
                  <span className="grow">{l.label}</span>
                  <span className="muted">{l.minutes}분</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="muted small">이번 주에 끝낸 할 일 {report.data?.done_todos ?? 0}개</p>
        </Card>
      </div>
    </Page>
  );
}

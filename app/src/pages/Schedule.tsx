import { CalendarPlus, X } from "lucide-react";
import { useState } from "react";
import { Button, Card, Empty, ErrorBox, Field, Notice, Page, PathLink } from "../components/ui";
import { api } from "../lib/api";
import { useAction } from "../lib/hooks";
import { isTauri, pickSavePath } from "../lib/platform";

type Ev = { title: string; start: string; end: string | null; all_day: boolean; source: string };

const SAMPLE = `내일 오후 3시에 디자인 회의
다음 주 화요일 10시 반 고객 미팅
11월 3일(화) 2시~4시 워크숍
금요일까지 보고서 제출`;

export default function Schedule() {
  const [text, setText] = useState("");
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const act = useAction();
  const parse = async () => {
    setSaved(null);
    const r = await act.run(() => api.post<{ events: Ev[] }>("/schedule/parse", { text }));
    if (r) setEvents(r.events);
  };
  const exportIcs = async () => {
    const out = await pickSavePath("일정.ics", [{ name: "캘린더", extensions: ["ics"] }]);
    if (isTauri && !out) return;
    const r = await act.run(() => api.post<{ path: string }>("/schedule/ics", { events, out_path: out }));
    if (r) setSaved(r.path);
  };
  const update = (i: number, patch: Partial<Ev>) => setEvents((xs) => xs!.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <Page title="일정 뽑기" desc="'다음 주 화요일 3시', '11월 3일 2시~4시' 같은 말을 찾아 캘린더 파일(.ics)로 만들어요. 구글·아웃룩·애플 캘린더에 바로 넣을 수 있어요.">
      <div className="grid-2">
        <Card>
          <Field label="글">
            <textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder={SAMPLE} />
          </Field>
          <div className="row">
            <Button variant="primary" icon={<CalendarPlus size={16} />} busy={act.busy} disabled={!text.trim()} onClick={parse}>
              일정 찾기
            </Button>
            {!text && <Button variant="ghost" onClick={() => setText(SAMPLE)}>예시 넣기</Button>}
          </div>
          <ErrorBox error={act.error} />
        </Card>
        <Card title={events ? `찾은 일정 ${events.length}개` : "결과"} right={events?.length ? <Button small variant="primary" onClick={exportIcs}>.ics로 저장</Button> : null}>
          {!events && <Empty>왼쪽에 글을 넣고 '일정 찾기'를 눌러 주세요.</Empty>}
          {events && !events.length && <Empty>날짜나 시간이 들어간 문장이 없어요.</Empty>}
          {saved && <Notice tone="ok">저장했어요: <PathLink path={saved} /> · 파일을 열면 캘린더 앱에 추가돼요.</Notice>}
          <div className="stack">
            {events?.map((e, i) => (
              <div key={i} className="edit-row">
                <input className="grow" value={e.title} onChange={(x) => update(i, { title: x.target.value })} />
                {e.all_day ? (
                  <input className="w-md" type="date" value={e.start.slice(0, 10)} onChange={(x) => update(i, { start: x.target.value })} />
                ) : (
                  <input className="w-lg" type="datetime-local" value={e.start.slice(0, 16)} onChange={(x) => update(i, { start: x.target.value + ":00" })} />
                )}
                <button className="iconbtn" aria-label="빼기" onClick={() => setEvents(events.filter((_, j) => j !== i))}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  );
}

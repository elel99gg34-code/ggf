import { ListChecks, X } from "lucide-react";
import { useState } from "react";
import { useSystem } from "../components/system";
import { Button, Card, Empty, ErrorBox, Field, Notice, Page } from "../components/ui";
import { api } from "../lib/api";
import { useAction } from "../lib/hooks";

type Item = { text: string; assignee: string | null; due: string | null };

const SAMPLE = `김민수 대리가 금요일까지 상세페이지 시안을 공유하기로 했습니다.
박지영님은 다음 주 화요일까지 견적서를 보내 주세요.
제가 내일 거래처에 연락하겠습니다.
TODO: 서버 비용 정리`;

export default function Actions() {
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [saved, setSaved] = useState(0);
  const act = useAction();
  const { navigate } = useSystem();
  const extract = async () => {
    setSaved(0);
    const r = await act.run(() => api.post<{ items: Item[] }>("/actions/extract", { text }));
    if (r) setItems(r.items);
  };
  const save = async () => {
    if (!items?.length) return;
    const r = await act.run(() => api.post<{ ids: number[] }>("/actions/save", { items, source: "actions" }));
    if (r) setSaved(r.ids.length);
  };
  const update = (i: number, patch: Partial<Item>) => setItems((xs) => xs!.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <Page title="할 일 뽑기" desc="회의 메모, 메일, 메신저 대화를 붙여넣으면 해야 할 일과 담당자, 기한을 찾아요.">
      <div className="grid-2">
        <Card>
          <Field label="글">
            <textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder={SAMPLE} />
          </Field>
          <div className="row">
            <Button variant="primary" icon={<ListChecks size={16} />} busy={act.busy} disabled={!text.trim()} onClick={extract}>
              할 일 찾기
            </Button>
            {!text && <Button variant="ghost" onClick={() => setText(SAMPLE)}>예시 넣기</Button>}
          </div>
          <ErrorBox error={act.error} />
        </Card>
        <Card title={items ? `찾은 할 일 ${items.length}개` : "결과"} right={items?.length ? <Button small variant="primary" onClick={save}>할 일 목록에 넣기</Button> : null}>
          {!items && <Empty>왼쪽에 글을 넣고 '할 일 찾기'를 눌러 주세요.</Empty>}
          {items && !items.length && <Empty>해야 할 일로 보이는 문장이 없어요.</Empty>}
          {saved > 0 && (
            <Notice tone="ok">
              {saved}개를 넣었어요. <button className="linklike" onClick={() => navigate("notes")}>할 일 보기</button>
            </Notice>
          )}
          <div className="stack">
            {items?.map((it, i) => (
              <div key={i} className="edit-row">
                <input className="grow" value={it.text} onChange={(e) => update(i, { text: e.target.value })} />
                <input className="w-sm" value={it.assignee ?? ""} placeholder="담당" onChange={(e) => update(i, { assignee: e.target.value || null })} />
                <input className="w-md" type="date" value={it.due ?? ""} onChange={(e) => update(i, { due: e.target.value || null })} />
                <button className="iconbtn" aria-label="빼기" onClick={() => setItems(items.filter((_, j) => j !== i))}>
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

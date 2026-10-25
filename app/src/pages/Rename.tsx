import { FilePen, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, ErrorBox, Field, Notice, Page, PathPicker } from "../components/ui";
import { api } from "../lib/api";
import { baseName, dateTime } from "../lib/format";
import { useAction, useData } from "../lib/hooks";

type Item = { src: string; dst: string; changed: boolean; conflict: string | null };
type Hist = { id: number; created_at: string; undone: boolean; count: number };

const TOKENS = [
  ["{name}", "원래 이름"],
  ["{n:03}", "번호 001"],
  ["{date:%Y%m%d}", "수정한 날"],
  ["{exif:%Y-%m-%d}", "사진 찍은 날"],
  ["{today:%Y%m%d}", "오늘"],
  ["{parent}", "폴더 이름"],
];

export default function Rename() {
  const [paths, setPaths] = useState<string[]>([]);
  const [rules, setRules] = useState({ template: "{name}", find: "", replace: "", regex: false, case: "none", spaces: "keep", start: 1, step: 1, sort: "name" });
  const [items, setItems] = useState<Item[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const act = useAction();
  const hist = useData(() => api.get<Hist[]>("/rename/history"));

  useEffect(() => {
    if (!paths.length) return setItems([]);
    const t = setTimeout(async () => {
      const r = await act.run(() => api.post<{ items: Item[] }>("/rename/plan", { paths, rules }));
      if (r) setItems(r.items);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths, rules]);

  const apply = async () => {
    const r = await act.run(() => api.post<{ renamed: number }>("/rename/apply", { items }));
    if (r) {
      setDone(`${r.renamed}개 이름을 바꿨어요.`);
      setPaths(items.map((i) => i.dst));
      hist.reload();
    }
  };
  const conflicts = items.filter((i) => i.conflict).length;
  const changed = items.filter((i) => i.changed).length;
  return (
    <Page title="이름 일괄 변경" desc="규칙을 정하면 바뀔 이름을 먼저 보여줘요. 잘못 바꿔도 되돌릴 수 있어요.">
      <div className="grid-2 wide-left">
        <Card>
          <PathPicker value={paths} onChange={(p) => (setPaths(p), setDone(null))} multiple placeholder="파일을 고르거나 끌어다 놓으세요" />
          {items.length > 0 && (
            <table className="table">
              <thead>
                <tr><th>지금 이름</th><th>바뀔 이름</th></tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.src} className={i.conflict ? "row-error" : ""}>
                    <td className="muted">{baseName(i.src)}</td>
                    <td>{baseName(i.dst)} {i.conflict && <span className="error-text small">· {i.conflict}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="row">
            <Button variant="primary" icon={<FilePen size={16} />} busy={act.busy} disabled={!changed || conflicts > 0} onClick={apply}>
              {changed}개 바꾸기
            </Button>
            {conflicts > 0 && <span className="error-text small">겹치는 이름 {conflicts}개를 먼저 해결해 주세요.</span>}
          </div>
          <ErrorBox error={act.error} />
          {done && <Notice tone="ok">{done}</Notice>}
        </Card>
        <div className="stack">
          <Card title="규칙">
            <Field label="새 이름 틀">
              <input value={rules.template} onChange={(e) => setRules({ ...rules, template: e.target.value })} />
            </Field>
            <div className="row wrap">
              {TOKENS.map(([t, label]) => (
                <button key={t} className="chip" onClick={() => setRules({ ...rules, template: rules.template + t })} title={t}>
                  + {label}
                </button>
              ))}
            </div>
            <div className="form-grid">
              <Field label="찾을 말"><input value={rules.find} onChange={(e) => setRules({ ...rules, find: e.target.value })} /></Field>
              <Field label="바꿀 말"><input value={rules.replace} onChange={(e) => setRules({ ...rules, replace: e.target.value })} /></Field>
              <Field label="빈칸">
                <select value={rules.spaces} onChange={(e) => setRules({ ...rules, spaces: e.target.value })}>
                  <option value="keep">그대로</option>
                  <option value="underscore">_ 로</option>
                  <option value="dash">- 로</option>
                  <option value="remove">없애기</option>
                </select>
              </Field>
              <Field label="대소문자">
                <select value={rules.case} onChange={(e) => setRules({ ...rules, case: e.target.value })}>
                  <option value="none">그대로</option>
                  <option value="lower">소문자</option>
                  <option value="upper">대문자</option>
                </select>
              </Field>
              <Field label="번호 순서">
                <select value={rules.sort} onChange={(e) => setRules({ ...rules, sort: e.target.value })}>
                  <option value="name">이름순</option>
                  <option value="mtime">수정한 날순</option>
                  <option value="size">크기순</option>
                </select>
              </Field>
              <Field label="시작 번호"><input type="number" value={rules.start} onChange={(e) => setRules({ ...rules, start: +e.target.value })} /></Field>
            </div>
            <label className="check-label">
              <input type="checkbox" checked={rules.regex} onChange={(e) => setRules({ ...rules, regex: e.target.checked })} /> 정규식으로 찾기
            </label>
          </Card>
          <Card title="되돌리기">
            {hist.data?.length ? (
              <ul className="list compact">
                {hist.data.map((h) => (
                  <li key={h.id} className="list-row">
                    <span className="grow">{dateTime(h.created_at)} · {h.count}개</span>
                    {h.undone ? (
                      <span className="muted small">되돌림</span>
                    ) : (
                      <Button small icon={<Undo2 size={14} />} onClick={async () => { await act.run(() => api.post(`/rename/undo/${h.id}`)); hist.reload(); setPaths([]); }}>
                        되돌리기
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">아직 바꾼 기록이 없어요.</p>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}

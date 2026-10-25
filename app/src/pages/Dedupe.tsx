import { Copy, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, Empty, ErrorBox, JobBar, Notice, Page, PathPicker, Tabs } from "../components/ui";
import { api } from "../lib/api";
import { baseName, bytes, dateTime } from "../lib/format";
import { useAction, useData, useJob } from "../lib/hooks";
import { reveal } from "../lib/platform";

type FileInfo = { path: string; size: number; mtime: string };
type Group = { files: FileInfo[]; size: number; wasted: number };
type Result = { mode: string; scanned: number; groups: Group[]; wasted: number };
type Hist = { id: number; created_at: string; undone: boolean; count: number };

export default function Dedupe() {
  const [dirs, setDirs] = useState<string[]>([]);
  const [mode, setMode] = useState<"exact" | "similar">("exact");
  const [threshold, setThreshold] = useState(6);
  const job = useJob<Result>();
  const act = useAction();
  const hist = useData(() => api.get<Hist[]>("/dedupe/history"));
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [moved, setMoved] = useState<string | null>(null);
  const result = job.job?.status === "done" ? job.job.result : null;

  const scan = async () => {
    setMoved(null);
    const j = await job.start(() => api.post("/dedupe/scan", { dirs, mode, threshold }));
    // 각 묶음에서 첫 번째(가장 오래된/큰 것)만 남기고 나머지를 미리 골라 둔다.
    if (j?.result) setChecked(new Set(j.result.groups.flatMap((g) => g.files.slice(1).map((f) => f.path))));
  };
  const selectedSize = useMemo(
    () => (result?.groups ?? []).flatMap((g) => g.files).filter((f) => checked.has(f.path)).reduce((s, f) => s + f.size, 0),
    [result, checked],
  );
  const quarantine = async () => {
    const r = await act.run(() => api.post<{ moved: number; folder: string }>("/dedupe/quarantine", { paths: Array.from(checked) }));
    if (r) {
      setMoved(`${r.moved}개를 보관함으로 옮겼어요. 지운 게 아니라서 언제든 되돌릴 수 있어요.`);
      job.reset();
      setChecked(new Set());
      hist.reload();
    }
  };
  const toggle = (p: string) => setChecked((s) => {
    const n = new Set(s);
    if (n.has(p)) n.delete(p);
    else n.add(p);
    return n;
  });
  return (
    <Page title="중복 정리" desc="내용이 똑같은 파일이나 거의 같은 사진을 찾아요. 지우지 않고 보관함으로 옮겨서 되돌릴 수 있어요.">
      <div className="grid-2 wide-left">
        <Card>
          <PathPicker value={dirs} onChange={setDirs} multiple directory placeholder="찾을 폴더를 고르거나 끌어다 놓으세요" />
          <Tabs tabs={[{ key: "exact", label: "똑같은 파일" }, { key: "similar", label: "비슷한 사진" }]} value={mode} onChange={setMode} />
          {mode === "similar" && (
            <label className="field">
              <span className="field-label">비슷한 정도: {threshold <= 3 ? "거의 같아야" : threshold <= 8 ? "보통" : "느슨하게"}</span>
              <input type="range" min={1} max={14} value={threshold} onChange={(e) => setThreshold(+e.target.value)} />
            </label>
          )}
          <Button variant="primary" icon={<Copy size={16} />} busy={job.running} disabled={!dirs.length} onClick={scan}>찾기</Button>
          <JobBar job={job.job} error={job.error} onCancel={job.cancel} />
          <ErrorBox error={act.error} />
          {moved && <Notice tone="ok">{moved}</Notice>}
        </Card>
        <Card title="보관함 기록">
          {hist.data?.length ? (
            <ul className="list compact">
              {hist.data.map((h) => (
                <li key={h.id} className="list-row">
                  <span className="grow">{dateTime(h.created_at)} · {h.count}개</span>
                  {h.undone ? <span className="muted small">되돌림</span> : (
                    <Button small icon={<Undo2 size={14} />} onClick={async () => { await act.run(() => api.post(`/dedupe/restore/${h.id}`)); hist.reload(); }}>되돌리기</Button>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="muted small">아직 옮긴 기록이 없어요.</p>}
        </Card>
      </div>
      {result && (
        <Card
          title={`${result.scanned.toLocaleString()}개 중 ${result.groups.length}묶음 · 아낄 수 있는 용량 ${bytes(result.wasted)}`}
          right={<Button variant="danger" disabled={!checked.size} busy={act.busy} onClick={quarantine}>고른 {checked.size}개 보관함으로 ({bytes(selectedSize)})</Button>}
        >
          {!result.groups.length && <Empty>중복이 없어요 👍</Empty>}
          <div className="stack">
            {result.groups.map((g, gi) => (
              <div key={gi} className="dup-group">
                {g.files.map((f) => (
                  <label key={f.path} className="dup-row">
                    <input type="checkbox" checked={checked.has(f.path)} onChange={() => toggle(f.path)} />
                    <span className="grow truncate" title={f.path}>{baseName(f.path)} <span className="muted small">{f.path}</span></span>
                    <span className="muted small">{bytes(f.size)}</span>
                    <span className="muted small">{dateTime(f.mtime)}</span>
                    <button className="iconbtn" onClick={(e) => (e.preventDefault(), reveal(f.path))} aria-label="폴더에서 보기">↗</button>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}
    </Page>
  );
}

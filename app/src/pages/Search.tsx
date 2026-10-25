import { FolderSearch, RotateCw, Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useSystem } from "../components/system";
import { Badge, Button, Card, Empty, JobBar, Page, PathLink, PathPicker, Tabs } from "../components/ui";
import { api } from "../lib/api";
import { dateTime } from "../lib/format";
import { useData, useJob } from "../lib/hooks";

type Hit = { kind: string; kind_label: string; ref: string; title: string; snippet: string; marks: [number, number][]; updated: string };
const KIND_PAGE: Record<string, string> = { note: "notes", todo: "notes", clip: "clipboard", transcript: "transcribe", contact: "papers" };
const KINDS = [
  { key: "", label: "전체" },
  { key: "transcript", label: "회의록" },
  { key: "note", label: "메모" },
  { key: "todo", label: "할 일" },
  { key: "clip", label: "클립보드" },
  { key: "file", label: "문서" },
  { key: "contact", label: "연락처" },
];

function Highlight({ text, marks }: { text: string; marks: [number, number][] }) {
  const out = [];
  let pos = 0;
  for (const [s, e] of marks) {
    if (s < pos) continue;
    out.push(text.slice(pos, s));
    out.push(<mark key={s}>{text.slice(s, e)}</mark>);
    pos = e;
  }
  out.push(text.slice(pos));
  return <>{out}</>;
}

export default function Search() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const { navigate } = useSystem();
  const folders = useData(() => api.get<{ folders: string[]; files: number }>("/search/folders"));
  const [dir, setDir] = useState<string[]>([]);
  const job = useJob<{ indexed: number; failed: number; total: number }>();

  useEffect(() => {
    if (!q.trim()) return setHits(null);
    const t = setTimeout(() => api.get<{ results: Hit[] }>("/search", { q, kinds: kind }).then((r) => setHits(r.results)).catch(() => setHits([])), 200);
    return () => clearTimeout(t);
  }, [q, kind]);

  const open = (h: Hit) => {
    if (h.kind === "file") return;
    sessionStorage.setItem("lb-open", JSON.stringify(h));
    navigate(KIND_PAGE[h.kind]);
  };
  return (
    <Page title="통합 검색" desc="회의록, 메모, 할 일, 클립보드, 연락처, 그리고 등록한 폴더의 문서(HWP·HWPX·DOCX·PDF·TXT) 속 글자까지 한 번에 찾아요.">
      <div className="search-box">
        <SearchIcon size={18} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="찾을 말 (두 글자 이상)" />
      </div>
      <Tabs tabs={KINDS} value={kind} onChange={setKind} />
      <div className="grid-2 wide-left">
        <Card>
          {!hits && <Empty icon={<SearchIcon size={28} />}>무엇이든 찾아보세요. 어디서든 Ctrl+K로 바로 찾을 수 있어요.</Empty>}
          {hits && !hits.length && <Empty>결과가 없어요.</Empty>}
          <ul className="list">
            {hits?.map((h) => (
              <li key={`${h.kind}-${h.ref}`} className={`list-row ${h.kind !== "file" ? "clickable" : ""}`} onClick={() => open(h)}>
                <div className="grow">
                  <div className="row">
                    <Badge>{h.kind_label}</Badge>
                    {h.kind === "file" ? <PathLink path={h.ref} label={h.title} /> : <b>{h.title}</b>}
                  </div>
                  <div className="muted small snippet"><Highlight text={h.snippet} marks={h.marks} /></div>
                </div>
                <span className="muted small">{dateTime(h.updated)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="문서 폴더 등록" right={folders.data?.folders.length ? <Button small icon={<RotateCw size={14} />} onClick={async () => { await api.post("/search/reindex"); folders.reload(); }}>다시 읽기</Button> : null}>
          <p className="muted small">폴더를 등록하면 안에 있는 문서의 글자를 읽어 두었다가 검색에 같이 보여줘요.</p>
          <PathPicker value={dir} onChange={setDir} directory placeholder="문서 폴더를 고르세요" />
          <Button icon={<FolderSearch size={16} />} busy={job.running} disabled={!dir.length} onClick={async () => { await job.start(() => api.post("/search/index-folder", { folder: dir[0] })); folders.reload(); setDir([]); }}>
            등록하고 읽기
          </Button>
          <JobBar job={job.job} error={job.error} onCancel={job.cancel} />
          {job.job?.status === "done" && job.job.result && <p className="small">문서 {job.job.result.indexed}개를 읽었어요{job.job.result.failed ? ` (읽지 못한 파일 ${job.job.result.failed}개)` : ""}.</p>}
          <ul className="list compact">
            {folders.data?.folders.map((f) => <li key={f} className="list-row"><PathLink path={f} label={f} /></li>)}
          </ul>
          {folders.data ? <p className="muted small">색인한 문서 {folders.data.files}개</p> : null}
        </Card>
      </div>
    </Page>
  );
}

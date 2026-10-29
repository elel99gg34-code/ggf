import { CalendarPlus, CircleCheckBig, Download, ListChecks, Mic, Sparkles, Tags, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { NeedsComponent, useSystem } from "../components/system";
import { Badge, Button, Card, Empty, ErrorBox, Field, JobBar, Page, PathLink, PathPicker, Tabs, Toggle, useToast } from "../components/ui";
import { api } from "../lib/api";
import { clock, dateTime } from "../lib/format";
import { useAction, useData, useJob } from "../lib/hooks";

type Segment = { start: number; end: number; text: string; speaker: number | null };
type Transcript = { id: number; title: string; source_path: string | null; duration: number | null; segments: Segment[]; speakers: Record<string, string>; summary: string[]; created_at: string };
type Item = { id: number; title: string; duration: number | null; created_at: string };
type ActionItem = { text: string; assignee: string | null; due: string | null };
type Ev = { title: string; start: string; end: string | null; all_day: boolean; source: string };
type Insights = { actions: ActionItem[]; events: Ev[]; decisions: string[]; keywords: { word: string; count: number }[] };
type Models = { available: boolean; diarize_available: boolean; sizes: { key: string; label: string }[]; installed: string[] };

const AUDIO = [{ name: "녹음·영상", extensions: ["mp3", "m4a", "wav", "aac", "flac", "ogg", "wma", "mp4", "mov", "mkv", "webm", "avi"] }];

export default function Transcribe() {
  const [tab, setTab] = useState<"new" | "list">("new");
  const [openId, setOpenId] = useState<number | null>(() => {
    const v = sessionStorage.getItem("lb-open-transcript");
    sessionStorage.removeItem("lb-open-transcript");
    const hit = sessionStorage.getItem("lb-open");
    if (hit && JSON.parse(hit).kind === "transcript") {
      sessionStorage.removeItem("lb-open");
      return Number(JSON.parse(hit).ref);
    }
    return v ? Number(v) : null;
  });
  if (openId) return <Detail id={openId} onBack={() => (setOpenId(null), setTab("list"))} />;
  return (
    <Page title="회의록" desc="녹음 파일을 넣으면 받아쓰기 → 요약 → 할 일·일정까지 한 번에 만들어요. 인터넷 없이 이 PC에서만 처리해요.">
      <Tabs tabs={[{ key: "new", label: "새로 만들기" }, { key: "list", label: "저장된 회의록" }]} value={tab} onChange={setTab} />
      {tab === "new" ? <NewTranscript onDone={setOpenId} /> : <List onOpen={setOpenId} />}
    </Page>
  );
}

function NewTranscript({ onDone }: { onDone: (id: number) => void }) {
  const [mode, setMode] = useState<"audio" | "text">("audio");
  const [paths, setPaths] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [model, setModel] = useState("small");
  const [diarize, setDiarize] = useState(false);
  const [autoTodos, setAutoTodos] = useState(true);
  const models = useData(() => api.get<Models>("/transcribe/models"));
  const job = useJob<{ transcript_id: number; todos_added: number }>();
  const dl = useJob();
  const act = useAction();
  const toast = useToast();
  const { has } = useSystem();
  const needsDownload = models.data?.available && !models.data.installed.includes(model);

  const run = async () => {
    if (mode === "text") {
      const r = await act.run(() => api.post<{ transcript_id: number; todos_added: number }>("/transcribe/text", { title, text, auto_todos: autoTodos }));
      if (r) {
        if (r.todos_added) toast(`할 일 ${r.todos_added}개를 등록했어요`);
        onDone(r.transcript_id);
      }
      return;
    }
    const j = await job.start(() => api.post("/transcribe", { path: paths[0], title, model, diarize, auto_todos: autoTodos }));
    if (j?.status === "done" && j.result) {
      if (j.result.todos_added) toast(`할 일 ${j.result.todos_added}개를 등록했어요`);
      onDone(j.result.transcript_id);
    }
  };

  return (
    <div className="grid-2 wide-left">
      <Card>
        <Tabs tabs={[{ key: "audio", label: "녹음 파일" }, { key: "text", label: "글 붙여넣기" }]} value={mode} onChange={setMode} />
        {mode === "audio" ? (
          <>
            <NeedsComponent keys={["stt"]}>녹음 받아쓰기에는 음성 인식 구성요소가 필요해요. 글 붙여넣기는 지금도 돼요.</NeedsComponent>
            <PathPicker value={paths} onChange={setPaths} filters={AUDIO} placeholder="녹음·영상 파일을 고르거나 끌어다 놓으세요 (mp3, m4a, wav, mp4…)" />
          </>
        ) : (
          <Field label="회의 내용">
            <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="회의 메모나 다른 곳에서 받아쓴 글을 붙여넣으면 요약과 할 일을 뽑아 드려요." />
          </Field>
        )}
        <Field label="제목 (비우면 파일 이름)">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 10월 마케팅 회의" />
        </Field>
        <div className="row">
          <Button variant="primary" icon={<Mic size={16} />} busy={job.running || act.busy} disabled={mode === "audio" ? !paths.length || !has("stt") : !text.trim()} onClick={run}>
            회의록 만들기
          </Button>
        </div>
        <JobBar job={job.job} error={job.error} onCancel={job.cancel} />
        <ErrorBox error={act.error} />
      </Card>
      <Card title="옵션">
        {mode === "audio" && (
          <>
            <Field label="정확도" hint={needsDownload ? "처음 쓰는 모델은 한 번 내려받아요 (인터넷 필요)." : undefined}>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {models.data?.sizes.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                    {models.data?.installed.includes(s.key) ? " ✓" : ""}
                  </option>
                ))}
              </select>
            </Field>
            {needsDownload && (
              <>
                <Button small icon={<Download size={14} />} busy={dl.running} onClick={async () => (await dl.start(() => api.post("/transcribe/models/download", { size: model })), models.reload())}>
                  지금 내려받기
                </Button>
                <JobBar job={dl.job} error={dl.error} />
              </>
            )}
            <Toggle checked={diarize} onChange={setDiarize} label={`화자 구분 (실험 기능${models.data?.diarize_available ? "" : " · 구성요소 필요"})`} />
          </>
        )}
        <Toggle checked={autoTodos} onChange={setAutoTodos} label="할 일 자동 등록" />
        <p className="muted small">끝나면 요약, 할 일, 일정이 자동으로 정리돼요. 내보낼 때 개인정보를 가린 사본도 만들 수 있어요.</p>
      </Card>
    </div>
  );
}

function List({ onOpen }: { onOpen: (id: number) => void }) {
  const { data, reload } = useData(() => api.get<Item[]>("/transcripts"));
  if (data && !data.length) return <Empty icon={<Mic size={28} />}>아직 회의록이 없어요.</Empty>;
  return (
    <Card>
      <ul className="list">
        {data?.map((t) => (
          <li key={t.id} className="list-row clickable" onClick={() => onOpen(t.id)}>
            <span className="grow">{t.title}</span>
            {t.duration ? <Badge>{clock(t.duration)}</Badge> : <Badge>글</Badge>}
            <span className="muted small">{dateTime(t.created_at)}</span>
            <button
              className="iconbtn"
              aria-label="삭제"
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm(`'${t.title}'을(를) 지울까요?`)) {
                  await api.del(`/transcripts/${t.id}`);
                  reload();
                }
              }}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Detail({ id, onBack }: { id: number; onBack: () => void }) {
  const t = useData(() => api.get<Transcript>(`/transcripts/${id}`), [id]);
  const ins = useData(() => api.get<Insights>(`/transcripts/${id}/insights`), [id]);
  const [masked, setMasked] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const act = useAction();
  const toast = useToast();
  const [title, setTitle] = useState("");
  useEffect(() => setTitle(t.data?.title ?? ""), [t.data?.title]);
  if (!t.data) return <Page title="회의록">{t.error ? <ErrorBox error={t.error} /> : null}</Page>;
  const tr = t.data;
  const speakerIds = Array.from(new Set(tr.segments.map((s) => s.speaker).filter((s): s is number => s !== null)));

  const save = async (patch: Partial<Transcript>) => {
    const r = await act.run(() => api.put<Transcript>(`/transcripts/${id}`, patch));
    if (r) t.setData(r);
  };
  const doExport = async (format: string) => {
    const r = await act.run(() => api.post<{ path: string }>(`/transcripts/${id}/export`, { format, masked }));
    if (r) setExported(r.path);
  };
  const addTodos = async () => {
    if (!ins.data?.actions.length) return;
    const r = await act.run(() => api.post<{ ids: number[]; skipped: number }>("/actions/save", { items: ins.data!.actions, source: `transcript:${id}` }));
    if (r) toast(r.ids.length ? `할 일 ${r.ids.length}개를 등록했어요` : "이미 할 일 목록에 있어요");
  };
  const saveIcs = async () => {
    const r = await act.run(() => api.post<{ path: string }>("/schedule/ics", { events: ins.data?.events ?? [] }));
    if (r) setExported(r.path);
  };

  return (
    <Page
      title={tr.title || "회의록"}
      desc={`${dateTime(tr.created_at)}${tr.duration ? ` · ${clock(tr.duration)}` : ""}`}
      actions={<Button variant="ghost" onClick={onBack}>← 목록</Button>}
    >
      <ErrorBox error={act.error} />
      <div className="grid-2 wide-left">
        <div className="stack">
          <Card
            title="요약"
            right={
              <Button small icon={<Sparkles size={14} />} onClick={async () => { await act.run(() => api.post(`/transcripts/${id}/summarize`)); t.reload(); }}>
                다시 요약
              </Button>
            }
          >
            {tr.summary.length ? (
              <ul className="bullets">
                {tr.summary.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            ) : (
              <p className="muted">요약할 내용이 짧아요.</p>
            )}
          </Card>
          <Card title="전체 내용">
            <div className="segments">
              {tr.segments.map((s, i) => (
                <div key={i} className="segment">
                  {tr.duration ? <span className="muted small mono">{clock(s.start)}</span> : null}
                  {s.speaker !== null && <Badge tone="accent">{tr.speakers[String(s.speaker)] || `화자${s.speaker + 1}`}</Badge>}
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    className="segment-text"
                    onBlur={(e) => {
                      const text = e.currentTarget.textContent ?? "";
                      if (text !== s.text) save({ segments: tr.segments.map((x, j) => (j === i ? { ...x, text } : x)) });
                    }}
                  >
                    {s.text}
                  </span>
                </div>
              ))}
            </div>
            <p className="muted small">글자를 눌러 바로 고칠 수 있어요.</p>
          </Card>
        </div>
        <div className="stack">
          <Card title="정보">
            <Field label="제목">
              <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title !== tr.title && save({ title })} />
            </Field>
            {speakerIds.length > 0 && (
              <Field label="화자 이름">
                {speakerIds.map((sp) => (
                  <input
                    key={sp}
                    defaultValue={tr.speakers[String(sp)] ?? ""}
                    placeholder={`화자${sp + 1}`}
                    onBlur={(e) => save({ speakers: { ...tr.speakers, [String(sp)]: e.target.value } })}
                  />
                ))}
              </Field>
            )}
          </Card>
          {!!ins.data?.decisions.length && (
            <Card title={<><CircleCheckBig size={16} /> 결정 사항 {ins.data.decisions.length}</>}>
              <ul className="bullets">
                {ins.data.decisions.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </Card>
          )}
          {!!ins.data?.keywords.length && (
            <Card title={<><Tags size={16} /> 주요 낱말</>}>
              <div className="row wrap">
                {ins.data.keywords.map((k) => <Badge key={k.word} tone="accent">{k.word} {k.count}</Badge>)}
              </div>
            </Card>
          )}
          <Card title={<><ListChecks size={16} /> 할 일 {ins.data?.actions.length ?? 0}</>} right={ins.data?.actions.length ? <Button small onClick={addTodos}>할 일에 넣기</Button> : null}>
            <ul className="list compact">
              {ins.data?.actions.map((a, i) => (
                <li key={i} className="list-row">
                  <span className="grow">{a.text}</span>
                  {a.assignee && <Badge>{a.assignee}</Badge>}
                  {a.due && <Badge tone="soon">{a.due.slice(5)}</Badge>}
                </li>
              ))}
            </ul>
            {ins.data && !ins.data.actions.length && <p className="muted small">찾은 할 일이 없어요.</p>}
          </Card>
          <Card title={<><CalendarPlus size={16} /> 일정 {ins.data?.events.length ?? 0}</>} right={ins.data?.events.length ? <Button small onClick={saveIcs}>캘린더 파일</Button> : null}>
            <ul className="list compact">
              {ins.data?.events.map((e, i) => (
                <li key={i} className="list-row">
                  <span className="grow">{e.title}</span>
                  <span className="muted small">{dateTime(e.start)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="내보내기">
            <Toggle checked={masked} onChange={setMasked} label="개인정보 가린 사본으로" />
            <div className="row wrap">
              {["docx", "txt", "md", "srt", "vtt"].map((f) => (
                <Button key={f} small busy={act.busy} onClick={() => doExport(f)}>
                  {f === "docx" ? "워드(.docx)" : f.toUpperCase()}
                </Button>
              ))}
            </div>
            {exported && <p className="small">저장했어요: <PathLink path={exported} /></p>}
          </Card>
        </div>
      </div>
    </Page>
  );
}

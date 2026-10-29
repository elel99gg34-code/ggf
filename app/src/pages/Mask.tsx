import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NeedsComponent } from "../components/system";
import { Badge, Button, Card, CopyButton, ErrorBox, Field, JobBar, Notice, Page, PathLink, PathPicker, Tabs, Toggle } from "../components/ui";
import { api } from "../lib/api";
import { baseName } from "../lib/format";
import { useAction, useData, useJob } from "../lib/hooks";
import { pickFiles } from "../lib/platform";

type Kind = { key: string; label: string; default: boolean };
type FileResult = { src: string; dst?: string; count?: number; by_kind?: Record<string, number>; note?: string; error?: string };
type Finding = { kind: string; label: string; start: number; end: number; value: string };

const MODES = [
  { key: "partial", label: "일부만 가리기 (010-****-5678)" },
  { key: "full", label: "전부 가리기 (***-****-****)" },
  { key: "tag", label: "항목 이름으로 ([전화번호])" },
];
const DOCS = [{ name: "문서·이미지", extensions: ["hwpx", "hwp", "docx", "xlsx", "pdf", "txt", "md", "csv", "png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"] }];

type Words = { always: string[]; never: string[] };
const lines = (s: string) => s.split(/\n|,/).map((x) => x.trim()).filter((x) => x.length >= 2);

export default function Mask() {
  const [tab, setTab] = useState<"files" | "text">("files");
  const kinds = useData(() => api.get<{ kinds: Kind[] }>("/mask/kinds"));
  const [selected, setSelected] = useState<string[] | null>(null);
  const [mode, setMode] = useState("partial");
  const active = selected ?? kinds.data?.kinds.filter((k) => k.default).map((k) => k.key) ?? [];
  const labels = useMemo(() => ({ custom: "지정한 말", ...Object.fromEntries((kinds.data?.kinds ?? []).map((k) => [k.key, k.label])) }), [kinds.data]);
  const words = useWords();
  return (
    <Page title="개인정보 가리기" desc="주민번호, 전화번호, 계좌, 카드, 주소, 이름, 얼굴까지 자동으로 찾아 가려요. 원본은 그대로 두고 '_마스킹' 사본을 만들어요.">
      <Tabs tabs={[{ key: "files", label: "파일" }, { key: "text", label: "글 바로 가리기" }]} value={tab} onChange={setTab} />
      <div className="grid-2 wide-left">
        {tab === "files" ? <Files kinds={active} mode={mode} labels={labels} words={words.value} /> : <TextMask kinds={active} mode={mode} words={words.value} />}
        <div className="stack">
          <Card title="찾을 항목">
            <div className="checks">
              {kinds.data?.kinds.map((k) => (
                <label key={k.key} className="check-label">
                  <input
                    type="checkbox"
                    checked={active.includes(k.key)}
                    onChange={(e) => setSelected(e.target.checked ? [...active, k.key] : active.filter((x) => x !== k.key))}
                  />
                  {k.label}
                </label>
              ))}
            </div>
            <Field label="가리는 방식">
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                {MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </Field>
            <p className="muted small">자동 탐지는 사람의 최종 확인을 대신하지 못해요. 결과 파일을 꼭 한 번 열어 보세요.</p>
          </Card>
          <Card title="내가 정하는 말">
            <Field label="항상 가릴 말" hint="거래처 이름, 내부 코드명처럼 자동으로 못 찾는 말. 한 줄에 하나 (두 글자 이상)">
              <textarea rows={3} value={words.draft.always} onChange={(e) => words.edit({ always: e.target.value })} onBlur={words.save} placeholder={"로컬상회\n프로젝트 블루문"} />
            </Field>
            <Field label="가리지 않을 말" hint="회사 대표번호·주소처럼 남겨 둘 말">
              <textarea rows={3} value={words.draft.never} onChange={(e) => words.edit({ never: e.target.value })} onBlur={words.save} placeholder={"02-345-6789\n서울특별시 마포구 월드컵북로 21"} />
            </Field>
            <p className="muted small">저장해 두면 자동 처리 규칙에도 똑같이 쓰여요.</p>
          </Card>
        </div>
      </div>
    </Page>
  );
}

/** '항상 가릴 말'·'가리지 않을 말'을 설정에 저장해 두고 쓴다. */
function useWords() {
  const saved = useData(() => api.get<{ mask_always?: string[]; mask_never?: string[] }>("/system/settings"));
  const [draft, setDraft] = useState({ always: "", never: "" });
  useEffect(() => {
    if (saved.data) setDraft({ always: (saved.data.mask_always ?? []).join("\n"), never: (saved.data.mask_never ?? []).join("\n") });
  }, [saved.data]);
  const value: Words = { always: lines(draft.always), never: lines(draft.never) };
  return {
    draft,
    value,
    edit: (d: Partial<typeof draft>) => setDraft((x) => ({ ...x, ...d })),
    save: () => api.put("/system/settings", { mask_always: value.always, mask_never: value.never }).catch(() => {}),
  };
}

function Files({ kinds, mode, labels, words }: { kinds: string[]; mode: string; labels: Record<string, string>; words: Words }) {
  const [paths, setPaths] = useState<string[]>([]);
  const [outDir, setOutDir] = useState("");
  const [faces, setFaces] = useState(true);
  const [report, setReport] = useState(false);
  const job = useJob<{ results: FileResult[]; total: number; report?: string }>();
  const hasImage = paths.some((p) => /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(p));
  return (
    <Card>
      <PathPicker value={paths} onChange={setPaths} multiple filters={DOCS} placeholder="HWPX·HWP·DOCX·엑셀·PDF·이미지·텍스트 파일을 고르거나 끌어다 놓으세요" />
      {paths.some((p) => /\.hwp$/i.test(p)) && <Notice tone="warn">HWP(구형)는 본문 글자만 가린 .txt로 저장돼요. 서식을 지키려면 한글에서 HWPX로 저장해 넣어 주세요.</Notice>}
      {hasImage && <NeedsComponent keys={["ocr"]}>이미지 속 글자를 찾으려면 OCR이 필요해요.</NeedsComponent>}
      <div className="row wrap">
        <Field label="저장 폴더 (비우면 원본 옆)" inline>
          <div className="row">
            <input value={outDir} onChange={(e) => setOutDir(e.target.value)} placeholder="원본과 같은 폴더" />
            <Button small onClick={async () => setOutDir((await pickFiles({ directory: true }))[0] ?? outDir)}>고르기</Button>
          </div>
        </Field>
        {hasImage && <Toggle checked={faces} onChange={setFaces} label="얼굴도 가리기" />}
        <Toggle checked={report} onChange={setReport} label="확인용 보고서(.csv)" />
      </div>
      <Button
        variant="primary"
        icon={<ShieldCheck size={16} />}
        busy={job.running}
        disabled={!paths.length || !kinds.length}
        onClick={() => job.start(() => api.post("/mask/files", { paths, kinds, mode, out_dir: outDir || null, faces, report, ...words }))}
      >
        {paths.length ? `${paths.length}개 파일 가리기` : "가리기"}
      </Button>
      <JobBar job={job.job} error={job.error} onCancel={job.cancel} />
      {job.job?.status === "done" && job.job.result && (
        <div className="results">
          <Notice tone="ok">모두 {job.job.result.total}곳을 가렸어요.</Notice>
          {job.job.result.report && <p className="small">보고서: <PathLink path={job.job.result.report} /> <span className="muted">(파일마다 무엇을 몇 개 가렸는지만 적혀 있어요)</span></p>}
          <table className="table">
            <thead>
              <tr><th>파일</th><th>찾은 항목</th><th>결과</th></tr>
            </thead>
            <tbody>
              {job.job.result.results.map((r) => (
                <tr key={r.src}>
                  <td title={r.src}>{baseName(r.src)}</td>
                  <td>
                    {r.error ? <span className="error-text">{r.error}</span> : Object.entries(r.by_kind ?? {}).map(([k, n]) => <Badge key={k}>{labels[k] ?? (k === "face" ? "얼굴" : k)} {n}</Badge>)}
                    {r.count === 0 && <span className="muted">없음</span>}
                    {r.note && <div className="muted small">{r.note}</div>}
                  </td>
                  <td>{r.dst && <PathLink path={r.dst} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function TextMask({ kinds, mode, words }: { kinds: string[]; mode: string; words: Words }) {
  const [text, setText] = useState("");
  const [res, setRes] = useState<{ masked: string; findings: Finding[] } | null>(null);
  const act = useAction();
  return (
    <Card>
      <Field label="원문">
        <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="개인정보가 섞인 글을 붙여넣으세요. 예: 홍길동 고객님 010-1234-5678" />
      </Field>
      <Button variant="primary" busy={act.busy} disabled={!text.trim()} onClick={async () => setRes((await act.run(() => api.post("/mask/text", { text, kinds, mode, ...words }))) ?? null)}>
        가리기
      </Button>
      <ErrorBox error={act.error} />
      {res && (
        <>
          <Field label={`결과 · ${res.findings.length}곳`}>
            <textarea rows={8} readOnly value={res.masked} />
          </Field>
          <div className="row wrap">
            <CopyButton text={res.masked} />
            {res.findings.map((f, i) => <Badge key={i}>{f.label}</Badge>)}
          </div>
        </>
      )}
    </Card>
  );
}

import { ArrowLeftRight, Download, Languages } from "lucide-react";
import { useState } from "react";
import { NeedsComponent } from "../components/system";
import { Button, Card, CopyButton, ErrorBox, JobBar, Notice, Page } from "../components/ui";
import { ApiError, api } from "../lib/api";
import { useAction, useData, useJob } from "../lib/hooks";

type Status = { available: boolean; llm: boolean; languages: { code: string; label: string }[]; installed: string[] };

export default function Translate() {
  const status = useData(() => api.get<Status>("/translate/status"));
  const [src, setSrc] = useState("ko");
  const [dst, setDst] = useState("en");
  const [text, setText] = useState(() => {
    const v = sessionStorage.getItem("lb-paste") ?? "";
    sessionStorage.removeItem("lb-paste");
    return v;
  });
  const [out, setOut] = useState("");
  const [needPack, setNeedPack] = useState(false);
  const act = useAction();
  const install = useJob();
  const run = async () => {
    setNeedPack(false);
    try {
      const r = await api.post<{ text: string }>("/translate", { text, source: src, target: dst });
      setOut(r.text);
      act.setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.component === "translate_pack") setNeedPack(true);
      act.setError(e instanceof Error ? e.message : String(e));
    }
  };
  const langs = status.data?.languages ?? [];
  return (
    <Page title="번역" desc="인터넷 없이 이 PC에서 번역해요. 언어팩은 처음 한 번만 내려받아요.">
      {status.data && !status.data.available && !status.data.llm && <NeedsComponent keys={["translate"]} />}
      <div className="row">
        <select value={src} onChange={(e) => setSrc(e.target.value)}>
          {langs.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <button className="iconbtn" aria-label="언어 바꾸기" onClick={() => (setSrc(dst), setDst(src), setText(out), setOut(text))}>
          <ArrowLeftRight size={16} />
        </button>
        <select value={dst} onChange={(e) => setDst(e.target.value)}>
          {langs.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <Button variant="primary" icon={<Languages size={16} />} busy={act.busy} disabled={!text.trim()} onClick={() => act.run(run)}>
          번역
        </Button>
      </div>
      <ErrorBox error={act.error} />
      {needPack && (
        <Notice tone="warn">
          <span>
            이 언어 조합의 언어팩이 없어요.{" "}
            <Button small icon={<Download size={14} />} busy={install.running} onClick={async () => { await install.start(() => api.post("/translate/install", { source: src, target: dst })); status.reload(); setNeedPack(false); }}>
              언어팩 받기 (인터넷 필요)
            </Button>
          </span>
        </Notice>
      )}
      <JobBar job={install.job} error={install.error} />
      <div className="grid-2">
        <Card>
          <textarea rows={16} value={text} onChange={(e) => setText(e.target.value)} placeholder="번역할 글" />
        </Card>
        <Card right={out ? <CopyButton text={out} /> : null}>
          <textarea rows={16} value={out} readOnly placeholder="번역 결과" />
        </Card>
      </div>
      {status.data?.installed.length ? <p className="muted small">설치된 언어팩: {status.data.installed.join(", ")}</p> : null}
    </Page>
  );
}

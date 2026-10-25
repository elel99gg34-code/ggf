import { Images, Scissors, Subtitles } from "lucide-react";
import { useState } from "react";
import { NeedsComponent, useSystem } from "../components/system";
import { Button, Card, ErrorBox, Field, JobBar, Notice, Page, PathLink, PathPicker, Tabs, Thumb, Toggle } from "../components/ui";
import { api } from "../lib/api";
import { baseName, clock } from "../lib/format";
import { useAction, useData, useJob } from "../lib/hooks";

type Preset = { key: string; label: string; width: number; height: number | null; mode: string };
type PresetsResp = { presets: Preset[]; rembg: boolean; ffmpeg: boolean; stt: boolean; font: boolean };
const IMAGES = [{ name: "이미지", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "gif", "tif", "tiff"] }];
const VIDEO = [{ name: "영상·녹음", extensions: ["mp4", "mov", "mkv", "webm", "avi", "mp3", "m4a", "wav"] }];

export default function Media() {
  const [tab, setTab] = useState<"image" | "video">("image");
  const info = useData(() => api.get<PresetsResp>("/media/presets"));
  return (
    <Page title="이미지·영상" desc="상품 이미지를 마켓 규격에 맞추고 워터마크를 넣어요. 영상은 말 없는 구간을 잘라내고 자막을 만들어요.">
      <Tabs tabs={[{ key: "image", label: "이미지 일괄 처리" }, { key: "video", label: "영상 무음 컷·자막" }]} value={tab} onChange={setTab} />
      {tab === "image" ? <ImageBatch info={info.data} /> : <Video />}
    </Page>
  );
}

function ImageBatch({ info }: { info: PresetsResp | null }) {
  const [paths, setPaths] = useState<string[]>([]);
  const [preset, setPreset] = useState("smartstore_main");
  const [custom, setCustom] = useState({ width: 1000, height: 1000, mode: "pad" });
  const [format, setFormat] = useState("jpg");
  const [quality, setQuality] = useState(90);
  const [bg, setBg] = useState("#ffffff");
  const [removeBg, setRemoveBg] = useState(false);
  const [wm, setWm] = useState({ text: "", position: "bottom-right", opacity: 0.35, size: 0.05, color: "#ffffff" });
  const job = useJob<{ results: { src: string; dst?: string; error?: string }[] }>();
  const run = () =>
    job.start(() =>
      api.post("/media/images", {
        paths,
        preset: preset === "custom" ? null : preset,
        ...(preset === "custom" ? custom : {}),
        format,
        quality,
        background: bg,
        remove_bg: removeBg,
        watermark: wm.text ? wm : null,
      }),
    );
  return (
    <div className="grid-2 wide-left">
      <Card>
        <PathPicker value={paths} onChange={setPaths} multiple filters={IMAGES} placeholder="이미지 파일이나 폴더를 고르거나 끌어다 놓으세요" />
        <Button variant="primary" icon={<Images size={16} />} busy={job.running} disabled={!paths.length} onClick={run}>
          처리하기
        </Button>
        <JobBar job={job.job} error={job.error} onCancel={job.cancel} />
        {job.job?.status === "done" && job.job.result && (
          <div className="results">
            <Notice tone="ok">{job.job.result.results.filter((r) => r.dst).length}장을 저장했어요.</Notice>
            <div className="thumbs">
              {job.job.result.results.map((r) => (
                <figure key={r.src}>
                  {r.dst ? <Thumb path={r.dst} /> : <span className="error-text small">{r.error}</span>}
                  <figcaption className="small">{r.dst ? <PathLink path={r.dst} /> : baseName(r.src)}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
      </Card>
      <Card title="설정">
        <Field label="규격">
          <select value={preset} onChange={(e) => setPreset(e.target.value)}>
            {info?.presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            <option value="custom">직접 입력</option>
          </select>
        </Field>
        {preset === "custom" && (
          <div className="row">
            <Field label="가로"><input type="number" value={custom.width} onChange={(e) => setCustom({ ...custom, width: +e.target.value })} /></Field>
            <Field label="세로"><input type="number" value={custom.height} onChange={(e) => setCustom({ ...custom, height: +e.target.value })} /></Field>
            <Field label="맞추기">
              <select value={custom.mode} onChange={(e) => setCustom({ ...custom, mode: e.target.value })}>
                <option value="pad">여백 넣기</option>
                <option value="crop">잘라 채우기</option>
                <option value="fit">안에 맞추기</option>
              </select>
            </Field>
          </div>
        )}
        <div className="row">
          <Field label="형식">
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="jpg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WEBP</option>
              <option value="same">원본과 같게</option>
            </select>
          </Field>
          <Field label={`화질 ${quality}`}>
            <input type="range" min={50} max={100} value={quality} onChange={(e) => setQuality(+e.target.value)} />
          </Field>
          <Field label="여백 색">
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
          </Field>
        </div>
        <Toggle checked={removeBg} onChange={setRemoveBg} label={`배경 지우기${info && !info.rembg ? " (구성요소 필요)" : ""}`} />
        {removeBg && <NeedsComponent keys={["rembg"]} />}
        <Field label="워터마크 글자">
          <input value={wm.text} onChange={(e) => setWm({ ...wm, text: e.target.value })} placeholder="예: @내가게" />
        </Field>
        {wm.text && (
          <div className="row">
            <Field label="위치">
              <select value={wm.position} onChange={(e) => setWm({ ...wm, position: e.target.value })}>
                <option value="bottom-right">오른쪽 아래</option>
                <option value="bottom-left">왼쪽 아래</option>
                <option value="top-right">오른쪽 위</option>
                <option value="top-left">왼쪽 위</option>
                <option value="center">가운데</option>
                <option value="tile">바둑판</option>
              </select>
            </Field>
            <Field label={`진하기 ${Math.round(wm.opacity * 100)}%`}>
              <input type="range" min={10} max={100} value={wm.opacity * 100} onChange={(e) => setWm({ ...wm, opacity: +e.target.value / 100 })} />
            </Field>
            <Field label="색"><input type="color" value={wm.color} onChange={(e) => setWm({ ...wm, color: e.target.value })} /></Field>
          </div>
        )}
        {info && !info.font && <p className="muted small">한글 글꼴을 찾지 못해 워터마크 한글이 깨질 수 있어요.</p>}
      </Card>
    </div>
  );
}

type Detect = { duration: number; silences: [number, number][]; keep: [number, number][]; result: number; removed: number };

function Video() {
  const { has } = useSystem();
  const [paths, setPaths] = useState<string[]>([]);
  const [noise, setNoise] = useState(-35);
  const [minSilence, setMinSilence] = useState(0.6);
  const [pad, setPad] = useState(0.15);
  const [preview, setPreview] = useState<Detect | null>(null);
  const act = useAction();
  const cut = useJob<{ dst: string; original: number; result: number; removed: number }>();
  const sub = useJob<{ dst: string; segments: number }>();
  const path = paths[0];
  const opts = { path, noise_db: noise, min_silence: minSilence, pad };
  return (
    <div className="grid-2 wide-left">
      <Card>
        <NeedsComponent keys={["ffmpeg"]} />
        <PathPicker value={paths} onChange={(p) => (setPaths(p), setPreview(null))} filters={VIDEO} placeholder="영상이나 녹음 파일을 고르거나 끌어다 놓으세요" />
        <div className="row wrap">
          <Button busy={act.busy} disabled={!path || !has("ffmpeg")} onClick={async () => setPreview((await act.run(() => api.post<Detect>("/media/silence/detect", opts))) ?? null)}>
            미리 계산
          </Button>
          <Button variant="primary" icon={<Scissors size={16} />} busy={cut.running} disabled={!path || !has("ffmpeg")} onClick={() => cut.start(() => api.post("/media/silence/cut", opts))}>
            무음 구간 자르기
          </Button>
          <Button icon={<Subtitles size={16} />} busy={sub.running} disabled={!path || !has("stt")} onClick={() => sub.start(() => api.post("/media/subtitles", { path, format: "srt" }))}>
            자막(SRT) 만들기
          </Button>
        </div>
        <ErrorBox error={act.error} />
        {preview && (
          <Notice>
            전체 {clock(preview.duration)} 중 말 없는 구간 {preview.silences.length}곳, {clock(preview.removed)}을 잘라 <b>{clock(preview.result)}</b>로 줄어들어요.
          </Notice>
        )}
        <JobBar job={cut.job} error={cut.error} onCancel={cut.cancel} />
        {cut.job?.status === "done" && cut.job.result && (
          <Notice tone="ok">
            {clock(cut.job.result.original)} → {clock(cut.job.result.result)} · <PathLink path={cut.job.result.dst} />
          </Notice>
        )}
        <JobBar job={sub.job} error={sub.error} onCancel={sub.cancel} />
        {sub.job?.status === "done" && sub.job.result && (
          <Notice tone="ok">
            자막 {sub.job.result.segments}줄 · <PathLink path={sub.job.result.dst} />
          </Notice>
        )}
      </Card>
      <Card title="자르기 기준">
        <Field label={`무음으로 볼 소리 크기: ${noise}dB`} hint="숫자가 클수록(0에 가까울수록) 작은 소리도 무음으로 봐요.">
          <input type="range" min={-60} max={-15} value={noise} onChange={(e) => setNoise(+e.target.value)} />
        </Field>
        <Field label={`이 시간 넘게 조용하면 자르기: ${minSilence}초`}>
          <input type="range" min={0.2} max={3} step={0.1} value={minSilence} onChange={(e) => setMinSilence(+e.target.value)} />
        </Field>
        <Field label={`앞뒤 여유: ${pad}초`} hint="말이 뚝 끊기지 않게 남겨 둘 시간이에요.">
          <input type="range" min={0} max={0.5} step={0.05} value={pad} onChange={(e) => setPad(+e.target.value)} />
        </Field>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Button, Card, ErrorBox, Field, Notice, Page, PathLink, PathPicker, Tabs } from "../components/ui";
import { api } from "../lib/api";
import { bytes } from "../lib/format";
import { useAction } from "../lib/hooks";

const PDF = [{ name: "PDF", extensions: ["pdf"] }];
const IMG = [{ name: "이미지", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"] }];
type Tab = "merge" | "split" | "compress" | "rotate" | "images" | "toimages";

export default function Pdf() {
  const [tab, setTab] = useState<Tab>("merge");
  const [paths, setPaths] = useState<string[]>([]);
  const [ranges, setRanges] = useState("");
  const [every, setEvery] = useState(1);
  const [splitMode, setSplitMode] = useState<"ranges" | "every">("ranges");
  const [quality, setQuality] = useState(60);
  const [degrees, setDegrees] = useState(90);
  const [pages, setPages] = useState("");
  const [a4, setA4] = useState(true);
  const [out, setOut] = useState<{ files: string[]; note?: string } | null>(null);
  const act = useAction();

  const switchTab = (t: Tab) => (setTab(t), setPaths([]), setOut(null), act.setError(null));
  const run = async () => {
    setOut(null);
    const p = paths[0];
    const r = await act.run(async () => {
      switch (tab) {
        case "merge": {
          const x = await api.post<{ dst: string; pages: number }>("/pdf/merge", { paths });
          return { files: [x.dst], note: `${x.pages}쪽으로 합쳤어요.` };
        }
        case "split": {
          const x = await api.post<{ outputs: string[] }>("/pdf/split", splitMode === "every" ? { path: p, every } : { path: p, ranges });
          return { files: x.outputs, note: `${x.outputs.length}개로 나눴어요.` };
        }
        case "compress": {
          const x = await api.post<{ dst: string; before: number; after: number; saved_ratio: number }>("/pdf/compress", { path: p, quality });
          return { files: [x.dst], note: `${bytes(x.before)} → ${bytes(x.after)} (${Math.round(x.saved_ratio * 100)}% 줄임)` };
        }
        case "rotate": {
          const x = await api.post<{ dst: string; rotated: number }>("/pdf/rotate", { path: p, degrees, pages: pages || null });
          return { files: [x.dst], note: `${x.rotated}쪽을 돌렸어요.` };
        }
        case "images": {
          const x = await api.post<{ dst: string; pages: number }>("/pdf/from-images", { paths, page: a4 ? "a4" : "fit" });
          return { files: [x.dst], note: `이미지 ${x.pages}장을 PDF로 묶었어요.` };
        }
        case "toimages": {
          const x = await api.post<{ outputs: string[] }>("/pdf/to-images", { path: p, dpi: 150, format: "png" });
          return { files: x.outputs, note: `${x.outputs.length}장으로 바꿨어요.` };
        }
      }
    });
    if (r) setOut(r);
  };
  const multi = tab === "merge" || tab === "images";
  const need = tab === "merge" ? 2 : 1;
  return (
    <Page title="PDF 도구" desc="합치기, 나누기, 용량 줄이기, 돌리기, 이미지↔PDF. 파일은 PC 밖으로 나가지 않아요.">
      <Tabs
        tabs={[
          { key: "merge", label: "합치기" },
          { key: "split", label: "나누기" },
          { key: "compress", label: "용량 줄이기" },
          { key: "rotate", label: "돌리기" },
          { key: "images", label: "이미지 → PDF" },
          { key: "toimages", label: "PDF → 이미지" },
        ]}
        value={tab}
        onChange={switchTab}
      />
      <div className="grid-2 wide-left">
        <Card>
          <PathPicker value={paths} onChange={setPaths} multiple={multi} filters={tab === "images" ? IMG : PDF} placeholder={multi ? "파일을 순서대로 넣어 주세요" : undefined} />
          {multi && paths.length > 1 && <p className="muted small">넣은 순서대로 합쳐요. 순서를 바꾸려면 빼고 다시 넣어 주세요.</p>}
          <Button variant="primary" busy={act.busy} disabled={paths.length < need || (tab === "split" && splitMode === "ranges" && !ranges.trim())} onClick={run}>
            실행
          </Button>
          <ErrorBox error={act.error} />
          {out && (
            <Notice tone="ok">
              <div>
                {out.note}
                <ul className="list compact">
                  {out.files.slice(0, 20).map((f) => <li key={f}><PathLink path={f} /></li>)}
                </ul>
              </div>
            </Notice>
          )}
        </Card>
        <Card title="옵션">
          {tab === "split" && (
            <>
              <Tabs tabs={[{ key: "ranges", label: "범위로" }, { key: "every", label: "몇 쪽씩" }]} value={splitMode} onChange={setSplitMode} />
              {splitMode === "ranges" ? (
                <Field label="쪽 범위" hint="예: 1-3, 5, 7- (7쪽부터 끝까지). 범위마다 파일 하나가 생겨요.">
                  <input value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3, 5, 7-" />
                </Field>
              ) : (
                <Field label="몇 쪽씩"><input type="number" min={1} value={every} onChange={(e) => setEvery(+e.target.value)} /></Field>
              )}
            </>
          )}
          {tab === "compress" && (
            <Field label={`이미지 화질 ${quality}`} hint="낮을수록 용량이 줄고 그림이 흐려져요. 글자는 그대로예요.">
              <input type="range" min={20} max={90} value={quality} onChange={(e) => setQuality(+e.target.value)} />
            </Field>
          )}
          {tab === "rotate" && (
            <>
              <Field label="방향">
                <select value={degrees} onChange={(e) => setDegrees(+e.target.value)}>
                  <option value={90}>오른쪽으로 90°</option>
                  <option value={180}>180°</option>
                  <option value={270}>왼쪽으로 90°</option>
                </select>
              </Field>
              <Field label="쪽 (비우면 전체)"><input value={pages} onChange={(e) => setPages(e.target.value)} placeholder="예: 2, 4-5" /></Field>
            </>
          )}
          {tab === "images" && (
            <label className="check-label"><input type="checkbox" checked={a4} onChange={(e) => setA4(e.target.checked)} /> A4 크기에 맞추기</label>
          )}
          {(tab === "merge" || tab === "toimages") && <p className="muted small">따로 정할 옵션이 없어요.</p>}
        </Card>
      </div>
    </Page>
  );
}

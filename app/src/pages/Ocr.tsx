import { Camera, ImageUp, ScanText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NeedsComponent, useSystem } from "../components/system";
import { Button, Card, CopyButton, Empty, ErrorBox, Page } from "../components/ui";
import { api } from "../lib/api";
import { useAction } from "../lib/hooks";
import { captureScreen, isTauri, onFileDrop, pickFiles } from "../lib/platform";

type Preview = { data_url: string; width: number; height: number };
type Rect = { x: number; y: number; w: number; h: number };

export default function Ocr() {
  const [path, setPath] = useState<string | null>(() => sessionStorage.getItem("lb-captured"));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sel, setSel] = useState<Rect | null>(null);
  const [text, setText] = useState("");
  const act = useAction();
  const { has, navigate } = useSystem();

  const load = useCallback(
    async (p: string) => {
      sessionStorage.removeItem("lb-captured");
      setPath(p);
      setSel(null);
      setText("");
      setPreview((await act.run(() => api.post<Preview>("/ocr/preview", { path: p }))) ?? null);
    },
    [act],
  );
  useEffect(() => {
    if (path) load(path);
    const on = (e: Event) => load((e as CustomEvent<string>).detail);
    window.addEventListener("lb-captured", on);
    const off = onFileDrop((ps) => load(ps[0]));
    return () => (window.removeEventListener("lb-captured", on), off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const read = async () => {
    if (!path || !preview) return;
    const crop = sel && sel.w > 4 && sel.h > 4 ? [sel.x, sel.y, sel.w, sel.h].map(Math.round) : null;
    const r = await act.run(() => api.post<{ text: string }>("/ocr/image", { path, crop }));
    if (r) setText(r.text);
  };

  return (
    <Page title="화면 글자 인식" desc={`화면을 캡처하거나 사진을 넣고, 읽을 부분을 끌어서 고르세요.${isTauri ? " 어디서든 Ctrl+Shift+O로 바로 캡처해요." : ""}`}>
      <NeedsComponent keys={["ocr"]} />
      <div className="row">
        {isTauri && (
          <Button icon={<Camera size={16} />} onClick={async () => { const p = await act.run(captureScreen); if (p) load(p); }}>
            화면 캡처
          </Button>
        )}
        <Button icon={<ImageUp size={16} />} onClick={async () => { const p = (await pickFiles({ filters: [{ name: "이미지", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"] }] }))[0]; if (p) load(p); }}>
          이미지 열기
        </Button>
        <Button variant="primary" icon={<ScanText size={16} />} busy={act.busy} disabled={!preview || !has("ocr")} onClick={read}>
          {sel ? "고른 부분 읽기" : "전체 읽기"}
        </Button>
      </div>
      <ErrorBox error={act.error} />
      <div className="grid-2 wide-left">
        <Card>
          {preview ? <Selector preview={preview} sel={sel} onSel={setSel} /> : <Empty icon={<ScanText size={28} />}>캡처하거나 이미지를 넣어 주세요.</Empty>}
        </Card>
        <Card title="읽은 글자" right={text ? <CopyButton text={text} /> : null}>
          <textarea rows={16} value={text} onChange={(e) => setText(e.target.value)} placeholder="여기에 결과가 나와요." />
          {text && (
            <div className="row wrap">
              <Button small onClick={() => (sessionStorage.setItem("lb-paste", text), navigate("translate"))}>번역하기</Button>
              <Button small onClick={() => (sessionStorage.setItem("lb-paste", text), navigate("papers"))}>영수증·명함으로</Button>
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}

function Selector({ preview, sel, onSel }: { preview: Preview; sel: Rect | null; onSel: (r: Rect | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [live, setLive] = useState<Rect | null>(null);
  const toImage = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const sx = preview.width / r.width;
    const sy = preview.height / r.height;
    return { x: Math.max(0, Math.min(r.width, e.clientX - r.left)) * sx, y: Math.max(0, Math.min(r.height, e.clientY - r.top)) * sy };
  };
  const rect = (a: { x: number; y: number }, b: { x: number; y: number }): Rect => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
  const shown = live ?? sel;
  return (
    <div
      ref={box}
      className="selector"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        start.current = toImage(e);
        setLive(null);
      }}
      onPointerMove={(e) => start.current && setLive(rect(start.current, toImage(e)))}
      onPointerUp={(e) => {
        if (start.current) {
          const r = rect(start.current, toImage(e));
          onSel(r.w > 4 && r.h > 4 ? r : null);
        }
        start.current = null;
        setLive(null);
      }}
    >
      <img src={preview.data_url} alt="미리보기" draggable={false} />
      {shown && (
        <div
          className="selection"
          style={{ left: `${(shown.x / preview.width) * 100}%`, top: `${(shown.y / preview.height) * 100}%`, width: `${(shown.w / preview.width) * 100}%`, height: `${(shown.h / preview.height) * 100}%` }}
        />
      )}
    </div>
  );
}

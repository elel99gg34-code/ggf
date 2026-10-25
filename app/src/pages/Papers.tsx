import { Contact, FileSpreadsheet, ImageUp, Receipt, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSystem } from "../components/system";
import { Button, Card, Empty, ErrorBox, Field, Notice, Page, PathLink, Tabs } from "../components/ui";
import { api } from "../lib/api";
import { localDate, won } from "../lib/format";
import { useAction, useData } from "../lib/hooks";
import { pickFiles, pickSavePath } from "../lib/platform";

type Expense = { id: number; date: string | null; merchant: string; amount: number | null; category: string; memo: string; biz_no: string };
type ContactT = { id: number; name: string; company: string; title: string; mobile: string; phone: string; fax: string; email: string; address: string; website: string };
const IMG = [{ name: "이미지", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "heic", "tif", "tiff"] }];
const CATEGORIES = ["식비", "교통", "사무용품", "통신", "숙박", "마트", "기타"];

export default function Papers() {
  const [tab, setTab] = useState<"receipt" | "card">(() => {
    const hit = sessionStorage.getItem("lb-open");
    return hit && JSON.parse(hit).kind === "contact" ? (sessionStorage.removeItem("lb-open"), "card") : "receipt";
  });
  return (
    <Page title="영수증·명함" desc="사진을 넣으면 글자를 읽어 칸을 채워요. 영수증은 경비 엑셀로, 명함은 휴대폰 연락처(.vcf)로 내보내요.">
      <Tabs tabs={[{ key: "receipt", label: "영수증 → 경비" }, { key: "card", label: "명함 → 연락처" }]} value={tab} onChange={setTab} />
      {tab === "receipt" ? <Receipts /> : <Cards />}
    </Page>
  );
}

function useParse<T>(endpoint: string, empty: T) {
  const [fields, setFields] = useState<T>(empty);
  const [text, setText] = useState(() => {
    const v = sessionStorage.getItem("lb-paste") ?? "";
    sessionStorage.removeItem("lb-paste");
    return v;
  });
  const act = useAction();
  const { has } = useSystem();
  const fromImage = async () => {
    const p = (await pickFiles({ filters: IMG }))[0];
    if (!p) return;
    const r = await act.run(() => api.post<{ text: string; fields: T }>(endpoint, { path: p }));
    if (r) (setText(r.text), setFields(r.fields));
  };
  const fromText = async () => {
    const r = await act.run(() => api.post<{ text: string; fields: T }>(endpoint, { text }));
    if (r) setFields(r.fields);
  };
  return { fields, setFields, text, setText, act, fromImage, fromText, ocr: has("ocr") };
}

function Receipts() {
  const p = useParse<Omit<Expense, "id">>("/receipts/parse", { date: "", merchant: "", amount: null, category: "", memo: "", biz_no: "" });
  const month = localDate().slice(0, 7);
  const [m, setM] = useState(month);
  const list = useData(() => api.get<Expense[]>("/expenses", { month: m }), [m]);
  const [saved, setSaved] = useState<string | null>(null);
  const f = p.fields;
  const add = async () => {
    await p.act.run(() => api.post("/expenses", { ...f, date: f.date || null }));
    p.setFields({ date: "", merchant: "", amount: null, category: "", memo: "", biz_no: "" });
    p.setText("");
    list.reload();
  };
  const exportXlsx = async () => {
    const out = await pickSavePath(`경비_${m}.xlsx`, [{ name: "엑셀", extensions: ["xlsx"] }]);
    const r = await p.act.run(() => api.post<{ path: string }>("/expenses/export", { month: m, out_path: out }));
    if (r) setSaved(r.path);
  };
  const total = (list.data ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
  return (
    <div className="grid-2">
      <Card title="영수증 읽기">
        <div className="row">
          <Button icon={<ImageUp size={16} />} disabled={!p.ocr} busy={p.act.busy} onClick={p.fromImage}>영수증 사진</Button>
          {!p.ocr && <span className="muted small">사진 읽기는 OCR 구성요소가 필요해요</span>}
        </div>
        <Field label="또는 글자 붙여넣기">
          <textarea rows={4} value={p.text} onChange={(e) => p.setText(e.target.value)} />
        </Field>
        <Button small onClick={p.fromText} disabled={!p.text.trim()}>글에서 찾기</Button>
        <div className="form-grid">
          <Field label="날짜"><input type="date" value={f.date ?? ""} onChange={(e) => p.setFields({ ...f, date: e.target.value })} /></Field>
          <Field label="가맹점"><input value={f.merchant} onChange={(e) => p.setFields({ ...f, merchant: e.target.value })} /></Field>
          <Field label="금액"><input type="number" value={f.amount ?? ""} onChange={(e) => p.setFields({ ...f, amount: e.target.value ? +e.target.value : null })} /></Field>
          <Field label="분류">
            <select value={f.category} onChange={(e) => p.setFields({ ...f, category: e.target.value })}>
              <option value="">선택</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="사업자번호"><input value={f.biz_no} onChange={(e) => p.setFields({ ...f, biz_no: e.target.value })} /></Field>
          <Field label="메모"><input value={f.memo} onChange={(e) => p.setFields({ ...f, memo: e.target.value })} /></Field>
        </div>
        <Button variant="primary" icon={<Receipt size={16} />} disabled={!f.amount} onClick={add}>장부에 넣기</Button>
        <ErrorBox error={p.act.error} />
      </Card>
      <Card title={`경비 장부 · ${won(total)}`} right={<div className="row"><input type="month" value={m} onChange={(e) => setM(e.target.value)} /><Button small icon={<FileSpreadsheet size={14} />} onClick={exportXlsx}>엑셀</Button></div>}>
        {saved && <Notice tone="ok">저장했어요: <PathLink path={saved} /></Notice>}
        {list.data && !list.data.length && <Empty>이번 달 경비가 없어요.</Empty>}
        <table className="table">
          <tbody>
            {list.data?.map((e) => (
              <tr key={e.id}>
                <td className="muted">{e.date?.slice(5)}</td>
                <td>{e.merchant}</td>
                <td className="muted">{e.category}</td>
                <td className="num">{won(e.amount)}</td>
                <td><button className="iconbtn" aria-label="삭제" onClick={async () => (await api.del(`/expenses/${e.id}`), list.reload())}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const EMPTY_CARD = { name: "", company: "", title: "", mobile: "", phone: "", fax: "", email: "", address: "", website: "" };
const CARD_FIELDS: [keyof typeof EMPTY_CARD, string][] = [
  ["name", "이름"], ["company", "회사"], ["title", "직함"], ["mobile", "휴대폰"], ["phone", "전화"], ["fax", "팩스"], ["email", "이메일"], ["website", "웹사이트"], ["address", "주소"],
];

function Cards() {
  const p = useParse<typeof EMPTY_CARD>("/cards/parse", EMPTY_CARD);
  const [q, setQ] = useState("");
  const list = useData(() => api.get<ContactT[]>("/contacts", { q }), [q]);
  const [saved, setSaved] = useState<string | null>(null);
  const add = async () => {
    await p.act.run(() => api.post("/contacts", p.fields));
    p.setFields(EMPTY_CARD);
    p.setText("");
    list.reload();
  };
  const exportVcf = async () => {
    const out = await pickSavePath("연락처.vcf", [{ name: "연락처", extensions: ["vcf"] }]);
    const r = await p.act.run(() => api.post<{ path: string }>("/contacts/export", { out_path: out }));
    if (r) setSaved(r.path);
  };
  return (
    <div className="grid-2">
      <Card title="명함 읽기">
        <div className="row">
          <Button icon={<ImageUp size={16} />} disabled={!p.ocr} busy={p.act.busy} onClick={p.fromImage}>명함 사진</Button>
          {!p.ocr && <span className="muted small">사진 읽기는 OCR 구성요소가 필요해요</span>}
        </div>
        <Field label="또는 글자 붙여넣기">
          <textarea rows={4} value={p.text} onChange={(e) => p.setText(e.target.value)} />
        </Field>
        <Button small onClick={p.fromText} disabled={!p.text.trim()}>글에서 찾기</Button>
        <div className="form-grid">
          {CARD_FIELDS.map(([k, label]) => (
            <Field key={k} label={label}>
              <input value={p.fields[k]} onChange={(e) => p.setFields({ ...p.fields, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
        <Button variant="primary" icon={<Contact size={16} />} disabled={!p.fields.name && !p.fields.company} onClick={add}>연락처에 넣기</Button>
        <ErrorBox error={p.act.error} />
      </Card>
      <Card title="연락처" right={<Button small onClick={exportVcf}>vCard로 내보내기</Button>}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·회사·이메일로 찾기" />
        {saved && <Notice tone="ok">저장했어요: <PathLink path={saved} /> · 휴대폰으로 보내 열면 연락처에 들어가요.</Notice>}
        {list.data && !list.data.length && <Empty>저장된 연락처가 없어요.</Empty>}
        <ul className="list">
          {list.data?.map((c) => (
            <li key={c.id} className="list-row">
              <div className="grow">
                <b>{c.name}</b> <span className="muted">{[c.title, c.company].filter(Boolean).join(" · ")}</span>
                <div className="muted small">{[c.mobile || c.phone, c.email].filter(Boolean).join(" · ")}</div>
              </div>
              <button className="iconbtn" aria-label="삭제" onClick={async () => (await api.del(`/contacts/${c.id}`), list.reload())}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

import { Copy, Pin, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Empty, Field, Page, Toggle, useToast } from "../components/ui";
import { api } from "../lib/api";
import { dateTime } from "../lib/format";
import { useData } from "../lib/hooks";
import { copyText, isTauri } from "../lib/platform";

type Clip = { id: number; text: string; sensitive: number; kinds: string; pinned: number; created_at: string };
type Policy = { policy: "mask" | "skip" | "raw"; enabled: boolean };

const KIND_LABEL: Record<string, string> = { rrn: "주민번호", phone: "전화", card: "카드", account: "계좌", email: "이메일", passport: "여권", driver: "면허", plate: "차량", name: "이름", address: "주소" };

export default function Clipboard() {
  const [q, setQ] = useState("");
  const clips = useData(() => api.get<Clip[]>("/clipboard", { q }), [q]);
  const policy = useData(() => api.get<Policy>("/clipboard/policy"));
  const [manual, setManual] = useState("");
  const toast = useToast();
  useEffect(() => {
    const on = () => clips.reload();
    window.addEventListener("lb-clipboard", on);
    return () => window.removeEventListener("lb-clipboard", on);
  }, [clips]);
  return (
    <Page
      title="클립보드"
      desc="복사한 글을 기억해 뒀다가 다시 꺼내 써요. 주민번호·카드번호 같은 민감정보는 가려서 저장해요."
      actions={<Button variant="ghost" onClick={async () => { if (confirm("고정하지 않은 기록을 모두 지울까요?")) { await api.del("/clipboard"); clips.reload(); } }}>기록 비우기</Button>}
    >
      <div className="grid-2 wide-left">
        <Card>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="기록에서 찾기" />
          {clips.data && !clips.data.length && <Empty>{isTauri ? "복사하면 여기에 쌓여요." : "데스크톱 앱에서는 복사할 때마다 자동으로 쌓여요."}</Empty>}
          <ul className="list">
            {clips.data?.map((c) => (
              <li key={c.id} className="list-row clip">
                <div className="grow">
                  <div className="clip-text">{c.text}</div>
                  <div className="row small muted">
                    {dateTime(c.created_at)}
                    {c.sensitive ? c.kinds.split(",").filter(Boolean).map((k) => <Badge key={k} tone="late">{KIND_LABEL[k] ?? k} 가림</Badge>) : null}
                  </div>
                </div>
                <button className="iconbtn" aria-label="복사" onClick={async () => (await copyText(c.text), toast("복사했어요"))}>
                  <Copy size={14} />
                </button>
                <button className={`iconbtn ${c.pinned ? "accent" : ""}`} aria-label="고정" onClick={async () => (await api.post(`/clipboard/${c.id}/pin`), clips.reload())}>
                  <Pin size={14} />
                </button>
                <button className="iconbtn" aria-label="삭제" onClick={async () => (await api.del(`/clipboard/${c.id}`), clips.reload())}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="설정">
          {policy.data && (
            <>
              <Toggle
                checked={policy.data.enabled}
                onChange={async (v) => (await api.put("/clipboard/enabled", { enabled: v }), policy.reload())}
                label="복사한 내용 기록하기"
              />
              <Field label="민감정보가 들어 있으면">
                <select value={policy.data.policy} onChange={async (e) => (await api.put("/clipboard/policy", { policy: e.target.value }), policy.reload())}>
                  <option value="mask">가려서 저장 (권장)</option>
                  <option value="skip">저장하지 않기</option>
                  <option value="raw">그대로 저장</option>
                </select>
              </Field>
            </>
          )}
          <p className="muted small">기록은 이 PC 안에만 저장되고 최근 500개까지 남아요. 고정한 항목은 지워지지 않아요.</p>
          {!isTauri && (
            <Field label="직접 넣기 (개발 모드)">
              <textarea rows={3} value={manual} onChange={(e) => setManual(e.target.value)} />
              <Button small onClick={async () => (await api.post("/clipboard", { text: manual }), setManual(""), clips.reload())}>넣기</Button>
            </Field>
          )}
        </Card>
      </div>
    </Page>
  );
}

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { useAction } from "../lib/hooks";
import type { License } from "./system";
import { Button, ErrorBox, Field, Notice } from "./ui";

/** 라이선스 키가 없으면 이 화면만 보인다. 키를 등록해야 모든 기능이 열린다. */
export default function LicenseGate({ license, version, onDone }: { license: License; version: string; onDone: () => void }) {
  const [key, setKey] = useState("");
  const [agree, setAgree] = useState(false);
  const act = useAction();
  const activate = async () => {
    if (await act.run(() => api.post("/license", { key }))) onDone();
  };
  return (
    <div className="gate">
      <div className="gate-card">
        <div className="brand">
          <span className="brand-mark">비</span>
          <span>로컬비서</span>
        </div>
        <h1><KeyRound size={22} /> 라이선스 키를 등록해 주세요</h1>
        <p className="muted">로컬비서는 라이선스 키를 등록해야 쓸 수 있어요. 키는 구매 후 받은 안내 메시지에 있어요. 인터넷 없이 입력만으로 인증돼요.</p>
        {license.status === "invalid" && <Notice tone="warn">등록된 키를 쓸 수 없어요. {license.error}</Notice>}
        <Field label="라이선스 키">
          <textarea rows={4} value={key} onChange={(e) => setKey(e.target.value)} placeholder="LB1.xxxxx.xxxxx" autoFocus />
        </Field>
        <label className="check-label small">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          키를 등록하면 디지털 콘텐츠 제공이 시작되어 청약철회가 제한된다는 점을 확인했어요 (전자상거래법 제17조 제2항 제5호).
        </label>
        <Button variant="primary" busy={act.busy} disabled={!key.trim() || !agree} onClick={activate}>
          등록하고 시작하기
        </Button>
        <ErrorBox error={act.error} />
        <span className="muted small">v{version}</span>
      </div>
    </div>
  );
}

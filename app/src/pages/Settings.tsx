import { CircleCheck, CircleDashed, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useSystem } from "../components/system";
import { Badge, Button, Card, ErrorBox, Field, Notice, Page } from "../components/ui";
import { api } from "../lib/api";
import { useAction, useData } from "../lib/hooks";
import { isTauri, openPath } from "../lib/platform";

async function openNotices() {
  const { resourceDir, join } = await import("@tauri-apps/api/path");
  await openPath(await join(await resourceDir(), "THIRD_PARTY_NOTICES.txt"));
}

export default function Settings() {
  const { status, reload } = useSystem();
  const settings = useData(() => api.get<Record<string, unknown>>("/system/settings"));
  const [form, setForm] = useState({ user_name: "", company: "", focus_minutes: 25, break_minutes: 5 });
  const [key, setKey] = useState("");
  const [agree, setAgree] = useState(false);
  const act = useAction();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (settings.data) setForm((f) => ({ ...f, ...(settings.data as Partial<typeof f>) }));
  }, [settings.data]);
  const lic = status?.license;

  const activate = async () => {
    const r = await act.run(() => api.post("/license", { key }));
    if (r) {
      setKey("");
      reload();
    }
  };
  return (
    <Page title="설정">
      <div className="grid-2">
        <div className="stack">
          <Card title={<><KeyRound size={16} /> 라이선스</>}>
            {lic?.status === "licensed" && <Notice tone="ok">정품 인증됨 · {lic.holder} ({lic.id})</Notice>}
            {lic?.status === "trial" && <Notice>체험판이에요. {lic.days_left}일 남았어요 ({lic.trial_ends}까지). 체험 기간에는 모든 기능을 쓸 수 있어요.</Notice>}
            {lic?.status === "expired" && <Notice tone="warn">체험 기간이 끝났어요. 회의록·파일 마스킹·이미지/영상은 라이선스가 필요해요. 나머지 비서 기능은 계속 쓸 수 있어요.</Notice>}
            {lic?.status !== "licensed" && (
              <>
                <Field label="라이선스 키" hint="인터넷 없이 입력만으로 인증돼요.">
                  <textarea rows={3} value={key} onChange={(e) => setKey(e.target.value)} placeholder="LB1.xxxxx.xxxxx" />
                </Field>
                <label className="check-label small">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  키를 등록하면 디지털 콘텐츠 제공이 시작되어 청약철회가 제한된다는 점을 확인했어요 (전자상거래법 제17조 제2항 제5호).
                </label>
                <Button variant="primary" busy={act.busy} disabled={!key.trim() || !agree} onClick={activate}>인증하기</Button>
                <ErrorBox error={act.error} />
              </>
            )}
          </Card>
          <Card title="내 정보와 기본값">
            <div className="form-grid">
              <Field label="이름 (메일 서명)"><input value={form.user_name} onChange={(e) => setForm({ ...form, user_name: e.target.value })} /></Field>
              <Field label="회사"><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
              <Field label="집중 시간(분)"><input type="number" value={form.focus_minutes} onChange={(e) => setForm({ ...form, focus_minutes: +e.target.value })} /></Field>
              <Field label="쉬는 시간(분)"><input type="number" value={form.break_minutes} onChange={(e) => setForm({ ...form, break_minutes: +e.target.value })} /></Field>
            </div>
            <div className="row">
              <Button variant="primary" onClick={async () => { await api.put("/system/settings", form); setSaved(true); setTimeout(() => setSaved(false), 1500); }}>저장</Button>
              {saved && <span className="small accent">저장했어요</span>}
            </div>
          </Card>
          {isTauri && (
            <Card title="단축키">
              <ul className="list compact">
                <li className="list-row"><kbd>Ctrl Shift Space</kbd><span className="grow">어디서든 로컬비서 열고 찾기</span></li>
                <li className="list-row"><kbd>Ctrl Shift O</kbd><span className="grow">화면 캡처해서 글자 읽기</span></li>
                <li className="list-row"><kbd>Ctrl K</kbd><span className="grow">앱 안에서 기능·내용 찾기</span></li>
              </ul>
            </Card>
          )}
        </div>
        <div className="stack">
          <Card title="구성요소" right={<Button small variant="ghost" onClick={reload}>새로 확인</Button>}>
            <p className="muted small">무거운 AI 기능은 따로 설치돼요. 설치하지 않은 기능만 꺼져 있고 나머지는 그대로 써요.</p>
            <ul className="list compact">
              {status?.components.map((c) => (
                <li key={c.key} className="list-row">
                  {c.available ? <CircleCheck size={16} className="ok" /> : <CircleDashed size={16} className="muted" />}
                  <span className="grow">
                    <b>{c.label}</b> <span className="muted small">{c.used_by}</span>
                  </span>
                  {c.available ? <Badge tone="ok">사용 가능</Badge> : <code className="small">{`[${c.extra}]`}</code>}
                </li>
              ))}
              <li className="list-row">
                {status?.ffmpeg ? <CircleCheck size={16} className="ok" /> : <CircleDashed size={16} className="muted" />}
                <span className="grow"><b>ffmpeg</b> <span className="muted small">영상 무음 컷</span></span>
                {status?.ffmpeg && <Badge tone="ok">사용 가능</Badge>}
              </li>
            </ul>
            {status?.ocr_backend && <p className="muted small">OCR 엔진: {status.ocr_backend}</p>}
          </Card>
          <Card title="정보">
            <p className="small">로컬비서 v{status?.version} · {status?.os}</p>
            <p className="small muted">
              데이터 폴더: {status?.data_dir}{" "}
              {isTauri && status && <button className="linklike" onClick={() => openPath(status.data_dir)}>열기</button>}
            </p>
            <p className="small muted">모든 기록(메모, 회의록, 클립보드 등)은 이 폴더 안의 파일 하나에 저장돼요. 백업하려면 폴더째 복사하면 돼요.</p>
            {isTauri && (
              <button className="linklike small" onClick={openNotices}>
                오픈소스 라이선스 고지
              </button>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}

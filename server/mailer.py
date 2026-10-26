"""메일 보내기: 라이선스 안내(키 확인 링크·설치 방법·사용 설명서 첨부)와 공지.

보내는 길은 Google Apps Script 웹 앱이다. 관리자 본인 Gmail에서 그대로 나가서 스팸으로 덜 빠지고,
무료 서버에서 막히기 쉬운 SMTP 포트도 쓰지 않는다. (무료 Gmail은 하루 100통 한도)
보낼 메일은 emails 표에 쌓아 두고, 백그라운드에서 한도를 지키며 차례로 보낸다.
"""
from __future__ import annotations

import base64
import html
import json
import re
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable
from urllib.error import URLError
from urllib.request import Request, urlopen

GUIDE_NAME = "로컬비서_사용설명서.pdf"
MAX_ATTEMPTS = 6
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

APPS_SCRIPT = """// 로컬비서 메일 발송 (Google Apps Script)
// 1) script.google.com → 새 프로젝트 → 이 코드를 통째로 붙여 넣고 저장
// 2) 배포 → 새 배포 → 유형: 웹 앱 → 실행 사용자: 나 / 액세스 권한: 모든 사용자 → 배포 → 권한 허용
// 3) 나온 웹 앱 URL을 라이선스 발급 사이트의 '메일' 탭에 붙여 넣기
const SECRET = "%(secret)s"; // 발급 사이트가 만든 값. 바꾸지 마세요.

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: "bad request" }); }
  if (req.secret !== SECRET) return out({ ok: false, error: "unauthorized" });
  if (req.action === "ping") return out({ ok: true, remaining: MailApp.getRemainingDailyQuota(), account: Session.getEffectiveUser().getEmail() });
  try {
    const attachments = (req.attachments || []).map(function (a) {
      return Utilities.newBlob(Utilities.base64Decode(a.data), a.type, a.name);
    });
    const options = { htmlBody: req.html, name: req.from_name, attachments: attachments };
    if (req.reply_to) options.replyTo = req.reply_to;
    MailApp.sendEmail(req.to, req.subject, req.text, options);
    if (req.more && req.server_url) keepWaking(req.server_url);
    return out({ ok: true, remaining: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

// 무료 서버는 접속이 없으면 잠든다. 보낼 메일이 남아 있는 동안만 한 시간마다 깨운다.
function keepWaking(serverUrl) {
  PropertiesService.getScriptProperties().setProperty("SERVER_URL", serverUrl);
  const exists = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === "wakeServer"; });
  if (!exists) ScriptApp.newTrigger("wakeServer").timeBased().everyHours(1).create();
}

function wakeServer() {
  const url = PropertiesService.getScriptProperties().getProperty("SERVER_URL");
  let queued = 1;
  try {
    const res = UrlFetchApp.fetch(url + "/mail/wake", { muteHttpExceptions: true });
    queued = JSON.parse(res.getContentText()).queued;
  } catch (err) {
    return; // 서버가 깨어나는 중이면 다음 시간에 다시 본다
  }
  if (!url || queued === 0) {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === "wakeServer") ScriptApp.deleteTrigger(t);
    });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
"""


class MailError(Exception):
    def __init__(self, message: str, quota: bool = False):
        super().__init__(message)
        self.quota = quota


def valid_email(addr: str) -> bool:
    return bool(EMAIL_RE.match(addr.strip()))


class AppsScriptRelay:
    """Apps Script 웹 앱에 JSON을 보내 메일을 부친다."""

    def __init__(self, url: str, secret: str):
        self.url = url.strip()
        self.secret = secret

    def call(self, payload: dict, timeout: int = 90) -> dict:
        if not self.url.startswith("https://script.google.com/"):
            raise MailError("메일 발송 주소(Apps Script 웹 앱 URL)를 먼저 넣어 주세요.")
        data = json.dumps({"secret": self.secret, **payload}).encode()
        req = Request(self.url, data=data, headers={"Content-Type": "application/json"}, method="POST")
        try:
            # Apps Script는 결과를 다른 주소로 넘겨서(302) 돌려준다. urllib이 GET으로 따라간다.
            with urlopen(req, timeout=timeout) as r:
                body = r.read().decode("utf-8", "replace")
        except URLError as e:
            raise MailError(f"Apps Script에 연결하지 못했어요: {e}") from e
        try:
            res = json.loads(body)
        except ValueError as e:
            raise MailError("Apps Script가 로그인 화면을 돌려줬어요. 배포의 액세스 권한을 '모든 사용자'로 했는지 확인해 주세요.") from e
        if not res.get("ok"):
            err = str(res.get("error", "알 수 없는 오류"))
            if err == "unauthorized":
                raise MailError("Apps Script 코드의 비밀값이 달라요. '메일' 탭의 코드를 다시 붙여 넣고 새로 배포해 주세요.")
            raise MailError(f"Gmail이 보내지 못했어요: {err}", quota="too many times" in err or "Limit Exceeded" in err)
        return res

    def ping(self) -> dict:
        return self.call({"action": "ping"}, timeout=30)

    def send(self, to: str, subject: str, html_body: str, text: str, from_name: str, reply_to: str, attachments: list[dict],
             server_url: str = "", more: bool = False) -> dict:
        return self.call({"action": "send", "to": to, "subject": subject, "html": html_body, "text": text, "from_name": from_name,
                          "reply_to": reply_to, "attachments": attachments, "server_url": server_url, "more": more})


# --- 메일 내용 ---------------------------------------------------------------

def _p(text: str, style: str = "") -> str:
    return f'<p style="margin:0 0 12px;line-height:1.7;{style}">{text}</p>'


def _button(href: str, label: str, primary: bool = True) -> str:
    bg, fg = ("#2563eb", "#ffffff") if primary else ("#eef2ff", "#1e3a8a")
    return (f'<a href="{html.escape(href)}" style="display:inline-block;margin:4px 8px 4px 0;padding:12px 20px;border-radius:10px;'
            f'background:{bg};color:{fg};font-weight:700;text-decoration:none">{html.escape(label)}</a>')


def _section(title: str, body: str) -> str:
    return (f'<tr><td style="padding:20px 28px 4px"><h2 style="margin:0 0 10px;font-size:17px;color:#111827">{title}</h2>{body}</td></tr>')


def _steps(items: list[str]) -> str:
    lis = "".join(f'<li style="margin:0 0 6px;line-height:1.6">{i}</li>' for i in items)
    return f'<ol style="margin:0 0 12px;padding-left:20px;color:#374151">{lis}</ol>'


def _frame(inner: str, footer: str) -> str:
    return (
        '<!doctype html><html lang="ko"><body style="margin:0;padding:0;background:#f5f6f8">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:24px 12px">'
        '<tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="max-width:600px;background:#ffffff;border:1px solid #e3e6eb;border-radius:16px;'
        "font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;font-size:15px;color:#1b1f27\">"
        '<tr><td style="padding:24px 28px 0"><span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;'
        'border-radius:8px;background:#2563eb;color:#fff;font-weight:800">비</span> <b style="font-size:16px">로컬비서</b></td></tr>'
        f"{inner}"
        f'<tr><td style="padding:20px 28px 26px;color:#6b7280;font-size:12px;line-height:1.7;border-top:1px solid #eef0f3">{footer}</td></tr>'
        "</table></td></tr></table></body></html>"
    )


def _footer(cfg: dict) -> str:
    lines = []
    if cfg.get("support_email"):
        lines.append(f"문의: {html.escape(cfg['support_email'])} (이 메일에 답장하셔도 돼요)")
    if cfg.get("seller_footer"):
        lines.extend(html.escape(line) for line in cfg["seller_footer"].splitlines() if line.strip())
    lines.append("이 메일은 로컬비서 구매·이용 안내를 위해 보내드렸어요.")
    return "<br>".join(lines)


def license_mail(lic: dict, links: dict, cfg: dict) -> tuple[str, str, str]:
    """(제목, HTML, 텍스트). links: key, windows, mac, guide 주소."""
    name = html.escape(lic["name"])
    dev = lic["edition"] == "dev"
    subject = f"[로컬비서] {lic['name']}님의 {'개발자 ' if dev else ''}라이선스와 설치 안내"
    notice = "키를 확인하면 디지털 콘텐츠 제공이 시작되어 청약철회가 제한돼요(전자상거래법 제17조 제2항 제5호)."
    if cfg.get("include_key"):
        key_html = (_p("아래 라이선스 키를 앱에 붙여 넣으세요. " + notice, "color:#6b7280;font-size:13px")
                    + f'<div style="padding:12px 14px;border:1px solid #e3e6eb;border-radius:10px;background:#f9fafb;'
                    f'font-family:Consolas,Menlo,monospace;font-size:12px;word-break:break-all">{html.escape(lic["key"])}</div>')
        key_text = f"라이선스 키:\n{lic['key']}\n({notice})"
    else:
        key_html = (_p("아래 버튼을 누르면 라이선스 키가 보여요. 설치를 마친 뒤에 확인하셔도 돼요.")
                    + _button(links["key"], "라이선스 키 확인하기")
                    + _p(notice + " 키를 확인하기 전이라면 환불 정책에 따라 환불받을 수 있어요.", "color:#6b7280;font-size:13px;margin-top:10px"))
        key_text = f"라이선스 키 확인하기: {links['key']}\n({notice})"

    downloads = []
    if links.get("windows"):
        downloads.append(_button(links["windows"], "Windows 설치 파일 받기"))
    if links.get("mac"):
        downloads.append(_button(links["mac"], "macOS 설치 파일 받기", primary=not links.get("windows")))
    download_html = ("".join(downloads) + _p("Windows 10·11 64비트, macOS 12 이상(Apple Silicon). 메모리 8GB 이상 권장.", "color:#6b7280;font-size:13px;margin-top:8px")
                     if downloads else _p("설치 파일 받는 곳은 따로 안내해 드릴게요."))

    inner = (
        '<tr><td style="padding:18px 28px 0">'
        + _p(f"<b>{name}</b>님, 로컬비서를 {'사용해 주셔서' if dev else '구매해 주셔서'} 감사합니다.")
        + _p(f"라이선스 번호 <b>{html.escape(lic['license_id'])}</b> · {html.escape(lic['edition_label'])}"
             + (f" · {html.escape(lic['expires'])}까지" if lic.get("expires") else "")
             + ("" if dev else " · PC 2대까지 · 1년 무료 업데이트"), "color:#374151")
        + "</td></tr>"
        + _section("1. 설치 파일 받기", download_html)
        + _section("2. 설치하기", _steps([
            "<b>Windows</b>: 받은 파일(LocalBiseo_…_x64-setup.exe)을 실행하세요. 'Windows의 PC 보호' 창이 뜨면 <b>추가 정보 → 실행</b>을 누르세요.",
            "<b>macOS</b>: 받은 .dmg를 열고 로컬비서를 <b>응용 프로그램</b> 폴더로 끌어 넣으세요. 처음 열 때는 앱을 <b>우클릭 → 열기</b>로 실행하세요.",
        ]))
        + _section("3. 라이선스 키 등록하기", key_html + _steps([
            "로컬비서를 실행하면 라이선스 키 입력 화면이 나와요.",
            "키를 붙여 넣고 안내에 동의한 뒤 <b>등록하고 시작하기</b>를 누르세요. 인터넷 없이도 인증돼요.",
        ]))
        + _section("4. 사용 설명서", _p(f"첨부한 <b>{GUIDE_NAME}</b>에 기능별 사용법과 자주 묻는 질문을 담았어요.")
                   + _button(links["guide"], "사용 설명서 열기", primary=False))
        + _section("알아 두세요", _steps([
            "모든 처리는 PC 안에서 이뤄지고, 파일은 서버로 보내지 않아요.",
            "음성 인식 모델은 회의록을 처음 만들 때 한 번만 내려받아요(인터넷 필요).",
            "라이선스 키는 구매하신 분만 써 주세요. 다른 사람과 나눠 쓰면 안 돼요.",
        ]))
    )
    text = "\n".join([
        f"{lic['name']}님, 로컬비서를 {'사용해' if dev else '구매해'} 주셔서 감사합니다.",
        f"라이선스 번호: {lic['license_id']} ({lic['edition_label']}{', ' + lic['expires'] + '까지' if lic.get('expires') else ''})",
        "",
        "1. 설치 파일 받기",
        *([f"- Windows: {links['windows']}"] if links.get("windows") else []),
        *([f"- macOS: {links['mac']}"] if links.get("mac") else []),
        *([] if links.get("windows") or links.get("mac") else ["- 따로 안내해 드릴게요."]),
        "",
        "2. 설치하기",
        "- Windows: 설치 파일 실행 → 'Windows의 PC 보호' 창이 뜨면 추가 정보 → 실행",
        "- macOS: .dmg를 열고 응용 프로그램 폴더로 끌어 넣기 → 처음엔 우클릭 → 열기",
        "",
        "3. 라이선스 키 등록하기",
        key_text,
        "- 앱을 실행하고 키를 붙여 넣은 뒤 [등록하고 시작하기]",
        "",
        f"4. 사용 설명서: 첨부 파일({GUIDE_NAME}) 또는 {links['guide']}",
        "",
        *(f"문의: {cfg['support_email']}" for _ in [0] if cfg.get("support_email")),
        *(cfg.get("seller_footer", "").splitlines()),
    ])
    return subject, _frame(inner, _footer(cfg)), text


def notice_mail(subject: str, body: str, cfg: dict) -> tuple[str, str, str]:
    paras = [p.strip() for p in re.split(r"\n\s*\n", body.strip()) if p.strip()]
    inner = '<tr><td style="padding:18px 28px 0">' + "".join(_p(html.escape(p).replace("\n", "<br>")) for p in paras) + "</td></tr>"
    return f"[로컬비서] {subject}", _frame(inner, _footer(cfg)), body.strip() + ("\n\n문의: " + cfg["support_email"] if cfg.get("support_email") else "")


# --- 보내기 대기열 -------------------------------------------------------------

class Mailer:
    """emails 표의 대기 메일을 한도 안에서 보낸다. send_fn(row) 은 실제 발송(테스트에서 바꿔 끼움)."""

    def __init__(self, store, send_fn: Callable[[dict], None], interval: float = 30):
        self.store = store
        self.send_fn = send_fn
        self.interval = interval
        self.wake_event = threading.Event()
        self.stop_event = threading.Event()
        self.thread: threading.Thread | None = None
        self.lock = threading.Lock()

    def start(self) -> None:
        self.thread = threading.Thread(target=self._loop, name="mailer", daemon=True)
        self.thread.start()

    def stop(self) -> None:
        self.stop_event.set()
        self.wake_event.set()

    def wake(self) -> None:
        self.wake_event.set()

    def _loop(self) -> None:
        while not self.stop_event.is_set():
            try:
                self.process_once()
            except Exception:  # noqa: BLE001 - 대기열 처리기는 멈추지 않는다
                pass
            self.wake_event.wait(self.interval)
            self.wake_event.clear()

    def process_once(self, now: datetime | None = None) -> int:
        """보낼 수 있는 만큼 보내고, 보낸 개수를 돌려준다."""
        with self.lock:
            sent = 0
            now = now or datetime.now(timezone.utc)
            if not self.store.ready():
                return 0  # Gmail을 연결하기 전에는 시도하지 않고 쌓아만 둔다
            for row in self.store.due_emails(now):
                if self.store.sent_since(now - timedelta(hours=24)) >= self.store.daily_limit():
                    break  # 오늘 한도를 다 썼다. 내일 이어서 보낸다.
                try:
                    self.send_fn(row)
                except MailError as e:
                    attempts = row["attempts"] + 1
                    if e.quota:
                        self.store.postpone_all(now + timedelta(hours=3), str(e))
                        break
                    retry = now + timedelta(minutes=5 * 2 ** (attempts - 1))
                    self.store.mark_failed(row["id"], attempts, str(e), None if attempts >= MAX_ATTEMPTS else retry)
                    continue
                except Exception as e:  # noqa: BLE001
                    attempts = row["attempts"] + 1
                    self.store.mark_failed(row["id"], attempts, f"{type(e).__name__}: {e}",
                                           None if attempts >= MAX_ATTEMPTS else now + timedelta(minutes=10))
                    continue
                self.store.mark_sent(row["id"], now)
                sent += 1
            return sent


def guide_attachment(path: Path) -> list[dict]:
    if not path.exists() or path.stat().st_size > 20 * 1024 * 1024:
        return []
    return [{"name": GUIDE_NAME, "type": "application/pdf", "data": base64.b64encode(path.read_bytes()).decode()}]

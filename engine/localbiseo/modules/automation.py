"""자동 처리: 정해 둔 폴더를 지켜보다가 새 파일이 들어오면 정해 둔 일을 알아서 한다.

예) '스캔' 폴더에 문서가 들어오면 개인정보를 가려 '처리됨'에 저장,
    '영수증' 폴더에 사진이 들어오면 경비 장부에 적기.

- 폴더 맨 위 칸만 본다. 결과는 기본으로 '<폴더>/처리됨', 원본은 그대로 두거나 '<폴더>/원본'으로 옮긴다.
- 복사가 끝나지 않은 파일을 건드리지 않도록, 크기와 수정 시각이 몇 초 동안 그대로인 파일만 처리한다.
- 한 번 처리한 파일은 기억해 두고 다시 처리하지 않는다. (내용이 바뀌면 다시 처리)
"""
from __future__ import annotations

import json
import shutil
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..core import license, optional, search
from ..core.config import output_path
from ..core.context import AppContext, Ctx
from ..core.db import Database, now_iso
from ..core.errors import AppError, NotFound
from ..core.jobs import JobContext
from .masking.detect import KIND_LABELS, MODES
from .masking.files import SUPPORTED_EXTS as MASK_EXTS
from .media import IMAGE_EXTS, PRESETS, ImageOpts, Watermark, process_image

router = APIRouter(prefix="/automations", tags=["자동 처리"])

AUDIO_EXTS = {".mp3", ".m4a", ".wav", ".aac", ".flac", ".ogg", ".wma", ".mp4", ".mov", ".mkv", ".webm", ".avi"}
PHOTO_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tif", ".tiff"}
DONE_DIR = "처리됨"
ORIGINAL_DIR = "원본"
# 내려받기·저장 중에 생기는 임시 파일
TEMP_SUFFIXES = (".tmp", ".part", ".crdownload", ".download", ".partial", ".!ut", ".swp")
# 다른 기능이 만든 결과 파일 (결과 폴더를 따로 두지 않았을 때 다시 처리하지 않도록)
OUTPUT_MARKS = ("_마스킹", "_편집", "_압축", "_글자", "_회의록")
SETTLE_SECONDS = 3.0
LOG_KEEP = 500


@dataclass
class Action:
    key: str
    label: str
    desc: str
    exts: set[str]
    run: Callable[[JobContext, Database, Path, Path, dict], dict]
    needs: list[str] = field(default_factory=list)  # 필요한 선택 구성요소


def _mask(job: JobContext, db: Database, src: Path, out_dir: Path, opt: dict) -> dict:
    from .masking.files import mask_file

    r = mask_file(src, opt.get("kinds"), opt.get("mode", "partial"), str(out_dir), opt.get("faces", True), opt.get("always"), opt.get("never"))
    msg = f"{r['count']}곳 가림" if r["count"] else "가릴 곳이 없었어요"
    return {"dst": r["dst"], "message": msg}


def _image(job: JobContext, db: Database, src: Path, out_dir: Path, opt: dict) -> dict:
    wm = opt.get("watermark") or ""
    o = ImageOpts(
        paths=[str(src)], preset=opt.get("preset") or None, width=opt.get("width"), height=opt.get("height"),
        mode=opt.get("mode", "fit"), enhance=opt.get("enhance", False), remove_bg=opt.get("remove_bg", False),
        watermark=Watermark(text=wm) if wm.strip() else None, format=opt.get("format", "jpg"), suffix="_편집", out_dir=str(out_dir),
    )
    dst = process_image(src, o)
    label = PRESETS[o.preset]["label"] if o.preset else "사진 정리"
    return {"dst": str(dst), "message": label}


def _receipt(job: JobContext, db: Database, src: Path, out_dir: Path, opt: dict) -> dict:
    from .papers import parse_receipt
    from .screen_ocr import read_image

    f = parse_receipt(read_image(str(src))["text"])
    db.insert(
        "INSERT INTO expenses(date, merchant, amount, category, memo, biz_no, created_at) VALUES(?,?,?,?,?,?,?)",
        (f["date"], f["merchant"], f["amount"], f["category"] or opt.get("category", ""), f"자동 처리: {src.name}", f["biz_no"], now_iso()),
    )
    amount = f"{f['amount']:,}원" if f["amount"] else "금액 확인 필요"
    return {"dst": None, "message": f"경비 장부에 적음 · {f['merchant'] or '가맹점 확인 필요'} · {amount}"}


def _card(job: JobContext, db: Database, src: Path, out_dir: Path, opt: dict) -> dict:
    from .papers import parse_card
    from .screen_ocr import read_image

    c = parse_card(read_image(str(src))["text"])
    cid = db.insert(
        f"INSERT INTO contacts({', '.join(c)}, created_at) VALUES({', '.join('?' * len(c))}, ?)", (*c.values(), now_iso())
    )
    search.index(db, "contact", cid, c["name"] or c["company"], " ".join(v for v in c.values() if v))
    who = " ".join(x for x in (c["name"], c["company"]) if x) or "이름 확인 필요"
    return {"dst": None, "message": f"연락처에 추가 · {who}"}


def _ocr_text(job: JobContext, db: Database, src: Path, out_dir: Path, opt: dict) -> dict:
    from .screen_ocr import read_image

    text = read_image(str(src))["text"]
    dst = output_path(src, "_글자", ext="txt", out_dir=out_dir)
    dst.write_text(text, encoding="utf-8")
    return {"dst": str(dst), "message": f"글자 {len(text.strip())}자"}


def _transcribe(job: JobContext, db: Database, src: Path, out_dir: Path, opt: dict) -> dict:
    from .actions import extract_actions
    from .transcribe import export
    from .transcribe.api import get_transcript, run_transcribe
    from .transcribe.summary import decisions

    r = run_transcribe(job, db, str(src), src.stem, opt.get("model", "small"), "ko", False, None, opt.get("auto_todos", True))
    dst = None
    if opt.get("docx", True):
        t = get_transcript(db, r["transcript_id"])
        dst = output_path(src, "_회의록", ext="docx", out_dir=out_dir)
        text = "\n".join(s["text"] for s in t["segments"])
        actions = extract_actions(text)
        export.to_docx(t, dst, actions, decisions(text, actions))
    msg = f"회의록 저장 · 할 일 {r['todos_added']}개 추가" if opt.get("auto_todos", True) else "회의록 저장"
    return {"dst": str(dst) if dst else None, "message": msg, "transcript_id": r["transcript_id"]}


def _pdf_compress(job: JobContext, db: Database, src: Path, out_dir: Path, opt: dict) -> dict:
    from .pdf_tools import compress

    r = compress(str(src), int(opt.get("quality", 60)), out_dir=str(out_dir))
    return {"dst": r["dst"], "message": f"{r['before'] // 1024:,}KB → {r['after'] // 1024:,}KB"}


ACTIONS: dict[str, Action] = {
    a.key: a
    for a in [
        Action("mask", "개인정보 가리기", "문서·이미지 속 주민번호·전화번호를 가린 사본을 만들어요", set(MASK_EXTS), _mask),
        Action("image", "사진 규격 맞추기", "상품 사진을 정한 크기로 맞추고 워터마크·보정을 넣어요", set(IMAGE_EXTS), _image),
        Action("receipt", "영수증 → 경비 장부", "영수증 사진을 읽어 경비 장부에 적어요", PHOTO_EXTS, _receipt, ["ocr"]),
        Action("card", "명함 → 연락처", "명함 사진을 읽어 연락처에 넣어요", PHOTO_EXTS, _card, ["ocr"]),
        Action("ocr", "사진 → 글자 파일", "사진·스캔 속 글자를 뽑아 .txt로 저장해요", PHOTO_EXTS, _ocr_text, ["ocr"]),
        Action("transcribe", "녹음 → 회의록", "녹음 파일을 회의록으로 만들고 할 일을 뽑아요", AUDIO_EXTS, _transcribe, ["stt"]),
        Action("pdf_compress", "PDF 용량 줄이기", "PDF 속 사진을 줄여 메일로 보내기 좋게 만들어요", {".pdf"}, _pdf_compress),
    ]
}


# --- 저장 ---
def _row(r: dict) -> dict:
    a = dict(r)
    a["options"] = json.loads(a["options"] or "{}")
    a["enabled"] = bool(a["enabled"])
    a["action_label"] = ACTIONS[a["action"]].label if a["action"] in ACTIONS else a["action"]
    a["out_dir_resolved"] = str(out_folder(a))
    return a


def get_automation(db: Database, aid: int) -> dict:
    r = db.one("SELECT * FROM automations WHERE id=?", (aid,))
    if not r:
        raise NotFound("자동 처리 규칙을 찾을 수 없어요.")
    return _row(r)


def out_folder(a: dict) -> Path:
    return Path(a["out_dir"]) if a.get("out_dir") else Path(a["folder"]) / DONE_DIR


def _same(a: Path, b: Path) -> bool:
    try:
        return a.resolve() == b.resolve()
    except OSError:
        return str(a) == str(b)


def is_candidate(path: Path, exts: set[str]) -> bool:
    name = path.name
    low = name.lower()
    if name.startswith((".", "~$", "~")) or low.endswith(TEMP_SUFFIXES) or low in ("thumbs.db", "desktop.ini"):
        return False
    if path.suffix.lower() not in exts:
        return False
    return not any(path.stem.endswith(m) or f"{m}(" in path.stem for m in OUTPUT_MARKS)


def scan(folder: Path, exts: set[str]) -> list[Path]:
    try:
        return sorted(p for p in folder.iterdir() if p.is_file() and is_candidate(p, exts))
    except OSError:
        return []


def _stat(p: Path) -> tuple[int, float] | None:
    try:
        st = p.stat()
    except OSError:
        return None
    return st.st_size, st.st_mtime


def remember_existing(db: Database, aid: int, folder: Path, exts: set[str]) -> int:
    """규칙을 만들 때 이미 있던 파일은 처리하지 않도록 기억해 둔다."""
    n = 0
    for p in scan(folder, exts):
        st = _stat(p)
        if st:
            db.execute(
                "INSERT OR REPLACE INTO automation_seen(automation_id, path, size, mtime) VALUES(?,?,?,?)", (aid, str(p), *st)
            )
            n += 1
    return n


def _log(db: Database, aid: int, src: Path, status: str, message: str = "", dst: str | None = None) -> int:
    lid = db.insert(
        "INSERT INTO automation_log(automation_id, src, dst, status, message, created_at, finished_at) VALUES(?,?,?,?,?,?,?)",
        (aid, str(src), dst, status, message, now_iso(), None if status == "running" else now_iso()),
    )
    db.execute(
        "DELETE FROM automation_log WHERE id IN (SELECT id FROM automation_log ORDER BY id DESC LIMIT -1 OFFSET ?)", (LOG_KEEP,)
    )
    return lid


# --- 실행 ---
def process_file(job: JobContext, db: Database, a: dict, src: Path, log_id: int) -> dict:
    action = ACTIONS[a["action"]]
    try:
        out_dir = out_folder(a)
        out_dir.mkdir(parents=True, exist_ok=True)
        r = action.run(job, db, src, out_dir, a["options"])
        if a["after"] == "move" and src.exists():
            moved = output_path(src, "", out_dir=Path(a["folder"]) / ORIGINAL_DIR)
            shutil.move(str(src), moved)
            db.execute("DELETE FROM automation_seen WHERE automation_id=? AND path=?", (a["id"], str(src)))
            r["moved_to"] = str(moved)
        db.execute(
            "UPDATE automation_log SET status='done', dst=?, message=?, finished_at=? WHERE id=?",
            (r.get("dst"), r.get("message", ""), now_iso(), log_id),
        )
        return r
    except Exception as e:
        msg = e.message if isinstance(e, AppError) else f"처리하지 못했어요: {e}"
        db.execute("UPDATE automation_log SET status='error', message=?, finished_at=? WHERE id=?", (msg, now_iso(), log_id))
        raise


class Watcher:
    """폴더를 몇 초마다 훑어서, 다 들어온 새 파일을 작업 줄에 올린다."""

    def __init__(self, ctx: AppContext, interval: float = 5.0, settle: float = SETTLE_SECONDS):
        self.ctx = ctx
        self.interval = interval
        self.settle = settle
        self._pending: dict[tuple[int, str], tuple[int, float, float]] = {}  # (규칙, 경로) → (크기, 수정 시각, 처음 본 때)
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._tick_lock = threading.Lock()

    def start(self) -> None:
        if self.interval <= 0 or self._thread:
            return
        self._thread = threading.Thread(target=self._loop, name="automation-watcher", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def _loop(self) -> None:
        while not self._stop.wait(self.interval):
            try:
                self.tick()
            except Exception:  # noqa: BLE001 - 감시는 멈추지 않는다
                import traceback

                traceback.print_exc()

    def tick(self, now: float | None = None, only: int | None = None, wait_settle: bool = True) -> list[str]:
        """한 번 훑는다. 작업 줄에 올린 파일 경로를 돌려준다."""
        db = self.ctx.db
        if not license.is_licensed(db):
            return []
        now = time.time() if now is None else now
        submitted: list[str] = []
        with self._tick_lock:
            rows = db.query("SELECT * FROM automations WHERE enabled=1" + (" AND id=?" if only else ""), (only,) if only else ())
            for r in rows:
                a = _row(r)
                action = ACTIONS.get(a["action"])
                folder = Path(a["folder"])
                if not action:
                    continue
                if not folder.is_dir():
                    self._set_error(a, f"폴더를 찾을 수 없어요: {folder}")
                    continue
                missing = [k for k in action.needs if not optional.available(k)]
                if missing:
                    labels = ", ".join(optional.COMPONENTS[k].label for k in missing)
                    self._set_error(a, f"'{labels}' 구성요소가 있어야 해요. 설정 > 구성요소에서 설치해 주세요.")
                    continue
                self._set_error(a, "")
                seen = {s["path"]: (s["size"], s["mtime"]) for s in db.query("SELECT path, size, mtime FROM automation_seen WHERE automation_id=?", (a["id"],))}
                for p in scan(folder, action.exts):
                    st = _stat(p)
                    if not st or seen.get(str(p)) == st:
                        continue
                    key = (a["id"], str(p))
                    if wait_settle:
                        before = self._pending.get(key)
                        if not before or before[:2] != st:
                            self._pending[key] = (*st, now)
                            continue
                        if now - before[2] < self.settle:
                            continue
                    self._pending.pop(key, None)
                    self._submit(a, p, st)
                    submitted.append(str(p))
                db.execute("UPDATE automations SET last_run_at=? WHERE id=?", (now_iso(), a["id"]))
        return submitted

    def _set_error(self, a: dict, msg: str) -> None:
        if a["error"] != msg:
            self.ctx.db.execute("UPDATE automations SET error=? WHERE id=?", (msg, a["id"]))

    def _submit(self, a: dict, src: Path, st: tuple[int, float]) -> None:
        db = self.ctx.db
        # 작업에 올리는 순간 기억해서 다음 훑기에 또 올리지 않는다. 실패해도 같은 파일을 계속 붙잡지 않는다.
        db.execute("INSERT OR REPLACE INTO automation_seen(automation_id, path, size, mtime) VALUES(?,?,?,?)", (a["id"], str(src), *st))
        log_id = _log(db, a["id"], src, "running")
        self.ctx.jobs.submit("automation", f"자동 처리({a['name'] or ACTIONS[a['action']].label}): {src.name}", process_file, db, a, src, log_id)


# --- API ---
class AutomationIn(BaseModel):
    name: str = ""
    folder: str
    action: str
    options: dict = Field(default_factory=dict)
    out_dir: str | None = None
    after: str = "keep"  # keep | move
    enabled: bool = True
    include_existing: bool = False  # 지금 폴더에 있는 파일도 처리할지


class AutomationUpdate(BaseModel):
    name: str | None = None
    options: dict | None = None
    out_dir: str | None = None
    after: str | None = None
    enabled: bool | None = None


class RunIn(BaseModel):
    all: bool = False  # 이미 처리한 파일까지 다시


def _validate(action: str, folder: str, out_dir: str | None, after: str, options: dict) -> None:
    if action not in ACTIONS:
        raise AppError("할 일을 골라 주세요.")
    if after not in ("keep", "move"):
        raise AppError("원본 처리 방식은 keep 또는 move예요.")
    f = Path(folder)
    if not folder.strip() or not f.is_dir():
        raise AppError("지켜볼 폴더를 찾을 수 없어요.")
    if out_dir and _same(Path(out_dir), f):
        raise AppError("결과 폴더는 지켜보는 폴더와 달라야 해요. 비워 두면 '처리됨' 폴더에 저장해요.")
    if action == "mask":
        if options.get("mode", "partial") not in MODES:
            raise AppError("가리는 방식은 partial, full, tag 중 하나예요.")
        unknown = set(options.get("kinds") or []) - set(KIND_LABELS)
        if unknown:
            raise AppError(f"알 수 없는 항목: {', '.join(sorted(unknown))}")
    if action == "image" and options.get("preset") and options["preset"] not in PRESETS:
        raise AppError("알 수 없는 규격이에요.")


def _watcher(ctx: AppContext) -> Watcher:
    w = getattr(ctx, "watcher", None)
    if w is None:
        raise AppError("자동 처리가 아직 준비되지 않았어요.")
    return w


@router.get("/actions")
def actions():
    return [
        {"key": a.key, "label": a.label, "desc": a.desc, "exts": sorted(a.exts), "needs": a.needs,
         "ready": all(optional.available(k) for k in a.needs)}
        for a in ACTIONS.values()
    ]


@router.get("")
def list_automations(ctx: Ctx):
    items = [_row(r) for r in ctx.db.query("SELECT * FROM automations ORDER BY id")]
    counts = {
        r["automation_id"]: r for r in ctx.db.query(
            "SELECT automation_id, SUM(status='done') AS done, SUM(status='error') AS errors, SUM(status='running') AS running "
            "FROM automation_log GROUP BY automation_id"
        )
    }
    for a in items:
        c = counts.get(a["id"]) or {}
        a["done"], a["errors"], a["running"] = c.get("done") or 0, c.get("errors") or 0, c.get("running") or 0
    return items


@router.post("")
def create(body: AutomationIn, ctx: Ctx):
    _validate(body.action, body.folder, body.out_dir, body.after, body.options)
    aid = ctx.db.insert(
        "INSERT INTO automations(name, folder, action, options, out_dir, after, enabled, created_at) VALUES(?,?,?,?,?,?,?,?)",
        (body.name.strip(), str(Path(body.folder)), body.action, json.dumps(body.options, ensure_ascii=False),
         body.out_dir or None, body.after, int(body.enabled), now_iso()),
    )
    if not body.include_existing:
        remember_existing(ctx.db, aid, Path(body.folder), ACTIONS[body.action].exts)
    return get_automation(ctx.db, aid)


@router.get("/log")
def log(ctx: Ctx, automation_id: int | None = None, limit: int = 100):
    sql = (
        "SELECT l.*, a.name AS automation_name, a.action FROM automation_log l LEFT JOIN automations a ON a.id=l.automation_id"
        + (" WHERE l.automation_id=?" if automation_id else "") + " ORDER BY l.id DESC LIMIT ?"
    )
    rows = ctx.db.query(sql, (automation_id, limit) if automation_id else (limit,))
    for r in rows:
        r["action_label"] = ACTIONS[r["action"]].label if r.get("action") in ACTIONS else ""
        r["name"] = Path(r["src"]).name
    return rows


@router.post("/log/{lid}/retry")
def retry(lid: int, ctx: Ctx):
    """실패한 파일을 다음 확인 때 다시 처리하도록 기억에서 지운다."""
    r = ctx.db.one("SELECT * FROM automation_log WHERE id=?", (lid,))
    if not r:
        raise NotFound("기록을 찾을 수 없어요.")
    if not Path(r["src"]).exists():
        raise AppError("원본 파일이 없어서 다시 처리할 수 없어요.")
    ctx.db.execute("DELETE FROM automation_seen WHERE automation_id=? AND path=?", (r["automation_id"], r["src"]))
    ctx.db.execute("DELETE FROM automation_log WHERE id=?", (lid,))
    submitted = _watcher(ctx).tick(only=r["automation_id"], wait_settle=False)
    return {"submitted": len(submitted)}


@router.delete("/log")
def clear_log(ctx: Ctx):
    ctx.db.execute("DELETE FROM automation_log WHERE status != 'running'")
    return {"ok": True}


@router.put("/{aid}")
def update(aid: int, body: AutomationUpdate, ctx: Ctx):
    a = get_automation(ctx.db, aid)
    merged = {
        "options": body.options if body.options is not None else a["options"],
        "out_dir": (body.out_dir or None) if body.out_dir is not None else a["out_dir"],
        "after": body.after or a["after"],
    }
    _validate(a["action"], a["folder"], merged["out_dir"], merged["after"], merged["options"])
    ctx.db.execute(
        "UPDATE automations SET name=?, options=?, out_dir=?, after=?, enabled=? WHERE id=?",
        (body.name.strip() if body.name is not None else a["name"], json.dumps(merged["options"], ensure_ascii=False),
         merged["out_dir"], merged["after"], int(body.enabled if body.enabled is not None else a["enabled"]), aid),
    )
    return get_automation(ctx.db, aid)


@router.delete("/{aid}")
def delete(aid: int, ctx: Ctx):
    with ctx.db.transaction() as c:
        c.execute("DELETE FROM automations WHERE id=?", (aid,))
        c.execute("DELETE FROM automation_seen WHERE automation_id=?", (aid,))
        c.execute("DELETE FROM automation_log WHERE automation_id=?", (aid,))
    return {"ok": True}


@router.post("/{aid}/run")
def run_now(aid: int, body: RunIn, ctx: Ctx):
    """기다리지 않고 지금 폴더를 확인한다. all이면 이미 처리한 파일도 다시 처리한다."""
    a = get_automation(ctx.db, aid)
    if not a["enabled"]:
        raise AppError("꺼져 있는 규칙이에요. 먼저 켜 주세요.")
    if body.all:
        ctx.db.execute("DELETE FROM automation_seen WHERE automation_id=?", (aid,))
    submitted = _watcher(ctx).tick(only=aid, wait_settle=False)
    a = get_automation(ctx.db, aid)
    if a["error"]:
        raise AppError(a["error"])
    return {"submitted": len(submitted), "files": submitted}

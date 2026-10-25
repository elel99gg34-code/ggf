"""클립보드 기록. 앱 셸이 복사 내용을 보내면 저장하고, 민감정보는 가려서 저장한다."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from ..core import search
from ..core.context import Ctx
from ..core.db import Database, now_iso
from .masking.detect import detect, mask_text

router = APIRouter(prefix="/clipboard", tags=["클립보드"])

MAX_ITEMS = 500
MAX_CHARS = 20000
POLICIES = ("mask", "skip", "raw")  # 민감정보: 가려서 저장 / 저장 안 함 / 그대로 저장


def add_clip(db: Database, text: str) -> dict | None:
    text = text.strip("\x00")
    if not text.strip() or len(text) > MAX_CHARS:
        return None
    policy = db.get_setting("clipboard_sensitive", "mask")
    findings = detect(text)
    kinds = sorted({f.kind for f in findings})
    if findings and policy == "skip":
        return {"skipped": True, "kinds": kinds}
    stored = mask_text(text)[0] if findings and policy == "mask" else text
    last = db.one("SELECT id, text FROM clips ORDER BY id DESC LIMIT 1")
    if last and last["text"] == stored:
        return {"id": last["id"], "duplicate": True}
    cid = db.insert(
        "INSERT INTO clips(text, sensitive, kinds, created_at) VALUES(?,?,?,?)",
        (stored, int(bool(findings)), ",".join(kinds), now_iso()),
    )
    search.index(db, "clip", cid, stored[:40], stored)
    _trim(db)
    return {"id": cid, "sensitive": bool(findings), "kinds": kinds}


def _trim(db: Database) -> None:
    old = db.query("SELECT id FROM clips WHERE pinned=0 ORDER BY id DESC LIMIT -1 OFFSET ?", (MAX_ITEMS,))
    for r in old:
        db.execute("DELETE FROM clips WHERE id=?", (r["id"],))
        search.remove(db, "clip", r["id"])


class ClipIn(BaseModel):
    text: str


class PolicyIn(BaseModel):
    policy: str


@router.post("")
def add(body: ClipIn, ctx: Ctx):
    return add_clip(ctx.db, body.text) or {"ignored": True}


@router.get("")
def list_clips(ctx: Ctx, q: str = "", limit: int = 100):
    if q:
        return ctx.db.query("SELECT * FROM clips WHERE text LIKE ? ORDER BY pinned DESC, id DESC LIMIT ?", (f"%{q}%", limit))
    return ctx.db.query("SELECT * FROM clips ORDER BY pinned DESC, id DESC LIMIT ?", (limit,))


@router.post("/{clip_id}/pin")
def pin(clip_id: int, ctx: Ctx):
    ctx.db.execute("UPDATE clips SET pinned = 1 - pinned WHERE id=?", (clip_id,))
    return ctx.db.one("SELECT * FROM clips WHERE id=?", (clip_id,))


@router.delete("/{clip_id}")
def delete(clip_id: int, ctx: Ctx):
    ctx.db.execute("DELETE FROM clips WHERE id=?", (clip_id,))
    search.remove(ctx.db, "clip", clip_id)
    return {"ok": True}


@router.delete("")
def clear(ctx: Ctx):
    for r in ctx.db.query("SELECT id FROM clips WHERE pinned=0"):
        search.remove(ctx.db, "clip", r["id"])
    ctx.db.execute("DELETE FROM clips WHERE pinned=0")
    return {"ok": True}


@router.get("/policy")
def get_policy(ctx: Ctx):
    return {"policy": ctx.db.get_setting("clipboard_sensitive", "mask"), "enabled": ctx.db.get_setting("clipboard_enabled", True)}


@router.put("/policy")
def set_policy(body: PolicyIn, ctx: Ctx):
    if body.policy not in POLICIES:
        return {"error": "mask, skip, raw 중 하나여야 해요."}
    ctx.db.set_setting("clipboard_sensitive", body.policy)
    return {"policy": body.policy}


@router.put("/enabled")
def set_enabled(body: dict, ctx: Ctx):
    ctx.db.set_setting("clipboard_enabled", bool(body.get("enabled", True)))
    return {"enabled": ctx.db.get_setting("clipboard_enabled", True)}

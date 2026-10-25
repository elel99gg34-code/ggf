"""메모와 할 일."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from ..core import search
from ..core.context import Ctx
from ..core.db import Database, now_iso
from ..core.errors import NotFound

router = APIRouter(tags=["메모·할 일"])


def _index_note(db: Database, note_id: int) -> None:
    n = db.one("SELECT * FROM notes WHERE id=?", (note_id,))
    if n:
        search.index(db, "note", note_id, n["title"], f"{n['body']}\n{n['tags']}")


def add_note(db: Database, title: str, body: str, tags: str = "", pinned: bool = False) -> int:
    ts = now_iso()
    nid = db.insert(
        "INSERT INTO notes(title, body, tags, pinned, created_at, updated_at) VALUES(?,?,?,?,?,?)",
        (title, body, tags, int(pinned), ts, ts),
    )
    _index_note(db, nid)
    return nid


def find_open_todo(db: Database, text: str) -> int | None:
    row = db.one("SELECT id FROM todos WHERE done=0 AND text=?", (text.strip(),))
    return row["id"] if row else None


def add_todo(db: Database, text: str, due: str | None = None, assignee: str | None = None, source: str | None = None) -> int:
    tid = db.insert(
        "INSERT INTO todos(text, due, assignee, source, created_at) VALUES(?,?,?,?,?)",
        (text, due, assignee, source, now_iso()),
    )
    search.index(db, "todo", tid, text[:40], f"{text}\n{assignee or ''}")
    return tid


class NoteIn(BaseModel):
    title: str = ""
    body: str = ""
    tags: str = ""
    pinned: bool = False


class TodoIn(BaseModel):
    text: str
    due: str | None = None
    assignee: str | None = None
    source: str | None = None


class TodoPatch(BaseModel):
    text: str | None = None
    due: str | None = None
    assignee: str | None = None
    done: bool | None = None


@router.get("/notes")
def list_notes(ctx: Ctx, q: str = ""):
    if q:
        like = f"%{q}%"
        return ctx.db.query(
            "SELECT * FROM notes WHERE title LIKE ? OR body LIKE ? OR tags LIKE ? ORDER BY pinned DESC, updated_at DESC",
            (like, like, like),
        )
    return ctx.db.query("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC")


@router.post("/notes")
def create_note(body: NoteIn, ctx: Ctx):
    nid = add_note(ctx.db, body.title, body.body, body.tags, body.pinned)
    return ctx.db.one("SELECT * FROM notes WHERE id=?", (nid,))


@router.put("/notes/{note_id}")
def update_note(note_id: int, body: NoteIn, ctx: Ctx):
    cur = ctx.db.execute(
        "UPDATE notes SET title=?, body=?, tags=?, pinned=?, updated_at=? WHERE id=?",
        (body.title, body.body, body.tags, int(body.pinned), now_iso(), note_id),
    )
    if cur.rowcount == 0:
        raise NotFound("메모를 찾을 수 없어요.")
    _index_note(ctx.db, note_id)
    return ctx.db.one("SELECT * FROM notes WHERE id=?", (note_id,))


@router.delete("/notes/{note_id}")
def delete_note(note_id: int, ctx: Ctx):
    ctx.db.execute("DELETE FROM notes WHERE id=?", (note_id,))
    search.remove(ctx.db, "note", note_id)
    return {"ok": True}


@router.get("/todos")
def list_todos(ctx: Ctx, status: str = "open"):
    where = {"open": "WHERE done=0", "done": "WHERE done=1"}.get(status, "")
    order = "ORDER BY done, due IS NULL, due, id DESC"
    return ctx.db.query(f"SELECT * FROM todos {where} {order}")


@router.post("/todos")
def create_todo(body: TodoIn, ctx: Ctx):
    tid = add_todo(ctx.db, body.text, body.due, body.assignee, body.source)
    return ctx.db.one("SELECT * FROM todos WHERE id=?", (tid,))


@router.patch("/todos/{todo_id}")
def patch_todo(todo_id: int, body: TodoPatch, ctx: Ctx):
    cur = ctx.db.one("SELECT * FROM todos WHERE id=?", (todo_id,))
    if not cur:
        raise NotFound("할 일을 찾을 수 없어요.")
    fields = body.model_dump(exclude_unset=True)
    if "done" in fields:
        fields["done_at"] = now_iso() if fields["done"] else None
        fields["done"] = int(fields["done"])
    if fields:
        sets = ", ".join(f"{k}=?" for k in fields)
        ctx.db.execute(f"UPDATE todos SET {sets} WHERE id=?", (*fields.values(), todo_id))
    row = ctx.db.one("SELECT * FROM todos WHERE id=?", (todo_id,))
    search.index(ctx.db, "todo", todo_id, row["text"][:40], f"{row['text']}\n{row['assignee'] or ''}")
    return row


@router.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, ctx: Ctx):
    ctx.db.execute("DELETE FROM todos WHERE id=?", (todo_id,))
    search.remove(ctx.db, "todo", todo_id)
    return {"ok": True}

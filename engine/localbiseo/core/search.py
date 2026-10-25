"""통합 검색 색인 (SQLite FTS5, trigram 토크나이저로 한글 부분 일치 지원)."""
from __future__ import annotations

import re

from .db import Database, now_iso

KIND_LABELS = {
    "note": "메모",
    "todo": "할 일",
    "clip": "클립보드",
    "transcript": "회의록",
    "file": "파일",
    "contact": "연락처",
}


def index(db: Database, kind: str, ref: str | int, title: str, body: str) -> None:
    ref = str(ref)
    with db.transaction() as conn:
        conn.execute("DELETE FROM search_index WHERE kind=? AND ref=?", (kind, ref))
        conn.execute(
            "INSERT INTO search_index(kind, ref, title, body, updated) VALUES(?,?,?,?,?)",
            (kind, ref, title or "", body or "", now_iso()),
        )


def remove(db: Database, kind: str, ref: str | int) -> None:
    db.execute("DELETE FROM search_index WHERE kind=? AND ref=?", (kind, str(ref)))


def _terms(q: str) -> list[str]:
    return [t for t in re.split(r"\s+", q.strip()) if t]


def snippet(text: str, terms: list[str], width: int = 70) -> tuple[str, list[list[int]]]:
    lower = text.lower()
    first = min((i for i in (lower.find(t.lower()) for t in terms) if i >= 0), default=0)
    start = max(0, first - width // 2)
    end = min(len(text), start + width * 2)
    piece = text[start:end].replace("\n", " ")
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(text) else ""
    piece = prefix + piece + suffix
    marks = []
    lp = piece.lower()
    for t in terms:
        for m in re.finditer(re.escape(t.lower()), lp):
            marks.append([m.start(), m.end()])
    marks.sort()
    return piece, marks


def query(db: Database, q: str, kinds: list[str] | None = None, limit: int = 40) -> list[dict]:
    terms = _terms(q)
    if not terms:
        return []
    kind_sql = ""
    params: list = []
    if db.fts_tokenizer == "trigram" and all(len(t) >= 3 for t in terms):
        match = " ".join('"' + t.replace('"', '""') + '"' for t in terms)
        where = "search_index MATCH ?"
        params.append(match)
        order = "ORDER BY bm25(search_index, 5.0, 1.0)"
    else:
        # trigram은 3글자 미만 검색어를 못 찾으니 LIKE로 훑는다.
        clauses = []
        for t in terms:
            clauses.append("(title LIKE ? OR body LIKE ?)")
            like = f"%{t}%"
            params += [like, like]
        where = " AND ".join(clauses)
        order = "ORDER BY updated DESC"
    if kinds:
        kind_sql = f" AND kind IN ({','.join('?' * len(kinds))})"
        params += kinds
    rows = db.query(
        f"SELECT kind, ref, title, body, updated FROM search_index WHERE {where}{kind_sql} {order} LIMIT ?",
        (*params, limit),
    )
    out = []
    for r in rows:
        snip, marks = snippet(r["body"] or r["title"], terms)
        out.append(
            {
                "kind": r["kind"],
                "kind_label": KIND_LABELS.get(r["kind"], r["kind"]),
                "ref": r["ref"],
                "title": r["title"] or (r["body"][:40] if r["body"] else ""),
                "snippet": snip,
                "marks": marks,
                "updated": r["updated"],
            }
        )
    return out

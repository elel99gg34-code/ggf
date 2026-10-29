from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator

SCHEMA_VERSION = 1

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  due TEXT,
  assignee TEXT,
  source TEXT,
  created_at TEXT NOT NULL,
  done_at TEXT
);
CREATE TABLE IF NOT EXISTS clips (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  sensitive INTEGER NOT NULL DEFAULT 0,
  kinds TEXT NOT NULL DEFAULT '',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS transcripts (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  source_path TEXT,
  language TEXT,
  duration REAL,
  segments TEXT NOT NULL,
  speakers TEXT NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS focus_sessions (
  id INTEGER PRIMARY KEY,
  label TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'focus',
  planned_minutes INTEGER,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  completed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY,
  date TEXT,
  merchant TEXT NOT NULL DEFAULT '',
  amount INTEGER,
  category TEXT NOT NULL DEFAULT '',
  memo TEXT NOT NULL DEFAULT '',
  biz_no TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  mobile TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  fax TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS automations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  folder TEXT NOT NULL,
  action TEXT NOT NULL,
  options TEXT NOT NULL DEFAULT '{}',
  out_dir TEXT,
  after TEXT NOT NULL DEFAULT 'keep',
  enabled INTEGER NOT NULL DEFAULT 1,
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  last_run_at TEXT
);
CREATE TABLE IF NOT EXISTS automation_seen (
  automation_id INTEGER NOT NULL,
  path TEXT NOT NULL,
  size INTEGER NOT NULL,
  mtime REAL NOT NULL,
  PRIMARY KEY (automation_id, path)
);
CREATE TABLE IF NOT EXISTS automation_log (
  id INTEGER PRIMARY KEY,
  automation_id INTEGER NOT NULL,
  src TEXT NOT NULL,
  dst TEXT,
  status TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE TABLE IF NOT EXISTS file_ops (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  undone INTEGER NOT NULL DEFAULT 0
);
"""


def now_iso() -> str:
    return datetime.now().replace(microsecond=0).isoformat()


class Database:
    """스레드 하나짜리 SQLite 연결을 락으로 감싼 얇은 래퍼."""

    def __init__(self, path: Path | str):
        self.path = str(path)
        self.lock = threading.RLock()
        self.conn = sqlite3.connect(self.path, check_same_thread=False, isolation_level=None)
        self.conn.row_factory = sqlite3.Row
        if self.path != ":memory:":
            self.conn.execute("PRAGMA journal_mode=WAL")
        self.fts_tokenizer = "trigram"
        self._migrate()

    def _migrate(self) -> None:
        with self.lock:
            self.conn.executescript(SCHEMA)
            try:
                self.conn.execute(
                    "CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5("
                    "kind UNINDEXED, ref UNINDEXED, title, body, updated UNINDEXED, tokenize='trigram')"
                )
            except sqlite3.OperationalError:
                # 오래된 SQLite(3.34 미만)는 trigram 토크나이저가 없다. 검색은 LIKE로 대체된다.
                self.fts_tokenizer = "unicode61"
                self.conn.execute(
                    "CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5("
                    "kind UNINDEXED, ref UNINDEXED, title, body, updated UNINDEXED)"
                )
            self.conn.execute(f"PRAGMA user_version={SCHEMA_VERSION}")

    def execute(self, sql: str, params: tuple | dict = ()) -> sqlite3.Cursor:
        with self.lock:
            return self.conn.execute(sql, params)

    def insert(self, sql: str, params: tuple | dict = ()) -> int:
        with self.lock:
            return int(self.conn.execute(sql, params).lastrowid)

    def query(self, sql: str, params: tuple | dict = ()) -> list[dict]:
        with self.lock:
            return [dict(r) for r in self.conn.execute(sql, params).fetchall()]

    def one(self, sql: str, params: tuple | dict = ()) -> dict | None:
        with self.lock:
            row = self.conn.execute(sql, params).fetchone()
            return dict(row) if row else None

    def scalar(self, sql: str, params: tuple | dict = ()) -> Any:
        with self.lock:
            row = self.conn.execute(sql, params).fetchone()
            return row[0] if row else None

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        with self.lock:
            self.conn.execute("BEGIN")
            try:
                yield self.conn
            except BaseException:
                self.conn.execute("ROLLBACK")
                raise
            else:
                self.conn.execute("COMMIT")

    # --- 설정 ---
    def get_setting(self, key: str, default: Any = None) -> Any:
        row = self.one("SELECT value FROM settings WHERE key=?", (key,))
        return json.loads(row["value"]) if row else default

    def set_setting(self, key: str, value: Any) -> None:
        self.execute(
            "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, json.dumps(value, ensure_ascii=False)),
        )

    def all_settings(self) -> dict:
        return {r["key"]: json.loads(r["value"]) for r in self.query("SELECT key, value FROM settings")}

    def close(self) -> None:
        with self.lock:
            self.conn.close()

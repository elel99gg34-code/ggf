from __future__ import annotations

import time
from pathlib import Path

from PIL import Image

from localbiseo.modules.automation import is_candidate


def _watcher(app):
    return app.state.ctx.watcher


def _settle(app, now: float | None = None) -> list[str]:
    """복사가 끝났는지 보려고 두 번 훑는다 (두 번째는 3초 넘게 지난 것으로)."""
    now = now or time.time()
    _watcher(app).tick(now=now)
    return _watcher(app).tick(now=now + 10)


def _wait_all(app, timeout: float = 30):
    jobs = app.state.ctx.jobs
    for j in jobs.list():
        jobs.wait(j.id, timeout)


def test_candidates_skip_temp_hidden_and_outputs():
    exts = {".txt", ".jpg"}
    assert is_candidate(Path("메모.txt"), exts)
    for name in ("~$메모.txt", ".숨김.txt", "받는중.jpg.crdownload", "사진.png", "메모_마스킹.txt", "메모_마스킹(2).txt"):
        assert not is_candidate(Path(name), exts), name


def test_mask_folder_end_to_end(client, app, tmp_path):
    inbox = tmp_path / "받은 문서"
    inbox.mkdir()
    (inbox / "예전.txt").write_text("전화 010-1111-2222", encoding="utf-8")
    r = client.post("/automations", json={
        "name": "고객 문서", "folder": str(inbox), "action": "mask",
        "options": {"mode": "partial", "always": ["로컬상회"], "never": ["02-345-6789"]},
    })
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["out_dir_resolved"] == str(inbox / "처리됨")

    # 규칙을 만들기 전부터 있던 파일은 건드리지 않는다.
    assert _settle(app) == []

    new = inbox / "상담.txt"
    new.write_text("로컬상회 김 대리 010-1234-5678, 대표번호 02-345-6789", encoding="utf-8")
    now = time.time()
    assert _watcher(app).tick(now=now) == []  # 처음 본 순간에는 기다린다
    assert _watcher(app).tick(now=now + 1) == []  # 아직 3초가 안 지났다
    assert _watcher(app).tick(now=now + 5) == [str(new)]
    _wait_all(app)
    out = inbox / "처리됨" / "상담_마스킹.txt"
    assert out.read_text(encoding="utf-8") == "로*** 김 대리 010-****-5678, 대표번호 02-345-6789"
    assert new.exists()  # 원본은 그대로

    # 한 번 처리한 파일은 다시 처리하지 않는다.
    assert _settle(app, now + 20) == []
    log = client.get("/automations/log").json()
    assert [(l["name"], l["status"]) for l in log] == [("상담.txt", "done")]
    assert log[0]["message"] == "2곳 가림"
    listed = client.get("/automations").json()[0]
    assert listed["done"] == 1 and listed["errors"] == 0

    # 지금 다시: 이미 처리한 파일까지
    r = client.post(f"/automations/{a['id']}/run", json={"all": True}).json()
    assert r["submitted"] == 2  # 예전.txt도 이번엔 처리
    _wait_all(app)


def test_size_change_restarts_wait(client, app, tmp_path):
    inbox = tmp_path / "in"
    inbox.mkdir()
    client.post("/automations", json={"folder": str(inbox), "action": "mask"})
    f = inbox / "a.txt"
    f.write_text("하나", encoding="utf-8")
    now = time.time()
    _watcher(app).tick(now=now)
    f.write_text("하나 둘 셋 (아직 복사 중)", encoding="utf-8")
    assert _watcher(app).tick(now=now + 5) == []  # 크기가 바뀌었으니 다시 기다린다
    assert _watcher(app).tick(now=now + 10) == [str(f)]
    _wait_all(app)


def test_image_rule_moves_original_and_receipt_needs_ocr(client, app, tmp_path, monkeypatch):
    inbox = tmp_path / "상품"
    inbox.mkdir()
    a = client.post("/automations", json={
        "folder": str(inbox), "action": "image", "after": "move",
        "options": {"preset": "thumb_500", "enhance": True},
    }).json()
    src = inbox / "머그컵.png"
    Image.new("RGB", (900, 700), (90, 80, 70)).save(src)
    assert client.post(f"/automations/{a['id']}/run", json={}).json()["submitted"] == 1
    _wait_all(app)
    assert Image.open(inbox / "처리됨" / "머그컵_편집.jpg").size == (500, 500)
    assert not src.exists() and (inbox / "원본" / "머그컵.png").exists()
    # 같은 이름의 새 파일이 오면 또 처리한다.
    Image.new("RGB", (900, 700), "white").save(src)
    assert client.post(f"/automations/{a['id']}/run", json={}).json()["submitted"] == 1
    _wait_all(app)

    from localbiseo.core import optional

    real = optional.available
    monkeypatch.setattr(optional, "available", lambda k: False if k == "ocr" else real(k))
    b = client.post("/automations", json={"folder": str(inbox), "action": "receipt"}).json()
    r = client.post(f"/automations/{b['id']}/run", json={})
    assert r.status_code == 400 and "구성요소" in r.json()["error"]
    assert "구성요소" in client.get("/automations").json()[1]["error"]


def test_failure_is_logged_and_retry(client, app, tmp_path):
    inbox = tmp_path / "pdf"
    inbox.mkdir()
    a = client.post("/automations", json={"folder": str(inbox), "action": "pdf_compress"}).json()
    bad = inbox / "깨진.pdf"
    bad.write_bytes(b"not a pdf")
    client.post(f"/automations/{a['id']}/run", json={})
    _wait_all(app)
    log = client.get("/automations/log").json()
    assert log[0]["status"] == "error" and log[0]["message"]
    # 같은 파일을 계속 붙잡지 않는다.
    assert _settle(app) == []
    assert client.post(f"/automations/log/{log[0]['id']}/retry").json()["submitted"] == 1
    _wait_all(app)
    assert len(client.get("/automations/log").json()) == 1


def test_validation_and_toggle(client, app, tmp_path):
    inbox = tmp_path / "x"
    inbox.mkdir()
    assert client.post("/automations", json={"folder": str(tmp_path / "없음"), "action": "mask"}).status_code == 400
    assert client.post("/automations", json={"folder": str(inbox), "action": "없는일"}).status_code == 400
    assert client.post("/automations", json={"folder": str(inbox), "action": "mask", "out_dir": str(inbox)}).status_code == 400
    a = client.post("/automations", json={"folder": str(inbox), "action": "mask"}).json()
    a = client.put(f"/automations/{a['id']}", json={"enabled": False, "name": "꺼둠"}).json()
    assert a["enabled"] is False and a["name"] == "꺼둠"
    (inbox / "a.txt").write_text("x", encoding="utf-8")
    assert _settle(app) == []  # 꺼진 규칙은 훑지 않는다
    assert client.post(f"/automations/{a['id']}/run", json={}).status_code == 400
    assert client.delete(f"/automations/{a['id']}").json()["ok"]
    assert client.get("/automations").json() == []
    actions = {x["key"] for x in client.get("/automations/actions").json()}
    assert {"mask", "image", "receipt", "card", "ocr", "transcribe", "pdf_compress"} <= actions


def test_watcher_idle_without_license(app, tmp_path):
    from localbiseo.modules.automation import Watcher

    inbox = tmp_path / "in"
    inbox.mkdir()
    ctx = app.state.ctx
    ctx.db.insert(
        "INSERT INTO automations(folder, action, created_at) VALUES(?,?,?)", (str(inbox), "mask", "2026-01-01T00:00:00")
    )
    (inbox / "a.txt").write_text("010-1234-5678", encoding="utf-8")
    ctx.db.execute("DELETE FROM settings WHERE key='license_key'")
    w = Watcher(ctx, interval=0)
    now = time.time()
    w.tick(now=now)
    assert w.tick(now=now + 10) == []

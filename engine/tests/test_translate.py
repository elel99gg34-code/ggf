"""번역: 언어팩 설치·문장 나누기·경유 번역.

실제 모델은 크고 인터넷이 필요해서, SentencePiece는 진짜로 학습시키고
CTranslate2 번역기만 입력을 그대로 돌려주는 가짜로 바꾼다.
"""
from __future__ import annotations

import io
import json
import zipfile
from types import SimpleNamespace

import pytest

spm = pytest.importorskip("sentencepiece")
ctranslate2 = pytest.importorskip("ctranslate2")

from localbiseo.core.errors import AppError, FeatureUnavailable  # noqa: E402
from localbiseo.modules import translate as tr  # noqa: E402

CORPUS = [
    "안녕하세요. 반갑습니다. 회의는 내일 오후 세 시에 합니다.",
    "견적서를 금요일까지 보내 주세요. 자료를 확인했습니다.",
    "Hello. Nice to meet you. The meeting is tomorrow at three.",
    "Please send the quote by Friday. I checked the file.",
    "こんにちは。会議は明日です。资料已经确认了。",
]


@pytest.fixture(scope="module")
def sp_model() -> bytes:
    buf = io.BytesIO()
    spm.SentencePieceTrainer.train(
        sentence_iterator=iter(CORPUS * 20), model_writer=buf, vocab_size=120, character_coverage=1.0, hard_vocab_limit=False
    )
    return buf.getvalue()


class EchoTranslator:
    """받은 토큰을 그대로 돌려준다. target_prefix가 있으면 앞에 붙인다."""

    def __init__(self, path, **_):
        self.path = path

    def translate_batch(self, tokens, target_prefix=None, **_):
        prefixes = target_prefix or [[] for _ in tokens]
        return [SimpleNamespace(hypotheses=[list(p) + list(t)]) for p, t in zip(prefixes, tokens)]


@pytest.fixture(autouse=True)
def fake_translator(monkeypatch):
    monkeypatch.setattr(ctranslate2, "Translator", EchoTranslator)
    tr._loaded.clear()
    yield
    tr._loaded.clear()


def make_pack(tmp_path, sp_model: bytes, src: str, dst: str, prefix: str = "", top: bool = True, extra: dict | None = None):
    path = tmp_path / f"translate-{src}_{dst}.argosmodel"
    base = f"translate-{src}_{dst}-1_1/" if top else ""
    meta = {"package_version": "1.1", "from_code": src, "to_code": dst}
    if prefix:
        meta["target_prefix"] = prefix
    with zipfile.ZipFile(path, "w") as z:
        z.writestr(base + "metadata.json", json.dumps(meta))
        z.writestr(base + "sentencepiece.model", sp_model)
        z.writestr(base + "model/model.bin", b"fake")
        z.writestr(base + "stanza/ko/tokenize.pt", b"big")
        for name, data in (extra or {}).items():
            z.writestr(name, data)
    return path


def test_install_archive_unpacks_and_drops_stanza(tmp_path, sp_model):
    dest = tr.install_archive(make_pack(tmp_path, sp_model, "ko", "en"), "ko", "en")
    assert dest == tr.packs_dir() / "ko_en"
    assert (dest / "model" / "model.bin").exists() and not (dest / "stanza").exists()
    assert tr.installed_packs() == {("ko", "en"): dest}
    # 최상위 폴더 없이 묶인 언어팩도 받는다
    tr.install_archive(make_pack(tmp_path, sp_model, "en", "ja", top=False), "en", "ja")
    assert set(tr.installed_packs()) == {("ko", "en"), ("en", "ja")}
    assert not list(tr.packs_dir().glob(".unpack-*"))


def test_install_archive_rejects_bad_files(tmp_path, sp_model):
    evil = make_pack(tmp_path, sp_model, "ko", "en", extra={"../../evil.txt": "x"})
    with pytest.raises(AppError):
        tr.install_archive(evil, "ko", "en")
    assert not (tr.packs_dir().parent.parent / "evil.txt").exists()
    broken = tmp_path / "broken.argosmodel"
    broken.write_bytes(b"not a zip")
    with pytest.raises(AppError):
        tr.install_archive(broken, "ko", "en")
    assert tr.installed_packs() == {}


def test_split_for_translation():
    assert tr.split_for_translation("Hi there. It is 3.5 km! OK?") == ["Hi there.", "It is 3.5 km!", "OK?"]
    assert tr.split_for_translation("会議は明日です。資料も確認しました。") == ["会議は明日です。", "資料も確認しました。"]
    assert tr.split_for_translation("   ") == []


def test_translate_keeps_lines_and_strips_prefix(tmp_path, sp_model):
    tr.install_archive(make_pack(tmp_path, sp_model, "ko", "en", prefix="__en__"), "ko", "en")
    text = "안녕하세요. 반갑습니다.\n\n견적서를 금요일까지 보내 주세요."
    res = tr.translate(text, "ko", "en")
    assert res["engine"] == "argos" and res["route"] == [("ko", "en")]
    assert res["text"] == text  # 가짜 번역기라 원문이 그대로 나와야 한다 (접두어는 떼고)


def test_translate_goes_through_english(tmp_path, sp_model):
    tr.install_archive(make_pack(tmp_path, sp_model, "ko", "en"), "ko", "en")
    tr.install_archive(make_pack(tmp_path, sp_model, "en", "ja"), "en", "ja")
    res = tr.translate("안녕하세요. 반갑습니다.", "ko", "ja")
    assert res["route"] == [("ko", "en"), ("en", "ja")]
    assert res["text"] == "안녕하세요.반갑습니다."  # 일본어는 문장을 띄우지 않고 잇는다


def test_missing_pack_asks_for_download(client):
    r = client.post("/translate", json={"text": "안녕하세요", "source": "ko", "target": "zh"})
    assert r.status_code == 424
    assert r.json()["component"] == "translate_pack" and "언어팩" in r.json()["error"]
    with pytest.raises(FeatureUnavailable):
        tr.translate("안녕하세요", "ko", "zh")
    s = client.get("/translate/status").json()
    assert s["available"] is True and s["installed"] == []
    assert client.post("/translate/install", json={"source": "ko", "target": "ko"}).status_code == 400


def test_install_pair_downloads_missing_legs(tmp_path, sp_model, monkeypatch, app, wait_job, client):
    packs = {pair: make_pack(tmp_path, sp_model, *pair).read_bytes() for pair in [("ko", "en"), ("en", "ja")]}
    index = [
        {"from_code": a, "to_code": b, "links": [f"https://example.invalid/{a}_{b}.argosmodel", "ipfs://x"]} for a, b in packs
    ]
    fetched = []

    class Resp(io.BytesIO):
        def __init__(self, body):
            super().__init__(body)
            self.headers = {"Content-Length": str(len(body))}

    def urlopen(req, timeout=0):
        url = req.full_url
        fetched.append(url)
        if url == tr.INDEX_URL:
            return Resp(json.dumps(index).encode())
        a, b = url.rsplit("/", 1)[1].split(".")[0].split("_")
        return Resp(packs[(a, b)])

    monkeypatch.setattr(tr, "urlopen", urlopen)
    job = wait_job(client.post("/translate/install", json={"source": "ko", "target": "ja"}).json())
    assert job["status"] == "done", job
    assert job["result"]["installed"] == ["en-ja", "ko-en"]
    assert fetched == [tr.INDEX_URL, "https://example.invalid/ko_en.argosmodel", "https://example.invalid/en_ja.argosmodel"]
    assert client.post("/translate", json={"text": "안녕하세요.", "source": "ko", "target": "ja"}).json()["text"] == "안녕하세요."

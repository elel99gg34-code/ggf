from __future__ import annotations

import subprocess
from pathlib import Path

import pytest
from PIL import Image, ImageDraw

from conftest import needs_ffmpeg, needs_ocr


# --- 이름 일괄 변경 ---
def test_rename_plan_apply_undo(client, tmp_path):
    files = []
    for name in ["사진 10.jpg", "사진 2.jpg", "사진 1.jpg"]:
        p = tmp_path / name
        p.write_bytes(b"x")
        files.append(str(p))
    rules = {"template": "여행_{n:03}", "spaces": "underscore"}
    items = client.post("/rename/plan", json={"paths": files, "rules": rules}).json()["items"]
    # 자연 정렬: 1, 2, 10
    assert [Path(i["src"]).name for i in items] == ["사진 1.jpg", "사진 2.jpg", "사진 10.jpg"]
    assert [Path(i["dst"]).name for i in items] == ["여행_001.jpg", "여행_002.jpg", "여행_003.jpg"]
    op = client.post("/rename/apply", json={"items": items}).json()
    assert op["renamed"] == 3 and (tmp_path / "여행_003.jpg").exists()
    assert client.post(f"/rename/undo/{op['op_id']}").json()["restored"] == 3
    assert (tmp_path / "사진 10.jpg").exists()


def test_rename_swap_and_conflicts(client, tmp_path):
    a, b = tmp_path / "a.txt", tmp_path / "b.txt"
    a.write_text("A")
    b.write_text("B")
    items = [{"src": str(a), "dst": str(b)}, {"src": str(b), "dst": str(a)}]
    client.post("/rename/apply", json={"items": items})
    assert a.read_text() == "B" and b.read_text() == "A"
    plan = client.post("/rename/plan", json={"paths": [str(a), str(b)], "rules": {"template": "같은이름"}}).json()["items"]
    assert all(i["conflict"] for i in plan)
    assert client.post("/rename/apply", json={"items": plan}).status_code == 400


def test_rename_find_replace_regex(client, tmp_path):
    p = tmp_path / "IMG_2024_0001.JPG"
    p.write_bytes(b"x")
    items = client.post("/rename/plan", json={"paths": [str(p)], "rules": {"find": r"IMG_(\d+)_", "replace": r"\1-", "regex": True, "case": "lower"}}).json()["items"]
    assert Path(items[0]["dst"]).name == "2024-0001.JPG"


# --- 중복 정리 ---
def test_dedupe_exact_and_quarantine(client, tmp_path, wait_job):
    (tmp_path / "sub").mkdir()
    for p in ["a.bin", "sub/a 복사본.bin", "c.bin"]:
        (tmp_path / p).write_bytes(b"same content" * 1000)
    (tmp_path / "d.bin").write_bytes(b"same content" * 999 + b"different!!!")
    job = wait_job(client.post("/dedupe/scan", json={"dirs": [str(tmp_path)]}).json())
    groups = job["result"]["groups"]
    assert len(groups) == 1 and len(groups[0]["files"]) == 3
    dupes = [f["path"] for f in groups[0]["files"][1:]]
    q = client.post("/dedupe/quarantine", json={"paths": dupes}).json()
    assert q["moved"] == 2 and not Path(dupes[0]).exists()
    assert client.post(f"/dedupe/restore/{q['op_id']}").json()["restored"] == 2
    assert Path(dupes[0]).exists()


def test_dedupe_similar_images(client, tmp_path, wait_job):
    img = Image.new("RGB", (400, 300), "white")
    d = ImageDraw.Draw(img)
    d.rectangle((50, 50, 200, 250), fill="navy")
    d.ellipse((220, 40, 380, 200), fill="orange")
    img.save(tmp_path / "원본.jpg", quality=95)
    img.resize((200, 150)).save(tmp_path / "작게.jpg", quality=60)
    Image.new("RGB", (400, 300), "green").save(tmp_path / "다른사진.jpg")
    job = wait_job(client.post("/dedupe/scan", json={"dirs": [str(tmp_path)], "mode": "similar"}).json())
    groups = job["result"]["groups"]
    assert len(groups) == 1
    assert {Path(f["path"]).name for f in groups[0]["files"]} == {"원본.jpg", "작게.jpg"}


# --- PDF 도구 ---
def _pdf(path: Path, pages: int):
    imgs = [Image.new("RGB", (600, 800), (i * 40 % 255, 100, 150)) for i in range(pages)]
    imgs[0].save(path, "PDF", save_all=True, append_images=imgs[1:])


def test_pdf_merge_split_rotate_compress(client, tmp_path):
    a, b = tmp_path / "a.pdf", tmp_path / "b.pdf"
    _pdf(a, 3)
    _pdf(b, 2)
    m = client.post("/pdf/merge", json={"paths": [str(a), str(b)]}).json()
    assert m["pages"] == 5
    s = client.post("/pdf/split", json={"path": m["dst"], "ranges": "1-2, 3, 4-"}).json()
    assert [client.post("/pdf/info", json={"path": p}).json()["pages"] for p in s["outputs"]] == [2, 1, 2]
    assert client.post("/pdf/split", json={"path": m["dst"], "ranges": "4-9"}).status_code == 400
    r = client.post("/pdf/rotate", json={"path": str(a), "degrees": 90, "pages": "2"}).json()
    assert r["rotated"] == 1
    from pypdf import PdfReader

    assert [p.rotation for p in PdfReader(r["dst"]).pages] == [0, 90, 0]
    c = client.post("/pdf/compress", json={"path": m["dst"], "quality": 40}).json()
    assert c["after"] > 0 and c["images"] == 5


def test_images_pdf_roundtrip(client, tmp_path):
    imgs = []
    for i in range(3):
        p = tmp_path / f"{i}.png"
        Image.new("RGB", (300, 200), "red").save(p)
        imgs.append(str(p))
    r = client.post("/pdf/from-images", json={"paths": imgs, "page": "a4"}).json()
    assert r["pages"] == 3
    out = client.post("/pdf/to-images", json={"path": r["dst"], "dpi": 50}).json()["outputs"]
    assert len(out) == 3 and Image.open(out[0]).size[0] > 0


# --- 이미지 일괄 처리 ---
def test_image_presets_and_watermark(client, tmp_path, wait_job, korean_font):
    src = tmp_path / "상품.png"
    Image.new("RGBA", (1200, 800), (200, 30, 30, 255)).save(src)
    job = wait_job(client.post("/media/images", json={"paths": [str(src)], "preset": "smartstore_main", "watermark": {"text": "로컬샵", "position": "center", "opacity": 0.8, "color": "#ffffff"}}).json())
    assert job["status"] == "done", job
    dst = Path(job["result"]["results"][0]["dst"])
    out = Image.open(dst)
    assert dst.suffix == ".jpg" and out.size == (1000, 1000)
    assert out.getpixel((500, 50)) == (255, 255, 255)  # 위아래 흰 여백 (pad)
    center = out.crop((380, 450, 620, 550)).convert("L")
    assert max(center.get_flattened_data() if hasattr(center, "get_flattened_data") else center.getdata()) > 200  # 워터마크 글자
    job = wait_job(client.post("/media/images", json={"paths": [str(tmp_path)], "preset": "detail_860", "format": "webp", "suffix": "_상세"}).json())
    sizes = {Image.open(r["dst"]).size for r in job["result"]["results"]}
    assert (860, 573) in sizes


# --- 영상 무음 컷 ---
def _tone_with_gaps(path: Path):
    # 1초 소리 - 2초 무음 - 1초 소리 - 1.5초 무음 - 1초 소리
    parts = "sine=f=440:d=1[a];anullsrc=r=44100:cl=mono,atrim=0:2[b];sine=f=440:d=1[c];anullsrc=r=44100:cl=mono,atrim=0:1.5[d];sine=f=440:d=1[e];[a][b][c][d][e]concat=n=5:v=0:a=1"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-filter_complex", parts, "-ar", "44100", str(path)], check=True)


@needs_ffmpeg
def test_silence_detect_and_cut(client, tmp_path, wait_job):
    src = tmp_path / "녹음.wav"
    _tone_with_gaps(src)
    r = client.post("/media/silence/detect", json={"path": str(src), "pad": 0.1}).json()
    assert len(r["silences"]) == 2 and r["duration"] == pytest.approx(6.5, abs=0.1)
    assert r["result"] == pytest.approx(3.4, abs=0.25)
    job = wait_job(client.post("/media/silence/cut", json={"path": str(src), "pad": 0.1}).json())
    assert job["status"] == "done", job
    from localbiseo.modules.media import probe

    assert probe(job["result"]["dst"])["duration"] == pytest.approx(3.4, abs=0.3)


@needs_ffmpeg
def test_silence_cut_video(client, tmp_path, wait_job):
    audio = tmp_path / "a.wav"
    _tone_with_gaps(audio)
    video = tmp_path / "영상.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=blue:s=160x120:r=15:d=6.5", "-i", str(audio), "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(video)], check=True)
    job = wait_job(client.post("/media/silence/cut", json={"path": str(video), "pad": 0.1}).json(), timeout=120)
    assert job["status"] == "done", job
    from localbiseo.modules.media import probe

    info = probe(job["result"]["dst"])
    assert info["has_video"] and info["duration"] == pytest.approx(3.4, abs=0.4)


# --- OCR ---
def _text_image(path: Path, font: str, lines: list[str]):
    from PIL import ImageFont

    f = ImageFont.truetype(font, 34)
    img = Image.new("RGB", (900, 70 * len(lines) + 40), "white")
    d = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        d.text((30, 30 + i * 70), line, font=f, fill="black")
    img.save(path)


@needs_ocr
def test_screen_ocr_and_image_masking(client, tmp_path, korean_font):
    src = tmp_path / "캡처.png"
    _text_image(src, korean_font, ["회의 자료 공유 부탁드립니다", "연락처 010-1234-5678"])
    r = client.post("/ocr/image", json={"path": str(src)}).json()
    assert "010-1234-5678" in r["text"].replace(" ", "")
    from localbiseo.modules.masking.files import mask_file

    res = mask_file(src, ["phone"], "partial", faces=False)
    assert res["by_kind"].get("phone") == 1
    again = client.post("/ocr/image", json={"path": res["dst"]}).json()["text"]
    assert "5678" not in again


@needs_ocr
def test_receipt_from_image(client, tmp_path, korean_font):
    src = tmp_path / "영수증.png"
    _text_image(src, korean_font, ["김밥천국 역삼점", "2026-10-20 12:31", "합계금액 14,000원"])
    f = client.post("/receipts/parse", json={"path": str(src)}).json()["fields"]
    assert f["amount"] == 14000 and f["date"] == "2026-10-20" and f["category"] == "식비"


@needs_ocr
def test_screen_ocr_selection_keeps_numbers_and_spacing(client, tmp_path, korean_font):
    from PIL import ImageFont

    src = tmp_path / "공지.png"
    img = Image.new("RGB", (1400, 820), (246, 247, 249))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 1400, 70), fill=(52, 58, 72))
    f = ImageFont.truetype(korean_font, 30)
    for i, line in enumerate(["점검 일시: 11월 3일(화) 오후 2시 ~ 4시", "문의: 정보보안팀 (내선 1234)"]):
        d.text((80, 220 + i * 62), line, font=f, fill=(40, 46, 60))
    img.save(src)
    text = client.post("/ocr/image", json={"path": str(src), "crop": [56, 180, 994, 200]}).json()["text"]
    assert "11월 3일(화) 오후 2시 ~ 4시" in text
    assert "정보보안팀 (내선 1234)" in text


@needs_ocr
def test_image_masking_survives_opencv_without_haar(tmp_path, korean_font, monkeypatch):
    """OpenCV 5.x에는 CascadeClassifier가 없다. 그래도 글자 마스킹은 끝까지 돼야 한다."""
    import sys
    import types

    from localbiseo.core import optional
    from localbiseo.modules.masking.files import mask_file

    monkeypatch.setitem(sys.modules, "cv2", types.SimpleNamespace(__version__="5.0.0"))
    real = optional.available
    monkeypatch.setattr(optional, "available", lambda key: True if key == "face" else real(key))
    src = tmp_path / "송장.png"
    _text_image(src, korean_font, ["받는 분 연락처 010-5555-7777"])
    res = mask_file(src, None, "partial", faces=True)
    assert res["by_kind"] == {"phone": 1}
    assert "얼굴 검출기가 없어" in res["note"]


@needs_ffmpeg
def test_load_audio_uses_ffmpeg(tmp_path):
    """faster-whisper 내장 디코더(PyAV)에 기대지 않고 16kHz 모노로 푼다."""
    pytest.importorskip("numpy")
    from localbiseo.modules.transcribe.stt import SAMPLE_RATE, load_audio

    src = tmp_path / "녹음.mp3"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=f=300:d=2", "-ac", "2", "-ar", "44100", str(src)], check=True)
    audio = load_audio(str(src))
    assert audio.dtype.name == "float32"
    assert abs(len(audio) - 2 * SAMPLE_RATE) < SAMPLE_RATE * 0.1
    assert 0.05 < float(abs(audio).max()) <= 1.0


def test_load_audio_reports_broken_file(tmp_path):
    import shutil as _sh

    pytest.importorskip("numpy")
    from localbiseo.core.errors import AppError
    from localbiseo.modules.transcribe.stt import load_audio

    if not _sh.which("ffmpeg"):
        pytest.skip("ffmpeg 없음")
    bad = tmp_path / "깨진파일.m4a"
    bad.write_bytes(b"not audio")
    with pytest.raises(AppError):
        load_audio(str(bad))


def test_image_enhance_and_new_presets(client, tmp_path, wait_job):
    src = tmp_path / "어두운사진.jpg"
    Image.new("RGB", (1600, 1000), (60, 55, 50)).save(src)
    ImageDraw.Draw(img := Image.open(src)).rectangle((400, 300, 1200, 700), fill=(90, 80, 75))
    img.save(src)
    job = wait_job(client.post("/media/images", json={"paths": [str(src)], "preset": "youtube_thumb", "enhance": True}).json())
    assert job["status"] == "done", job
    out = Image.open(job["result"]["results"][0]["dst"]).convert("L")
    assert out.size == (1280, 720)
    lo, hi = out.getextrema()
    assert hi - lo > 150  # 흐릿한 대비가 넓게 펴졌다
    keys = {p["key"] for p in client.get("/media/presets").json()["presets"]}
    assert {"youtube_thumb", "blog_966", "delivery_menu", "kakao_profile"} <= keys

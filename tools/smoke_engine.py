"""설치 파일에 넣을 엔진(PyInstaller로 묶은 실행 파일)이 기능을 실제로 돌리는지 확인한다.

/health만 보면 묶을 때 빠진 라이브러리를 못 잡는다. 번역·받아쓰기·이미지 가리기를
한 번씩 돌려 본다. 언어팩과 음성 모델을 내려받으므로 인터넷이 필요하다. (CI용, 표준 라이브러리만 씀)

    python tools/smoke_engine.py http://127.0.0.1:8799 [--need-ocr]
"""
from __future__ import annotations

import argparse
import json
import math
import struct
import sys
import tempfile
import time
import wave
import zlib
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

REQUIRED = ["stt", "face", "rembg", "translate"]


def call(base: str, method: str, path: str, body: dict | None = None) -> tuple[int, dict]:
    data = json.dumps(body).encode() if body is not None else None
    req = Request(base + path, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=120) as r:
            return r.status, json.load(r)
    except HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def wait_job(base: str, ref: dict, timeout: float = 900) -> dict:
    end = time.time() + timeout
    while time.time() < end:
        _, job = call(base, "GET", f"/jobs/{ref['job_id']}")
        if job["status"] in ("done", "error", "cancelled"):
            return job
        time.sleep(1)
    return {"status": "timeout", "error": f"{timeout:.0f}초 안에 끝나지 않음"}


def write_png(path: Path, w: int = 160, h: int = 120) -> None:
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + b"\xff\xff\xff" * w for _ in range(h))
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def write_wav(path: Path, seconds: float = 2.0, rate: int = 16000) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"".join(struct.pack("<h", int(8000 * math.sin(2 * math.pi * 440 * i / rate))) for i in range(int(seconds * rate))))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("base")
    ap.add_argument("--need-ocr", action="store_true", help="OCR(Tesseract)이 설치 파일에 들어 있어야 함")
    args = ap.parse_args()
    base = args.base.rstrip("/")
    failures: list[str] = []

    def check(ok: bool, label: str, detail: object = "") -> None:
        print(f"[{'OK' if ok else 'FAIL'}] {label} {detail}", flush=True)
        if not ok:
            failures.append(label)

    _, st = call(base, "GET", "/system/status")
    comps = {c["key"]: c["available"] for c in st["components"]}
    print("구성요소:", comps, "| ffmpeg:", st["ffmpeg"], "| OCR:", st["ocr_backend"], "| 글꼴:", st["korean_font"], flush=True)
    for key in REQUIRED + (["ocr"] if args.need_ocr else []):
        check(comps.get(key, False), f"구성요소 {key}")
    check(st["ffmpeg"], "ffmpeg")

    work = Path(tempfile.mkdtemp(prefix="lb-smoke-"))

    # 번역: 언어팩을 받고 CTranslate2 + SentencePiece로 돌린다.
    code, ref = call(base, "POST", "/translate/install", {"source": "ko", "target": "en"})
    job = wait_job(base, ref) if code == 200 else {"status": code, "error": ref}
    check(job["status"] == "done", "번역 언어팩 설치", job.get("error") or "")
    if job["status"] == "done":
        code, res = call(base, "POST", "/translate", {"text": "회의는 내일 오후에 시작합니다.", "source": "ko", "target": "en"})
        check(code == 200 and any(c.isascii() and c.isalpha() for c in res.get("text", "")), "번역", res.get("text") or res)

    # 받아쓰기: 가장 작은 모델로 faster-whisper와 오디오 디코딩(ffmpeg)을 돌린다.
    code, ref = call(base, "POST", "/transcribe/models/download", {"size": "base"})
    job = wait_job(base, ref) if code == 200 else {"status": code, "error": ref}
    check(job["status"] == "done", "음성 모델 받기", job.get("error") or "")
    if job["status"] == "done":
        wav = work / "삐소리.wav"
        write_wav(wav)
        code, ref = call(base, "POST", "/transcribe", {"path": str(wav), "model": "base", "title": "점검"})
        job = wait_job(base, ref) if code == 200 else {"status": code, "error": ref}
        check(job["status"] == "done", "받아쓰기", job.get("error") or "")

    # 이미지 가리기: OpenCV 얼굴 검출기와 OCR을 부른다.
    png = work / "빈그림.png"
    write_png(png)
    code, ref = call(base, "POST", "/mask/files", {"paths": [str(png)], "out_dir": str(work / "out")})
    job = wait_job(base, ref) if code == 200 else {"status": code, "error": ref}
    result = ((job.get("result") or {}).get("results") or [{}])[0]
    note = result.get("note", "")
    check(job["status"] == "done" and "error" not in result, "이미지 가리기", result.get("error") or job.get("error") or "")
    check("얼굴" not in note, "얼굴 검출기", note)
    if args.need_ocr:
        check("OCR" not in note, "OCR", note)

    print(f"\n실패 {len(failures)}개: {', '.join(failures)}" if failures else "\n모두 통과", flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

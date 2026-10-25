"""엔진을 실행 파일 하나로 묶어 Tauri 사이드카 자리에 둔다.

  python tools/build_engine.py                    # 현재 PC용
  python tools/build_engine.py --ffmpeg C:/ffmpeg/bin/ffmpeg.exe --tesseract "C:/Program Files/Tesseract-OCR"

결과:
  app/src-tauri/resources/engine/localbiseo-engine[.exe] (+ _internal 폴더)
  app/src-tauri/resources/tools/ffmpeg/…, tools/tesseract/… (넘긴 경우)

한 파일(onefile)로 묶으면 실행할 때마다 수백 MB를 임시 폴더에 풀어서 느리다.
그래서 폴더째(onedir) 앱 리소스로 넣는다.

미리 설치할 것: pip install "./engine[stt,ocr,rembg,face,translate,ffmpeg]" pyinstaller
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENGINE = ROOT / "engine"
TAURI = ROOT / "app" / "src-tauri"
FONT_CANDIDATES = [
    Path(r"C:\Windows\Fonts\NanumGothic.ttf"),
    Path("/usr/share/fonts/truetype/nanum/NanumGothic.ttf"),
    Path("/Library/Fonts/NanumGothic.ttf"),
]

# 동적으로 불러와서 PyInstaller가 놓치는 모듈
HIDDEN = [
    "uvicorn.logging", "uvicorn.loops.auto", "uvicorn.protocols.http.auto", "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan.on", "pypdfium2", "pypdfium2_raw", "olefile", "openpyxl", "docx",
]
COLLECT = ["faster_whisper", "ctranslate2", "sentencepiece", "rembg", "pytesseract", "cv2", "pypdfium2", "pypdfium2_raw", "docx", "imageio_ffmpeg"]


def target_triple() -> str:
    out = subprocess.run(["rustc", "-vV"], capture_output=True, text=True, check=True).stdout
    return next(line.split(": ", 1)[1] for line in out.splitlines() if line.startswith("host: "))


def installed(mod: str) -> bool:
    import importlib.util

    return importlib.util.find_spec(mod) is not None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", help="Rust target triple (기본: 현재 PC)")
    ap.add_argument("--ffmpeg", help="함께 넣을 ffmpeg 실행 파일 (LGPL 빌드 권장)")
    ap.add_argument("--tesseract", help="함께 넣을 Tesseract 설치 폴더 (kor.traineddata 포함)")
    ap.add_argument("--font", help="워터마크용 한글 글꼴 (기본: 나눔고딕을 찾아서 넣음)")
    args = ap.parse_args()

    triple = args.target or target_triple()
    ext = ".exe" if "windows" in triple else ""
    work = ROOT / "engine" / "build"
    sep = ";" if sys.platform == "win32" else ":"

    cmd = [
        sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--onedir",
        "--name", "localbiseo-engine",
        "--distpath", str(work / "dist"), "--workpath", str(work / "work"), "--specpath", str(work),
        "--add-data", f"{ENGINE / 'localbiseo' / 'core' / 'license_pubkey.pem'}{sep}localbiseo/core",
    ]
    font = Path(args.font) if args.font else next((f for f in FONT_CANDIDATES if f.exists()), None)
    if font:
        cmd += ["--add-data", f"{font}{sep}fonts"]
    for h in HIDDEN:
        cmd += ["--hidden-import", h]
    for c in COLLECT:
        if installed(c):
            cmd += ["--collect-all", c]
    if sys.platform != "win32":
        cmd += ["--strip"]
    cmd.append(str(ENGINE / "run_engine.py"))
    print(" ".join(cmd))
    subprocess.run(cmd, check=True, cwd=ENGINE)

    engine_dst = TAURI / "resources" / "engine"
    if engine_dst.exists():
        shutil.rmtree(engine_dst)
    shutil.copytree(work / "dist" / "localbiseo-engine", engine_dst)
    print(f"엔진: {engine_dst} ({triple})")

    tools = TAURI / "resources" / "tools"
    tools.mkdir(parents=True, exist_ok=True)
    (tools / "README.txt").write_text("로컬비서가 쓰는 외부 도구(ffmpeg, tesseract)가 이 폴더에 들어갑니다.\n", encoding="utf-8")
    if args.ffmpeg:
        (tools / "ffmpeg").mkdir(exist_ok=True)
        shutil.copy2(args.ffmpeg, tools / "ffmpeg" / f"ffmpeg{ext}")
        print("ffmpeg 포함")
    if args.tesseract:
        target = tools / "tesseract"
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(args.tesseract, target, ignore=shutil.ignore_patterns("*.html", "doc", "uninstall*"))
        print("tesseract 포함")


if __name__ == "__main__":
    main()

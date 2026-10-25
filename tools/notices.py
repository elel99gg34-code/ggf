"""설치 파일에 넣을 오픈소스 고지문(THIRD_PARTY_NOTICES.txt)을 만든다.

  python tools/notices.py            # 엔진을 묶은 그 파이썬 환경에서 실행
결과: app/src-tauri/resources/THIRD_PARTY_NOTICES.txt

- Python: 지금 환경에 설치된 패키지 (엔진에 같이 묶이는 것들)
- JavaScript: app의 배포 의존성 (npm ls --omit=dev)
- Rust: 데스크톱 셸 의존성 (cargo metadata)
- 함께 넣는 외부 도구: FFmpeg, Tesseract, 글꼴
"""
from __future__ import annotations

import json
import subprocess
import sys
from importlib import metadata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
TAURI = APP / "src-tauri"
OUT = TAURI / "resources" / "THIRD_PARTY_NOTICES.txt"
LICENSE_NAMES = ("LICENSE", "LICENCE", "COPYING", "NOTICE", "AUTHORS")
SKIP_PY = {"pip", "setuptools", "wheel", "pyinstaller", "pyinstaller-hooks-contrib", "pytest", "localbiseo-engine", "altgraph", "pefile", "macholib", "pywin32-ctypes"}

BUNDLED_TOOLS = """\
FFmpeg (Windows 설치 파일에 포함)
  라이선스: GNU LGPL 2.1 이상 (LGPL 빌드, https://github.com/BtbN/FFmpeg-Builds)
  소스 코드: https://ffmpeg.org/download.html
  FFmpeg는 별도 실행 파일로 들어 있으며, 같은 버전의 다른 LGPL 빌드로 바꿔 쓸 수 있습니다.

Tesseract OCR과 한국어 학습 데이터 (Windows 설치 파일에 포함)
  라이선스: Apache License 2.0
  소스 코드: https://github.com/tesseract-ocr/tesseract , https://github.com/tesseract-ocr/tessdata_fast

나눔고딕 (워터마크 글꼴)
  라이선스: SIL Open Font License 1.1 (https://help.naver.com/service/30016/contents/18088)

처음 사용할 때 내려받는 AI 모델 (설치 파일에는 들어 있지 않음)
  Whisper (faster-whisper 변환본, Systran): MIT License
  U²-Net (rembg 배경 제거): Apache License 2.0
"""


def license_texts(paths: list[Path], limit: int = 40_000) -> str:
    chunks = []
    for p in paths:
        try:
            text = p.read_text(encoding="utf-8", errors="replace").strip()
        except OSError:
            continue
        if text and text not in chunks:
            chunks.append(text[:limit])
    return "\n\n".join(chunks)


def python_section() -> list[str]:
    out = []
    seen = set()
    for dist in sorted(metadata.distributions(), key=lambda d: (d.metadata["Name"] or "").lower()):
        name = dist.metadata["Name"] or ""
        if not name or name.lower() in seen or name.lower() in SKIP_PY:
            continue
        seen.add(name.lower())
        lic = dist.metadata.get("License-Expression") or dist.metadata.get("License") or ""
        if len(lic) > 120 or not lic:
            classifiers = [c.split("::")[-1].strip() for c in dist.metadata.get_all("Classifier") or [] if c.startswith("License ::")]
            lic = ", ".join(classifiers) or lic[:120]
        files = [Path(dist.locate_file(f)) for f in (dist.files or []) if Path(str(f)).name.upper().startswith(LICENSE_NAMES)]
        out.append(f"{name} {dist.version}\n  라이선스: {lic or '패키지 정보 참고'}\n\n{license_texts(files)}")
    return out


def npm_section() -> list[str]:
    try:
        raw = subprocess.run(["npm", "ls", "--omit=dev", "--all", "--json"], cwd=APP, capture_output=True, text=True, shell=sys.platform == "win32").stdout
        tree = json.loads(raw or "{}")
    except (OSError, json.JSONDecodeError):
        return []
    found: dict[str, str] = {}

    def walk(deps: dict) -> None:
        for name, info in (deps or {}).items():
            key = f"{name}@{info.get('version', '')}"
            if key not in found:
                found[key] = name
                walk(info.get("dependencies", {}))

    walk(tree.get("dependencies", {}))
    out = []
    for key, name in sorted(found.items()):
        pkg_dir = APP / "node_modules" / name
        try:
            pkg = json.loads((pkg_dir / "package.json").read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        files = [p for p in pkg_dir.iterdir() if p.is_file() and p.name.upper().startswith(LICENSE_NAMES)]
        out.append(f"{key}\n  라이선스: {pkg.get('license', '패키지 정보 참고')}\n\n{license_texts(files)}")
    return out


def cargo_section() -> list[str]:
    try:
        raw = subprocess.run(["cargo", "metadata", "--format-version", "1", "--locked"], cwd=TAURI, capture_output=True, text=True).stdout
        meta = json.loads(raw)
    except (OSError, json.JSONDecodeError):
        return []
    resolved = {n["id"] for n in (meta.get("resolve") or {}).get("nodes", [])}
    out = []
    for pkg in sorted(meta["packages"], key=lambda p: p["name"]):
        if pkg["id"] not in resolved or pkg.get("source") is None:
            continue
        d = Path(pkg["manifest_path"]).parent
        files = [p for p in d.iterdir() if p.is_file() and p.name.upper().startswith(LICENSE_NAMES)]
        # 같은 라이선스 본문이 수백 번 반복되지 않도록 Rust 쪽은 첫 파일만 넣는다.
        out.append(f"{pkg['name']} {pkg['version']}\n  라이선스: {pkg.get('license') or pkg.get('license_file') or '패키지 정보 참고'}\n\n{license_texts(files[:1], 12_000)}")
    return out


def main() -> None:
    sections = [
        ("함께 들어 있는 외부 도구와 글꼴", [BUNDLED_TOOLS]),
        ("엔진 (Python 패키지)", python_section()),
        ("화면 (JavaScript 패키지)", npm_section()),
        ("데스크톱 셸 (Rust 패키지)", cargo_section()),
    ]
    rule = "=" * 78
    parts = [
        "로컬비서 오픈소스 고지 (THIRD PARTY NOTICES)",
        "",
        "로컬비서는 아래 오픈소스 소프트웨어를 사용합니다. 각 소프트웨어의 저작권은 원저작자에게 있으며,",
        "각자의 라이선스 조건에 따라 사용합니다.",
        "",
    ]
    for title, items in sections:
        parts += [rule, f"■ {title} ({len(items)}개)", rule, ""]
        for item in items:
            parts += [item.strip(), "", "-" * 78, ""]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(parts), encoding="utf-8")
    counts = ", ".join(f"{t}: {len(i)}" for t, i in sections)
    print(f"{OUT} ({OUT.stat().st_size // 1024} KB) — {counts}")


if __name__ == "__main__":
    main()

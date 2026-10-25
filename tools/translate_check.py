"""실제 Argos 언어팩을 내려받아 번역이 되는지 확인한다. (인터넷 필요, CI에서 돌림)

    python tools/translate_check.py
"""
from __future__ import annotations

import re
import sys
import time

from localbiseo.modules import translate as tr

SAMPLES = {
    ("ko", "en"): "다음 주 화요일까지 견적서를 보내 주세요. 회의는 3시에 시작합니다.",
    ("en", "ko"): "Please send the quote by next Tuesday. The meeting starts at three.",
    ("en", "ja"): "Thank you for your order. We will ship it tomorrow.",
    ("en", "zh"): "The file has been saved to your computer.",
    ("ko", "ja"): "내일 오전에 자료를 공유하겠습니다.",
}
SCRIPT = {"en": r"[A-Za-z]{3}", "ko": r"[가-힣]{2}", "ja": r"[぀-ヿ一-鿿]{2}", "zh": r"[一-鿿]{2}"}


class PrintJob:
    def progress(self, value: float, message: str | None = None) -> None:
        if message and not message.endswith("MB"):  # 내려받기 진행은 생략
            print(f"  {value:4.0%} {message}", flush=True)

    def check(self) -> None:
        pass


def main() -> int:
    for a, b in [("ko", "en"), ("en", "ko"), ("en", "ja"), ("en", "zh")]:
        t = time.time()
        tr.install_pair(PrintJob(), a, b)
        size = sum(f.stat().st_size for f in (tr.packs_dir() / f"{a}_{b}").rglob("*") if f.is_file())
        print(f"{a}->{b} 설치 {time.time() - t:.1f}s, 풀린 크기 {size / 1e6:.0f}MB", flush=True)
    failed = 0
    for (a, b), text in SAMPLES.items():
        t = time.time()
        res = tr.translate(text, a, b)
        ok = bool(re.search(SCRIPT[b], res["text"])) and res["text"].strip() != text
        failed += not ok
        print(f"[{'OK' if ok else 'FAIL'}] {a}->{b} ({time.time() - t:.1f}s, {res['route']})\n  {text}\n  => {res['text']}", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

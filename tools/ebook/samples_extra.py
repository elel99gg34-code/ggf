"""설명서 화면용 예시 파일 (영수증·명함 사진, 중복 사진 폴더). make_samples.py 다음에 돌린다.

    python tools/ebook/samples_extra.py <예시 폴더>
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/nanum/NanumGothic.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf"


def paper(path: Path, lines: list[tuple[str, int, bool]], size=(700, 900)) -> None:
    img = Image.new("RGB", size, "white")
    d = ImageDraw.Draw(img)
    y = 50
    for text, px, bold in lines:
        d.text((50, y), text, fill="black", font=ImageFont.truetype(FONT_BOLD if bold else FONT, px))
        y += int(px * 1.9)
    img.save(path)


out = Path(sys.argv[1])
paper(out / "영수증.png", [
    ("카페 로컬 강남점", 40, True), ("사업자번호 123-45-67890", 26, False), ("서울특별시 강남구 테헤란로 123", 26, False),
    ("2026-10-21 14:32", 26, False), ("아메리카노 2  9,000", 28, False), ("치즈케이크 1  6,500", 28, False), ("합계 15,500원", 36, True),
])
paper(out / "명함.png", [
    ("김민수", 44, True), ("마케팅팀 대리", 28, False), ("주식회사 로컬상회", 30, True), ("휴대폰 010-2345-6789", 26, False),
    ("전화 02-555-1234", 26, False), ("minsu.kim@localshop.co.kr", 26, False), ("서울특별시 마포구 월드컵북로 21", 24, False),
], size=(900, 560))
dup = out / "사진정리"
dup.mkdir(exist_ok=True)
for i, src in enumerate(sorted((out / "상품사진").glob("*"))):
    shutil.copy(src, dup / src.name)
    if i == 0:
        shutil.copy(src, dup / f"{src.stem} (1){src.suffix}")
        Image.open(src).convert("RGB").resize((800, 500)).save(dup / f"{src.stem}_작게.jpg", quality=80)
shutil.copy(out / "청구서.pdf", out / "견적서.pdf")
print("ok")

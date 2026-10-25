"""시연 영상·스크린샷용 예시 파일 만들기 (모두 가상의 인물·번호).

  python tools/demo/make_samples.py <폴더> [--audio]

--audio: edge-tts로 회의 녹음(meeting.mp3)도 만든다 (인터넷 필요).
"""
from __future__ import annotations

import asyncio
import sys
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT = "/usr/share/fonts/truetype/nanum/NanumGothic.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf"

MEETING = (
    "오늘 회의 안건은 와디즈 펀딩 준비입니다. 목표 금액은 삼백만 원으로 정했습니다. "
    "김민수 대리가 금요일까지 상세페이지 시안을 공유하기로 했습니다. "
    "박지영 과장은 다음 주 월요일까지 촬영 장소 견적을 받아 주세요. "
    "다음 주 화요일 오후 두 시에 제품 촬영 일정을 잡았습니다. "
    "예산 문제는 다음 회의에서 다시 논의하겠습니다."
)

HWPX_SECTION = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>'
    '<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">'
    '<hp:p id="1"><hp:run charPrIDRef="0"><hp:t>장학금 신청서</hp:t></hp:run></hp:p>'
    '<hp:p id="2"><hp:run charPrIDRef="0"><hp:t>신청인: 이서연</hp:t></hp:run></hp:p>'
    '<hp:p id="3"><hp:run charPrIDRef="0"><hp:t>연락처: 010-2468-1357</hp:t></hp:run></hp:p>'
    '<hp:p id="4"><hp:run charPrIDRef="0"><hp:t>주민등록번호: 030315-4123456</hp:t></hp:run></hp:p>'
    '<hp:p id="5"><hp:run charPrIDRef="0"><hp:t>이메일: seoyeon.lee@example.com</hp:t></hp:run></hp:p>'
    "</hs:sec>"
)


def product(path: Path, color: tuple[int, int, int], size=(1600, 1000)) -> None:
    w, h = size
    img = Image.new("RGB", size, (226, 221, 214))
    d = ImageDraw.Draw(img)
    d.rectangle((0, int(h * 0.64), w, h), fill=(205, 196, 184))
    sh = Image.new("L", size, 0)
    ImageDraw.Draw(sh).ellipse((w * 0.35, h * 0.61, w * 0.66, h * 0.69), fill=120)
    img.paste((150, 140, 128), mask=sh.filter(ImageFilter.GaussianBlur(18)))
    dark = tuple(int(c * 0.78) for c in color)
    light = tuple(min(255, int(c * 1.35) + 30) for c in color)
    d.rounded_rectangle((w * 0.375, h * 0.3, w * 0.6125, h * 0.66), radius=40, fill=color)
    d.ellipse((w * 0.375, h * 0.27, w * 0.6125, h * 0.33), fill=dark)
    d.ellipse((w * 0.3875, h * 0.28, w * 0.6, h * 0.322), fill=(30, 40, 60))
    d.ellipse((w * 0.6, h * 0.38, w * 0.68, h * 0.56), outline=color, width=34)
    d.rounded_rectangle((w * 0.4, h * 0.34, w * 0.419, h * 0.62), radius=14, fill=light)
    img.save(path, quality=92)


def text_image(path: Path, lines: list[str], size=(900, 300), title=False) -> None:
    img = Image.new("RGB", size, "white")
    d = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        f = ImageFont.truetype(FONT_BOLD if title and i == 0 else FONT, 34)
        d.text((30, 30 + i * 80), line, font=f, fill="black")
    img.save(path)


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    import docx

    doc = docx.Document()
    doc.add_heading("고객 상담 기록", 1)
    for line in ["상담일: 2026-10-20", "성명: 홍길동", "연락처: 010-1234-5678", "주민등록번호: 900101-1234567",
                 "주소: 서울특별시 강남구 테헤란로 123, 101동 1001호", "환불 계좌: 국민은행 123456-01-234567"]:
        doc.add_paragraph(line)
    doc.save(out / "고객상담기록.docx")

    with zipfile.ZipFile(out / "장학금신청서.hwpx", "w") as z:
        z.writestr(zipfile.ZipInfo("mimetype"), "application/hwp+zip")
        z.writestr("Contents/section0.xml", HWPX_SECTION, compress_type=zipfile.ZIP_DEFLATED)

    from fpdf import FPDF

    pdf = FPDF()
    pdf.add_font("n", fname=FONT)
    pdf.set_font("n", size=13)
    pdf.add_page()
    for line in ["보험금 청구서", "피보험자: 김철수", "주민등록번호: 850505-2345678", "연락처 010-9876-5432", "이메일 chulsoo.kim@example.com"]:
        pdf.cell(0, 10, line, new_x="LMARGIN", new_y="NEXT")
    pdf.output(str(out / "청구서.pdf"))

    text_image(out / "택배송장.png", ["택배 송장", "받는 분 연락처 010-5555-7777", "주소 부산광역시 해운대구 센텀로 45"], title=True)

    products = out / "상품사진"
    products.mkdir(exist_ok=True)
    product(products / "머그컵_블루.jpg", (47, 107, 237))
    product(products / "머그컵_코랄.jpg", (240, 112, 96))
    product(products / "머그컵_그린.jpg", (46, 158, 110), size=(1400, 1050))

    (out / "회의메모.txt").write_text(MEETING, encoding="utf-8")
    if "--audio" in sys.argv:
        import edge_tts

        asyncio.run(edge_tts.Communicate(MEETING, "ko-KR-SunHiNeural", rate="-5%").save(str(out / "회의녹음.mp3")))
    print(f"예시 파일: {out}")


if __name__ == "__main__":
    main()

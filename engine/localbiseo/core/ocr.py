"""OCR 백엔드 묶음. PaddleOCR > Tesseract > RapidOCR 순서로 있는 걸 쓴다."""
from __future__ import annotations

import re
import threading
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image

from . import optional
from .tools import find_tool

Box = tuple[int, int, int, int]  # left, top, right, bottom


@dataclass
class OcrLine:
    text: str
    box: Box
    conf: float = 1.0
    # 줄 안의 단어 위치: (텍스트 시작, 끝, 박스). 마스킹할 때 글자 범위를 박스로 바꾸는 데 쓴다.
    words: list[tuple[int, int, Box]] = field(default_factory=list)

    def span_box(self, start: int, end: int) -> Box:
        hits = [b for s, e, b in self.words if s < end and e > start]
        if hits:
            return (min(b[0] for b in hits), min(b[1] for b in hits), max(b[2] for b in hits), max(b[3] for b in hits))
        # 단어 정보가 없으면 글자 수 비율로 나눈다.
        left, top, right, bottom = self.box
        n = max(len(self.text), 1)
        width = right - left
        return (left + int(width * start / n), top, left + int(width * end / n + 0.999), bottom)

    def to_dict(self) -> dict:
        return {"text": self.text, "box": list(self.box), "conf": round(self.conf, 3)}


_lock = threading.Lock()
_engines: dict[str, object] = {}


def backend_name() -> str | None:
    for name in ("paddleocr", "pytesseract", "rapidocr_onnxruntime"):
        if optional.has_module(name):
            if name == "pytesseract" and not optional.available("ocr"):
                continue
            return name
    return None


def ocr_image(image: Image.Image | str | Path, block: bool = False) -> list[OcrLine]:
    """block=True: 사용자가 고른 영역처럼 글 덩어리 하나라고 보고 읽는다 (화면 OCR에서 정확도가 높다)."""
    optional.require("ocr")
    img = Image.open(image) if isinstance(image, (str, Path)) else image
    img = img.convert("RGB")
    name = backend_name()
    if name == "paddleocr":
        lines = _paddle(img)
    elif name == "pytesseract":
        lines = _tesseract(img, block)
    else:
        lines = _rapid(img)
    return [l for l in lines if not _is_noise(l)]


_JAMO = re.compile(r"^[\u3131-\u318E]+$")


def _psm(block: bool) -> str:
    # psm 6: 글 덩어리 하나(고른 영역), psm 4: 크기가 다른 줄이 세로로 이어진 문서.
    # 기본값(psm 3)은 화면 캡처나 영수증에서 줄을 통째로 빠뜨리거나 숫자·괄호를 자주 틀린다.
    return "--psm 6" if block else "--psm 4"


def ocr_text(image: Image.Image, block: bool = False) -> str:
    """글자만 필요할 때. Tesseract는 자체 출력이 띄어쓰기를 더 정확하게 살린다."""
    optional.require("ocr")
    img = image.convert("RGB")
    if backend_name() != "pytesseract":
        return "\n".join(l.text for l in ocr_image(img, block))
    import pytesseract

    cmd = find_tool("tesseract")
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd
    lang = "kor+eng" if "kor" in pytesseract.get_languages(config="") else "eng"
    raw = pytesseract.image_to_string(img, lang=lang, config=_psm(block))
    lines = []
    for line in raw.splitlines():
        t = line.strip()
        compact = t.replace(" ", "")
        if not t or _JAMO.match(compact) or (len(compact) <= 2 and not re.search(r"[가-힣0-9]", compact)):
            continue
        lines.append(t)
    return "\n".join(lines)


def _is_noise(line: OcrLine) -> bool:
    # 테두리·그림자에서 생기는 낱자모('ㄱ', 'ㅋ')나 신뢰도 낮은 한 글자 줄은 버린다.
    text = line.text.strip()
    return not text or bool(_JAMO.match(text.replace(" ", ""))) or (len(text) == 1 and line.conf < 0.85)


def _tesseract(img: Image.Image, block: bool = False) -> list[OcrLine]:
    import pytesseract

    cmd = find_tool("tesseract")
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd

    langs = pytesseract.get_languages(config="")
    lang = "kor+eng" if "kor" in langs else "eng"
    config = _psm(block)
    data = pytesseract.image_to_data(img, lang=lang, config=config, output_type=pytesseract.Output.DICT)
    groups: dict[tuple, list[int]] = {}
    for i, word in enumerate(data["text"]):
        # 신뢰도가 아주 낮은 조각이나 낱자모는 잡음(테두리, 얼룩)인 경우가 많다.
        if word and word.strip() and float(data["conf"][i]) >= 35 and not _JAMO.match(word.strip()):
            key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
            groups.setdefault(key, []).append(i)
    lines = []
    for idxs in groups.values():
        text = ""
        words, confs = [], []
        prev_right = None
        heights = sorted(data["height"][i] for i in idxs)
        height = heights[len(heights) // 2] or 1
        for i in idxs:
            w = data["text"][i].strip()
            box = (data["left"][i], data["top"][i], data["left"][i] + data["width"][i], data["top"][i] + data["height"][i])
            # Tesseract는 한글을 음절마다 띄워서 내놓는다. 실제 간격이 좁으면 붙인다.
            if prev_right is not None and box[0] - prev_right > height * 0.45:
                text += " "
            words.append((len(text), len(text) + len(w), box))
            text += w
            prev_right = box[2]
            confs.append(float(data["conf"][i]) / 100)
        boxes = [b for _, _, b in words]
        line_box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
        lines.append(OcrLine(text, line_box, sum(confs) / len(confs), words))
    lines.sort(key=lambda l: (l.box[1] // 10, l.box[0]))
    return lines


def _quad_box(points) -> Box:
    xs = [int(p[0]) for p in points]
    ys = [int(p[1]) for p in points]
    return (min(xs), min(ys), max(xs), max(ys))


def _paddle(img: Image.Image) -> list[OcrLine]:
    import numpy as np
    from paddleocr import PaddleOCR

    with _lock:
        engine = _engines.get("paddle")
        if engine is None:
            engine = PaddleOCR(lang="korean", use_angle_cls=True, show_log=False)
            _engines["paddle"] = engine
    result = engine.ocr(np.array(img), cls=True) or []
    lines = []
    for page in result:
        for points, (text, conf) in page or []:
            lines.append(OcrLine(text, _quad_box(points), float(conf)))
    return lines


def _rapid(img: Image.Image) -> list[OcrLine]:
    import numpy as np
    from rapidocr_onnxruntime import RapidOCR

    with _lock:
        engine = _engines.get("rapid")
        if engine is None:
            engine = RapidOCR()
            _engines["rapid"] = engine
    result, _ = engine(np.array(img))
    return [OcrLine(text, _quad_box(points), float(conf)) for points, text, conf in result or []]

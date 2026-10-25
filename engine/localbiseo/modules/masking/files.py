"""파일 형식별 마스킹: 텍스트, DOCX, HWPX, HWP(텍스트 추출), PDF, 이미지."""
from __future__ import annotations

import html
import io
import re
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from ...core import ocr, optional
from ...core.config import output_path
from ...core.errors import AppError
from ...core.extract import HWPX_TOKEN_RE, TEXT_EXTS, hwp_text, hwpx_sections, pdf_page_chars, read_text_file
from .detect import Finding, detect, mask_text, remap_runs, summarize_findings

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tif", ".tiff"}
SUPPORTED_EXTS = TEXT_EXTS | IMAGE_EXTS | {".docx", ".hwpx", ".hwp", ".pdf"}


def mask_file(path: str | Path, kinds: list[str] | None, mode: str, out_dir: str | None = None, faces: bool = True) -> dict:
    src = Path(path)
    if not src.exists():
        raise AppError(f"파일을 찾을 수 없어요: {src}")
    ext = src.suffix.lower()
    if ext in TEXT_EXTS:
        return _mask_textfile(src, kinds, mode, out_dir)
    if ext == ".docx":
        return _mask_docx(src, kinds, mode, out_dir)
    if ext == ".hwpx":
        return _mask_hwpx(src, kinds, mode, out_dir)
    if ext == ".hwp":
        return _mask_hwp(src, kinds, mode, out_dir)
    if ext == ".pdf":
        return _mask_pdf(src, kinds, out_dir)
    if ext in IMAGE_EXTS:
        return _mask_image(src, kinds, out_dir, faces)
    raise AppError(f"지원하지 않는 형식이에요: {ext}")


def _result(src: Path, dst: Path, findings: list[Finding], note: str = "") -> dict:
    return {"src": str(src), "dst": str(dst), "count": len(findings), "by_kind": summarize_findings(findings), "note": note}


def _mask_textfile(src: Path, kinds, mode, out_dir) -> dict:
    text, enc = read_text_file(src)
    masked, findings = mask_text(text, kinds, mode)
    dst = output_path(src, "_마스킹", out_dir=out_dir)
    dst.write_text(masked, encoding="utf-8" if enc.startswith("utf-8") else enc)
    return _result(src, dst, findings)


W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"


def _mask_docx(src: Path, kinds, mode, out_dir) -> dict:
    import docx

    doc = docx.Document(str(src))
    roots = [doc.element.body]
    for section in doc.sections:
        for hf in (section.header, section.footer, section.first_page_header, section.first_page_footer, section.even_page_header, section.even_page_footer):
            try:
                if hf is not None and not hf.is_linked_to_previous:
                    roots.append(hf._element)
            except Exception:  # noqa: BLE001 - 머리글이 없는 구역
                pass
    all_findings: list[Finding] = []
    for root in roots:
        for p in root.iter(f"{W_NS}p"):
            ts = list(p.iter(f"{W_NS}t"))
            if not ts:
                continue
            runs = [t.text or "" for t in ts]
            findings = detect("".join(runs), kinds)
            if not findings:
                continue
            all_findings += findings
            for t, new in zip(ts, remap_runs(runs, findings, mode)):
                if new != (t.text or ""):
                    t.text = new
                    if new != new.strip():
                        t.set(XML_SPACE, "preserve")
    # 문서 속성에 남은 작성자 이름도 지운다.
    props = doc.core_properties
    props.author = ""
    props.last_modified_by = ""
    dst = output_path(src, "_마스킹", out_dir=out_dir)
    doc.save(str(dst))
    return _result(src, dst, all_findings)


def _escape_xml(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


SEP = "\x00"  # 문단 경계. 정규식의 \s에 걸리지 않아 문단을 넘는 탐지가 생기지 않는다.
_PIECE_RE = re.compile(r"<[^>]+>|[^<]+")


def mask_hwpx_xml(xml: str, kinds, mode) -> tuple[str, list[Finding]]:
    """section XML 안의 <hp:t> 텍스트만 바꾸고 나머지는 바이트 그대로 둔다."""
    pieces: list[tuple[int, int, str]] = []  # (xml 안 시작, 끝, 원문 텍스트)
    runs: list[str] = []
    for m in HWPX_TOKEN_RE.finditer(xml):
        if m.group(1) is None:
            if m.group(0).startswith("<hp:p") or m.group(0) == "</hp:p>":
                runs.append(SEP)
                pieces.append((-1, -1, SEP))
            continue
        base = m.start(1)
        for pm in _PIECE_RE.finditer(m.group(1)):
            if pm.group(0).startswith("<"):
                continue
            text = html.unescape(pm.group(0))
            runs.append(text)
            pieces.append((base + pm.start(), base + pm.end(), text))
    full = "".join(runs)
    findings = detect(full, kinds)
    if not findings:
        return xml, []
    new_runs = remap_runs(runs, findings, mode)
    out = xml
    for (start, end, old), new in sorted(zip(pieces, new_runs), key=lambda x: x[0][0], reverse=True):
        if start < 0 or new == old:
            continue
        out = out[:start] + _escape_xml(new) + out[end:]
    return out, findings


def _blank_png_like(data: bytes) -> bytes:
    try:
        size = Image.open(io.BytesIO(data)).size
    except Exception:  # noqa: BLE001
        size = (200, 280)
    buf = io.BytesIO()
    Image.new("RGB", size, "white").save(buf, "PNG")
    return buf.getvalue()


def _mask_hwpx(src: Path, kinds, mode, out_dir) -> dict:
    findings: list[Finding] = []
    with zipfile.ZipFile(src) as zin:
        sections = set(hwpx_sections(zin))
        if not sections:
            raise AppError("HWPX 본문을 찾지 못했어요. 파일이 손상됐을 수 있어요.")
        dst = output_path(src, "_마스킹", out_dir=out_dir)
        with zipfile.ZipFile(dst, "w") as zout:
            _copy_hwpx(zin, zout, sections, kinds, mode, findings)
    return _result(src, dst, findings, "미리보기 그림은 흰 화면으로 바뀌어요. 한글에서 저장하면 다시 만들어져요.")


def _copy_hwpx(zin: zipfile.ZipFile, zout: zipfile.ZipFile, sections: set[str], kinds, mode, findings: list[Finding]) -> None:
    for info in zin.infolist():
        data = zin.read(info.filename)
        if info.filename in sections:
            xml, f = mask_hwpx_xml(data.decode("utf-8"), kinds, mode)
            findings += f
            data = xml.encode("utf-8")
        elif info.filename == "Preview/PrvText.txt":
            # 미리보기 텍스트에도 원문이 들어 있다. (utf-16은 거의 모든 바이트열이 디코딩되므로 나중에 시도)
            for enc in ("utf-8", "utf-16"):
                try:
                    data = mask_text(data.decode(enc), kinds, mode)[0].encode(enc)
                    break
                except UnicodeDecodeError:
                    continue
        elif info.filename.startswith("Preview/") and info.filename.lower().endswith(".png"):
            # 첫 장 미리보기 그림은 다시 만들 수 없으니 흰 그림으로 바꾼다.
            data = _blank_png_like(data)
        # mimetype은 압축하지 않은 첫 항목이어야 한다. 원래 순서와 압축 방식을 그대로 따른다.
        zout.writestr(info, data, compress_type=info.compress_type)


def _mask_hwp(src: Path, kinds, mode, out_dir) -> dict:
    # HWP 5.0 바이너리는 압축 스트림 크기가 바뀌어 원본 형식으로 다시 쓰기 어렵다.
    # 본문 텍스트를 마스킹해서 .txt로 내보내고 HWPX 변환을 안내한다.
    masked, findings = mask_text(hwp_text(src), kinds, mode)
    dst = output_path(src, "_마스킹", ext="txt", out_dir=out_dir)
    dst.write_text(masked, encoding="utf-8")
    return _result(src, dst, findings, "HWP는 본문 텍스트만 마스킹해 .txt로 저장했어요. 서식을 유지하려면 한글에서 HWPX로 저장한 뒤 다시 넣어 주세요.")


PDF_RENDER_SCALE = 200 / 72  # 200dpi


def _pdf_page_boxes(page, kinds, findings_out: list[Finding]) -> list[tuple[float, float, float, float]]:
    """가릴 영역(렌더링 픽셀 좌표) 목록."""
    text, tp = pdf_page_chars(page)
    _, height = page.get_size()
    boxes = []
    for f in detect(text, kinds):
        findings_out.append(f)
        for i in range(f.start, f.end):
            left, bottom, right, top = tp.get_charbox(i)
            if right - left <= 0 or top - bottom <= 0:
                continue
            boxes.append((left * PDF_RENDER_SCALE, (height - top) * PDF_RENDER_SCALE, right * PDF_RENDER_SCALE, (height - bottom) * PDF_RENDER_SCALE))
    return boxes


def _mask_pdf(src: Path, kinds, out_dir) -> dict:
    """개인정보가 있는 페이지만 그림으로 바꾸고 그 위를 검게 칠한다.

    글자 레이어를 남기지 않으니 복사·검색으로도 원문이 나오지 않는다.
    (PyMuPDF의 진짜 텍스트 삭제는 AGPL이라 판매용 앱에 넣지 않았다.)
    """
    import pypdfium2 as pdfium

    try:
        doc = pdfium.PdfDocument(str(src))
    except pdfium.PdfiumError as e:
        raise AppError("PDF를 열 수 없어요. 암호가 걸렸거나 손상된 파일일 수 있어요.") from e
    findings: list[Finding] = []
    replaced, ocr_pages = 0, 0
    out = pdfium.PdfDocument.new()
    try:
        for i in range(len(doc)):
            page = doc[i]
            rotation = page.get_rotation()
            if rotation:
                page.set_rotation(0)
            page_findings: list[Finding] = []
            boxes = _pdf_page_boxes(page, kinds, page_findings)
            has_text = page.get_textpage().count_chars() > 0
            img = None
            if boxes or (not has_text and optional.available("ocr")):
                img = page.render(scale=PDF_RENDER_SCALE).to_pil().convert("RGB")
                if not has_text:
                    ocr_pages += 1
                    for line in ocr.ocr_image(img):
                        for f in detect(line.text, kinds):
                            page_findings.append(f)
                            boxes.append(line.span_box(f.start, f.end))
            findings += page_findings
            if not boxes:
                if rotation:
                    page.set_rotation(rotation)
                out.import_pages(doc, [i])
                continue
            draw = ImageDraw.Draw(img)
            for l, t, r, b in boxes:
                draw.rectangle((l - 2, t - 2, r + 2, b + 2), fill="black")
            width, height = page.get_size()
            new_page = out.new_page(width, height)
            buf = io.BytesIO()
            img.save(buf, "JPEG", quality=88)
            buf.seek(0)
            image = pdfium.PdfImage.new(out)
            image.load_jpeg(buf, inline=False)
            image.set_matrix(pdfium.PdfMatrix().scale(width, height))
            new_page.insert_obj(image)
            new_page.gen_content()
            if rotation:
                new_page.set_rotation(rotation)
            replaced += 1
        dst = output_path(src, "_마스킹", out_dir=out_dir)
        out.save(str(dst))
    finally:
        out.close()
        doc.close()
    note = f"개인정보가 있는 {replaced}페이지는 그림으로 바꿔 가렸어요(글자를 복사·검색해도 안 나와요)."
    if ocr_pages:
        note += f" 스캔 페이지 {ocr_pages}장은 OCR로 찾았어요."
    return _result(src, dst, findings, note)


def detect_faces(img: Image.Image) -> list[tuple[int, int, int, int]]:
    import cv2
    import numpy as np

    gray = cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    return [(int(x), int(y), int(x + w), int(y + h)) for x, y, w, h in faces]


def _pixelate(img: Image.Image, box) -> None:
    region = img.crop(box)
    w, h = region.size
    small = region.resize((max(1, w // 12), max(1, h // 12)), Image.Resampling.BILINEAR)
    img.paste(small.resize((w, h), Image.Resampling.NEAREST).filter(ImageFilter.GaussianBlur(2)), box[:2])


def _mask_image(src: Path, kinds, out_dir, faces: bool) -> dict:
    img = Image.open(src)
    img.load()
    img = img.convert("RGB")
    findings: list[Finding] = []
    notes = []
    draw = ImageDraw.Draw(img)
    if optional.available("ocr"):
        for line in ocr.ocr_image(img):
            for f in detect(line.text, kinds):
                findings.append(f)
                l, t, r, b = line.span_box(f.start, f.end)
                draw.rectangle((l - 2, t - 2, r + 2, b + 2), fill="black")
    else:
        notes.append("OCR 구성요소가 없어 글자는 찾지 못했어요.")
    face_count = 0
    if faces and optional.available("face"):
        for box in detect_faces(img):
            _pixelate(img, box)
            face_count += 1
    elif faces:
        notes.append("얼굴 감지 구성요소가 없어 얼굴은 가리지 못했어요.")
    if not optional.available("ocr") and not (faces and optional.available("face")):
        raise AppError("이미지 마스킹에는 OCR 또는 얼굴 감지 구성요소가 필요해요.", component="ocr")
    dst = output_path(src, "_마스킹", ext="png" if src.suffix.lower() not in (".jpg", ".jpeg") else "jpg", out_dir=out_dir)
    img.save(dst, quality=92)
    result = _result(src, dst, findings, " ".join(notes))
    if face_count:
        result["by_kind"]["face"] = face_count
        result["count"] += face_count
    return result

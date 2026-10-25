"""문서에서 텍스트 뽑기: txt/md/csv, docx, hwpx, hwp(5.0), pdf."""
from __future__ import annotations

import html
import re
import struct
import zipfile
import zlib
from pathlib import Path

from .errors import AppError

TEXT_EXTS = {".txt", ".md", ".csv", ".tsv", ".log", ".json", ".srt", ".vtt", ".html", ".xml"}
DOC_EXTS = TEXT_EXTS | {".docx", ".hwpx", ".hwp", ".pdf"}


def read_text_file(path: Path) -> tuple[str, str]:
    """(텍스트, 인코딩). 한국 문서는 UTF-8 아니면 CP949인 경우가 대부분이다."""
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "cp949", "utf-16"):
        try:
            return raw.decode(enc), enc
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace"), "utf-8"


def extract_text(path: str | Path) -> str:
    path = Path(path)
    if not path.exists():
        raise AppError(f"파일을 찾을 수 없어요: {path}")
    ext = path.suffix.lower()
    if ext in TEXT_EXTS:
        return read_text_file(path)[0]
    if ext == ".docx":
        return docx_text(path)
    if ext == ".hwpx":
        return hwpx_text(path)
    if ext == ".hwp":
        return hwp_text(path)
    if ext == ".pdf":
        return pdf_text(path)
    raise AppError(f"지원하지 않는 문서 형식이에요: {ext}")


def docx_text(path: Path) -> str:
    import docx

    doc = docx.Document(str(path))
    lines = []
    for p in doc.element.body.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
        texts = [t.text or "" for t in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")]
        lines.append("".join(texts))
    return "\n".join(lines)


HWPX_SECTION_RE = re.compile(r"^Contents/section\d+\.xml$")
HWPX_TOKEN_RE = re.compile(r"<hp:t(?:\s[^>]*)?>(.*?)</hp:t>|<hp:t\s*/>|<hp:p\b[^>]*>|</hp:p>", re.S)
TAG_RE = re.compile(r"<[^>]+>")


def hwpx_sections(zf: zipfile.ZipFile) -> list[str]:
    names = [n for n in zf.namelist() if HWPX_SECTION_RE.match(n)]
    return sorted(names, key=lambda n: int(re.search(r"(\d+)", n).group(1)))


def hwpx_text(path: Path) -> str:
    with zipfile.ZipFile(path) as zf:
        parts = []
        for name in hwpx_sections(zf):
            xml = zf.read(name).decode("utf-8")
            buf: list[str] = []
            for m in HWPX_TOKEN_RE.finditer(xml):
                tok = m.group(0)
                if tok.startswith("<hp:p") or tok == "</hp:p>":
                    if buf and buf[-1] != "\n":
                        buf.append("\n")
                elif m.group(1) is not None:
                    buf.append(html.unescape(TAG_RE.sub("", m.group(1))))
            parts.append("".join(buf).strip("\n"))
        return "\n".join(parts)


# --- HWP 5.0 바이너리 ---
HWPTAG_PARA_TEXT = 67
# 8 WCHAR(16바이트)를 차지하는 제어 문자 (인라인/확장 컨트롤)
_HWP_WIDE_CTRL = {1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23}


def _hwp_para_text(data: bytes) -> str:
    out = []
    i = 0
    n = len(data) // 2
    while i < n:
        code = struct.unpack_from("<H", data, i * 2)[0]
        if code < 32:
            if code == 9:
                out.append("\t")
            elif code in (10, 13):
                out.append("\n")
            i += 8 if code in _HWP_WIDE_CTRL else 1
            continue
        out.append(chr(code))
        i += 1
    return "".join(out)


def _hwp_records(stream: bytes):
    pos = 0
    while pos + 4 <= len(stream):
        header = struct.unpack_from("<I", stream, pos)[0]
        tag = header & 0x3FF
        size = (header >> 20) & 0xFFF
        pos += 4
        if size == 0xFFF:
            size = struct.unpack_from("<I", stream, pos)[0]
            pos += 4
        yield tag, stream[pos : pos + size]
        pos += size


def hwp_text(path: Path) -> str:
    import olefile

    if not olefile.isOleFile(str(path)):
        raise AppError("HWP 5.0 형식이 아니에요. (HWP 3.0 이하는 지원하지 않아요)")
    with olefile.OleFileIO(str(path)) as ole:
        header = ole.openstream("FileHeader").read()
        flags = struct.unpack_from("<I", header, 36)[0]
        compressed = bool(flags & 0x1)
        if flags & 0x2:
            raise AppError("암호가 걸린 HWP 문서는 읽을 수 없어요.")
        if flags & 0x4:
            raise AppError("배포용 HWP 문서는 읽을 수 없어요. 한글에서 HWPX로 저장해 주세요.")
        sections = sorted(
            (e for e in ole.listdir() if len(e) == 2 and e[0] == "BodyText" and e[1].startswith("Section")),
            key=lambda e: int(e[1][7:]),
        )
        paras = []
        for entry in sections:
            raw = ole.openstream(entry).read()
            stream = zlib.decompress(raw, -15) if compressed else raw
            for tag, payload in _hwp_records(stream):
                if tag == HWPTAG_PARA_TEXT:
                    paras.append(_hwp_para_text(payload).rstrip("\n"))
        return "\n".join(paras)


def pdf_page_chars(page) -> tuple[str, object]:
    """페이지 글자를 글자 인덱스와 1:1로 맞춘 문자열과 텍스트 페이지를 돌려준다."""
    import pypdfium2.raw as raw

    tp = page.get_textpage()
    n = tp.count_chars()
    chars = []
    for i in range(n):
        code = raw.FPDFText_GetUnicode(tp, i)
        chars.append(chr(code) if 0 < code < 0x110000 else " ")
    return "".join(chars).replace("\r", " "), tp


def pdf_text(path: Path) -> str:
    import pypdfium2 as pdfium

    doc = pdfium.PdfDocument(str(path))
    try:
        return "\n".join(pdf_page_chars(doc[i])[0] for i in range(len(doc)))
    finally:
        doc.close()

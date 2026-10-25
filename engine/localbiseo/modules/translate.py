"""오프라인 번역.

Argos Translate 언어팩(CTranslate2 모델 + SentencePiece)을 직접 돌린다.
argostranslate 패키지는 문장 분리에 stanza(→torch)를 끌고 와서 설치 파일이 몇 GB 늘어나므로 쓰지 않는다.
CTranslate2는 음성 인식 때문에 이미 들어 있고, SentencePiece는 몇 MB다.
언어팩은 처음 한 번 내려받는다.
"""
from __future__ import annotations

import json
import re
import shutil
import tempfile
import threading
import zipfile
from pathlib import Path
from urllib.request import Request, urlopen

from fastapi import APIRouter
from pydantic import BaseModel

from ..core import llm, optional
from ..core.config import sub_dir
from ..core.context import Ctx, job_ref
from ..core.errors import AppError, FeatureUnavailable
from ..core.jobs import JobContext

router = APIRouter(prefix="/translate", tags=["번역"])

LANGS = {"ko": "한국어", "en": "영어", "ja": "일본어", "zh": "중국어"}
INDEX_URL = "https://raw.githubusercontent.com/argosopentech/argospm-index/main/index.json"
_HEADERS = {"User-Agent": "LocalBiseo"}
# 띄어쓰기 없이 문장을 잇는 언어
_NO_SPACE = {"ja", "zh"}
_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+|(?<=[。！？])")

_lock = threading.Lock()
_loaded: dict[Path, tuple] = {}


def packs_dir() -> Path:
    return sub_dir("translate", sub_dir("models"))


def installed_packs() -> dict[tuple[str, str], Path]:
    out = {}
    for meta in packs_dir().glob("*/metadata.json"):
        try:
            m = json.loads(meta.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if (meta.parent / "model").is_dir() and (meta.parent / "sentencepiece.model").exists():
            out[(m.get("from_code"), m.get("to_code"))] = meta.parent
    return out


def _installed_pairs() -> set[tuple[str, str]]:
    return set(installed_packs()) if optional.available("translate") else set()


def _route(src: str, dst: str, pairs: set[tuple[str, str]]) -> list[tuple[str, str]] | None:
    if (src, dst) in pairs:
        return [(src, dst)]
    # 한↔일 같은 조합은 영어를 거쳐 간다.
    if (src, "en") in pairs and ("en", dst) in pairs:
        return [(src, "en"), ("en", dst)]
    return None


def _load(path: Path) -> tuple:
    import ctranslate2
    import sentencepiece

    with _lock:
        if path not in _loaded:
            if len(_loaded) >= 2:  # 영어를 거쳐 가는 두 개까지만 메모리에 둔다
                _loaded.pop(next(iter(_loaded)))
            meta = json.loads((path / "metadata.json").read_text(encoding="utf-8"))
            _loaded[path] = (
                ctranslate2.Translator(str(path / "model"), device="cpu", compute_type="auto"),
                sentencepiece.SentencePieceProcessor(model_file=str(path / "sentencepiece.model")),
                meta.get("target_prefix", ""),
            )
        return _loaded[path]


def split_for_translation(line: str) -> list[str]:
    return [s.strip() for s in _SENT_SPLIT.split(line) if s.strip()]


def _translate_pack(path: Path, text: str, dst: str) -> str:
    translator, sp, prefix = _load(path)
    lines = text.split("\n")
    sentences = [(i, s) for i, line in enumerate(lines) for s in split_for_translation(line)]
    if not sentences:
        return text
    tokens = [sp.encode(s, out_type=str) for _, s in sentences]
    results = translator.translate_batch(
        tokens,
        target_prefix=[[prefix]] * len(tokens) if prefix else None,
        replace_unknowns=True,
        max_batch_size=32,
        batch_type="tokens",
        beam_size=4,
        length_penalty=0.2,
    )
    by_line: dict[int, list[str]] = {}
    for (i, _), res in zip(sentences, results):
        hyp = res.hypotheses[0]
        if prefix and hyp and hyp[0] == prefix:
            hyp = hyp[1:]
        by_line.setdefault(i, []).append(sp.decode_pieces(hyp).replace("▁", " ").strip())
    glue = "" if dst in _NO_SPACE else " "
    return "\n".join(glue.join(by_line[i]) if i in by_line else line for i, line in enumerate(lines))


def translate(text: str, src: str, dst: str) -> dict:
    if src == dst:
        return {"text": text, "engine": "none"}
    route = _route(src, dst, _installed_pairs())
    if route:
        packs = installed_packs()
        out = text
        for a, b in route:
            out = _translate_pack(packs[(a, b)], out, b)
        return {"text": out, "engine": "argos", "route": route}
    if llm.available():
        prompt = f"다음 글을 {LANGS.get(dst, dst)}로 자연스럽게 번역해. 번역문만 출력해.\n\n{text}"
        return {"text": llm.complete(prompt, max_tokens=1500), "engine": "llm"}
    optional.require("translate")
    raise FeatureUnavailable(
        f"{LANGS.get(src, src)}→{LANGS.get(dst, dst)} 언어팩이 없어요. 번역 화면에서 언어팩을 내려받아 주세요.",
        component="translate_pack",
    )


def _fetch_index() -> list[dict]:
    try:
        with urlopen(Request(INDEX_URL, headers=_HEADERS), timeout=30) as r:
            return json.load(r)
    except OSError as e:
        raise AppError(f"언어팩 목록을 받지 못했어요. 인터넷 연결을 확인해 주세요. ({e})") from e


def _download(job: JobContext, url: str, dest: Path, start: float, end: float, label: str) -> None:
    try:
        with urlopen(Request(url, headers=_HEADERS), timeout=60) as r, open(dest, "wb") as f:
            total = int(r.headers.get("Content-Length") or 0)
            done = 0
            while chunk := r.read(1 << 20):
                f.write(chunk)
                done += len(chunk)
                if total:
                    job.progress(start + (end - start) * done / total, f"{label} 내려받는 중 {done >> 20}/{total >> 20}MB")
                else:
                    job.check()
    except OSError as e:
        raise AppError(f"{label} 언어팩을 받지 못했어요. ({e})") from e


def install_archive(archive: Path, src: str, dst: str) -> Path:
    """내려받은 .argosmodel(zip)을 언어팩 폴더에 푼다."""
    root = packs_dir()
    tmp = Path(tempfile.mkdtemp(prefix=".unpack-", dir=root))
    try:
        try:
            with zipfile.ZipFile(archive) as z:
                base = tmp.resolve()
                if any(not (tmp / n).resolve().is_relative_to(base) for n in z.namelist()):
                    raise AppError("언어팩 파일이 올바르지 않아요.")
                z.extractall(tmp)
        except zipfile.BadZipFile as e:
            raise AppError("언어팩 파일이 깨졌어요. 다시 받아 주세요.") from e
        meta = next(iter(sorted(tmp.glob("metadata.json")) + sorted(tmp.glob("*/metadata.json"))), None)
        if meta is None or not (meta.parent / "model").is_dir():
            raise AppError("언어팩 안에 번역 모델이 없어요.")
        if not (meta.parent / "sentencepiece.model").exists():
            raise AppError("이 언어팩 형식은 아직 지원하지 않아요.")
        shutil.rmtree(meta.parent / "stanza", ignore_errors=True)  # 문장 분리는 직접 한다
        dest = root / f"{src}_{dst}"
        with _lock:
            _loaded.pop(dest, None)
        shutil.rmtree(dest, ignore_errors=True)
        shutil.move(str(meta.parent), str(dest))
        return dest
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def install_pair(job: JobContext, src: str, dst: str) -> dict:
    optional.require("translate")
    job.progress(0.03, "언어팩 목록 확인 중")
    index = {(p.get("from_code"), p.get("to_code")): p for p in _fetch_index()}
    needed = [(src, dst)] if (src, dst) in index else [(src, "en"), ("en", dst)]
    have = installed_packs()
    todo = [pair for pair in needed if pair not in have]
    for n, (a, b) in enumerate(todo):
        pkg = index.get((a, b))
        url = next((u for u in (pkg or {}).get("links", []) if u.startswith("https://")), None)
        if url is None:
            raise AppError(f"{LANGS.get(a, a)}→{LANGS.get(b, b)} 언어팩을 찾지 못했어요.")
        label = f"{LANGS.get(a, a)}→{LANGS.get(b, b)}"
        start, end = 0.05 + 0.9 * n / len(todo), 0.05 + 0.9 * (n + 1) / len(todo)
        with tempfile.TemporaryDirectory(dir=packs_dir()) as d:
            archive = Path(d) / "pack.argosmodel"
            _download(job, url, archive, start, end - 0.02, label)
            job.progress(end - 0.02, f"{label} 설치 중")
            install_archive(archive, a, b)
    return {"installed": sorted(f"{a}-{b}" for a, b in _installed_pairs())}


class TranslateIn(BaseModel):
    text: str
    source: str = "ko"
    target: str = "en"


class InstallIn(BaseModel):
    source: str
    target: str


@router.get("/status")
def status():
    pairs = _installed_pairs()
    return {
        "available": optional.available("translate"),
        "llm": llm.available(),
        "languages": [{"code": k, "label": v} for k, v in LANGS.items()],
        "installed": sorted(f"{a}-{b}" for a, b in pairs),
    }


@router.post("")
def translate_api(body: TranslateIn):
    if body.source not in LANGS or body.target not in LANGS:
        raise AppError("지원하지 않는 언어예요.")
    return translate(body.text, body.source, body.target)


@router.post("/install")
def install_api(body: InstallIn, ctx: Ctx):
    optional.require("translate")
    if body.source not in LANGS or body.target not in LANGS or body.source == body.target:
        raise AppError("지원하지 않는 언어 조합이에요.")
    return job_ref(ctx.jobs.submit("translate_pack", f"언어팩 {body.source}→{body.target}", install_pair, body.source, body.target))

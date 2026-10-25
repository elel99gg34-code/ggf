"""오프라인 번역 (Argos Translate). 언어팩은 처음 한 번 내려받는다."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from ..core import llm, optional
from ..core.context import Ctx, job_ref
from ..core.errors import AppError, FeatureUnavailable
from ..core.jobs import JobContext

router = APIRouter(prefix="/translate", tags=["번역"])

LANGS = {"ko": "한국어", "en": "영어", "ja": "일본어", "zh": "중국어"}


def _installed_pairs() -> set[tuple[str, str]]:
    if not optional.available("translate"):
        return set()
    from argostranslate import package

    return {(p.from_code, p.to_code) for p in package.get_installed_packages()}


def _route(src: str, dst: str, pairs: set[tuple[str, str]]) -> list[tuple[str, str]] | None:
    if (src, dst) in pairs:
        return [(src, dst)]
    # 한↔일 같은 조합은 영어를 거쳐 간다.
    if (src, "en") in pairs and ("en", dst) in pairs:
        return [(src, "en"), ("en", dst)]
    return None


def translate(text: str, src: str, dst: str) -> dict:
    if src == dst:
        return {"text": text, "engine": "none"}
    pairs = _installed_pairs()
    route = _route(src, dst, pairs)
    if route:
        from argostranslate import translate as at

        out = text
        for a, b in route:
            out = "\n".join(at.translate(line, a, b) if line.strip() else line for line in out.split("\n"))
        return {"text": out, "engine": "argos", "route": route}
    if llm.available():
        prompt = f"다음 글을 {LANGS.get(dst, dst)}로 자연스럽게 번역해. 번역문만 출력해.\n\n{text}"
        return {"text": llm.complete(prompt, max_tokens=1500), "engine": "llm"}
    if not optional.available("translate"):
        optional.require("translate")
    raise FeatureUnavailable(
        f"{LANGS.get(src, src)}→{LANGS.get(dst, dst)} 언어팩이 없어요. 번역 화면에서 언어팩을 내려받아 주세요.",
        component="translate_pack",
    )


def install_pair(job: JobContext, src: str, dst: str) -> dict:
    optional.require("translate")
    from argostranslate import package

    job.progress(0.05, "언어팩 목록 확인 중")
    package.update_package_index()
    available = package.get_available_packages()
    needed = [(src, dst)] if any(p.from_code == src and p.to_code == dst for p in available) else [(src, "en"), ("en", dst)]
    have = _installed_pairs()
    for i, (a, b) in enumerate(needed):
        if (a, b) in have:
            continue
        pkg = next((p for p in available if p.from_code == a and p.to_code == b), None)
        if pkg is None:
            raise AppError(f"{a}→{b} 언어팩을 찾지 못했어요.")
        job.progress(0.1 + 0.8 * i / len(needed), f"{LANGS.get(a, a)}→{LANGS.get(b, b)} 내려받는 중")
        package.install_from_path(pkg.download())
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
    return job_ref(ctx.jobs.submit("translate_pack", f"언어팩 {body.source}→{body.target}", install_pair, body.source, body.target))

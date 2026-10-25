"""선택 구성요소(무거운 모델/라이브러리) 확인.

기본 설치에는 가벼운 기능만 들어 있다. STT, OCR, 배경 제거 같은 기능은
구성요소가 있을 때만 켜지고, 없으면 어떤 걸 설치해야 하는지 안내한다.
"""
from __future__ import annotations

import importlib.util
from dataclasses import dataclass

from .errors import FeatureUnavailable
from .tools import find_tool


@dataclass(frozen=True)
class Component:
    key: str
    label: str
    modules: tuple[str, ...]  # 이 중 하나라도 있으면 사용 가능
    extra: str
    used_by: str


COMPONENTS: dict[str, Component] = {
    c.key: c
    for c in [
        Component("stt", "음성 인식 (Whisper)", ("faster_whisper",), "stt", "회의록, 자막"),
        Component("diarize", "화자 분리 (실험적)", ("speechbrain",), "diarize", "회의록 화자 구분"),
        Component("ocr", "문자 인식 (OCR)", ("paddleocr", "pytesseract", "rapidocr_onnxruntime"), "ocr", "화면 OCR, 영수증·명함, 이미지 마스킹"),
        Component("rembg", "배경 제거", ("rembg",), "rembg", "이미지 일괄 처리"),
        Component("face", "얼굴 감지", ("cv2",), "face", "이미지 마스킹"),
        Component("translate", "오프라인 번역", ("sentencepiece",), "translate", "번역"),
        Component("llm", "로컬 AI 문장 생성", ("llama_cpp",), "llm", "요약·문장 다듬기 품질 향상"),
    ]
}


def has_module(name: str) -> bool:
    try:
        return importlib.util.find_spec(name) is not None
    except (ImportError, ValueError):
        return False


def available(key: str) -> bool:
    comp = COMPONENTS[key]
    if key == "ocr" and has_module("pytesseract") and not has_module("paddleocr") and not has_module("rapidocr_onnxruntime"):
        # pytesseract는 tesseract 실행 파일도 있어야 한다.
        return find_tool("tesseract") is not None
    if key == "translate":
        return has_module("ctranslate2") and has_module("sentencepiece")
    return any(has_module(m) for m in comp.modules)


def require(key: str) -> None:
    if not available(key):
        comp = COMPONENTS[key]
        raise FeatureUnavailable(
            f"'{comp.label}' 구성요소가 설치되어 있지 않아요. 설정 > 구성요소에서 설치해 주세요.",
            component=key,
            install_hint=f"pip install 'localbiseo-engine[{comp.extra}]'",
        )


def status() -> list[dict]:
    return [
        {"key": c.key, "label": c.label, "available": available(c.key), "used_by": c.used_by, "extra": c.extra}
        for c in COMPONENTS.values()
    ]

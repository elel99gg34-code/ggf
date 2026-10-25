"""음성 인식(faster-whisper)과 실험적 화자 분리(speechbrain)."""
from __future__ import annotations

import os
import subprocess
import sys
import threading
from pathlib import Path

from ...core import optional
from ...core.config import sub_dir
from ...core.errors import AppError
from ...core.ffmpeg import find_ffmpeg
from ...core.jobs import JobContext

SAMPLE_RATE = 16000
# 한국어 요일을 숫자로 잘못 받아 적기 쉽다(예: 월요일 → 5요일). 30초 구간마다 힌트로 넣는다.
KO_HOTWORDS = "월요일 화요일 수요일 목요일 금요일 토요일 일요일"

MODEL_SIZES = {
    "base": "빠름 (정확도 보통, 약 150MB)",
    "small": "균형 (권장, 약 500MB)",
    "medium": "정확함 (느림, 약 1.5GB)",
    "large-v3": "가장 정확함 (아주 느림, 약 3GB, 16GB RAM 이상)",
}

_lock = threading.Lock()
_models: dict[str, object] = {}


def whisper_dir() -> Path:
    return sub_dir("whisper", sub_dir("models"))


def installed_models() -> list[str]:
    root = whisper_dir()
    out = []
    for size in MODEL_SIZES:
        # huggingface_hub 캐시 폴더 이름 규칙
        if any(root.glob(f"models--Systran--faster-whisper-{size}/snapshots/*/model.bin")):
            out.append(size)
    return out


def _model(size: str):
    optional.require("stt")
    from faster_whisper import WhisperModel

    with _lock:
        if size not in _models:
            _models.clear()  # 메모리를 아끼려고 한 번에 하나만 올린다
            _models[size] = WhisperModel(
                size,
                device="auto",
                compute_type="int8",
                download_root=str(whisper_dir()),
                cpu_threads=max(1, (os.cpu_count() or 4) - 1),
            )
        return _models[size]


def download_model(job: JobContext, size: str) -> dict:
    job.progress(0.05, f"{size} 모델 내려받는 중… (처음 한 번만)")
    _model(size)
    return {"size": size, "installed": installed_models()}


def load_audio(path: str):
    """16kHz 모노 float32 배열.

    faster-whisper 내장 디코더는 PyAV 버전에 따라 깨진다(예: faster-whisper 1.2 + PyAV 19).
    배포판에 같이 넣는 ffmpeg로 직접 풀면 그 조합에 영향을 받지 않는다.
    """
    import numpy as np

    exe = find_ffmpeg()
    if exe:
        flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0  # type: ignore[attr-defined]
        res = subprocess.run(
            [exe, "-nostdin", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SAMPLE_RATE), "-"],
            capture_output=True,
            creationflags=flags,
        )
        if res.returncode != 0 or not res.stdout:
            msg = res.stderr.decode("utf-8", "replace").strip().splitlines()[-1:] or ["알 수 없는 오류"]
            raise AppError(f"오디오를 읽지 못했어요: {msg[0]}")
        return np.frombuffer(res.stdout, np.float32).copy()
    from faster_whisper.audio import decode_audio

    return decode_audio(path, sampling_rate=SAMPLE_RATE)


def transcribe(job: JobContext, path: str, size: str = "small", language: str | None = "ko") -> dict:
    model = _model(size)
    job.progress(0.01, "오디오 읽는 중")
    audio = load_audio(path)
    job.progress(0.02, "음성 분석 시작")
    segments_iter, info = model.transcribe(
        audio,
        language=language or None,
        vad_filter=True,
        beam_size=5,
        condition_on_previous_text=False,
        hotwords=KO_HOTWORDS if language == "ko" else None,
    )
    duration = float(info.duration or 0) or 1.0
    segments = []
    for seg in segments_iter:
        segments.append({"start": round(seg.start, 2), "end": round(seg.end, 2), "text": seg.text.strip(), "speaker": None})
        job.progress(min(0.95, seg.end / duration), f"{int(seg.end // 60)}분 {int(seg.end % 60)}초 / {int(duration // 60)}분")
    return {"segments": segments, "duration": duration, "language": info.language}


def diarize(job: JobContext, path: str, segments: list[dict], max_speakers: int | None = None, threshold: float = 0.55) -> list[dict]:
    """구간별 목소리 임베딩을 묶어 화자 번호를 붙인다. (실험 기능)"""
    optional.require("diarize")
    import numpy as np
    import torch
    from speechbrain.inference.speaker import EncoderClassifier

    job.progress(0.96, "화자 구분 중")
    encoder = EncoderClassifier.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb", savedir=str(sub_dir("ecapa", sub_dir("models")))
    )
    sr = SAMPLE_RATE
    wave = load_audio(path)
    embs: list = []
    for seg in segments:
        a, b = int(seg["start"] * sr), int(seg["end"] * sr)
        if b - a < sr // 2:
            embs.append(None)
            continue
        with torch.no_grad():
            e = encoder.encode_batch(torch.from_numpy(wave[a:b]).unsqueeze(0)).squeeze().numpy()
        embs.append(e / (np.linalg.norm(e) + 1e-9))
    centroids: list = []
    counts: list[int] = []
    labels: list[int | None] = []
    for e in embs:
        if e is None:
            labels.append(None)
            continue
        sims = [float(np.dot(e, c / (np.linalg.norm(c) + 1e-9))) for c in centroids]
        best = int(np.argmax(sims)) if sims else -1
        if best >= 0 and sims[best] >= threshold:
            centroids[best] = centroids[best] + e
            counts[best] += 1
            labels.append(best)
        else:
            centroids.append(e.copy())
            counts.append(1)
            labels.append(len(centroids) - 1)
    # 너무 많이 쪼개졌으면 가장 가까운 묶음끼리 합친다.
    mapping = list(range(len(centroids)))
    if max_speakers and len(centroids) > max_speakers:
        alive = list(range(len(centroids)))
        while len(alive) > max_speakers:
            best_pair, best_sim = None, -2.0
            for i in alive:
                for j in alive:
                    if i < j:
                        ci, cj = centroids[i], centroids[j]
                        s = float(np.dot(ci, cj) / (np.linalg.norm(ci) * np.linalg.norm(cj) + 1e-9))
                        if s > best_sim:
                            best_pair, best_sim = (i, j), s
            i, j = best_pair
            centroids[i] = centroids[i] + centroids[j]
            alive.remove(j)
            mapping = [i if m == j else m for m in mapping]
        order = {c: n for n, c in enumerate(sorted(set(mapping)))}
        mapping = [order[m] for m in mapping]
    # 앞 구간과 같은 화자로 채워 빈 칸을 메운다.
    prev = 0
    out = []
    for seg, lab in zip(segments, labels):
        sp = mapping[lab] if lab is not None else prev
        prev = sp
        out.append({**seg, "speaker": sp})
    return out

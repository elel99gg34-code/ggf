# -*- coding: utf-8 -*-
"""외부 라이브러리 없이 프로그램 아이콘(.ico)을 생성한다.

PyInstaller 가 exe 에 박아 넣을 아이콘이 필요한데, 빌드 머신에 Pillow 가
있다는 보장이 없어서 ICO 파일 포맷(ICONDIR + BMP)을 직접 쓴다.
디자인: 짙은 남색 둥근 사각형 + 초록색 'Z' (잠수/AFK).
"""

from __future__ import annotations

import os
import struct
from typing import List, Tuple

BG = (28, 32, 48)        # 짙은 남색
ACCENT = (64, 220, 132)  # 초록
SIZES = (16, 24, 32, 48, 64, 128, 256)


def _inside_rounded_rect(x: float, y: float, size: int, radius: float) -> bool:
    """둥근 사각형 내부인지 판정."""
    margin = size * 0.06
    left, top = margin, margin
    right, bottom = size - margin, size - margin
    if not (left <= x <= right and top <= y <= bottom):
        return False
    for cx, cy in (
        (left + radius, top + radius),
        (right - radius, top + radius),
        (left + radius, bottom - radius),
        (right - radius, bottom - radius),
    ):
        # 모서리 영역 밖이면 검사할 필요 없음
        if (x < left + radius or x > right - radius) and (y < top + radius or y > bottom - radius):
            if (x - cx) ** 2 + (y - cy) ** 2 > radius ** 2:
                # 이 모서리의 사분면에 속할 때만 탈락
                if abs(x - cx) <= radius + 1 and abs(y - cy) <= radius + 1:
                    return False
    return True


def _on_z(x: float, y: float, size: int) -> bool:
    """'Z' 글리프 위의 픽셀인지 판정 (윗변 / 대각선 / 밑변)."""
    s = size
    thickness = max(1.4, s * 0.115)
    x0, x1 = s * 0.26, s * 0.74
    y0, y1 = s * 0.28, s * 0.72

    if x0 <= x <= x1:
        if abs(y - y0) <= thickness / 2:      # 윗변
            return True
        if abs(y - y1) <= thickness / 2:      # 밑변
            return True
        # 대각선: (x1, y0) -> (x0, y1)
        t = (y - y0) / (y1 - y0)
        if 0 <= t <= 1:
            diag_x = x1 + (x0 - x1) * t
            if abs(x - diag_x) <= thickness / 2 * 1.35:
                return True
    return False


def render(size: int) -> List[Tuple[int, int, int, int]]:
    """BGRA 픽셀을 위에서 아래 순서로 렌더링한다 (안티앨리어싱 2x2 슈퍼샘플)."""
    radius = size * 0.22
    pixels: List[Tuple[int, int, int, int]] = []
    for py in range(size):
        for px in range(size):
            bg_hits = z_hits = 0
            for sy in (0.25, 0.75):
                for sx in (0.25, 0.75):
                    x, y = px + sx, py + sy
                    if _inside_rounded_rect(x, y, size, radius):
                        bg_hits += 1
                        if _on_z(x, y, size):
                            z_hits += 1
            if bg_hits == 0:
                pixels.append((0, 0, 0, 0))
                continue
            alpha = int(255 * bg_hits / 4)
            mix = z_hits / bg_hits
            r = round(BG[0] + (ACCENT[0] - BG[0]) * mix)
            g = round(BG[1] + (ACCENT[1] - BG[1]) * mix)
            b = round(BG[2] + (ACCENT[2] - BG[2]) * mix)
            pixels.append((b, g, r, alpha))  # BMP 는 BGRA 순서
    return pixels


def bmp_image(size: int) -> bytes:
    """ICO 안에 들어가는 BITMAPINFOHEADER + XOR 데이터 + AND 마스크."""
    pixels = render(size)
    header = struct.pack(
        "<IiiHHIIiiII",
        40,          # biSize
        size,        # biWidth
        size * 2,    # biHeight (XOR + AND 마스크를 합친 높이)
        1,           # biPlanes
        32,          # biBitCount
        0,           # biCompression (BI_RGB)
        size * size * 4,
        0, 0, 0, 0,
    )
    # BMP 는 아래에서 위로 저장한다.
    rows = []
    for y in range(size - 1, -1, -1):
        row = bytearray()
        for x in range(size):
            row += bytes(pixels[y * size + x])
        rows.append(bytes(row))
    xor_data = b"".join(rows)

    # AND 마스크: 1bpp, 행마다 4바이트 정렬. 알파를 쓰므로 전부 0(불투명 취급).
    mask_row_bytes = ((size + 31) // 32) * 4
    and_data = b"\x00" * (mask_row_bytes * size)
    return header + xor_data + and_data


def build_ico(path: str) -> str:
    images = [(size, bmp_image(size)) for size in SIZES]
    out = bytearray(struct.pack("<HHH", 0, 1, len(images)))  # ICONDIR
    offset = 6 + 16 * len(images)
    for size, data in images:
        out += struct.pack(
            "<BBBBHHII",
            0 if size >= 256 else size,  # bWidth (256 은 0 으로 표기)
            0 if size >= 256 else size,  # bHeight
            0,      # 색상 수 (32bpp 는 0)
            0,      # 예약
            1,      # 컬러 플레인
            32,     # 비트 수
            len(data),
            offset,
        )
        offset += len(data)
    for _size, data in images:
        out += data

    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(out)
    return path


if __name__ == "__main__":
    target = os.path.join(os.path.dirname(os.path.abspath(__file__)), "roblox_afk.ico")
    built = build_ico(target)
    print(f"아이콘 생성 완료: {built} ({os.path.getsize(built):,} bytes)")

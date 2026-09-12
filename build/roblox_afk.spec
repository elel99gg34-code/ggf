# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller 스펙: 단일 실행 파일(RobloxAFK.exe) 생성.

    pyinstaller build/roblox_afk.spec --noconfirm --clean
"""

import os

ROOT = os.path.abspath(os.path.join(SPECPATH, os.pardir))
ENTRY = os.path.join(ROOT, "src", "roblox_afk.py")
ICON = os.path.join(ROOT, "build", "roblox_afk.ico")
VERSION_FILE = os.path.join(ROOT, "build", "version_info.txt")

a = Analysis(
    [ENTRY],
    pathex=[os.path.join(ROOT, "src")],
    binaries=[],
    datas=[],
    hiddenimports=[],
    hookspath=[],
    runtime_hooks=[],
    # 표준 라이브러리만 쓰므로 무거운 서드파티는 제외해 용량을 줄인다.
    # (표준 라이브러리 모듈은 빌드가 깨질 수 있어 건드리지 않는다.)
    excludes=["numpy", "pandas", "matplotlib", "scipy", "PIL", "pytest", "test"],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="RobloxAFK",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,          # GUI 프로그램 (검은 콘솔 창 안 뜸)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=ICON if os.path.exists(ICON) else None,
    version=VERSION_FILE if os.path.exists(VERSION_FILE) else None,
)

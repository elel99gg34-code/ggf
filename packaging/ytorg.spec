# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller 빌드 설정.

onefile이 아니라 onedir을 쓴다:
  - onefile은 실행할 때마다 임시 폴더에 전부 풀어서 시작이 몇 초 느리다.
  - 백신 오탐이 훨씬 심하다(자기 압축 해제 실행파일 패턴이라서).
설치 파일(Inno Setup)이 어차피 한 파일로 감싸주므로 사용자에게는 차이가 없다.
"""

import sys
from pathlib import Path

PROJECT = Path(SPECPATH).parent

# keyring과 google 클라이언트는 백엔드를 런타임에 동적으로 찾는다.
# PyInstaller의 정적 분석에 안 걸리므로 직접 지정해야 한다.
# 이걸 빠뜨리면 빌드는 되는데 실행 중에 "No recommended backend was available"로
# 로그인이 실패한다.
HIDDEN = [
    "keyring.backends.Windows",
    "keyring.backends.null",
    "keyring.backends.fail",
    "win32ctypes.core",
    "win32ctypes.pywin32",
    "google.auth.transport.requests",
    "googleapiclient.discovery",
]

# 쓰지 않는 Qt 모듈을 빼서 배포 크기를 줄인다.
# QtWebEngine 하나만 빼도 100MB 넘게 준다.
EXCLUDES = [
    "PySide6.QtWebEngineCore", "PySide6.QtWebEngineWidgets", "PySide6.QtWebEngineQuick",
    "PySide6.QtQuick", "PySide6.QtQml", "PySide6.Qt3DCore", "PySide6.Qt3DRender",
    "PySide6.QtMultimedia", "PySide6.QtMultimediaWidgets", "PySide6.QtCharts",
    "PySide6.QtDataVisualization", "PySide6.QtBluetooth", "PySide6.QtNfc",
    "PySide6.QtPositioning", "PySide6.QtSerialPort", "PySide6.QtTest",
    "PySide6.QtSql", "PySide6.QtDesigner", "PySide6.QtHelp",
    "tkinter", "matplotlib", "numpy", "pandas", "PIL", "pytest",
]

datas = []

# 동봉할 OAuth 설정이 있으면 리소스로 넣는다.
# 없어도 빌드는 된다 — 그 경우 사용자가 설정 화면에서 직접 등록해야 한다.
client_secret = PROJECT / "packaging" / "client_secret.json"
if client_secret.exists():
    datas.append((str(client_secret), "resources"))
else:
    print("[ytorg] 알림: packaging/client_secret.json 이 없어 동봉하지 않습니다.")
    print("[ytorg]      사용자가 설정 화면에서 직접 등록해야 합니다.")

a = Analysis(
    [str(PROJECT / "packaging" / "launcher.py")],
    pathex=[str(PROJECT)],
    binaries=[],
    datas=datas,
    hiddenimports=HIDDEN,
    hookspath=[],
    runtime_hooks=[],
    excludes=EXCLUDES,
    noarchive=False,
)

pyz = PYZ(a.pure)

icon_path = PROJECT / "packaging" / "ytorg.ico"

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="YTOrganizer",
    debug=False,
    strip=False,
    upx=False,          # UPX 압축은 백신 오탐을 크게 늘린다
    console=False,      # GUI 앱이라 콘솔 창을 띄우지 않는다
    icon=str(icon_path) if icon_path.exists() else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="YTOrganizer",
)

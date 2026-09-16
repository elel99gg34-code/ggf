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
    "keyring.backends.null",
    "keyring.backends.fail",
    "google.auth.transport.requests",
    "googleapiclient.discovery",
]

if sys.platform == "win32":
    # 윈도우 자격 증명 관리자에 토큰을 넣으려면 필요하다.
    # 다른 OS에서 빌드할 때 넣으면 "not found" 오류만 찍히므로 분기한다.
    HIDDEN += [
        "keyring.backends.Windows",
        "win32ctypes.core",
        "win32ctypes.pywin32",
    ]

# anthropic은 AI 분류를 켤 때만 함수 안에서 import한다. 그 덕에 패키지가 없어도
# 앱이 돌지만, PyInstaller의 정적 분석에도 안 걸려서 번들에서 통째로 빠진다.
# (빌드는 성공하고, exe에서 AI 분류를 켜야만 드러나는 종류의 누락이다.)
try:
    from PyInstaller.utils.hooks import collect_submodules

    HIDDEN += collect_submodules("anthropic")
except ImportError:
    print("[ytorg] 알림: anthropic이 설치돼 있지 않아 AI 분류 없이 빌드합니다.")

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

# google-api-python-client는 600개가 넘는 Google API의 discovery 문서를 들고
# 온다(105MB). 이 앱이 읽는 건 youtube.v3 하나뿐이라 나머지는 버린다.
def _keep(entry) -> bool:
    dest = str(entry[0]).replace("\\", "/")
    if "discovery_cache/documents/" not in dest:
        return True
    return dest.endswith("/youtube.v3.json")


_before = len(a.datas)
a.datas = [entry for entry in a.datas if _keep(entry)]
print(f"[ytorg] discovery 문서 정리: {_before - len(a.datas)}개 제외")

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

# 같은 코드로 콘솔용 실행 파일을 하나 더 만든다.
# console=False인 GUI exe는 윈도우에서 stdout이 없어 `status`나 `demo` 같은
# 명령의 출력이 어디에도 보이지 않는다. 진단할 때 이쪽을 쓴다.
# 무거운 의존성(_internal)은 둘이 공유하므로 용량은 몇 MB만 늘어난다.
exe_cli = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="YTOrganizer-cli",
    debug=False,
    strip=False,
    upx=False,
    console=True,
    icon=str(icon_path) if icon_path.exists() else None,
)

coll = COLLECT(
    exe,
    exe_cli,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="YTOrganizer",
)

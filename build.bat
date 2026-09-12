@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Roblox AFK Keeper - 빌드
cd /d "%~dp0"

echo.
echo ==========================================================
echo    로블록스 잠수 방지 - 설치 파일 만들기
echo ==========================================================
echo.

REM ---------- 1) 파이썬 찾기 ----------
set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY where python >nul 2>&1 && set "PY=python"
if not defined PY (
    echo [오류] 파이썬이 설치되어 있지 않다.
    echo.
    echo    https://www.python.org/downloads/ 에서 받아서 설치하고,
    echo    설치 화면 맨 아래 "Add python.exe to PATH" 를 반드시 체크할 것.
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('%PY% --version 2^>^&1') do echo [1/5] 파이썬 확인 - %%v

REM ---------- 2) 빌드용 가상환경 ----------
if not exist ".venv\Scripts\python.exe" (
    echo [2/5] 빌드용 가상환경 만드는 중...
    %PY% -m venv .venv || goto :fail
) else (
    echo [2/5] 빌드용 가상환경 - 이미 있음
)
set "VPY=.venv\Scripts\python.exe"

REM ---------- 3) PyInstaller ----------
echo [3/5] PyInstaller 준비 중... (처음 한 번만 시간이 걸린다)
"%VPY%" -m pip install --upgrade pip --quiet --disable-pip-version-check
"%VPY%" -m pip install --upgrade pyinstaller --quiet --disable-pip-version-check || goto :fail

REM ---------- 4) 아이콘 ----------
echo [4/5] 아이콘 생성 중...
"%VPY%" "build\make_icon.py" || goto :fail

REM ---------- 5) exe 빌드 ----------
echo [5/5] RobloxAFK.exe 빌드 중... (1~3분 정도 걸린다)
"%VPY%" -m PyInstaller "build\roblox_afk.spec" --noconfirm --clean --distpath "dist" --workpath "build\temp" --log-level WARN || goto :fail

if not exist "dist\RobloxAFK.exe" (
    echo [오류] exe 가 만들어지지 않았다.
    goto :fail
)

REM ---------- 6) 설치 프로그램 (Inno Setup 있으면) ----------
set "PF86=%ProgramFiles(x86)%"
set "ISCC="
if exist "%PF86%\Inno Setup 6\ISCC.exe" set "ISCC=%PF86%\Inno Setup 6\ISCC.exe"
if not defined ISCC if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"
if not defined ISCC if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" set "ISCC=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
if not defined ISCC where iscc >nul 2>&1 && set "ISCC=iscc"

if defined ISCC (
    echo.
    echo [추가] 설치 프로그램 만드는 중...
    "%ISCC%" /Q "installer\RobloxAFK.iss" || echo [경고] 설치 프로그램 생성 실패 - exe 는 정상이다.
) else (
    echo.
    echo [안내] Inno Setup 6 이 없어서 Setup.exe 는 건너뛴다.
    echo        설치 마법사 형태로도 만들고 싶으면:
    echo        https://jrsoftware.org/isdl.php  에서 설치 후 이 파일을 다시 실행할 것.
)

echo.
echo ==========================================================
echo    완료
echo ==========================================================
echo.
if exist "dist\RobloxAFK.exe"                echo   무설치 실행 파일 : dist\RobloxAFK.exe
if exist "dist\RobloxAFK-Setup-1.0.0.exe"    echo   설치 프로그램    : dist\RobloxAFK-Setup-1.0.0.exe
echo.
echo   dist 폴더를 열어서 확인해라.
echo.
explorer "dist"
pause
exit /b 0

:fail
echo.
echo [실패] 빌드 도중 오류가 났다. 위의 메시지를 확인해라.
echo.
pause
exit /b 1

@echo off
chcp 65001 >nul
setlocal

REM ============================================================
REM  YTOrganizer 윈도우 빌드 스크립트
REM  더블클릭하면 exe와 설치 파일이 만들어진다.
REM  필요한 것: 파이썬 3.11 이상
REM ============================================================

cd /d "%~dp0\.."

echo.
echo [1/5] 파이썬 확인
python --version >nul 2>&1
if errorlevel 1 (
    echo   ! 파이썬을 찾지 못했습니다.
    echo   ! https://www.python.org/downloads/ 에서 설치하고,
    echo   ! 설치할 때 "Add Python to PATH"를 꼭 체크해주세요.
    pause
    exit /b 1
)
python --version

echo.
echo [2/5] 가상환경 준비
if not exist ".venv" (
    python -m venv .venv
    if errorlevel 1 goto :fail
)
call .venv\Scripts\activate.bat

echo.
echo [3/5] 의존성 설치 (처음 한 번은 몇 분 걸립니다)
python -m pip install --upgrade pip --quiet
python -m pip install -r requirements-dev.txt --quiet
if errorlevel 1 goto :fail
REM 윈도우에서 keyring이 자격 증명 관리자를 쓰려면 필요합니다
python -m pip install pywin32-ctypes --quiet

echo.
echo [4/5] 테스트 (실패하면 빌드를 중단합니다)
python -m pytest -q
if errorlevel 1 (
    echo.
    echo   ! 테스트가 실패했습니다. 이 상태로는 빌드하지 않습니다.
    pause
    exit /b 1
)

echo.
echo [5/5] exe 빌드
if exist "dist\YTOrganizer" rmdir /s /q "dist\YTOrganizer"
python -m PyInstaller packaging\ytorg.spec --noconfirm --clean
if errorlevel 1 goto :fail

echo.
echo   exe 완성: dist\YTOrganizer\YTOrganizer.exe

REM ---- 설치 파일 (Inno Setup이 있을 때만) ----
set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"

if exist "%ISCC%" (
    echo.
    echo [추가] 설치 파일 만드는 중
    "%ISCC%" packaging\installer.iss
    if errorlevel 1 goto :fail
    echo   설치 파일 완성: dist\YTOrganizer-Setup.exe
) else (
    echo.
    echo [건너뜀] Inno Setup 6이 없어서 설치 파일은 만들지 않았습니다.
    echo          exe는 dist\YTOrganizer\ 폴더째로 전달하면 동작합니다.
    echo          설치 파일도 만들려면: https://jrsoftware.org/isdl.php
)

echo.
echo ============================================================
echo  빌드 완료
echo ============================================================
pause
exit /b 0

:fail
echo.
echo   ! 빌드 중 오류가 발생했습니다. 위 메시지를 확인해주세요.
pause
exit /b 1

@echo off
chcp 65001 >nul
title 로블록스 잠수 방지 (소스 실행)
cd /d "%~dp0"

set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY where python >nul 2>&1 && set "PY=python"
if not defined PY (
    echo [오류] 파이썬이 없다. https://www.python.org/downloads/ 에서 설치할 것.
    pause
    exit /b 1
)

REM 빌드 없이 바로 실행한다. 인자를 그대로 넘기므로
REM   run_from_source.bat --cli -i 3
REM 같은 식으로도 쓸 수 있다.
%PY% "src\roblox_afk.py" %*
if errorlevel 1 pause

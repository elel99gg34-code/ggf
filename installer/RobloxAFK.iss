; Inno Setup 스크립트 — RobloxAFK 설치 프로그램(Setup.exe) 생성
;
;   빌드:  build.bat  (또는)  iscc installer\RobloxAFK.iss
;   결과:  dist\RobloxAFK-Setup-1.0.0.exe
;
; 관리자 권한이 필요 없도록 사용자 폴더에 설치한다.

#define MyAppName "Roblox AFK Keeper"
#define MyAppNameKo "로블록스 잠수 방지"
#define MyAppVersion "1.0.0"
#define MyAppExeName "RobloxAFK.exe"

[Setup]
AppId={{7B4C1E2A-5D93-4C1F-9A62-0E8B3F21D4A7}
AppName={#MyAppNameKo}
AppVersion={#MyAppVersion}
AppVerName={#MyAppNameKo} {#MyAppVersion}
VersionInfoVersion={#MyAppVersion}
DefaultDirName={autopf}\RobloxAFK
DefaultGroupName={#MyAppNameKo}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=..\dist
OutputBaseFilename=RobloxAFK-Setup-{#MyAppVersion}
SetupIconFile=..\build\roblox_afk.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppNameKo}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "default"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
default.CreateDesktopIcon=바탕화면에 아이콘 만들기
default.AutoStart=윈도우 시작할 때 자동 실행
default.LaunchApp={#MyAppNameKo} 실행

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "추가 작업:"
Name: "autostart";   Description: "{cm:AutoStart}";        GroupDescription: "추가 작업:"; Flags: unchecked

[Files]
Source: "..\dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\README.md";            DestDir: "{app}"; DestName: "사용법.md"; Flags: ignoreversion isreadme

[Icons]
Name: "{group}\{#MyAppNameKo}";           Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{#MyAppNameKo} 제거";      Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppNameKo}";     Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
    ValueType: string; ValueName: "RobloxAFK"; ValueData: """{app}\{#MyAppExeName}"""; \
    Flags: uninsdeletevalue; Tasks: autostart

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchApp}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; 설정 파일(%APPDATA%\RobloxAFK\config.json)도 같이 지운다.
Type: filesandordirs; Name: "{userappdata}\RobloxAFK"

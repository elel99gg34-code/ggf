; YTOrganizer 설치 파일 설정 (Inno Setup 6)
;
; 관리자 권한을 요구하지 않는다. %LOCALAPPDATA% 아래에 설치하므로
; 회사 PC처럼 관리자 권한이 없는 환경에서도 그냥 설치된다.

#define AppName "YTOrganizer"
#define AppVersion "0.1.0"
#define AppExe "YTOrganizer.exe"

[Setup]
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
DefaultDirName={localappdata}\Programs\{#AppName}
DefaultGroupName={#AppName}
UninstallDisplayIcon={app}\{#AppExe}
OutputDir=..\dist
OutputBaseFilename={#AppName}-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
; 관리자 권한 없이 설치
PrivilegesRequired=lowest
; 64비트 윈도우만 지원 (PySide6가 32비트를 지원하지 않는다)
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"

[Tasks]
Name: "desktopicon"; Description: "바탕화면에 바로가기 만들기"; GroupDescription: "추가 작업:"

[Files]
Source: "..\dist\YTOrganizer\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\docs\USER_GUIDE.md"; DestDir: "{app}\docs"; Flags: ignoreversion
Source: "..\docs\SETUP_GOOGLE_CLOUD.md"; DestDir: "{app}\docs"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{group}\{#AppName} 제거"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "지금 실행하기"; Flags: nowait postinstall skipifsilent

; 설정과 데이터(%APPDATA%\YTOrganizer)는 제거해도 남긴다.
; 실수로 지웠다가 다시 깔 때 로그인과 캐시를 잃지 않게 하려는 것이다.
; 완전히 지우려면 사용자가 직접 그 폴더를 삭제하면 된다.
[UninstallDelete]
Type: filesandordirs; Name: "{app}"

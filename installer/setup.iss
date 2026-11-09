[Setup]
AppName=패턴 클릭 도우미
AppVersion=1.0.0
DefaultDirName={autopf}\PatternClicker
DefaultGroupName=패턴 클릭 도우미
OutputDir=..\dist-installer
OutputBaseFilename=PatternClicker-Setup
Compression=lzma
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\PatternClicker.exe

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"

[Tasks]
Name: "desktopicon"; Description: "바탕화면에 바로가기 만들기"

[Files]
Source: "..\dist\PatternClicker.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\패턴 클릭 도우미"; Filename: "{app}\PatternClicker.exe"
Name: "{autodesktop}\패턴 클릭 도우미"; Filename: "{app}\PatternClicker.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\PatternClicker.exe"; Description: "지금 실행"; Flags: nowait postinstall skipifsilent

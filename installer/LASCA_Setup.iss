#define MyAppName "LASCA"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "LASCA"
#define MyAppExeName "LASCA.exe"
#define MyAppSource "..\dist\LASCA"

[Setup]
AppId={{524E0A33-E211-41E0-9E4D-74CEE971A1EE}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
LicenseFile=..\LICENSE

; 🟢 Αλλαγή 1: Εγκατάσταση στο AppData του χρήστη (αποφεύγει το Program Files)
DefaultDirName={userappdata}\LASCA
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; 🟢 Αλλαγή 2: Δεν απαιτούνται δικαιώματα Admin (αποφεύγει το UAC block)
PrivilegesRequired=lowest

ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\installer-output
OutputBaseFilename=LASCA_Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#MyAppExeName}
SetupIconFile=..\code\assets\lasca-icon.ico
ChangesAssociations=no

; 🟢 Διασφάλιση ομαλής ενημέρωσης όταν η εφαρμογή είναι ήδη ανοιχτή
CloseApplications=yes
RestartApplications=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"

[Files]
Source: "{#MyAppSource}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent
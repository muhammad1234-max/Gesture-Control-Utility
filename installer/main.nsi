!include "MUI2.nsh"

Name "Gesture Control Command Center"
OutFile "..\release\GestureControl_Setup.exe"
InstallDir "$PROGRAMFILES64\GestureControl"
RequestExecutionLevel admin

!define MUI_ABORTWARNING

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Copy all files from the release/GestureControl folder
  File /r "..\release\GestureControl\*"
  
  ; Create Start Menu Shortcut
  CreateDirectory "$SMPROGRAMS\Gesture Control"
  CreateShortcut "$SMPROGRAMS\Gesture Control\Gesture Control.lnk" "$INSTDIR\StartGestureControl.bat" "" "$INSTDIR\app\frontend\tray-icon.ico"
  
  ; Create Desktop Shortcut
  CreateShortcut "$DESKTOP\Gesture Control.lnk" "$INSTDIR\StartGestureControl.bat" "" "$INSTDIR\app\frontend\tray-icon.ico"
  
  ; Write uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  
  ; Write Registry keys for Add/Remove Programs
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GestureControl" "DisplayName" "Gesture Control Command Center"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GestureControl" "UninstallString" "$\"$INSTDIR\Uninstall.exe$\""
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GestureControl" "QuietUninstallString" "$\"$INSTDIR\Uninstall.exe$\" /S"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GestureControl" "Publisher" "Gesture Control Team"
SectionEnd

Section "Uninstall"
  ; Stop the running process if it exists
  nsExec::ExecToStack 'taskkill /F /IM node.exe'
  
  Delete "$DESKTOP\Gesture Control.lnk"
  Delete "$SMPROGRAMS\Gesture Control\Gesture Control.lnk"
  RMDir "$SMPROGRAMS\Gesture Control"
  
  ; Remove the installation directory
  RMDir /r "$INSTDIR"
  
  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GestureControl"
SectionEnd

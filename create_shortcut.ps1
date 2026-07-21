$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\Gesture Control Utility.lnk")
$Shortcut.TargetPath = "d:\Gesture-Control-Utility-main\release\win-unpacked\Gesture Control Utility.exe"
$Shortcut.WorkingDirectory = "d:\Gesture-Control-Utility-main\release\win-unpacked"
$Shortcut.IconLocation = "d:\Gesture-Control-Utility-main\release\win-unpacked\Gesture Control Utility.exe, 0"
$Shortcut.Save()
Write-Host "Shortcut created successfully at $DesktopPath\Gesture Control Utility.lnk"

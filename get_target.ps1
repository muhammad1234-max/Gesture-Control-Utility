$sh = New-Object -ComObject WScript.Shell
$shortcut = $sh.CreateShortcut("C:\Users\hp z book\Desktop\Gesture Control Utility.lnk")
Write-Output $shortcut.TargetPath
Write-Output $shortcut.Arguments

$sh = New-Object -ComObject WScript.Shell
$shortcut = $sh.CreateShortcut("C:\Users\hp z book\Desktop\Gesture Control Utility.lnk")
$shortcut.TargetPath = "D:\Gesture-Control-Utility-main\start.vbs"
$shortcut.WorkingDirectory = "D:\Gesture-Control-Utility-main"
$shortcut.IconLocation = "D:\Gesture-Control-Utility-main\public\tray-icon.ico"
$shortcut.Save()

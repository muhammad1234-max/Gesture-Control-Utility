@echo off
echo === Gesture Control Utility Environment Setup ===
powershell -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
if %ERRORLEVEL% neq 0 (
    echo Setup failed.
    exit /b %ERRORLEVEL%
)
echo Setup completed successfully.
pause

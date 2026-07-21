$ErrorActionPreference = "Stop"

Write-Host "=== Gesture Control Utility Environment Setup ==="
$PythonExe = "$env:USERPROFILE\AppData\Local\Programs\Python\Python311\python.exe"

if (-Not (Test-Path $PythonExe)) {
    # Check if py launcher can find 3.11
    $pyCheck = py -3.11 -c "import sys; print(sys.executable)" 2>$null
    if ($pyCheck) {
        $PythonExe = $pyCheck
    } else {
        Write-Host "Python 3.11 not found at $PythonExe. Please install Python 3.11." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Using Python: $PythonExe"

if (-Not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..."
    & $PythonExe -m venv .venv
}

Write-Host "Activating virtual environment and installing dependencies..."
& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt

Write-Host "Verifying MediaPipe Installation..."
$testCode = "import mediapipe.python.solutions; print('MediaPipe legacy solutions API verified successfully.')"
& ".\.venv\Scripts\python.exe" -c $testCode

if ($LASTEXITCODE -ne 0) {
    Write-Host "Verification failed." -ForegroundColor Red
    exit 1
}

Write-Host "Environment is ready! You can now run the application." -ForegroundColor Green

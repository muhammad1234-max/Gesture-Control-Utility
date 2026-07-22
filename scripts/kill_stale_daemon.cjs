const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[Build Pipeline Hardening] Checking file locks and terminating stale engine processes...');

try {
  if (process.platform === 'win32') {
    // 1. Force kill application executables
    execSync(`powershell -NoProfile -NonInteractive -Command "Stop-Process -Name 'Gesture Control Utility' -Force -ErrorAction SilentlyContinue"`, { stdio: 'ignore' });
    
    // 2. Force kill daemon processes
    execSync(`powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object {$_.Name -match 'python' -and $_.CommandLine -match 'daemon.py'} | Stop-Process -Force -ErrorAction SilentlyContinue"`, { stdio: 'ignore' });

    console.log('[Build Pipeline Hardening] Processes cleaned.');

    // 3. Verify Release directory lock status
    const releaseDir = path.join(__dirname, '../release/win-unpacked');
    if (fs.existsSync(releaseDir)) {
      try {
        const testFile = path.join(releaseDir, '.build_lock_check');
        fs.writeFileSync(testFile, 'lock_check');
        fs.unlinkSync(testFile);
        console.log('[Build Pipeline Hardening] Release directory unlocked and ready for packaging.');
      } catch (err) {
        console.error('[Build Pipeline Hardening ERROR] Release directory is LOCKED by a background process!');
        try {
          const lockCmd = `powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Select-Object ProcessId, Name, CommandLine | Where-Object {$_.CommandLine -match 'Gesture Control Utility'}"`;
          const out = execSync(lockCmd).toString();
          console.error('[Build Pipeline Hardening] Blocking Processes Detected:\n', out);
        } catch (e) {}
      }
    }
  }
} catch (e) {
  console.warn('[Build Pipeline Hardening Warning]:', e.message);
}

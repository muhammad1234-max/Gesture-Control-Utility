const fs = require('fs');
const { execSync } = require('child_process');

let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: 'pipe' }).toString().trim();
} catch (e) {}

const fingerprint = {
  BUILD_ID: `${Date.now()}-${commit}`,
  TIMESTAMP: new Date().toISOString(),
  COMMIT: commit,
  VERSION: process.env.npm_package_version || '1.0.0'
};

const jsonStr = JSON.stringify(fingerprint, null, 2);

fs.writeFileSync('public/fingerprint.json', jsonStr);
fs.writeFileSync('shared/fingerprint.json', jsonStr);
fs.writeFileSync('backend/daemon/fingerprint.json', jsonStr);

console.log('Generated Build Fingerprint:', fingerprint.BUILD_ID);

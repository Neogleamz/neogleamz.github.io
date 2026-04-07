const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const hooksDir = path.join(repoRoot, '.githooks');
const hookFile = path.join(hooksDir, 'pre-commit');

if (!fs.existsSync(hooksDir)) {
  fs.mkdirSync(hooksDir, { recursive: true });
}

const hookContents = `#!/usr/bin/env node
const { execSync } = require('child_process');

try {
  execSync('npm run version:bump', { stdio: 'inherit' });
  execSync('git add system-version.js index.html', { stdio: 'inherit' });
} catch (err) {
  console.error('Automatic version bump failed. Commit aborted.');
  process.exit(1);
}
`;

fs.writeFileSync(hookFile, hookContents, { mode: 0o755 });

try {
  execSync('git config core.hooksPath .githooks', { cwd: repoRoot, stdio: 'inherit' });
  console.log('Git hook installed to .githooks/pre-commit');
} catch (err) {
  console.error('Failed to configure git hooks path:', err.message);
  process.exit(1);
}

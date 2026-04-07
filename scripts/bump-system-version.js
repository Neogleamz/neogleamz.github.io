const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const versionFile = path.join(root, 'system-version.js');
const indexFile = path.join(root, 'index.html');

const pad = (value) => String(value).padStart(2, '0');
const now = new Date();
const newVersion = `v.${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}.${pad(now.getHours())}${pad(now.getMinutes())}`;

function updateSystemVersion() {
  const content = fs.readFileSync(versionFile, 'utf8');
  const updated = content.replace(/const\s+NEOGLEAMZ_VERSION\s*=\s*".*?";/, `const NEOGLEAMZ_VERSION = "${newVersion}";`);
  if (content === updated) throw new Error('Unable to find NEOGLEAMZ_VERSION line in system-version.js');
  fs.writeFileSync(versionFile, updated, 'utf8');
}

function updateIndexCacheBusting() {
  const content = fs.readFileSync(indexFile, 'utf8');
  const updated = content.replace(/\?v=v\.\d{4}\.\d{2}\.\d{2}\.\d{4}/g, `?v=${newVersion}`);
  if (content === updated) {
    console.warn('No cache-busting tags found in index.html to update.');
    return;
  }
  fs.writeFileSync(indexFile, updated, 'utf8');
}

try {
  updateSystemVersion();
  updateIndexCacheBusting();
  console.log(`System version bumped to ${newVersion}`);
} catch (error) {
  console.error('Version bump failed:', error.message);
  process.exit(1);
}

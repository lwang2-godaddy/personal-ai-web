const fs = require('fs');
const { execSync } = require('child_process');

function getGitCommitHash() {
  try {
    return execSync('git rev-parse --short=7 HEAD').toString().trim();
  } catch (error) {
    console.warn('Git not available, using fallback');
    return 'dev';
  }
}

function getPackageVersion() {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  return packageJson.version;
}

// Generate version info
const version = getPackageVersion();
const commitHash = getGitCommitHash();
const buildTime = new Date().toISOString();

const versionInfo = {
  version,
  commitHash,
  buildTime,
  fullVersion: `v${version} (${commitHash})`
};

fs.writeFileSync('./lib/generated-version.json', JSON.stringify(versionInfo, null, 2));
console.log(`Generated version: ${versionInfo.fullVersion}`);

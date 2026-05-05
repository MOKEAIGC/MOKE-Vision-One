import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, copyFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(projectRoot, 'release');
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const version = packageJson.version;
const requireAll = process.argv.includes('--require-all');

const artifactDefinitions = [
  {
    key: 'windows-x64',
    triple: 'x86_64-pc-windows-msvc',
    bundleDir: path.join('bundle', 'nsis'),
    extension: '.exe',
    outputName: `moke-vision-one-windows-x64-${version}-release.exe`,
  },
  {
    key: 'darwin-x64',
    triple: 'x86_64-apple-darwin',
    bundleDir: path.join('bundle', 'dmg'),
    extension: '.dmg',
    outputName: `moke-vision-one-darwin-x64-${version}-release.dmg`,
  },
  {
    key: 'darwin-arm64',
    triple: 'aarch64-apple-darwin',
    bundleDir: path.join('bundle', 'dmg'),
    extension: '.dmg',
    outputName: `moke-vision-one-darwin-arm64-${version}-release.dmg`,
  },
];

mkdirSync(releaseDir, { recursive: true });

function findLatestBundleArtifact(bundleRoot, extension) {
  if (!existsSync(bundleRoot)) {
    return null;
  }

  const candidates = readdirSync(bundleRoot)
    .filter((entry) => entry.toLowerCase().endsWith(extension) && !entry.toLowerCase().endsWith(`${extension}.sig`))
    .map((entry) => path.join(bundleRoot, entry))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);

  return candidates[0] || null;
}

function sha256(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

const publishedArtifacts = [];

for (const artifact of artifactDefinitions) {
  const bundleRoot = path.join(projectRoot, 'src-tauri', 'target', artifact.triple, 'release', artifact.bundleDir);
  const sourcePath = findLatestBundleArtifact(bundleRoot, artifact.extension);

  if (!sourcePath) {
    if (requireAll) {
      throw new Error(`Missing ${artifact.key} bundle under ${bundleRoot}`);
    }
    continue;
  }

  const destinationPath = path.join(releaseDir, artifact.outputName);
  copyFileSync(sourcePath, destinationPath);
  publishedArtifacts.push(destinationPath);
}

const sourceArchivePath = path.join(releaseDir, `moke-vision-one-source-${version}.zip`);
execFileSync('git', ['archive', '--format=zip', `--output=${sourceArchivePath}`, 'HEAD'], {
  cwd: projectRoot,
  stdio: 'inherit',
});
publishedArtifacts.push(sourceArchivePath);

const checksumPath = path.join(releaseDir, `moke-vision-one-checksums-${version}.txt`);
const checksumContent = publishedArtifacts
  .map((artifactPath) => `${sha256(artifactPath)}  ${path.basename(artifactPath)}`)
  .join('\n');
writeFileSync(checksumPath, `${checksumContent}\n`, 'utf8');

console.log('Prepared release artifacts:');
for (const artifactPath of publishedArtifacts) {
  console.log(`- ${path.relative(projectRoot, artifactPath)}`);
}
console.log(`- ${path.relative(projectRoot, checksumPath)}`);
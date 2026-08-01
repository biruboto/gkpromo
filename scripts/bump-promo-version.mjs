import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['promo.html', 'promo/app.js'].map(path => resolve(root, path));
const versionPattern = /^V(\d+)$/i;
const requestedVersion = process.argv[2]?.toUpperCase();
if (requestedVersion === '--HELP') {
  console.log('Usage: node scripts/bump-promo-version.mjs [V<number>]');
  process.exit(0);
}

const files = targets.map(path => ({ path, content: readFileSync(path, 'utf8') }));
const labelMatch = files[0].content.match(/BUILD (V\d+)/);
if (!labelMatch) throw new Error('Could not find the promo build label.');

const currentVersion = labelMatch[1];
const currentNumber = Number(versionPattern.exec(currentVersion)?.[1]);
if (!Number.isInteger(currentNumber)) throw new Error(`Invalid promo build label: ${currentVersion}`);

const nextVersion = requestedVersion || `V${currentNumber + 1}`;
if (!versionPattern.test(nextVersion)) throw new Error(`Invalid version: ${nextVersion}`);

for (const file of files) {
  const versions = [...file.content.matchAll(/[?&]v=(\d+)/g)].map(match => `V${match[1]}`);
  if (versions.some(version => version !== currentVersion)) {
    throw new Error(`${file.path} has cache keys that do not match ${currentVersion}.`);
  }
}

files[0].content = files[0].content.replace(`BUILD ${currentVersion}`, `BUILD ${nextVersion}`);
for (const file of files) file.content = file.content.replaceAll(`v=${currentNumber}`, `v=${nextVersion.slice(1)}`);
for (const file of files) writeFileSync(file.path, file.content);

console.log(`Promo build advanced from ${currentVersion} to ${nextVersion}.`);

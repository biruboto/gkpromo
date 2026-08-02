import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CELL_SIZE = 8;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arcadeDirectory = path.join(repositoryRoot, 'arcade');
const assetDirectory = path.join(repositoryRoot, 'assets', 'arcade-fonts');
const indexFile = path.join(arcadeDirectory, 'index.json');

function pngDimensions(buffer, file) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE) || buffer.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`${file} is not a readable PNG.`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colorType: buffer[25] };
}

function sourceDetails(file) {
  const stem = file.replace(/\.png$/i, '');
  const separator = stem.indexOf('-');
  const id = (separator === -1 ? stem : stem.slice(0, separator)).toLowerCase();
  let label = separator === -1 ? stem : stem.slice(separator + 1);
  const manufacturerMatch = label.match(/\s+\(([^()]*)\)$/);
  const manufacturer = manufacturerMatch?.[1] || '';
  if (manufacturerMatch) label = label.slice(0, manufacturerMatch.index);
  label = label.replace(/\.png$/i, '');
  return { id, name: label, manufacturer };
}

function variantLabel(index) {
  let label = '';
  for (let value = index; value >= 0; value = Math.floor(value / 26) - 1) label = String.fromCharCode(65 + value % 26) + label;
  return label;
}

async function buildIndex() {
  const files = (await readdir(arcadeDirectory)).filter(file => file.toLowerCase().endsWith('.png')).sort((left, right) => left.localeCompare(right, 'en'));
  const fonts = [];
  const rejected = [];
  const ids = new Set();

  for (const file of files) {
    const { width, height, colorType } = pngDimensions(await readFile(path.join(arcadeDirectory, file)), file);
    const details = sourceDetails(file);
    if (ids.has(details.id)) throw new Error(`Duplicate arcade font id: ${details.id}`);
    ids.add(details.id);
    if (!width || !height || width % CELL_SIZE || height % CELL_SIZE) {
      rejected.push({ ...details, file, width, height, reason: 'Sheet dimensions are not divisible by 8.' });
      continue;
    }
    const slotCount = width / CELL_SIZE;
    if (slotCount > 96) {
      rejected.push({ ...details, file, width, height, reason: 'Sheet contains more than 96 ASCII glyph slots.' });
      continue;
    }
    const variantCount = height / CELL_SIZE;
    fonts.push({ ...details, file, asset: `${details.id}.png`, width, height, slotCount, ...(colorType === 2 ? { transparentFromTopLeft: true } : {}), variants: Array.from({ length: variantCount }, (_, index) => variantLabel(index)) });
  }

  return {
    version: 1,
    cellSize: CELL_SIZE,
    characterStart: 32,
    fonts,
    rejected
  };
}

const index = await buildIndex();
const output = `${JSON.stringify(index, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const current = await readFile(indexFile, 'utf8').catch(() => '');
  const staleAssets = [];
  for (const font of index.fonts) {
    const source = await readFile(path.join(arcadeDirectory, font.file));
    const asset = await readFile(path.join(assetDirectory, font.asset)).catch(() => null);
    if (!asset?.equals(source)) staleAssets.push(font.asset);
  }
  if (current !== output || staleAssets.length) {
    console.error('arcade/index.json is out of date. Run node scripts/generate-arcade-font-index.mjs.');
    if (staleAssets.length) console.error(`${staleAssets.length} browser font assets are missing or stale.`);
    process.exitCode = 1;
  } else {
    console.log('Arcade font manifest and browser assets are current.');
  }
} else {
  await mkdir(assetDirectory, { recursive: true });
  await Promise.all(index.fonts.map(font => copyFile(path.join(arcadeDirectory, font.file), path.join(assetDirectory, font.asset))));
  await writeFile(indexFile, output);
  console.log(`Wrote ${path.relative(repositoryRoot, indexFile)} and ${index.fonts.length} browser assets.`);
}

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sources = {
  logo: { input: 'assets/images/gklogo.png', output: 'models/gk-logo-extrusion.glb', background: [24, 29, 48] },
  ship: { input: 'assets/images/ship.png', output: 'models/gk-hud-ship.glb', background: [255, 255, 255] }
};
const sourceName = process.argv[2] || 'logo'; const sourceConfig = sources[sourceName];
if (!sourceConfig) throw new Error(`Unknown extrusion source: ${sourceName}. Use logo or ship.`);
const sourcePath = resolve(root, sourceConfig.input); const outputPath = resolve(root, sourceConfig.output); const BACKGROUND = sourceConfig.background;

function decodePng(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) throw new Error('Expected a PNG source image.');
  let offset = 8, width = 0, height = 0, colorType = 0, bitDepth = 0; const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset); const type = buffer.subarray(offset + 4, offset + 8).toString('ascii'); const data = buffer.subarray(offset + 8, offset + 8 + length); offset += length + 12;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    if (type === 'IDAT') idat.push(data);
    if (type === 'IEND') break;
  }
  if (bitDepth !== 8 || ![2, 6].includes(colorType)) throw new Error('The generator expects an 8-bit RGB or RGBA PNG.');
  const compressed = inflateSync(Buffer.concat(idat)); const bytesPerPixel = colorType === 6 ? 4 : 3, stride = width * bytesPerPixel, decoded = Buffer.alloc(stride * height); let source = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = compressed[source++]; const row = decoded.subarray(y * stride, (y + 1) * stride); const previous = y ? decoded.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x += 1) {
      const value = compressed[source++], left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0, up = previous ? previous[x] : 0, upLeft = previous && x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      if (filter === 0) row[x] = value;
      else if (filter === 1) row[x] = (value + left) & 255;
      else if (filter === 2) row[x] = (value + up) & 255;
      else if (filter === 3) row[x] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) { const estimate = left + up - upLeft, distances = [Math.abs(estimate - left), Math.abs(estimate - up), Math.abs(estimate - upLeft)]; const predictor = distances[0] <= distances[1] && distances[0] <= distances[2] ? left : distances[1] <= distances[2] ? up : upLeft; row[x] = (value + predictor) & 255; }
      else throw new Error(`Unsupported PNG filter ${filter}.`);
    }
  }
  if (colorType === 6) return { width, height, pixels: decoded };
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) { decoded.copy(pixels, index * 4, index * 3, index * 3 + 3); pixels[index * 4 + 3] = 255; }
  return { width, height, pixels };
}

function buildGlb({ width, height, pixels }) {
  const filled = new Set();
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const index = (y * width + x) * 4; const visible = pixels[index + 3] > 0 && (pixels[index] !== BACKGROUND[0] || pixels[index + 1] !== BACKGROUND[1] || pixels[index + 2] !== BACKGROUND[2]); if (visible) filled.add(`${x},${y}`); }
  const positions = [], indices = [];
  const addFace = (points) => { const start = positions.length / 3; points.forEach(([x, y, z]) => positions.push(x, y, z)); indices.push(start, start + 1, start + 2, start, start + 2, start + 3); };
  const point = (x, y, z) => [x - width / 2, height / 2 - y, z]; const front = .75, back = -.75;
  filled.forEach(cell => {
    const [x, y] = cell.split(',').map(Number); const x1 = x + 1, y1 = y + 1;
    addFace([point(x, y, front), point(x1, y, front), point(x1, y1, front), point(x, y1, front)]);
    addFace([point(x1, y, back), point(x, y, back), point(x, y1, back), point(x1, y1, back)]);
    if (!filled.has(`${x - 1},${y}`)) addFace([point(x, y1, back), point(x, y, back), point(x, y, front), point(x, y1, front)]);
    if (!filled.has(`${x + 1},${y}`)) addFace([point(x1, y, back), point(x1, y1, back), point(x1, y1, front), point(x1, y, front)]);
    if (!filled.has(`${x},${y - 1}`)) addFace([point(x, y, back), point(x1, y, back), point(x1, y, front), point(x, y, front)]);
    if (!filled.has(`${x},${y + 1}`)) addFace([point(x, y1, back), point(x, y1, front), point(x1, y1, front), point(x1, y1, back)]);
  });
  const positionBuffer = Buffer.from(new Float32Array(positions).buffer); const indexBuffer = Buffer.from(new Uint32Array(indices).buffer); const positionOffset = 0, indexOffset = Math.ceil(positionBuffer.length / 4) * 4, binary = Buffer.alloc(indexOffset + indexBuffer.length); positionBuffer.copy(binary, positionOffset); indexBuffer.copy(binary, indexOffset);
  const json = { asset: { version: '2.0', generator: 'generate-gk-logo-extrusion.mjs' }, buffers: [{ byteLength: binary.length }], bufferViews: [{ buffer: 0, byteOffset: positionOffset, byteLength: positionBuffer.length, target: 34962 }, { buffer: 0, byteOffset: indexOffset, byteLength: indexBuffer.length, target: 34963 }], accessors: [{ bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: [-width / 2, -height / 2, back], max: [width / 2, height / 2, front] }, { bufferView: 1, componentType: 5125, count: indices.length, type: 'SCALAR', min: [0], max: [positions.length / 3 - 1] }], meshes: [{ name: sourceName === 'ship' ? 'GK Ship' : 'Ground Kontrol wordmark extrusion', primitives: [{ attributes: { POSITION: 0 }, indices: 1, mode: 4 }] }], nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0 };
  const jsonBuffer = Buffer.from(JSON.stringify(json)); const jsonPadding = (4 - jsonBuffer.length % 4) % 4, binaryPadding = (4 - binary.length % 4) % 4, totalLength = 12 + 8 + jsonBuffer.length + jsonPadding + 8 + binary.length + binaryPadding, glb = Buffer.alloc(totalLength); glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(totalLength, 8); glb.writeUInt32LE(jsonBuffer.length + jsonPadding, 12); glb.writeUInt32LE(0x4e4f534a, 16); jsonBuffer.copy(glb, 20); glb.fill(0x20, 20 + jsonBuffer.length, 20 + jsonBuffer.length + jsonPadding); const binaryHeader = 20 + jsonBuffer.length + jsonPadding; glb.writeUInt32LE(binary.length + binaryPadding, binaryHeader); glb.writeUInt32LE(0x004e4942, binaryHeader + 4); binary.copy(glb, binaryHeader + 8);
  return { glb, cells: filled.size, vertices: positions.length / 3 };
}

const source = decodePng(await readFile(sourcePath)); const model = buildGlb(source); await writeFile(outputPath, model.glb); console.log(`Wrote ${outputPath} from ${model.cells} ${sourceName} pixels (${model.vertices} vertices).`);

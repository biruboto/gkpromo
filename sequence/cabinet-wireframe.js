import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/loaders/OBJLoader.js';
import { SimplifyModifier } from 'https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/modifiers/SimplifyModifier.js';
import { mergeVertices } from 'https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/utils/BufferGeometryUtils.js';

function parseThreeDsMeshes(buffer) {
  const view = new DataView(buffer); const objects = [];
  function readChunks(start, end, parent = null) {
    for (let offset = start; offset + 6 <= end;) {
      const id = view.getUint16(offset, true); const length = view.getUint32(offset + 2, true); const data = offset + 6; const next = offset + length;
      if (length < 6 || next > end) return;
      if (id === 0x4000) {
        let nameEnd = data, name = ''; while (nameEnd < next && view.getUint8(nameEnd)) { name += String.fromCharCode(view.getUint8(nameEnd)); nameEnd += 1; }
        const object = { name, vertices: [], faces: [] }; objects.push(object); readChunks(nameEnd + 1, next, object);
      } else if (id === 0x4100) {
        readChunks(data, next, parent);
      } else if (id === 0x4110 && parent) {
        const count = view.getUint16(data, true);
        for (let index = 0, cursor = data + 2; index < count && cursor + 12 <= next; index += 1, cursor += 12) parent.vertices.push(view.getFloat32(cursor, true), view.getFloat32(cursor + 4, true), view.getFloat32(cursor + 8, true));
      } else if (id === 0x4120 && parent) {
        const count = view.getUint16(data, true);
        for (let index = 0, cursor = data + 2; index < count && cursor + 8 <= next; index += 1, cursor += 8) parent.faces.push(view.getUint16(cursor, true), view.getUint16(cursor + 2, true), view.getUint16(cursor + 4, true));
      } else if (id === 0x4d4d || id === 0x3d3d) {
        readChunks(data, next, parent);
      }
      offset = next;
    }
  }
  readChunks(0, view.byteLength); return objects.filter(object => object.vertices.length && object.faces.length);
}

function removeMonitorDanglers(geometry) {
  const positions = geometry.getAttribute('position').array; const degree = new Map(); const keyFor = index => `${Math.round(positions[index] * 1000)},${Math.round(positions[index + 1] * 1000)},${Math.round(positions[index + 2] * 1000)}`;
  for (let index = 0; index < positions.length; index += 6) { const first = keyFor(index), second = keyFor(index + 3); degree.set(first, (degree.get(first) || 0) + 1); degree.set(second, (degree.get(second) || 0) + 1); }
  const retained = [];
  for (let index = 0; index < positions.length; index += 6) {
    const first = keyFor(index), second = keyFor(index + 3); const dx = Math.abs(positions[index] - positions[index + 3]), dz = Math.abs(positions[index + 2] - positions[index + 5]);
    const length = Math.hypot(dx, positions[index + 1] - positions[index + 4], dz); const middleZ = (positions[index + 2] + positions[index + 5]) / 2;
    const monitorDangler = (degree.get(first) === 1 || degree.get(second) === 1) && length < 7 && dx > .2 && dz > .2 && middleZ > 35 && middleZ < 58;
    if (!monitorDangler) retained.push(...positions.slice(index, index + 6));
  }
  const filtered = new THREE.BufferGeometry(); filtered.setAttribute('position', new THREE.Float32BufferAttribute(retained, 3)); return filtered;
}

export function createWireframeCabinet({ width, height }) {
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(width, height, false); renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(38, width / height, .1, 100); const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100); const target = new THREE.Vector3(.25, .15, 0); const humanTarget = new THREE.Vector3(.38, -.06, 0);
    const cabinet = new THREE.Group(); cabinet.position.set(.38, -.06, 0); scene.add(cabinet);
    const proceduralCabinet = new THREE.Group(); const importedCabinet = new THREE.Group(); importedCabinet.visible = false; cabinet.add(proceduralCabinet, importedCabinet);
    const material = new THREE.LineBasicMaterial({ color: 0x00ddff, transparent: true, opacity: .65 });
    const point = (x, y, z) => new THREE.Vector3(x * .035, (y - 36.5) * .035, z * .035);
    const line = (points, closed = false) => { const geometry = new THREE.BufferGeometry().setFromPoints(closed ? [...points, points[0]] : points); proceduralCabinet.add(new THREE.Line(geometry, material)); };
    // No-art silhouette scaled from a 26in W x 30in D x 73in H upright cabinet.
    const profile = [[-15, 0], [15, 0], [15, 73], [-7, 73], [-8, 60], [-14, 35], [-20, 29], [-16, 18]].map(([z, y]) => ({ y, z }));
    const left = profile.map(({ y, z }) => point(-13, y, z)); const right = profile.map(({ y, z }) => point(13, y, z)); line(left, true); line(right, true);
    profile.forEach(({ y, z }) => line([point(-13, y, z), point(13, y, z)]));
    line([point(-10, 29, -20), point(10, 29, -20), point(10, 35, -14), point(-10, 35, -14)], true);
    line([point(-9, 36, -14), point(9, 36, -14), point(9, 57, -8), point(-9, 57, -8)], true);
    line([point(-10, 61, -8), point(10, 61, -8), point(10, 70, -7), point(-10, 70, -7)], true);
    line([point(-7, 5, -15), point(7, 5, -15), point(7, 17, -15), point(-7, 17, -15)], true);
    line([point(0, 31, -18), point(0, 38, -18)]); line([point(-5, 31, -18), point(5, 31, -18)]);
    let sourceLoadId = 0;
    function installImportedSource(source, loadId, sourceBounds = null, { normalization = 'height' } = {}) {
      source.updateMatrixWorld(true); const bounds = sourceBounds || new THREE.Box3().setFromObject(source); const size = bounds.getSize(new THREE.Vector3());
      const referenceSize = normalization === 'max' ? Math.max(size.x, size.y, size.z) : size.y;
      if (!referenceSize) throw new Error('Imported model has no visible size.');
      const scale = 2.55 / referenceSize; const center = bounds.getCenter(new THREE.Vector3()); source.scale.setScalar(scale); source.position.set(-center.x * scale, normalization === 'max' ? -center.y * scale : -bounds.min.y * scale - 1.27, -center.z * scale);
      if (loadId !== sourceLoadId) return false;
      importedCabinet.clear(); importedCabinet.add(source); importedCabinet.visible = true; proceduralCabinet.visible = false;
      return true;
    }
    async function loadSource(url, { excludeMeshes = [], removeDanglers = false, edgeThreshold = 12 } = {}) {
      const loadId = ++sourceLoadId;
      const response = await fetch(url); if (!response.ok) throw new Error(`model request returned ${response.status}`);
      const meshes = parseThreeDsMeshes(await response.arrayBuffer()); const wireMeshes = meshes.filter(object => !excludeMeshes.includes(object.name));
      if (!wireMeshes.length) throw new Error('The imported model did not contain usable mesh data.');
      const source = new THREE.Group(); wireMeshes.forEach(object => {
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(object.vertices, 3)); geometry.setIndex(object.faces);
        const edges = new THREE.EdgesGeometry(geometry, edgeThreshold);
        source.add(new THREE.LineSegments(removeDanglers ? removeMonitorDanglers(edges) : edges, material));
      });
      if (!source.children.length) throw new Error('The model did not contain triangle geometry.');
      source.rotation.x = -Math.PI / 2; return installImportedSource(source, loadId);
    }
    async function loadFbxSource(url, { targetVertices = 180, edgeThreshold = 1 } = {}) {
      const loadId = ++sourceLoadId; const response = await fetch(url); if (!response.ok) throw new Error(`model request returned ${response.status}`);
      const parsed = new FBXLoader().parse(await response.arrayBuffer(), './models/'); parsed.updateMatrixWorld(true); const source = new THREE.Group();
      parsed.traverse(object => {
        if (!object.isMesh || !object.geometry) return;
        const mergedGeometry = mergeVertices(object.geometry.clone().applyMatrix4(object.matrixWorld)); const removalCount = Math.max(0, mergedGeometry.getAttribute('position').count - targetVertices);
        const geometry = removalCount ? new SimplifyModifier().modify(mergedGeometry, removalCount) : mergedGeometry; source.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, edgeThreshold), material));
      });
      if (!source.children.length) throw new Error('The FBX did not contain usable mesh geometry.');
      return installImportedSource(source, loadId);
    }
    async function loadObjSource(url, { targetVertices = 260, edgeThreshold = 1 } = {}) {
      const loadId = ++sourceLoadId; const response = await fetch(url); if (!response.ok) throw new Error(`model request returned ${response.status}`);
      const parsed = new OBJLoader().parse(await response.text()); parsed.updateMatrixWorld(true); const source = new THREE.Group();
      parsed.traverse(object => {
        if (!object.isMesh || !object.geometry) return;
        const mergedGeometry = mergeVertices(object.geometry.clone().applyMatrix4(object.matrixWorld)); const removalCount = Math.max(0, mergedGeometry.getAttribute('position').count - targetVertices);
        const geometry = removalCount ? new SimplifyModifier().modify(mergedGeometry, removalCount) : mergedGeometry; source.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, edgeThreshold), material));
      });
      if (!source.children.length) throw new Error('The OBJ did not contain usable mesh geometry.');
      return installImportedSource(source, loadId);
    }
    async function loadGlbSource(url, { targetVertices = 500, edgeThreshold = 1, normalization = 'height' } = {}) {
      const loadId = ++sourceLoadId; const response = await fetch(url); if (!response.ok) throw new Error(`model request returned ${response.status}`);
      const buffer = await response.arrayBuffer(); const parsed = await new Promise((resolve, reject) => new GLTFLoader().parse(buffer, './models/', resolve, reject));
      parsed.scene.updateMatrixWorld(true); const source = new THREE.Group();
      parsed.scene.traverse(object => {
        if (!object.isMesh || !object.geometry) return;
        const mergedGeometry = mergeVertices(object.geometry.clone().applyMatrix4(object.matrixWorld)); const removalCount = Math.max(0, mergedGeometry.getAttribute('position').count - targetVertices);
        const geometry = removalCount ? new SimplifyModifier().modify(mergedGeometry, removalCount) : mergedGeometry; source.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, edgeThreshold), material));
      });
      if (!source.children.length) throw new Error('The GLB did not contain usable mesh geometry.');
      return installImportedSource(source, loadId, null, { normalization });
    }
    let lastColor = null; let lastOpacity = null;
    function resize(nextWidth, nextHeight) {
      width = Math.max(1, Math.round(nextWidth)); height = Math.max(1, Math.round(nextHeight));
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    }
    function render({ color = '#00ddff', opacity = .65, elapsed = 0, yaw = -.62, pitch = 0, zoom = 1, cameraPitch = 0, cameraOrbit = 0, projection = 'perspective', wobble = true } = {}) {
      const safeZoom = Math.max(.45, Math.min(4.5, zoom)); const baseDistance = Math.hypot(3.6, 2.5, 6.2);
      const azimuth = Math.atan2(6.2, 3.6) + cameraOrbit; const elevation = Math.max(-1.35, Math.min(1.35, Math.asin(2.5 / baseDistance) + cameraPitch));
      const cosElevation = Math.cos(elevation), sinElevation = Math.sin(elevation), cosAzimuth = Math.cos(azimuth), sinAzimuth = Math.sin(azimuth);
      const baseX = baseDistance * cosElevation * cosAzimuth, baseY = baseDistance * sinElevation, baseZ = baseDistance * cosElevation * sinAzimuth;
      const activeTarget = projection === 'orthographic' ? humanTarget : target;
      camera.position.set(baseX / safeZoom, baseY / safeZoom, baseZ / safeZoom); camera.lookAt(activeTarget);
      if (projection === 'orthographic') {
        const halfHeight = 1.52 / safeZoom; orthographicCamera.left = -halfHeight * width / height; orthographicCamera.right = halfHeight * width / height; orthographicCamera.top = halfHeight; orthographicCamera.bottom = -halfHeight; orthographicCamera.position.set(baseX, baseY, baseZ); orthographicCamera.lookAt(activeTarget); orthographicCamera.updateProjectionMatrix();
      }
      if (color !== lastColor) { material.color.set(color); lastColor = color; }
      const clampedOpacity = Math.max(0, Math.min(1, opacity)); if (clampedOpacity !== lastOpacity) { material.opacity = clampedOpacity; lastOpacity = clampedOpacity; }
      cabinet.rotation.y = yaw + (wobble ? Math.sin(elapsed * .62) * .14 : 0); cabinet.rotation.x = pitch + (wobble ? Math.sin(elapsed * .44) * .035 : 0);
      renderer.clear(); renderer.render(scene, projection === 'orthographic' ? orthographicCamera : camera); return renderer.domElement;
    }
    return { canvas: renderer.domElement, loadSource, loadFbxSource, loadObjSource, loadGlbSource, render, resize };
  } catch (error) {
    console.warn('Wireframe cabinet unavailable:', error);
    return null;
  }
}

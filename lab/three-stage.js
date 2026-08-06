import * as THREE from './three.module.js';

export function createThreeStage({ width, height, host, clearColor = '#050914' }) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.setClearColor(clearColor, 1);
  renderer.domElement.className = 'three-layer';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);

  function resize(nextWidth, nextHeight) {
    renderer.setSize(nextWidth, nextHeight, false);
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
  }

  function render() {
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { renderer, scene, camera, canvas: renderer.domElement, resize, render, dispose };
}

export function createStarfield({ scene, count = 110, width = 256, height = 160, color = '#8fa6e8' }) {
  const positions = new Float32Array(count * 3);
  const depths = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.sin(index * 91.71) * 0.5 + 0.5) * 7 - 3.5;
    positions[index * 3 + 1] = (Math.sin(index * 47.13 + 1) * 0.5 + 0.5) * 4.4 - 2.2;
    positions[index * 3 + 2] = -1 - (Math.sin(index * 17.39 + 2) * 0.5 + 0.5) * 8;
    depths[index] = 0.25 + (Math.sin(index * 13.27 + 4) * 0.5 + 0.5) * 0.75;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size: 0.09, transparent: true, opacity: 0.7 });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  function update(elapsed) {
    const attribute = geometry.getAttribute('position');
    for (let index = 0; index < count; index += 1) {
      const baseY = (Math.sin(index * 47.13 + 1) * 0.5 + 0.5) * 4.4 - 2.2;
      attribute.array[index * 3 + 1] = ((baseY + elapsed * (0.03 + depths[index] * 0.08) + 2.2) % 4.4) - 2.2;
    }
    attribute.needsUpdate = true;
  }

  return { points, update, width, height };
}

export function createWireframeShip({ scene, color = '#79e7ff' }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -1.6, 0, 0, 1.55, 0, 0,
    -0.8, 0.22, 0, 0.65, 0.22, 0,
    -0.8, -0.22, 0, 0.65, -0.22, 0,
    -0.45, 0, 0, 0.35, 0, 0.52,
    -0.45, 0, 0, 0.35, 0, -0.52,
    -0.75, 0.22, 0, -1.15, 0.58, 0,
    -1.15, 0.58, 0, -0.55, 0.42, 0,
    -0.75, -0.22, 0, -1.15, -0.58, 0,
    -1.15, -0.58, 0, -0.55, -0.42, 0,
    0.65, 0.22, 0, 1.55, 0, 0,
    0.65, -0.22, 0, 1.55, 0, 0,
    -0.2, 0.14, 0.45, -0.2, -0.14, 0.45,
    -0.2, 0.14, -0.45, -0.2, -0.14, -0.45
  ], 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.36 });
  const ship = new THREE.LineSegments(geometry, material);
  ship.position.set(0.8, 0.1, -2.3);
  ship.scale.setScalar(0.72);
  scene.add(ship);

  function update(elapsed) {
    ship.rotation.y = -0.42 + Math.sin(elapsed * 0.42) * 0.16;
    ship.rotation.x = Math.sin(elapsed * 0.34) * 0.05;
    ship.position.y = 0.1 + Math.sin(elapsed * 0.7) * 0.08;
    material.opacity = 0.24 + (Math.sin(elapsed * 2.1) * 0.5 + 0.5) * 0.18;
  }

  return { ship, update };
}

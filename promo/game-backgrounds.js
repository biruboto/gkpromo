import { createWireframeCabinet } from '../sequence/cabinet-wireframe.js?v=29';

export const MODEL_SOURCES = {
  asteroids: { label: 'Asteroids upright', url: './models/asteroids.3ds', excludeMeshes: ['Mesh09'], removeDanglers: true },
  elvira: { label: 'Elvira', url: './models/elvira.3ds' },
  ironman: { label: 'Iron Man pinball', url: './models/ironman.3ds' },
  gklogo: { label: 'Ground Kontrol extrusion', url: './models/gk-logo-extrusion.glb', format: 'glb', normalization: 'max' },
  gkship: { label: 'GK Ship', url: './models/gk-hud-ship.glb?v=2', format: 'glb' },
  neogeo: { label: 'Neo Geo arcade cabinet', url: './models/neo-geo_arcade_cabinet.glb', format: 'glb', targetVertices: 500 },
  pacman: { label: 'Pac-Man arcade cabinet', url: './models/pac-man_arcade_cabinet.glb', format: 'glb', targetVertices: 500 },
};

export function createGameBackgrounds({ context: ctx, width: initialWidth, height: initialHeight, images: moonLanderImages, getStyle, getModel, getModelSettings }) {
  let W = initialWidth, H = initialHeight;
  const MODEL_BACKGROUND_OPACITY = .48;
  const moonLanderTintCache = new Map();
  const random = value => { const sample = Math.sin(value * 12.9898 + 78.233) * 43758.5453; return sample - Math.floor(sample); };
  let stars = [], seed = 1;
  function resetStars() {
    seed += 1;
    stars = Array.from({ length: 120 }, (_, index) => ({ x: Math.floor(random(seed * 101 + index * 3) * W), y: Math.floor(random(seed * 103 + index * 3 + 1) * H), z: .2 + random(seed * 107 + index * 3 + 2) }));
  }
  function resize(width, height) {
    if (width === W && height === H) return;
    W = width; H = height;
    stars = Array.from({ length: 120 }, (_, index) => ({ x: Math.floor(random(seed * 101 + index * 3) * W), y: Math.floor(random(seed * 103 + index * 3 + 1) * H), z: .2 + random(seed * 107 + index * 3 + 2) }));
    asteroidsGame = null;
    wireframeCabinet?.resize(Math.round(W / 3), Math.round(H / 3));
  }
  const VECTOR_DIRECTION_STEPS = 64;
  // Proportions follow the original DVG ShipDir0 and ThrustDir0 vector paths.
  const VECTOR_SHIP = [[-5, -3], [-5, 3], [-8, 6], [11, 0], [-8, -6], [-5, -3]];
  const VECTOR_THRUST = [[-5, -3], [-11, 0], [-5, 3]];
  // Proportions follow the original DVG saucer path, including its separate visor line.
  const VECTOR_SAUCER_VISOR = [[-4, -2], [4, -2]];
  const VECTOR_SAUCER_HULL = [[10, 2], [-10, 2], [-4, 6], [4, 6], [10, 2], [4, -2], [2, -6], [-2, -6], [-4, -2], [-10, 2]];
  const VECTOR_ASTEROIDS = [
    [[-10, -8], [-4, -11], [3, -9], [10, -5], [8, 1], [11, 7], [4, 10], [-3, 8], [-9, 10], [-11, 3], [-8, -2]],
    [[-7, -11], [1, -9], [7, -11], [11, -4], [7, 2], [10, 8], [2, 10], [-4, 7], [-11, 5], [-9, -2], [-11, -7]],
    [[-10, -4], [-5, -10], [2, -8], [9, -10], [11, -2], [7, 4], [9, 9], [1, 10], [-6, 8], [-11, 2], [-7, -1]],
    [[-8, -10], [-1, -8], [6, -11], [10, -5], [8, 1], [11, 6], [5, 10], [-2, 8], [-8, 10], [-11, 4], [-9, -3]]
  ];
  function wrapped(value, limit) { return ((value % limit) + limit) % limit; }
  function vectorAngle(angle) { return Math.round(angle / (Math.PI * 2) * VECTOR_DIRECTION_STEPS) / VECTOR_DIRECTION_STEPS * Math.PI * 2; }
  function vectorOffsets(x, y, radius) {
    const xOffsets = x < radius ? [0, W] : x > W - radius ? [0, -W] : [0];
    const yOffsets = y < radius ? [0, H] : y > H - radius ? [0, -H] : [0];
    return xOffsets.flatMap(offsetX => yOffsets.map(offsetY => ({ x: offsetX, y: offsetY })));
  }
  function vectorPath(points, x, y, angle = 0, close = true) {
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    ctx.beginPath();
    points.forEach(([pointX, pointY], index) => {
      const drawX = Math.round(x + pointX * cosine - pointY * sine);
      const drawY = Math.round(y + pointX * sine + pointY * cosine);
      if (index === 0) ctx.moveTo(drawX, drawY); else ctx.lineTo(drawX, drawY);
    });
    if (close) ctx.closePath();
    ctx.stroke();
  }
  function drawVectorShip(x, y, angle, thrust) {
    const direction = vectorAngle(angle);
    vectorOffsets(x, y, 14).forEach(offset => vectorPath(VECTOR_SHIP, x + offset.x, y + offset.y, direction, false));
    if (!thrust) return;
    vectorOffsets(x, y, 14).forEach(offset => vectorPath(VECTOR_THRUST, x + offset.x, y + offset.y, direction, false));
  }
  function drawVectorAsteroid(id, x, y, radius) {
    const scale = radius / 11;
    const points = VECTOR_ASTEROIDS[id % VECTOR_ASTEROIDS.length].map(([pointX, pointY]) => [pointX * scale, pointY * scale]);
    vectorOffsets(x, y, radius + 2).forEach(offset => vectorPath(points, x + offset.x, y + offset.y));
  }
  function drawVectorSaucer(x, y) {
    vectorOffsets(x, y, 13).forEach(offset => {
      vectorPath(VECTOR_SAUCER_VISOR, x + offset.x, y + offset.y, 0, false);
      vectorPath(VECTOR_SAUCER_HULL, x + offset.x, y + offset.y, 0, false);
    });
  }
  function drawVectorShot(x, y) {
    vectorOffsets(x, y, 1).forEach(offset => ctx.fillRect(Math.round(x + offset.x), Math.round(y + offset.y), 1, 1));
  }
  function drawVectorShrapnel(x, y, age) {
    const distance = 3 + age * 26;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([directionX, directionY], index) => {
      const startX = x + directionX * distance, startY = y + directionY * distance;
      const endX = startX + directionX * (2 + index % 2), endY = startY + directionY * (2 + (index + 1) % 2);
      vectorPath([[startX, startY], [endX, endY]], 0, 0, 0, false);
    });
  }
  function wrappedDelta(from, to, limit) {
    const delta = to - from;
    return delta > limit / 2 ? delta - limit : delta < -limit / 2 ? delta + limit : delta;
  }
  function wrappedDistance(first, second) {
    return Math.hypot(wrappedDelta(first.x, second.x, W), wrappedDelta(first.y, second.y, H));
  }
  function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
  function asteroidWave(wave) {
    return Array.from({ length: 4 }, (_, index) => {
      const angle = random(wave * 29 + index * 7) * Math.PI * 2;
      const speed = 11 + random(wave * 31 + index * 11) * 10;
      return {
        shape: wave + index,
        x: 90 + random(wave * 37 + index * 13) * (W - 180), y: 78 + random(wave * 41 + index * 17) * (H - 156),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 25 + random(wave * 43 + index * 19) * 10
      };
    });
  }
  function createAsteroidsGame() {
    return {
      lastTime: null, wave: 1, waveDelay: 0, rocks: asteroidWave(1), shots: [], effects: [],
      ship: { x: 88, y: 493, vx: 22, vy: -12, angle: .35, cooldown: .35, respawn: 0, thrust: false },
      saucer: { x: W - 56, y: 180, vx: -31, cooldown: 2.2, respawn: 0 }
    };
  }
  let asteroidsGame = null;
  function addImpact(game, x, y) { game.effects.push({ x, y, age: 0, life: .34 }); }
  function splitAsteroid(game, rock) {
    addImpact(game, rock.x, rock.y);
    if (rock.radius < 14) return;
    [-1, 1].forEach((direction, index) => {
      const angle = Math.atan2(rock.vy, rock.vx) + direction * (.72 + index * .14);
      const speed = Math.hypot(rock.vx, rock.vy) * 1.23 + 7;
      game.rocks.push({ shape: rock.shape + index + 1, x: rock.x, y: rock.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: rock.radius * .58 });
    });
  }
  function fireShot(game, owner, x, y, angle) {
    const speed = owner === 'ship' ? 170 : 126;
    game.shots.push({ owner, x: wrapped(x + Math.cos(angle) * 12, W), y: wrapped(y + Math.sin(angle) * 12, H), vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: owner === 'ship' ? 1.15 : 1.45 });
  }
  function destroyShip(game) {
    const ship = game.ship;
    if (ship.respawn) return;
    addImpact(game, ship.x, ship.y); ship.respawn = .72; ship.vx = 0; ship.vy = 0; ship.thrust = false;
  }
  function safeShipSpawn(game) {
    const candidates = [{ x: 92, y: 500 }, { x: W - 78, y: H - 94 }, { x: 84, y: 116 }, { x: W - 96, y: 154 }, { x: W / 2, y: H - 86 }];
    return candidates.reduce((safest, candidate) => {
      const candidateDistance = game.rocks.reduce((nearest, rock) => Math.min(nearest, wrappedDistance(candidate, rock) - rock.radius), Infinity);
      const safestDistance = game.rocks.reduce((nearest, rock) => Math.min(nearest, wrappedDistance(safest, rock) - rock.radius), Infinity);
      return candidateDistance > safestDistance ? candidate : safest;
    }, candidates[0]);
  }
  function updateAsteroidsGame(time) {
    if (!asteroidsGame) asteroidsGame = createAsteroidsGame();
    const game = asteroidsGame;
    if (game.lastTime === null) { game.lastTime = time; return game; }
    const dt = clamp(time - game.lastTime, 0, .05); game.lastTime = time;
    game.effects = game.effects.filter(effect => (effect.age += dt) < effect.life);
    game.rocks.forEach(rock => { rock.x = wrapped(rock.x + rock.vx * dt, W); rock.y = wrapped(rock.y + rock.vy * dt, H); });

    const ship = game.ship;
    if (ship.respawn > 0) {
      ship.respawn -= dt;
      if (ship.respawn <= 0) {
        const spawn = safeShipSpawn(game);
        ship.respawn = 0; ship.x = spawn.x; ship.y = spawn.y; ship.angle = .2; ship.vx = 19; ship.vy = -9; ship.cooldown = .32;
      }
    } else if (game.rocks.length) {
      const nearest = game.rocks.reduce((best, rock) => wrappedDistance(ship, rock) < wrappedDistance(ship, best) ? rock : best, game.rocks[0]);
      const distance = wrappedDistance(ship, nearest);
      const lead = distance / 170;
      const targetX = wrappedDelta(ship.x, nearest.x, W) + nearest.vx * lead;
      const targetY = wrappedDelta(ship.y, nearest.y, H) + nearest.vy * lead;
      const threat = game.rocks.find(rock => wrappedDistance(ship, rock) < rock.radius + 58);
      const desiredAngle = threat ? Math.atan2(-wrappedDelta(ship.y, threat.y, H), -wrappedDelta(ship.x, threat.x, W)) : Math.atan2(targetY, targetX);
      const turn = Math.atan2(Math.sin(desiredAngle - ship.angle), Math.cos(desiredAngle - ship.angle));
      ship.angle += clamp(turn, -2.25 * dt, 2.25 * dt);
      const speedBeforeThrust = Math.hypot(ship.vx, ship.vy);
      ship.thrust = Boolean(threat) || (distance > 72 && Math.abs(turn) < .78) || speedBeforeThrust < 24;
      if (ship.thrust) { ship.vx += Math.cos(ship.angle) * 25 * dt; ship.vy += Math.sin(ship.angle) * 25 * dt; }
      const speed = Math.hypot(ship.vx, ship.vy);
      if (speed > 62) { ship.vx *= 62 / speed; ship.vy *= 62 / speed; }
      ship.x = wrapped(ship.x + ship.vx * dt, W); ship.y = wrapped(ship.y + ship.vy * dt, H);
      ship.cooldown -= dt;
      const aimError = Math.abs(Math.atan2(Math.sin(desiredAngle - ship.angle), Math.cos(desiredAngle - ship.angle)));
      if (ship.cooldown <= 0 && !threat && aimError < .2 && distance < 280) { fireShot(game, 'ship', ship.x, ship.y, ship.angle); ship.cooldown = .34; }
    }

    const saucer = game.saucer;
    if (saucer.respawn > 0) { saucer.respawn = Math.max(0, saucer.respawn - dt); }
    else {
      saucer.x = wrapped(saucer.x + saucer.vx * dt, W); saucer.y = clamp(saucer.y + Math.sin(time * 1.45) * 11 * dt, 74, H - 72); saucer.cooldown -= dt;
      if (saucer.cooldown <= 0 && !ship.respawn) {
        const aim = Math.atan2(wrappedDelta(saucer.y, ship.y, H), wrappedDelta(saucer.x, ship.x, W));
        fireShot(game, 'saucer', saucer.x, saucer.y, aim + (random(Math.floor(time * 10)) - .5) * .72); saucer.cooldown = 2.1;
      }
    }

    game.shots = game.shots.filter(shot => {
      shot.life -= dt; shot.x = wrapped(shot.x + shot.vx * dt, W); shot.y = wrapped(shot.y + shot.vy * dt, H);
      if (shot.owner === 'ship') {
        const hit = game.rocks.find(rock => wrappedDistance(shot, rock) < rock.radius);
        if (hit) { game.rocks.splice(game.rocks.indexOf(hit), 1); splitAsteroid(game, hit); return false; }
        if (!saucer.respawn && wrappedDistance(shot, saucer) < 14) { addImpact(game, saucer.x, saucer.y); saucer.respawn = 3.2; return false; }
      } else if (!ship.respawn && wrappedDistance(shot, ship) < 8) { destroyShip(game); return false; }
      return shot.life > 0;
    });
    if (!ship.respawn && game.rocks.some(rock => wrappedDistance(ship, rock) < rock.radius + 7)) destroyShip(game);
    if (!game.rocks.length) {
      game.waveDelay += dt;
      if (game.waveDelay > 1.1) { game.wave += 1; game.waveDelay = 0; game.rocks = asteroidWave(game.wave); }
    }
    return game;
  }
  function drawAsteroidsBackground(palette, time) {
    const game = updateAsteroidsGame(time);
    ctx.save();
    ctx.strokeStyle = palette.text; ctx.fillStyle = palette.text; ctx.lineWidth = 1;
    ctx.globalAlpha = .31;
    game.rocks.forEach(rock => drawVectorAsteroid(rock.shape, rock.x, rock.y, rock.radius));
    game.effects.forEach(effect => { ctx.globalAlpha = .46 * (1 - effect.age / effect.life); drawVectorShrapnel(effect.x, effect.y, effect.age / effect.life); });
    ctx.globalAlpha = .58;
    if (game.saucer.respawn <= 0) drawVectorSaucer(game.saucer.x, game.saucer.y);
    game.shots.forEach(shot => { ctx.globalAlpha = shot.owner === 'ship' ? .68 : .54; drawVectorShot(shot.x, shot.y); });
    if (game.ship.respawn <= 0 || Math.floor(time * 12) % 2 === 0) {
      ctx.globalAlpha = .62 * (game.ship.respawn > 0 ? .52 : 1);
      drawVectorShip(game.ship.x, game.ship.y, game.ship.angle, game.ship.thrust && !game.ship.respawn);
    }
    ctx.restore();
  }
  function drawStarfieldBackground(palette, time) {
    stars.forEach((star, index) => {
      ctx.globalAlpha = .22 + star.z * .68; ctx.fillStyle = index % 11 === 0 ? palette.accent : index % 3 === 0 ? palette.text : palette.muted;
      ctx.fillRect(star.x, Math.floor((star.y + time * (6 + star.z * 19)) % H), star.z > .72 ? 2 : 1, star.z > .9 ? 2 : 1);
    });
    ctx.globalAlpha = 1;
  }
  const MOON_LANDER_SCALE = 4;
  function tintedMoonLanderLayer(name, color) {
    const image = moonLanderImages[name];
    if (!image.complete || !image.naturalWidth) return null;
    const cacheKey = `${name}:${color}`;
    if (moonLanderTintCache.has(cacheKey)) return moonLanderTintCache.get(cacheKey);
    const layer = document.createElement('canvas'); layer.width = image.naturalWidth; layer.height = image.naturalHeight;
    const layerCtx = layer.getContext('2d'); layerCtx.drawImage(image, 0, 0);
    const pixels = layerCtx.getImageData(0, 0, layer.width, layer.height);
    const target = color.match(/\w\w/g).map(value => Number.parseInt(value, 16));
    for (let index = 0; index < pixels.data.length; index += 4) {
      if (!pixels.data[index + 3]) continue;
      const luminance = (pixels.data[index] * .299 + pixels.data[index + 1] * .587 + pixels.data[index + 2] * .114) / 255;
      const shade = .3 + luminance * .7;
      pixels.data[index] = Math.round(target[0] * shade); pixels.data[index + 1] = Math.round(target[1] * shade); pixels.data[index + 2] = Math.round(target[2] * shade);
    }
    layerCtx.putImageData(pixels, 0, 0); moonLanderTintCache.set(cacheKey, layer); return layer;
  }
  function drawTiledMoonLanderLayer(image, y, time, speed) {
    if (!image || (image.complete === false) || !(image.naturalWidth || image.width)) return;
    const tileWidth = (image.naturalWidth || image.width) * MOON_LANDER_SCALE;
    const tileHeight = (image.naturalHeight || image.height) * MOON_LANDER_SCALE;
    const offset = (time * speed) % tileWidth;
    for (let x = -tileWidth - offset; x < W + tileWidth; x += tileWidth) ctx.drawImage(image, Math.round(x), y, tileWidth, tileHeight);
  }
  function drawMoonLanderBackground(palette, time) {
    const mountainY = H - (moonLanderImages.mountain.naturalHeight || 128) * MOON_LANDER_SCALE;
    drawTiledMoonLanderLayer(tintedMoonLanderLayer('mountain', palette.muted), mountainY, time, 12);
    drawTiledMoonLanderLayer(tintedMoonLanderLayer('city', palette.accent), mountainY + 46 * MOON_LANDER_SCALE, time, 29);
  }
  let wireframeCabinet = null;
  let loadedModelId = null;
  let loadingModelId = null;
  let failedModelId = null;
  function loadSelectedModel(modelId, settings) {
    const source = MODEL_SOURCES[modelId] || MODEL_SOURCES.asteroids;
    const modelKey = `${modelId}:${settings.edgeThreshold}:${settings.targetVertices}`;
    if (!wireframeCabinet || loadingModelId === modelKey || loadedModelId === modelKey || failedModelId === modelKey) return;
    loadingModelId = modelKey;
    const loadOptions = { ...source, edgeThreshold: settings.edgeThreshold, targetVertices: settings.targetVertices };
    const load = source.format === 'fbx' ? wireframeCabinet.loadFbxSource(source.url, loadOptions) : source.format === 'obj' ? wireframeCabinet.loadObjSource(source.url, loadOptions) : source.format === 'glb' ? wireframeCabinet.loadGlbSource(source.url, loadOptions) : wireframeCabinet.loadSource(source.url, loadOptions);
    load.then(applied => {
      if (applied) { loadedModelId = modelKey; failedModelId = null; }
    }).catch(() => {
      failedModelId = modelKey;
    }).finally(() => {
      if (loadingModelId === modelKey) loadingModelId = null;
    });
  }
  function drawModelBackground(palette, time) {
    if (!wireframeCabinet) {
      wireframeCabinet = createWireframeCabinet({ width: Math.round(W / 3), height: Math.round(H / 3) });
    }
    if (!wireframeCabinet) return;
    const modelId = getModel?.() || 'asteroids';
    const modelSettings = getModelSettings?.() || { edgeThreshold: 1, targetVertices: 500, opacity: 48 };
    loadSelectedModel(modelId, modelSettings);
    const cameraOrbit = Math.sin(time * 0.22) * 75;
    const cameraPitch = Math.cos(time * 0.15) * 28;
    const zoom = Math.max(45, Math.min(450, 140 * (1 + Math.sin(time * 0.35) * 0.25)));
    const yaw = ((time * 30 + 180) % 360) - 180;
    const frameCanvas = wireframeCabinet.render({
      color: palette.accent,
      opacity: 1,
      elapsed: time,
      yaw: yaw * Math.PI / 180,
      pitch: 0,
      zoom: zoom / 100,
      cameraPitch: cameraPitch * Math.PI / 180,
      cameraOrbit: cameraOrbit * Math.PI / 180,
      projection: 'perspective',
      wobble: false
    });
    ctx.save();
    ctx.globalAlpha = MODEL_BACKGROUND_OPACITY * modelSettings.opacity / 100;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frameCanvas, 0, 0, W, H);
    ctx.restore();
  }
  function drawGameBackground(palette, time) {
    if (getStyle() === 'asteroids') drawAsteroidsBackground(palette, time);
    else if (getStyle() === 'moon-patrol') drawMoonLanderBackground(palette, time);
    else if (getStyle() === 'model') drawModelBackground(palette, time);
    else drawStarfieldBackground(palette, time);
  }
  resetStars();
  return { draw: drawGameBackground, reset: resetStars, resize };
}

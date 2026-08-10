import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D(() => 0.4271);

const WORLD_SIZE = 3600;
const SEGMENTS = 220;

function fractalNoise(x, z, octaves = 5, freq = 0.0016, amp = 1, lac = 2.05, gain = 0.5) {
  let sum = 0, a = amp, f = freq, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2D(x * f, z * f) * a;
    norm += a;
    a *= gain;
    f *= lac;
  }
  return sum / norm;
}

// Height field shared by terrain mesh + gameplay collision queries.
export function heightAt(x, z) {
  const r = Math.sqrt(x * x + z * z);
  // Keep the spawn/landing area clear and flat; ramp full terrain roughness in beyond it.
  const flatten = THREE.MathUtils.smoothstep(r, 180, 750);
  const base = fractalNoise(x, z) * 150;
  const mountains = Math.max(0, fractalNoise(x + 5000, z + 5000, 4, 0.0009) - 0.15) * 420;
  const ridge = Math.pow(Math.abs(fractalNoise(x - 2000, z + 2000, 3, 0.0022)), 1.6) * 180;
  const rough = (base + mountains + ridge) * (0.06 + 0.94 * flatten);
  const bowl = Math.max(0, 1 - r / 320) * -18; // gentle valley near spawn
  return rough + bowl;
}

function colorForHeight(h, slope) {
  const c = new THREE.Color();
  if (h < 10) c.setHSL(0.42, 0.38, 0.34 + slope * 0.05); // pastel meadow
  else if (h < 90) c.setHSL(0.40, 0.32, 0.32 + h / 900); // blossom hills
  else if (h < 220) c.setHSL(0.78, 0.18, 0.56); // lavender cliffs
  else c.setHSL(0.90, 0.16, 0.88); // blush snow caps
  if (slope > 0.55) c.lerp(new THREE.Color(0x5c4570), Math.min(1, (slope - 0.55) * 1.8));
  return c;
}

function buildTerrain() {
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
  }
  geo.computeVertexNormals();

  const normal = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i);
    const slope = 1 - normal.getY(i);
    tmp.copy(colorForHeight(h, slope));
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function buildSky(scene) {
  const skyGeo = new THREE.SphereGeometry(2600, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top: { value: new THREE.Color(0x4a2f7a) },
      mid: { value: new THREE.Color(0xff8fc4) },
      bottom: { value: new THREE.Color(0xffe3f0) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
      void main() {
        float h = normalize(vPos).y;
        vec3 col = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.7, h)) : mix(mid, bottom, smoothstep(0.0, -0.4, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  scene.fog = new THREE.FogExp2(0xf3a8d8, 0.00042);
  return sky;
}

function buildSparkles(scene) {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,220,245,0.7)');
  grad.addColorStop(1, 'rgba(255,220,245,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);

  const count = 500;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color(0xffe3f5), new THREE.Color(0xffd166), new THREE.Color(0xd9b3ff)];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * WORLD_SIZE * 0.8;
    const z = (Math.random() - 0.5) * WORLD_SIZE * 0.8;
    const y = heightAt(x, z) + 10 + Math.random() * 220;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    speeds[i] = 4 + Math.random() * 8;
    const c = palette[i % palette.length];
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 5, map: tex, transparent: true, depthWrite: false,
    vertexColors: true, blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: 0.85,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const baseColor = new THREE.Color(0xffffff);
  const stormColor = new THREE.Color(0x8a97c9);
  return {
    update(dt, t, stormIntensity = 0) {
      const pos = geo.attributes.position;
      const fallSpeed = THREE.MathUtils.lerp(1, -18, stormIntensity); // rain falls in a storm
      for (let i = 0; i < count; i++) {
        let y = pos.getY(i) + speeds[i] * fallSpeed * dt;
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const ceiling = heightAt(x, z) + 240;
        const floor = heightAt(x, z) + 5;
        if (y > ceiling) y = floor;
        if (y < floor) y = ceiling;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      mat.opacity = (0.7 + Math.sin(t * 1.3) * 0.15) * THREE.MathUtils.lerp(1, 0.6, stormIntensity);
      mat.color.lerpColors(baseColor, stormColor, stormIntensity);
    },
  };
}

function buildBlossomSpire(scene, x, z) {
  const group = new THREE.Group();
  const h = heightAt(x, z);
  group.position.set(x, h, z);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a5a, roughness: 0.85, flatShading: true });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(14, 34, 420, 10), trunkMat);
  trunk.position.y = 210;
  group.add(trunk);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(4, 9, 180, 6), trunkMat);
    branch.position.set(Math.cos(a) * 20, 380 + i * 14, Math.sin(a) * 20);
    branch.rotation.z = Math.cos(a) * 0.9;
    branch.rotation.x = Math.sin(a) * 0.9;
    group.add(branch);
  }

  const leafMats = [
    new THREE.MeshStandardMaterial({ color: 0xffb3e0, emissive: 0xff6fc0, emissiveIntensity: 0.6, roughness: 0.6, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0xffe3f5, emissive: 0xffb3e0, emissiveIntensity: 0.5, roughness: 0.6, flatShading: true }),
  ];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = 90 + (i % 3) * 30;
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(60 + (i % 3) * 18, 0), leafMats[i % 2]);
    leaf.position.set(Math.cos(a) * r, 470 + (i % 4) * 30, Math.sin(a) * r);
    group.add(leaf);
  }

  const glow = new THREE.PointLight(0xff9fd6, 4, 900, 2);
  glow.position.y = 480;
  group.add(glow);

  group.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });
  scene.add(group);
  return group;
}

function buildRuins(scene) {
  const pillarGeo = new THREE.CylinderGeometry(6, 7, 60, 8);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xb3a0c0, roughness: 1, flatShading: true });
  const mesh = new THREE.InstancedMesh(pillarGeo, pillarMat, 60);
  const dummy = new THREE.Object3D();
  let placed = 0;
  let attempts = 0;
  while (placed < 60 && attempts < 800) {
    attempts++;
    const x = (Math.random() - 0.5) * WORLD_SIZE * 0.85;
    const z = (Math.random() - 0.5) * WORLD_SIZE * 0.85;
    if (Math.hypot(x, z) < 260) continue;
    const h = heightAt(x, z);
    if (h < -10 || h > 200) continue;
    dummy.position.set(x, h + 25, z);
    dummy.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
    const s = 0.6 + Math.random() * 1.1;
    dummy.scale.set(s, s * (0.5 + Math.random()), s);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  mesh.castShadow = true;
  scene.add(mesh);
}

function buildTrees(scene) {
  const trunkGeo = new THREE.ConeGeometry(10, 46, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a7a5a, roughness: 1, flatShading: true });
  const mesh = new THREE.InstancedMesh(trunkGeo, trunkMat, 500);
  const dummy = new THREE.Object3D();
  let placed = 0, attempts = 0;
  while (placed < 500 && attempts < 4000) {
    attempts++;
    const x = (Math.random() - 0.5) * WORLD_SIZE * 0.9;
    const z = (Math.random() - 0.5) * WORLD_SIZE * 0.9;
    if (Math.hypot(x, z) < 220) continue;
    const h = heightAt(x, z);
    if (h < 0 || h > 90) continue;
    dummy.position.set(x, h + 23, z);
    const s = 0.7 + Math.random() * 1.3;
    dummy.scale.set(s, s, s);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  mesh.castShadow = true;
  scene.add(mesh);
}

function buildLandingPad(scene, x, z) {
  const h = heightAt(x, z);
  const group = new THREE.Group();
  group.position.set(x, h, z);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(46, 50, 6, 24),
    new THREE.MeshStandardMaterial({ color: 0xcbb8d9, roughness: 0.9 })
  );
  base.receiveShadow = true;
  group.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(42, 1.6, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xff8fc4, emissiveIntensity: 1.2 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 4;
  group.add(ring);

  const light = new THREE.PointLight(0xff9fd6, 2, 200);
  light.position.y = 30;
  group.add(light);

  scene.add(group);
  return { group, position: new THREE.Vector3(x, h + 3, z), radius: 46 };
}

function buildBeacon(scene, x, z, id) {
  const h = heightAt(x, z);
  const group = new THREE.Group();
  group.position.set(x, h, z);

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x5a4a66, roughness: 0.9 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 46, 8), poleMat);
  pole.position.y = 23;
  group.add(pole);

  const bowlMat = new THREE.MeshStandardMaterial({ color: 0x453a52, roughness: 0.8 });
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(7, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), bowlMat);
  bowl.position.y = 46;
  bowl.rotation.x = Math.PI;
  group.add(bowl);

  const flameMat = new THREE.MeshStandardMaterial({
    color: 0x4a3a55, emissive: 0x2a1a35, emissiveIntensity: 0.4, roughness: 0.5,
  });
  const flame = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 10), flameMat);
  flame.position.y = 48;
  group.add(flame);

  const light = new THREE.PointLight(0xff7fc8, 0, 140, 2);
  light.position.y = 50;
  group.add(light);

  scene.add(group);

  return {
    id,
    group,
    flame,
    flameMat,
    light,
    position: new THREE.Vector3(x, h + 46, z),
    lit: false,
    ignite() {
      if (this.lit) return;
      this.lit = true;
      this.flameMat.color.set(0xff6fc0);
      this.flameMat.emissive.set(0xffb3e0);
      this.flameMat.emissiveIntensity = 2.2;
      this.light.intensity = 3.5;
    },
  };
}

// Ordered nearest/simplest → farthest/trickiest; easy mode uses the first 4.
const BEACON_SPOTS = [
  [420, 260],
  [-560, -180],
  [180, -1200],
  [900, 420],
  [-820, -820],
  [-300, 900],
  [650, -650],
  [-1100, 300],
];

export const ENEMY_SPAWNS = [
  [250, 500], [-300, -400], [500, -1000], [-700, 700],
  [1000, 100], [-1000, -600],
];

// Builds the difficulty-independent parts of the world (terrain, sky, landmarks).
// Called once at load so there's something pretty behind the start screen.
export function buildStaticWorld(scene) {
  const terrain = buildTerrain();
  scene.add(terrain);
  const sky = buildSky(scene);
  buildTrees(scene);
  buildRuins(scene);
  const spire = buildBlossomSpire(scene, 0, -900);
  const landingPad = buildLandingPad(scene, 0, 140);
  const sparkles = buildSparkles(scene);

  // Ambient + sun — kept as named lights (not just scene.add) so the weather
  // cycle can animate their color/intensity over time.
  const ambient = new THREE.AmbientLight(0xffdff0, 0.6);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe2f0, 1.5);
  sun.position.set(-600, 800, 300);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.4;
  // Frustum stays tight (not sized to the whole 3600-unit world) since
  // updateSunShadow() below re-centers it on the dragon every frame.
  const SHADOW_HALF = 200;
  sun.shadow.camera.left = -SHADOW_HALF;
  sun.shadow.camera.right = SHADOW_HALF;
  sun.shadow.camera.top = SHADOW_HALF;
  sun.shadow.camera.bottom = -SHADOW_HALF;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 2000;
  scene.add(sun);
  scene.add(sun.target);
  const rim = new THREE.DirectionalLight(0xb08fff, 0.4);
  rim.position.set(500, 200, -600);
  scene.add(rim);

  return { terrain, spire, landingPad, sparkles, sky, ambient, sun, rim, worldSize: WORLD_SIZE };
}

// Keeps the sun's shadow frustum tight and centered on the player by
// translating the light and its target together each frame (same offset,
// so the light direction/angle never changes) rather than sizing the
// frustum to the whole world, which would tank shadow resolution.
const SUN_OFFSET = new THREE.Vector3(-600, 800, 300);
export function updateSunShadow(sun, targetPos) {
  sun.position.copy(targetPos).add(SUN_OFFSET);
  sun.target.position.copy(targetPos);
}

// Builds the beacons for the chosen difficulty. Called once the player picks a mode.
export function buildBeacons(scene, difficulty) {
  const beaconCount = difficulty === 'hard' ? BEACON_SPOTS.length : 4;
  return BEACON_SPOTS.slice(0, beaconCount).map(([x, z], i) => buildBeacon(scene, x, z, i));
}

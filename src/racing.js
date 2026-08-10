import * as THREE from 'three';

// Relative to spawn (0, 140); [x, z, altitudeOffset]. Alternating altitude for a
// rollercoaster feel — climbs and dives, with a loop out past the Blossom Spire.
const RING_COURSE = [
  [0, -60, 55],
  [160, -230, 110],
  [320, -420, 70],
  [220, -650, 160],
  [40, -840, 100],
  [-180, -760, 190],
  [-340, -520, 90],
  [-320, -260, 130],
  [-150, -60, 60],
  [0, 130, 90],
];

const HIT_RADIUS = 34;
const RING_RADIUS = 26;

function buildRingMesh(bright) {
  const group = new THREE.Group();
  const color = bright ? 0x5cf2ff : 0x2a8a99;
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: bright ? 0x2fd8ee : 0x0f4a52,
    emissiveIntensity: bright ? 1.6 : 0.4, roughness: 0.4, metalness: 0.2,
    transparent: !bright, opacity: bright ? 1 : 0.35,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_RADIUS, 2.6, 10, 28), mat);
  group.add(ring);
  const light = new THREE.PointLight(0x5cf2ff, bright ? 2.5 : 0, 160);
  group.add(light);
  group.userData.mat = mat;
  group.userData.light = light;
  return group;
}

export function buildRingCourse(scene, heightAt) {
  const rings = RING_COURSE.map(([dx, dz, alt], i) => {
    const x = dx, z = 140 + dz;
    const y = heightAt(x, z) + alt;
    const mesh = buildRingMesh(i === 0);
    mesh.position.set(x, y, z);
    // Face roughly along the course direction toward the next point for a natural gate feel.
    const [ndx, ndz] = RING_COURSE[i + 1] || RING_COURSE[i];
    const nx = ndx, nz = 140 + ndz;
    mesh.lookAt(nx, y, nz);
    scene.add(mesh);
    return { index: i, position: new THREE.Vector3(x, y, z), mesh, passed: false };
  });
  return rings;
}

export function disposeRingCourse(scene, rings) {
  for (const r of rings) scene.remove(r.mesh);
}

// Advances the race if the dragon reaches the current target ring. Returns
// 'advance' | 'finish' | null.
export function updateRace(dt, dragon, rings, currentIndex, t) {
  if (currentIndex >= rings.length) return null;
  const ring = rings[currentIndex];
  ring.mesh.rotation.z += dt * 0.6;
  const pulse = 1 + Math.sin(t * 4) * 0.06;
  ring.mesh.scale.setScalar(pulse);

  const dist = dragon.position.distanceTo(ring.position);
  if (dist < HIT_RADIUS) {
    ring.passed = true;
    ring.mesh.userData.mat.opacity = 1;
    ring.mesh.userData.mat.transparent = false;
    // Fade this ring out over the next moment, then remove it.
    ring.mesh.visible = false;
    if (currentIndex + 1 < rings.length) {
      const next = rings[currentIndex + 1];
      next.mesh.userData.mat.color.set(0x5cf2ff);
      next.mesh.userData.mat.emissive.set(0x2fd8ee);
      next.mesh.userData.mat.emissiveIntensity = 1.6;
      next.mesh.userData.mat.transparent = false;
      next.mesh.userData.mat.opacity = 1;
      next.mesh.userData.light.intensity = 2.5;
      return 'advance';
    }
    return 'finish';
  }
  return null;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toFixed(2).padStart(5, '0');
  return `${m}:${s}`;
}

const BEST_KEY = 'pinkflight_race_best';

export function getBestTime() {
  const v = localStorage.getItem(BEST_KEY);
  return v ? parseFloat(v) : null;
}

export function maybeSaveBestTime(seconds) {
  const best = getBestTime();
  if (best === null || seconds < best) {
    localStorage.setItem(BEST_KEY, String(seconds));
    return true;
  }
  return false;
}

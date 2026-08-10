import * as THREE from 'three';

const PATROL_RADIUS = 90;
const ATTACK_INTERVAL_MIN = 5;
const ATTACK_INTERVAL_MAX = 8;
const TELEGRAPH_DURATION = 1.8;
const BURST_RADIUS = 150;
const BURST_FORCE = 60;
const FIRE_DAMAGE_RATE = 0.3; // HP/sec of continuous, well-aimed fire — ~3.3s to defeat
const FIRE_RANGE = 150;
const FIRE_CONE = Math.PI / 7;

function buildBossMesh() {
  const group = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0x2a1f3a, emissive: 0x150a22, emissiveIntensity: 0.5, roughness: 0.85, flatShading: true,
  });
  const puffSpots = [[0, 0, 0], [16, 6, 8], [-16, 6, -6], [8, -8, -12], [-10, -6, 10], [0, 14, -4], [18, -4, 4], [-18, 2, -10]];
  const puffs = [];
  for (const [x, y, z] of puffSpots) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(14 + Math.random() * 6, 0), cloudMat);
    puff.position.set(x, y, z);
    group.add(puff);
    puffs.push(puff);
  }

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xb06fe0, emissive: 0xff6fc0, emissiveIntensity: 1.4, roughness: 0.25, metalness: 0.3,
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(9, 0), coreMat);
  group.add(core);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffe3f5, emissive: 0xffe3f5, emissiveIntensity: 2 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 8), eyeMat);
    eye.position.set(s * 9, 8, 15);
    group.add(eye);
  }

  const light = new THREE.PointLight(0xb06fe0, 2, 220, 1.6);
  group.add(light);

  return { group, puffs, core, coreMat, light };
}

export function spawnBoss(scene, position) {
  const { group, puffs, core, coreMat, light } = buildBossMesh();
  group.position.copy(position);
  scene.add(group);
  return {
    group, puffs, core, coreMat, light,
    position: position.clone(),
    home: position.clone(),
    hp: 1,
    t: 0,
    patrolAngle: Math.random() * Math.PI * 2,
    attackTimer: 3 + Math.random() * 2,
    telegraphing: 0,
    defeated: false,
    dissolveT: 0,
  };
}

export function removeBoss(scene, boss) {
  scene.remove(boss.group);
}

// Advances the boss one frame. `firing`/`mouthPos`/`fwd` describe the
// dragon's fire breath this frame (same cone-check shape as fire.js's
// beacon-ignite / enemies.js's scare checks). Returns
// { burst, burstPosition, justDefeated } for main.js to react to.
export function updateBoss(dt, boss, firing, mouthPos, fwd) {
  if (boss.defeated) {
    boss.dissolveT += dt;
    const s = Math.max(0, 1 - boss.dissolveT / 1.2);
    boss.group.scale.setScalar(s);
    boss.light.intensity = 2 * s;
    return { burst: false, justDefeated: false };
  }

  boss.t += dt;
  boss.patrolAngle += dt * 0.15;
  boss.position.set(
    boss.home.x + Math.cos(boss.patrolAngle) * PATROL_RADIUS,
    boss.home.y + 55 + Math.sin(boss.t * 0.4) * 12,
    boss.home.z + Math.sin(boss.patrolAngle) * PATROL_RADIUS
  );
  boss.group.position.copy(boss.position);
  boss.group.rotation.y += dt * 0.3;
  boss.core.rotation.x += dt * 1.2;
  boss.core.rotation.y += dt * 0.8;
  boss.coreMat.emissiveIntensity = 1.2 + (1 - boss.hp) * 2.2;
  for (let i = 0; i < boss.puffs.length; i++) {
    boss.puffs[i].position.y += Math.sin(boss.t * 2 + i) * 0.02;
  }

  let burst = false;
  if (boss.telegraphing > 0) {
    boss.telegraphing -= dt;
    boss.light.intensity = 2 + (TELEGRAPH_DURATION - boss.telegraphing) * 3;
    if (boss.telegraphing <= 0) {
      burst = true;
      boss.light.intensity = 6;
    }
  } else {
    boss.attackTimer -= dt;
    boss.light.intensity = THREE.MathUtils.lerp(boss.light.intensity, 2, dt * 3);
    if (boss.attackTimer <= 0) {
      boss.telegraphing = TELEGRAPH_DURATION;
      boss.attackTimer = ATTACK_INTERVAL_MIN + Math.random() * (ATTACK_INTERVAL_MAX - ATTACK_INTERVAL_MIN);
    }
  }

  let justDefeated = false;
  if (firing && mouthPos && fwd) {
    const toBoss = boss.position.clone().sub(mouthPos);
    const dist = toBoss.length();
    if (dist < FIRE_RANGE) {
      toBoss.normalize();
      const angle = Math.acos(THREE.MathUtils.clamp(fwd.dot(toBoss), -1, 1));
      if (angle < FIRE_CONE) {
        boss.hp = Math.max(0, boss.hp - dt * FIRE_DAMAGE_RATE);
        if (boss.hp <= 0) {
          boss.defeated = true;
          justDefeated = true;
        }
      }
    }
  }

  return { burst, burstPosition: boss.position.clone(), justDefeated };
}

export function bossTelegraphActive(boss) {
  return boss && !boss.defeated && boss.telegraphing > 0;
}

export { BURST_RADIUS, BURST_FORCE };

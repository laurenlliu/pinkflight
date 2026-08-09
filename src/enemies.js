import * as THREE from 'three';
import { ENEMY_SPAWNS, heightAt } from './world.js';

const COLLIDE_RADIUS = 16;

function buildSpriteMesh() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xb08fff, emissive: 0x6a3fc0, emissiveIntensity: 0.5, roughness: 0.7, flatShading: true,
  });
  const puffPositions = [[0, 0, 0], [7, 2, 3], [-7, 2, -2], [3, -3, -5], [-4, -2, 5]];
  for (const [x, y, z] of puffPositions) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(6 + Math.random() * 2, 0), bodyMat);
    puff.position.set(x, y, z);
    group.add(puff);
  }
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffe3f5, emissive: 0xffe3f5, emissiveIntensity: 2 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1.3, 6, 6), eyeMat);
    eye.position.set(s * 3, 1, 6);
    group.add(eye);
  }
  return group;
}

class StormSprite {
  constructor(scene, home) {
    this.home = home.clone();
    this.position = home.clone();
    this.mesh = buildSpriteMesh();
    scene.add(this.mesh);
    this._t = Math.random() * 100;
    this._bobRadius = 40 + Math.random() * 30;
    this._bobSpeed = 0.25 + Math.random() * 0.15;
    this.scared = 0; // seconds remaining fleeing
    this.hitCooldown = 0;
  }

  update(dt, dragonPos) {
    this._t += dt;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);

    if (this.scared > 0) {
      this.scared -= dt;
      const away = this.position.clone().sub(dragonPos);
      away.y = 0;
      if (away.lengthSq() < 1) away.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      away.normalize();
      this.position.addScaledVector(away, 70 * dt);
      this.position.y += 40 * dt;
    } else {
      const a = this._t * this._bobSpeed;
      this.position.x = this.home.x + Math.cos(a) * this._bobRadius;
      this.position.z = this.home.z + Math.sin(a) * this._bobRadius;
      this.position.y = this.home.y + Math.sin(this._t * 0.8) * 12;
    }

    const groundY = heightAt(this.position.x, this.position.z);
    if (this.position.y < groundY + 20) this.position.y = groundY + 20;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y += dt * 0.6;
    const bob = Math.sin(this._t * 3) * 0.08;
    this.mesh.scale.setScalar(1 + bob);
  }

  scare() {
    this.scared = 3.5;
  }
}

export function createEnemies(scene, difficulty) {
  if (difficulty !== 'hard') return [];
  return ENEMY_SPAWNS.map(([x, z]) => {
    const y = heightAt(x, z) + 60 + Math.random() * 60;
    return new StormSprite(scene, new THREE.Vector3(x, y, z));
  });
}

// Returns true if the dragon just took a hit (for feedback: shake/sound/stamina).
export function updateEnemies(dt, enemies, dragon) {
  let hit = false;
  for (const sprite of enemies) {
    sprite.update(dt, dragon.position);
    if (sprite.scared > 0 || dragon.isLanded) continue;
    const dist = sprite.position.distanceTo(dragon.position);
    if (dist < COLLIDE_RADIUS && sprite.hitCooldown <= 0) {
      sprite.hitCooldown = 1.5;
      dragon.stamina = Math.max(0, dragon.stamina - 0.35);
      dragon.speed *= 0.75;
      hit = true;
    }
  }
  return hit;
}

// Returns count of sprites scared off this call (for chime feedback).
export function checkFireScares(dragon, enemies, range = 130, coneAngle = Math.PI / 7) {
  let scaredCount = 0;
  const mouth = dragon.getMouthWorldPosition(new THREE.Vector3());
  const fwd = dragon.getForwardWorld(new THREE.Vector3());
  for (const sprite of enemies) {
    if (sprite.scared > 0) continue;
    const toSprite = sprite.position.clone().sub(mouth);
    const dist = toSprite.length();
    if (dist > range) continue;
    toSprite.normalize();
    const angle = Math.acos(THREE.MathUtils.clamp(fwd.dot(toSprite), -1, 1));
    if (angle < coneAngle) {
      sprite.scare();
      scaredCount++;
    }
  }
  return scaredCount;
}

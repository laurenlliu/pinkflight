import * as THREE from 'three';

function makeFlameTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,240,1)');
  grad.addColorStop(0.35, 'rgba(255,180,60,0.9)');
  grad.addColorStop(0.7, 'rgba(255,80,20,0.5)');
  grad.addColorStop(1, 'rgba(255,40,10,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

const MAX_PARTICLES = 400;

export class FireBreath {
  constructor(scene) {
    this.scene = scene;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 6,
      map: makeFlameTexture(),
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, maxLife: 1 });
    }
    this.cursor = 0;
    this.active = false;
    this.range = 130;
    this.coneAngle = Math.PI / 8;
    this._light = new THREE.PointLight(0xff7a2a, 0, 90, 2);
    scene.add(this._light);
  }

  update(dt, dragon, beacons, firing) {
    this.active = firing && dragon.fireFuel > 0.02;

    if (this.active) {
      dragon.fireFuel = Math.max(0, dragon.fireFuel - dt * 0.35);
      const mouthPos = dragon.getMouthWorldPosition(new THREE.Vector3());
      const fwd = dragon.getForwardWorld(new THREE.Vector3());
      this._light.position.copy(mouthPos);
      this._light.intensity = 3 + Math.random() * 1.5;

      const emitCount = Math.round(dt * 140);
      for (let i = 0; i < emitCount; i++) this._emit(mouthPos, fwd);

      this._igniteCheck(mouthPos, fwd, beacons);
    } else {
      dragon.fireFuel = Math.min(1, dragon.fireFuel + dt * 0.22);
      this._light.intensity = THREE.MathUtils.lerp(this._light.intensity, 0, dt * 6);
    }

    this._simulate(dt);
  }

  _emit(origin, fwd) {
    const p = this.particles[this.cursor];
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    p.alive = true;
    p.pos.copy(origin);
    const spread = 0.16;
    const dir = fwd.clone();
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();
    const speed = 60 + Math.random() * 40;
    p.vel.copy(dir).multiplyScalar(speed);
    p.vel.y += 4;
    p.life = 0;
    p.maxLife = 0.4 + Math.random() * 0.3;
    p.size = 8 + Math.random() * 8;
  }

  _simulate(dt) {
    const positions = this.points.geometry.attributes.position;
    const colors = this.points.geometry.attributes.color;
    const sizes = this.points.geometry.attributes.size;
    const c = new THREE.Color();

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (p.alive) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.alive = false;
          positions.setXYZ(i, 0, -9999, 0);
        } else {
          p.pos.addScaledVector(p.vel, dt);
          p.vel.multiplyScalar(0.94);
          const t = p.life / p.maxLife;
          positions.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
          if (t < 0.3) c.setRGB(1, 1, 0.8);
          else if (t < 0.6) c.setRGB(1, 0.55, 0.15);
          else c.setRGB(0.5, 0.15, 0.08);
          colors.setXYZ(i, c.r, c.g, c.b);
          sizes.setX(i, p.size * (1 - t * 0.5));
        }
      }
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
  }

  _igniteCheck(mouthPos, fwd, beacons) {
    for (const b of beacons) {
      if (b.lit) continue;
      const toBeacon = b.position.clone().sub(mouthPos);
      const dist = toBeacon.length();
      if (dist > this.range) continue;
      toBeacon.normalize();
      const angle = Math.acos(THREE.MathUtils.clamp(fwd.dot(toBeacon), -1, 1));
      if (angle < this.coneAngle) {
        b.ignite();
      }
    }
  }
}

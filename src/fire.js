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

const MAX_PARTICLES = 500;

// PointsMaterial ignores a per-vertex "size" attribute — it only has one flat
// material.size for every point. A small custom shader is what actually makes
// individual particles render at their own (much bigger, fading) size.
const VERTEX_SHADER = `
  attribute float size;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (420.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const FRAGMENT_SHADER = `
  uniform sampler2D map;
  varying vec3 vColor;
  void main() {
    vec4 tex = texture2D(map, gl_PointCoord);
    gl_FragColor = vec4(vColor, 1.0) * tex;
  }
`;

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

    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: makeFlameTexture() } },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, maxLife: 1, size: 0 });
    }
    this.cursor = 0;
    this.active = false;
    this.range = 130;
    this.coneAngle = Math.PI / 8;
    this._light = new THREE.PointLight(0xff8a3a, 0, 150, 2);
    scene.add(this._light);
  }

  update(dt, dragon, beacons, firing) {
    this.active = firing && dragon.fireFuel > 0.02;

    if (this.active) {
      dragon.fireFuel = Math.max(0, dragon.fireFuel - dt * 0.35);
      const mouthPos = dragon.getMouthWorldPosition(new THREE.Vector3());
      const fwd = dragon.getForwardWorld(new THREE.Vector3());
      this._light.position.copy(mouthPos);
      this._light.intensity = 7 + Math.random() * 2.5;

      const emitCount = Math.round(dt * 260);
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
    const spread = 0.32;
    const dir = fwd.clone();
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();
    const speed = 42 + Math.random() * 30;
    p.vel.copy(dir).multiplyScalar(speed);
    p.vel.y += 4;
    p.life = 0;
    p.maxLife = 0.5 + Math.random() * 0.35;
    p.size = 26 + Math.random() * 22;
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
          sizes.setX(i, 0);
        } else {
          p.pos.addScaledVector(p.vel, dt);
          p.vel.multiplyScalar(0.94);
          const t = p.life / p.maxLife;
          positions.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
          if (t < 0.3) c.setRGB(1, 1, 0.85);
          else if (t < 0.6) c.setRGB(1, 0.55, 0.15);
          else c.setRGB(0.5, 0.15, 0.08);
          colors.setXYZ(i, c.r, c.g, c.b);
          // Bloom up quickly then taper — reads as a fat tongue of flame, not a dot.
          const growth = Math.min(1, t / 0.2);
          sizes.setX(i, p.size * growth * (1 - t * 0.55));
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

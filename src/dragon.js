import * as THREE from 'three';
import { DRAGON_SKINS } from './skins.js';

const DEG = Math.PI / 180;

// Vertical distance from the dragon's origin down to its feet in the grounded
// leg pose (legs at y=-9, rotation.x=0.3 — see buildModel, foot bottom ~-16.6).
// Used so landing rests the feet ON the ground instead of sinking the legs
// through it. Slightly over the bare-terrain minimum so feet also clear the
// landing pad's raised platform (~3 units tall) without a visible gap.
export const GROUND_CLEARANCE = 22;

function scaleMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, flatShading: true, roughness: 0.55, metalness: 0.15, ...opts,
  });
}

function buildWing(side) {
  const wingRoot = new THREE.Group();
  const boneMat = scaleMat(0xb02070, { roughness: 0.7 });
  const membraneMat = new THREE.MeshStandardMaterial({
    color: 0xff6fb8, emissive: 0x8a1258, emissiveIntensity: 0.35,
    roughness: 0.8, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.92,
  });

  // upper arm bone
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 26, 6), boneMat);
  upper.rotation.z = Math.PI / 2;
  upper.position.set(side * 13, 0, 0);
  wingRoot.add(upper);

  const forearmPivot = new THREE.Group();
  forearmPivot.position.set(side * 26, 0, 0);
  wingRoot.add(forearmPivot);

  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.7, 34, 6), boneMat);
  forearm.rotation.z = Math.PI / 2;
  forearm.position.set(side * 17, -2, 4);
  forearmPivot.add(forearm);

  // membrane as a simple tapered shape spanning root->tip
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(side * 40, -6);
  shape.lineTo(side * 56, -30);
  shape.lineTo(side * 34, -20);
  shape.lineTo(side * 10, -34);
  shape.lineTo(0, -10);
  shape.closePath();
  const membraneGeo = new THREE.ShapeGeometry(shape);
  const membrane = new THREE.Mesh(membraneGeo, membraneMat);
  membrane.position.set(side * 12, -2, 6);
  forearmPivot.add(membrane);

  return { wingRoot, forearmPivot, boneMat, membraneMat };
}

function buildTail() {
  const tail = new THREE.Group();
  const segMat = scaleMat(0xe83f96);
  const spikeMat = scaleMat(0x7a1052);
  const segments = [];
  let prev = tail;
  const count = 6;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const radius = 6.5 * (1 - t * 0.85);
    const len = 11;
    const seg = new THREE.Group();
    seg.position.z = i === 0 ? 0 : len;
    prev.add(seg);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius, len, 7), segMat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = len / 2;
    seg.add(mesh);
    if (i % 2 === 0) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(2.2, 8, 5), spikeMat);
      spike.position.set(0, radius + 2, len / 2);
      spike.rotation.x = Math.PI;
      seg.add(spike);
    }
    segments.push(seg);
    prev = seg;
  }
  return { tail, segments, segMat, spikeMat };
}

export class Dragon {
  constructor(scene, skin) {
    this.group = new THREE.Group();
    this._buildModel();
    scene.add(this.group);
    this._skinTime = 0;
    this.applySkin(skin || DRAGON_SKINS[0]);

    // Flight state
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.speed = 26;
    this.minSpeed = 8;
    this.cruiseSpeed = 30;
    this.maxSpeed = 68;
    this.boostMaxSpeed = 96;
    this.position = new THREE.Vector3(0, 60, 260);
    this.velY = 0;
    this.windForce = new THREE.Vector3(); // set externally (e.g. by the weather system)

    this.isLanded = false;
    this.stamina = 1; // boost fuel
    this.fireFuel = 1;
    this.flapCooldown = 0;
    this.flapPulse = 0;

    this._flapPhase = 0;
    this._targetRoll = 0;
  }

  _buildModel() {
    const bodyMat = scaleMat(0xe83f96, { roughness: 0.5, metalness: 0.2 });
    const bellyMat = scaleMat(0xffd3ea, { roughness: 0.6 });
    const darkMat = scaleMat(0x7a1052);
    this.bodyMat = bodyMat;
    this.bellyMat = bellyMat;
    this.darkMat = darkMat;

    // Torso
    const torso = new THREE.Mesh(new THREE.SphereGeometry(14, 10, 8), bodyMat);
    torso.scale.set(1, 0.85, 1.9);
    torso.position.set(0, 0, -4);
    this.group.add(torso);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(10, 8, 6), bellyMat);
    belly.scale.set(0.85, 0.6, 1.7);
    belly.position.set(0, -5, -4);
    this.group.add(belly);

    // Neck + head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(6, 9, 26, 8), bodyMat);
    neck.rotation.x = -0.5;
    neck.position.set(0, 9, -22);
    this.group.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 20, -36);
    head.rotation.x = -0.35;
    this.group.add(head);
    this.head = head;

    const skull = new THREE.Mesh(new THREE.ConeGeometry(7.5, 22, 7), bodyMat);
    skull.rotation.x = Math.PI / 2;
    skull.position.z = -6;
    head.add(skull);

    const jaw = new THREE.Mesh(new THREE.ConeGeometry(5, 16, 6), darkMat);
    jaw.rotation.x = Math.PI / 2 + 0.15;
    jaw.position.set(0, -3, -8);
    head.add(jaw);

    this.mouthAnchor = new THREE.Object3D();
    this.mouthAnchor.position.set(0, -1, -22);
    head.add(this.mouthAnchor);

    const hornMat = scaleMat(0x2a1a10, { roughness: 0.4, metalness: 0.4 });
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(1.6, 14, 5), hornMat);
      horn.position.set(s * 3.5, 5, 2);
      horn.rotation.x = -0.6;
      horn.rotation.z = s * 0.3;
      head.add(horn);
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xffcf3a, emissive: 0xff9a1a, emissiveIntensity: 2 })
      );
      eye.position.set(s * 3.2, 1.5, -2);
      head.add(eye);
    }

    // Wings
    const left = buildWing(-1);
    const right = buildWing(1);
    left.wingRoot.position.set(0, 9, -8);
    right.wingRoot.position.set(0, 9, -8);
    this.group.add(left.wingRoot, right.wingRoot);
    this.wings = [left, right];
    this.wingBoneMats = [left.boneMat, right.boneMat];
    this.wingMembraneMats = [left.membraneMat, right.membraneMat];

    // Legs: hang down when landed, tuck up against the body in flight.
    const legMat = scaleMat(0xb02070);
    const footMat = scaleMat(0x7a1052, { roughness: 0.6 });
    this.legMat = legMat;
    this.footMat = footMat;
    this.legs = [];
    for (const [sx, sz] of [[-9, 6], [9, 6], [-7, -16], [7, -16]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 1.8, 16, 6), legMat);
      // Tucked pose is a subtle draw-up, not a full fold — folding further hides
      // the legs entirely inside the torso/belly geometry.
      leg.userData.base = { sx, sz, groundedY: -9, tuckedY: -7, groundedRotX: 0.3, tuckedRotX: 0.55 };
      leg.position.set(sx, -9, sz);
      leg.rotation.x = 0.3;

      // Paw + claws at the leg's bottom tip (children so they inherit the leg's
      // own fold/ground animation for free).
      const paw = new THREE.Mesh(new THREE.SphereGeometry(2.3, 8, 6), footMat);
      paw.position.y = -8.3;
      paw.scale.set(1, 0.7, 1.15);
      leg.add(paw);
      for (let c = 0; c < 3; c++) {
        const ang = (c / 2) * 1.3 - 0.65;
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 5), footMat);
        claw.position.set(Math.sin(ang) * 1.7, -9.6, Math.cos(ang) * 1.7 - 1.2);
        claw.rotation.x = Math.PI / 2 + 0.35;
        leg.add(claw);
      }

      this.group.add(leg);
      this.legs.push(leg);
    }
    this._legFold = 0;

    // Tail
    const { tail, segMat, spikeMat } = buildTail();
    tail.position.set(0, 2, 16);
    this.group.add(tail);
    this.tailRoot = tail;
    this.tailSegMat = segMat;
    this.tailSpikeMat = spikeMat;

    // Saddle marker (camera / rider anchor, just above shoulders)
    this.saddleAnchor = new THREE.Object3D();
    this.saddleAnchor.position.set(0, 15, 2);
    this.group.add(this.saddleAnchor);

    this.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  // Repaints the existing materials in place — no geometry rebuild, so this is
  // cheap enough to call live from a start-screen color picker for preview.
  applySkin(skin) {
    this.skin = skin;
    if (skin.animated) return; // handled continuously by updateSkinAnimation instead
    this.bodyMat.color.set(skin.body);
    this.bellyMat.color.set(skin.belly);
    this.darkMat.color.set(skin.dark);
    this.tailSegMat.color.set(skin.body);
    this.tailSpikeMat.color.set(skin.dark);
    this.legMat.color.set(skin.accent);
    this.footMat.color.set(skin.dark);
    for (const m of this.wingBoneMats) m.color.set(skin.accent);
    for (const m of this.wingMembraneMats) {
      m.color.set(skin.membrane);
      m.emissive.set(skin.membraneEmissive);
    }
  }

  // Called every frame (even while idle on the start screen) so the Rainbow
  // skin animates continuously; a no-op for any static skin.
  updateSkinAnimation(dt) {
    if (!this.skin || !this.skin.animated) return;
    this._skinTime += dt;
    const hue = (this._skinTime * 0.12) % 1;
    const c = new THREE.Color();
    const paint = (mat, hueOffset, s, l) => {
      c.setHSL((hue + hueOffset + 1) % 1, s, l);
      mat.color.copy(c);
    };
    paint(this.bodyMat, 0, 0.75, 0.55);
    paint(this.bellyMat, 0.08, 0.6, 0.85);
    paint(this.darkMat, 0.02, 0.7, 0.25);
    paint(this.tailSegMat, 0, 0.75, 0.55);
    paint(this.tailSpikeMat, 0.02, 0.7, 0.25);
    paint(this.legMat, 0.05, 0.7, 0.45);
    paint(this.footMat, 0.02, 0.7, 0.3);
    for (const m of this.wingBoneMats) paint(m, 0.05, 0.7, 0.45);
    for (const m of this.wingMembraneMats) {
      paint(m, 0.1, 0.7, 0.65);
      c.setHSL((hue + 0.15) % 1, 0.9, 0.5);
      m.emissive.copy(c);
    }
  }

  getAltitudeAbove(groundY) {
    return this.position.y - groundY;
  }

  update(dt, input, heightAt) {
    const groundY = heightAt(this.position.x, this.position.z);
    const alt = this.getAltitudeAbove(groundY);

    if (this.isLanded) {
      // slow taxi turning only
      if (input.yawLeft) this.yaw += 1.1 * dt;
      if (input.yawRight) this.yaw -= 1.1 * dt;
      this.roll = THREE.MathUtils.lerp(this.roll, 0, dt * 4);
      this.pitch = THREE.MathUtils.lerp(this.pitch, 0, dt * 4);

      if (input.flap) {
        this.isLanded = false;
        this.speed = this.minSpeed + 6;
        this.velY = 18;
        this.pitch = 12 * DEG;
      }
      this._applyTransform(groundY, dt);
      this._animate(dt, 0);
      return this._state(alt);
    }

    // --- Steering ---
    const yawRate = 0.9 * dt;
    const pitchRate = 0.85 * dt;
    if (input.yawLeft) { this.yaw += yawRate; this._targetRoll = 0.6; }
    else if (input.yawRight) { this.yaw -= yawRate; this._targetRoll = -0.6; }
    else this._targetRoll = 0;
    this.roll = THREE.MathUtils.lerp(this.roll, this._targetRoll, dt * 3.5);

    if (input.pitchDown) this.pitch -= pitchRate;
    if (input.pitchUp) this.pitch += pitchRate;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -60 * DEG, 55 * DEG);

    // --- Speed model ---
    const diveFactor = Math.max(0, -Math.sin(this.pitch));
    const climbFactor = Math.max(0, Math.sin(this.pitch));
    let targetSpeed = this.cruiseSpeed + diveFactor * 40 - climbFactor * 12;

    if (input.boost && this.stamina > 0.02) {
      targetSpeed = Math.max(targetSpeed, this.boostMaxSpeed);
      this.stamina = Math.max(0, this.stamina - dt * 0.5);
    } else {
      this.stamina = Math.min(1, this.stamina + dt * 0.18);
    }
    targetSpeed = THREE.MathUtils.clamp(targetSpeed, this.minSpeed, this.boostMaxSpeed);
    this.speed = THREE.MathUtils.lerp(this.speed, targetSpeed, dt * 1.6);

    // Flap: burst of lift + forward power, edge-triggered by caller via input.flapEdge
    this.flapCooldown = Math.max(0, this.flapCooldown - dt);
    if (input.flapEdge && this.flapCooldown <= 0) {
      this.velY += 16;
      this.speed += 6;
      this.flapCooldown = 0.55;
      this.flapPulse = 1;
    }
    this.flapPulse = Math.max(0, this.flapPulse - dt * 2);

    // Stall recovery: too slow -> nose drifts down
    if (this.speed < this.minSpeed + 3) {
      this.pitch = THREE.MathUtils.lerp(this.pitch, -20 * DEG, dt);
    }

    // --- Vertical motion ---
    // Pitch attitude (via dir.y below) is the primary, reliable climb/dive control so nose-down
    // always loses altitude and nose-up always gains it. velY is just a light secondary layer:
    // a gentle constant sink (so hovering forever isn't free) plus flap impulses.
    const gravity = 6;
    this.velY -= gravity * dt;
    this.velY *= 0.98;
    this.velY = THREE.MathUtils.clamp(this.velY, -20, 40);

    // --- Move ---
    // Model's local forward is -Z, matching Euler(pitch, yaw, roll, 'YXZ') applied to (0,0,-1).
    const dir = new THREE.Vector3(
      -Math.cos(this.pitch) * Math.sin(this.yaw),
      Math.sin(this.pitch),
      -Math.cos(this.pitch) * Math.cos(this.yaw)
    );
    this.position.addScaledVector(dir, this.speed * dt);
    this.position.y += this.velY * dt;
    this.position.addScaledVector(this.windForce, dt); // storm gusts, no-op when calm

    // Ground collision / landing check — slope-aware so steep terrain slides the dragon
    // clear along the incline instead of just bouncing it straight up.
    const newGroundY = heightAt(this.position.x, this.position.z);
    const newAlt = this.position.y - newGroundY;
    const nearLevel = Math.abs(this.pitch) < 25 * DEG;
    if (newAlt < 6) {
      const eps = 6;
      const hL = heightAt(this.position.x - eps, this.position.z);
      const hR = heightAt(this.position.x + eps, this.position.z);
      const hD = heightAt(this.position.x, this.position.z - eps);
      const hU = heightAt(this.position.x, this.position.z + eps);
      const slopeX = (hL - hR) / (2 * eps);
      const slopeZ = (hD - hU) / (2 * eps);
      const slopeMag = Math.hypot(slopeX, slopeZ);

      if (this.speed < 22 && nearLevel && this.velY < 14 && slopeMag < 0.9) {
        this.isLanded = true;
        this.position.y = newGroundY + GROUND_CLEARANCE;
        this.speed = 0;
        this.velY = 0;
        this.pitch = 0;
      } else {
        // Slide down-gradient and pop clear of the slope, nudging the nose up so a steep
        // dive self-corrects instead of grinding along the incline in a repeated bump loop.
        this.position.x += slopeX * 14;
        this.position.z += slopeZ * 14;
        this.position.y = newGroundY + 10;
        this.velY = Math.max(0, this.velY) * 0.25 + 7;
        this.speed *= 0.93;
        if (this.pitch < 0) this.pitch = THREE.MathUtils.lerp(this.pitch, 10 * DEG, 0.5);
      }
    }
    // world bound (soft wrap-ish clamp)
    const bound = 1750;
    this.position.x = THREE.MathUtils.clamp(this.position.x, -bound, bound);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -bound, bound);
    if (this.position.y > 1400) this.position.y = 1400;

    this._applyTransform(newGroundY, dt);
    this._animate(dt, this.speed);
    return this._state(newAlt);
  }

  _applyTransform(groundY, dt) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, this.roll, 'YXZ'));
    this.group.quaternion.slerp(q, 1 - Math.pow(0.001, dt));
    this.group.position.copy(this.position);
  }

  // Immediately snaps group.position/quaternion to match the logical state —
  // no smoothing. update() (which does the smoothed version above) only runs
  // during actual gameplay, so without this the visible mesh sits wherever
  // the group was left (world origin, by default) until the player takes
  // off, even though `position`/`yaw` already say otherwise (e.g. spawned on
  // the landing pad). Call once after positioning the dragon, and every
  // frame while idle so camera code relying on group.position stays correct.
  syncTransform() {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, this.roll, 'YXZ'));
    this.group.quaternion.copy(q);
    this.group.position.copy(this.position);
  }

  _animate(dt, speed) {
    const flapRate = this.isLanded ? 0 : THREE.MathUtils.clamp(0.9 + speed * 0.045, 0.9, 3.2);
    this._flapPhase += dt * flapRate * Math.PI * 2;
    const flap = Math.sin(this._flapPhase) * (this.isLanded ? 0.1 : 0.55) + this.flapPulse * 0.6;
    for (const w of this.wings) {
      const sign = w === this.wings[0] ? 1 : -1;
      w.wingRoot.rotation.z = sign * (0.15 + flap);
      w.forearmPivot.rotation.z = sign * (flap * 0.9 - 0.2);
    }
    if (this.tailRoot) {
      this.tailRoot.children.forEach((seg, i) => {
        seg.rotation.y = Math.sin(this._flapPhase * 0.5 - i * 0.6) * 0.15;
      });
    }
    if (this.head) {
      this.head.rotation.z = this.roll * -0.15;
    }

    const foldTarget = this.isLanded ? 0 : 1;
    this._legFold = THREE.MathUtils.lerp(this._legFold, foldTarget, 1 - Math.pow(0.001, dt));
    for (const leg of this.legs) {
      const b = leg.userData.base;
      leg.position.y = THREE.MathUtils.lerp(b.groundedY, b.tuckedY, this._legFold);
      leg.rotation.x = THREE.MathUtils.lerp(b.groundedRotX, b.tuckedRotX, this._legFold);
    }
  }

  _state(alt) {
    return {
      position: this.position,
      speed: this.speed,
      altitude: Math.max(0, alt),
      isLanded: this.isLanded,
      stamina: this.stamina,
      fireFuel: this.fireFuel,
      yaw: this.yaw,
      pitch: this.pitch,
      roll: this.roll,
    };
  }

  getMouthWorldPosition(target) {
    this.mouthAnchor.getWorldPosition(target);
    return target;
  }

  getForwardWorld(target) {
    this.group.getWorldDirection(target);
    target.multiplyScalar(-1); // model built facing -Z
    return target;
  }
}

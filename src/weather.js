import * as THREE from 'three';
import { updateCelestial } from './world.js';

// Time-of-day keyframes around a 0..1 cycle. Dusk sits at both ends since
// it's Pinkflight's "home" look — the cycle drifts through night/dawn/day
// and back rather than treating any one state as default.
const KEYFRAMES = [
  { t: 0.00, top: 0x4a2f7a, mid: 0xff8fc4, bottom: 0xffe3f0, fog: 0xf3a8d8, ambient: 0xffdff0, ambientI: 0.6, sun: 0xffe2f0, sunI: 1.5, rim: 0xb08fff, rimI: 0.4 },
  { t: 0.30, top: 0x0a0818, mid: 0x1c1440, bottom: 0x2e2255, fog: 0x241c40, ambient: 0x8fa0ff, ambientI: 0.22, sun: 0x8fa0ff, sunI: 0.3, rim: 0x5a4fae, rimI: 0.25 },
  { t: 0.55, top: 0xffb37a, mid: 0xffd9a0, bottom: 0xffe9c9, fog: 0xffd2a8, ambient: 0xffe9c9, ambientI: 0.65, sun: 0xfff0d0, sunI: 1.7, rim: 0xffb37a, rimI: 0.35 },
  { t: 0.80, top: 0x6fa8ff, mid: 0x9fd3ff, bottom: 0xdff3ff, fog: 0xbfe3ff, ambient: 0xe9f5ff, ambientI: 0.75, sun: 0xffffff, sunI: 1.9, rim: 0xaeeaff, rimI: 0.3 },
  { t: 1.00, top: 0x4a2f7a, mid: 0xff8fc4, bottom: 0xffe3f0, fog: 0xf3a8d8, ambient: 0xffdff0, ambientI: 0.6, sun: 0xffe2f0, sunI: 1.5, rim: 0xb08fff, rimI: 0.4 },
];

const STORM = {
  top: 0x1a1f2e, mid: 0x3a4258, bottom: 0x555f78, fog: 0x3a4258,
  ambientI: 0.28, sunI: 0.35, rimI: 0.15,
};

const CYCLE_SECONDS = 200;

function sampleKeyframes(t) {
  let a = KEYFRAMES[0], b = KEYFRAMES[KEYFRAMES.length - 1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (t >= KEYFRAMES[i].t && t <= KEYFRAMES[i + 1].t) {
      a = KEYFRAMES[i]; b = KEYFRAMES[i + 1];
      break;
    }
  }
  const span = b.t - a.t || 1;
  const local = THREE.MathUtils.clamp((t - a.t) / span, 0, 1);
  return { a, b, local };
}

export function createWeather(world, scene) {
  const c = {
    top: new THREE.Color(), mid: new THREE.Color(), bottom: new THREE.Color(),
    fog: new THREE.Color(), ambient: new THREE.Color(), sun: new THREE.Color(), rim: new THREE.Color(),
  };

  let dayTime = 0; // 0..1, wraps
  let stormActive = false;
  let stormT = 0; // 0..1 fade in/out envelope
  let timeToNextStorm = 50 + Math.random() * 70;
  let stormDuration = 0;
  let windDir = Math.random() * Math.PI * 2;
  let windSwirl = 0;
  let thunderCooldown = 4;
  const windForce = new THREE.Vector3();

  function update(dt, sound) {
    dayTime = (dayTime + dt / CYCLE_SECONDS) % 1;
    const { a, b, local } = sampleKeyframes(dayTime);

    c.top.setHex(a.top).lerp(new THREE.Color(b.top), local);
    c.mid.setHex(a.mid).lerp(new THREE.Color(b.mid), local);
    c.bottom.setHex(a.bottom).lerp(new THREE.Color(b.bottom), local);
    c.fog.setHex(a.fog).lerp(new THREE.Color(b.fog), local);
    c.ambient.setHex(a.ambient).lerp(new THREE.Color(b.ambient), local);
    c.sun.setHex(a.sun).lerp(new THREE.Color(b.sun), local);
    c.rim.setHex(a.rim).lerp(new THREE.Color(b.rim), local);
    let ambientI = THREE.MathUtils.lerp(a.ambientI, b.ambientI, local);
    let sunI = THREE.MathUtils.lerp(a.sunI, b.sunI, local);
    let rimI = THREE.MathUtils.lerp(a.rimI, b.rimI, local);

    // --- Storm state machine ---
    if (!stormActive) {
      timeToNextStorm -= dt;
      if (timeToNextStorm <= 0) {
        stormActive = true;
        stormDuration = 22 + Math.random() * 14;
        windDir = Math.random() * Math.PI * 2;
      }
    } else {
      stormDuration -= dt;
      stormT = Math.min(1, stormT + dt / 3);
      if (stormDuration <= 0) {
        stormActive = false;
        timeToNextStorm = 70 + Math.random() * 90;
      }
    }
    if (!stormActive) stormT = Math.max(0, stormT - dt / 4);

    if (stormT > 0.001) {
      c.top.lerp(new THREE.Color(STORM.top), stormT);
      c.mid.lerp(new THREE.Color(STORM.mid), stormT);
      c.bottom.lerp(new THREE.Color(STORM.bottom), stormT);
      c.fog.lerp(new THREE.Color(STORM.fog), stormT);
      ambientI = THREE.MathUtils.lerp(ambientI, STORM.ambientI, stormT);
      sunI = THREE.MathUtils.lerp(sunI, STORM.sunI, stormT);
      rimI = THREE.MathUtils.lerp(rimI, STORM.rimI, stormT);
    }

    // Gusting wind: a slowly rotating direction with pulsing magnitude.
    windSwirl += dt * 0.35;
    windDir += dt * 0.15 * Math.sin(windSwirl * 0.7);
    const gust = stormT * (14 + Math.sin(windSwirl * 2.3) * 8 + Math.sin(windSwirl * 5.1) * 4);
    windForce.set(Math.cos(windDir) * gust, 0, Math.sin(windDir) * gust);

    // Occasional thunder rumble while a storm is going.
    if (stormActive && stormT > 0.6) {
      thunderCooldown -= dt;
      if (thunderCooldown <= 0 && sound) {
        thunderCooldown = 6 + Math.random() * 10;
        sound.playThunder();
      }
    }

    // Apply to the world.
    world.sky.material.uniforms.top.value.copy(c.top);
    world.sky.material.uniforms.mid.value.copy(c.mid);
    world.sky.material.uniforms.bottom.value.copy(c.bottom);
    scene.fog.color.copy(c.fog);
    world.ambient.color.copy(c.ambient);
    world.ambient.intensity = ambientI;
    world.sun.color.copy(c.sun);
    world.sun.intensity = sunI;
    world.rim.color.copy(c.rim);
    world.rim.intensity = rimI;

    updateCelestial(world.celestial, dayTime);
    // Clouded over during a storm — fade both out rather than have the sun
    // shine implausibly through the dark storm sky.
    const stormFade = 1 - stormT * 0.85;
    world.celestial.sun.material.opacity *= stormFade;
    world.celestial.moon.material.opacity *= stormFade;

    return { windForce, stormIntensity: stormT, isStorm: stormActive, dayTime };
  }

  return {
    update,
    // Test/debug hooks — not used by normal gameplay.
    forceStorm() { timeToNextStorm = 0; },
    endStorm() { stormActive = false; stormDuration = 0; },
    setDayTime(t) { dayTime = THREE.MathUtils.euclideanModulo(t, 1); },
  };
}

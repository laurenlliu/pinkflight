import * as THREE from 'three';
import { buildWorld, heightAt } from './world.js';
import { Dragon } from './dragon.js';
import { Controls } from './controls.js';
import { FireBreath } from './fire.js';
import { UI } from './ui.js';
import { SoundEngine } from './audio.js';

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.5, 4000);

const world = buildWorld(scene);
const dragon = new Dragon(scene);
dragon.position.set(0, heightAt(0, 140) + 1.2, 140);
dragon.isLanded = true;
dragon.yaw = Math.PI;

const controls = new Controls();
const fire = new FireBreath(scene);
const ui = new UI();
const sound = new SoundEngine();

let gameWon = false;
let startTime = null;
let started = false;

function beginFlight() {
  if (started) return;
  started = true;
  ui.hideStart();
  startTime = performance.now();
  sound.unlock();
  sound.playTakeoff();
}

ui.onStart(beginFlight);
controls.onStart(beginFlight);

ui.onRestart(() => {
  sound.unlock();
  sound.playUIClick();
  window.location.reload();
});

// --- Camera rig ---
const camPos = new THREE.Vector3();
const camLookTarget = new THREE.Vector3();
let camInit = false;
let shakeAmp = 0;
let shakeT = 0;

function updateCamera(dt, shakeTarget) {
  const backOffset = new THREE.Vector3(0, 30, 78).applyQuaternion(dragon.group.quaternion);
  const desired = dragon.group.position.clone().add(backOffset);

  const groundY = heightAt(desired.x, desired.z);
  if (desired.y < groundY + 6) desired.y = groundY + 6;

  if (!camInit) {
    camPos.copy(desired);
    camInit = true;
  } else {
    camPos.lerp(desired, 1 - Math.pow(0.0025, dt));
  }
  camera.position.copy(camPos);

  // Subtle procedural shake while firing/boosting — smoothed sine jitter, not raw random noise.
  shakeAmp = THREE.MathUtils.lerp(shakeAmp, shakeTarget || 0, 1 - Math.pow(0.02, dt));
  shakeT += dt;
  if (shakeAmp > 0.001) {
    camera.position.x += Math.sin(shakeT * 37.1) * shakeAmp;
    camera.position.y += Math.sin(shakeT * 53.7 + 1.7) * shakeAmp * 0.7;
    camera.position.z += Math.sin(shakeT * 29.3 + 3.1) * shakeAmp * 0.6;
  }

  const lookAhead = new THREE.Vector3(0, 12, -70).applyQuaternion(dragon.group.quaternion).add(dragon.group.position);
  camLookTarget.lerp(lookAhead, 1 - Math.pow(0.001, dt));
  camera.up.set(0, 1, 0);
  camera.lookAt(camLookTarget);
}

function litCount() {
  return world.beacons.filter((b) => b.lit).length;
}

function checkWin(state) {
  if (gameWon) return;
  if (litCount() === world.beacons.length && state.isLanded) {
    const distToPad = dragon.position.distanceTo(world.landingPad.position);
    if (distToPad < world.landingPad.radius + 10) {
      gameWon = true;
      const elapsed = (performance.now() - startTime) / 1000;
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = Math.floor(elapsed % 60).toString().padStart(2, '0');
      ui.showWin(`${m}:${s}`);
      sound.playWin();
    }
  }
}

const clock = new THREE.Clock();
let prevIsLanded = true;
let prevLitCount = 0;
let prevBoost = false;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());

  if (started && !gameWon) {
    const flapEdge = controls.consumeFlapEdge();
    const input = { ...controls.state, flapEdge };
    const state = dragon.update(dt, input, heightAt);
    const firing = controls.state.fire && !dragon.isLanded;
    fire.update(dt, dragon, world.beacons, firing);
    ui.update(state, litCount(), world.beacons.length, dragon, world.beacons, world.landingPad);
    checkWin(state);

    if (state.isLanded && !prevIsLanded) sound.playLand();
    if (!state.isLanded && prevIsLanded) sound.playTakeoff();
    prevIsLanded = state.isLanded;

    const lit = litCount();
    if (lit > prevLitCount) sound.playIgnite();
    prevLitCount = lit;

    if (controls.state.boost && !prevBoost && state.speed > 5) sound.playBoost();
    prevBoost = controls.state.boost;

    sound.update(dt, { speed: state.speed, maxSpeed: dragon.boostMaxSpeed, firing, isLanded: state.isLanded });

    const shakeTarget = (firing ? 0.35 : 0) + (controls.state.boost && state.speed > 5 ? 0.45 : 0);
    updateCamera(dt, shakeTarget);
  } else {
    updateCamera(dt, 0);
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  window.__debug = { dragon, world, heightAt, THREE, fire, controls, sound };
}

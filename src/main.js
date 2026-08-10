import * as THREE from 'three';
import { buildStaticWorld, buildBeacons, heightAt } from './world.js';
import { Dragon, GROUND_CLEARANCE } from './dragon.js';
import { Controls } from './controls.js';
import { FireBreath } from './fire.js';
import { UI } from './ui.js';
import { SoundEngine } from './audio.js';
import { createEnemies, updateEnemies, checkFireScares } from './enemies.js';
import { buildRingCourse, updateRace, formatTime, getBestTime, maybeSaveBestTime } from './racing.js';
import { createWeather } from './weather.js';
import { DRAGON_SKINS, getSkin, loadSavedSkinId, saveSkinId } from './skins.js';

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.5, 4000);

// The static world (terrain, sky, landmarks) renders immediately behind the start
// screen; beacons/enemies/rings are created once the player picks a mode.
const world = buildStaticWorld(scene);
const savedSkinId = loadSavedSkinId();
const dragon = new Dragon(scene, getSkin(savedSkinId));
dragon.position.set(0, heightAt(0, 140) + GROUND_CLEARANCE, 140);
dragon.isLanded = true;
dragon.yaw = Math.PI;

const controls = new Controls();
const fire = new FireBreath(scene);
const ui = new UI();
const sound = new SoundEngine();
ui.bindTouchControls(controls);
ui.buildSkinPicker(DRAGON_SKINS, savedSkinId, (skin) => {
  dragon.applySkin(skin);
  saveSkinId(skin.id);
});
const weather = createWeather(world, scene);

const bestTime = getBestTime();
if (bestTime !== null) ui.setRaceBestHint(`10 rings · best ${formatTime(bestTime)}`);

let mode = null;
let beacons = [];
let enemies = [];
let raceRings = [];
let raceIndex = 0;
let raceActive = false;
let raceFinished = false;
let gameWon = false;
let startTime = null;
let started = false;

function beginFlight(chosenMode) {
  if (started) return;
  started = true;
  mode = chosenMode;

  if (mode === 'race') {
    raceRings = buildRingCourse(scene, heightAt);
    raceIndex = 0;
    raceActive = true;
    ui.setRaceMode(raceRings.length);
  } else {
    beacons = buildBeacons(scene, mode);
    enemies = createEnemies(scene, mode);
    ui.setGoalText(beacons.length);
  }

  ui.hideStart();
  startTime = performance.now();
  sound.unlock();
  sound.playTakeoff();
}

ui.onStart(beginFlight);
controls.onStart(() => { if (!started) beginFlight('easy'); });

ui.onRestart(() => {
  sound.unlock();
  sound.playUIClick();
  window.location.reload();
});
ui.onRaceRestart(() => {
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

  // Subtle procedural shake while firing/boosting/hit — smoothed sine jitter, not raw random noise.
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
  return beacons.filter((b) => b.lit).length;
}

function checkWin(state) {
  if (gameWon) return;
  if (beacons.length > 0 && litCount() === beacons.length && state.isLanded) {
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

function finishRace() {
  raceActive = false;
  raceFinished = true;
  const elapsed = (performance.now() - startTime) / 1000;
  const isNewBest = maybeSaveBestTime(elapsed);
  const best = getBestTime();
  ui.showRaceResult(formatTime(elapsed), isNewBest, best !== null ? formatTime(best) : '');
  sound.playWin();
}

const clock = new THREE.Clock();
let elapsedTime = 0;
let prevIsLanded = true;
let prevLitCount = 0;
let prevBoost = false;
let prevStorming = false;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  elapsedTime += dt;

  const weatherState = weather.update(dt, sound);
  dragon.windForce.copy(weatherState.windForce);
  world.sparkles.update(dt, elapsedTime, weatherState.stormIntensity);
  dragon.updateSkinAnimation(dt); // keeps the Rainbow skin cycling even on the start screen

  if (weatherState.isStorm && !prevStorming) ui.setWeatherPrompt('A storm rolls in…');
  if (!weatherState.isStorm && prevStorming) ui.setWeatherPrompt('The storm passes');
  prevStorming = weatherState.isStorm;

  const running = started && !gameWon && !raceFinished;

  if (running) {
    const flapEdge = controls.consumeFlapEdge();
    const input = { ...controls.state, flapEdge };
    const state = dragon.update(dt, input, heightAt);
    const firing = controls.state.fire && !dragon.isLanded;

    if (state.isLanded && !prevIsLanded) sound.playLand();
    if (!state.isLanded && prevIsLanded) sound.playTakeoff();
    prevIsLanded = state.isLanded;
    if (controls.state.boost && !prevBoost && state.speed > 5) sound.playBoost();
    prevBoost = controls.state.boost;
    sound.update(dt, { speed: state.speed, maxSpeed: dragon.boostMaxSpeed, firing, isLanded: state.isLanded });

    let hitShake = 0;

    if (mode === 'race') {
      fire.update(dt, dragon, [], false);
      if (raceActive) {
        const result = updateRace(dt, dragon, raceRings, raceIndex, elapsedTime);
        if (result === 'advance') {
          raceIndex++;
          sound.playRingPass();
        } else if (result === 'finish') {
          sound.playRingPass();
          finishRace();
        }
      }
      const elapsedStr = formatTime((performance.now() - startTime) / 1000);
      const nextRing = raceRings[raceIndex];
      ui.updateRaceHUD(state, raceIndex, raceRings.length, elapsedStr, dragon, nextRing ? nextRing.position : null);
    } else {
      fire.update(dt, dragon, beacons, firing);
      ui.update(state, litCount(), beacons.length, dragon, beacons, world.landingPad);
      checkWin(state);

      const lit = litCount();
      if (lit > prevLitCount) sound.playIgnite();
      prevLitCount = lit;

      if (enemies.length > 0) {
        const hit = updateEnemies(dt, enemies, dragon);
        if (hit) {
          sound.playHit();
          ui.flashHit();
          hitShake = 0.6;
        }
        if (firing) {
          const scaredCount = checkFireScares(dragon, enemies);
          if (scaredCount > 0) sound.playScare();
        }
      }
    }

    const shakeTarget = (firing ? 0.35 : 0) + (controls.state.boost && state.speed > 5 ? 0.45 : 0)
      + hitShake + weatherState.stormIntensity * 0.5;
    updateCamera(dt, shakeTarget);
  } else {
    updateCamera(dt, weatherState.stormIntensity * 0.3);
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
  window.__debug = {
    dragon, world, heightAt, THREE, fire, controls, sound, checkFireScares, updateEnemies, camera, scene, renderer, weather, DRAGON_SKINS,
    get beacons() { return beacons; },
    get enemies() { return enemies; },
    get raceRings() { return raceRings; },
    get raceIndex() { return raceIndex; },
  };
}

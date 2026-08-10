import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildStaticWorld, buildBeacons, heightAt, updateSunShadow } from './world.js';
import { Dragon, GROUND_CLEARANCE } from './dragon.js';
import { Controls } from './controls.js';
import { FireBreath } from './fire.js';
import { UI } from './ui.js';
import { SoundEngine } from './audio.js';
import { createEnemies, updateEnemies, checkFireScares } from './enemies.js';
import { buildRingCourse, updateRace, formatTime, getBestTime, maybeSaveBestTime } from './racing.js';
import { createWeather } from './weather.js';
import { DRAGON_SKINS, getSkin, loadSavedSkinId, saveSkinId } from './skins.js';
import { isUnlocked, updateProgress, getProgress } from './progress.js';
import { spawnBoss, updateBoss, removeBoss, bossTelegraphActive, BURST_RADIUS, BURST_FORCE } from './boss.js';
import { loadSettings, saveSettings } from './settings.js';
import { buildGems, updateGems, removeGems } from './gems.js';

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.5, 4000);

// Bloom makes the fire breath, gems, and wishlights actually glow instead of
// just being bright flat-shaded shapes. Threshold is high so it only catches
// genuinely emissive/bright spots, not the whole sunlit scene.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
// Bloom's blur chain is rendered at half resolution — it's a soft effect anyway,
// so the quality loss is invisible but the cost is ~4x cheaper.
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
  0.55, 0.4, 0.82
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// The static world (terrain, sky, landmarks) renders immediately behind the start
// screen; beacons/enemies/rings are created once the player picks a mode.
const world = buildStaticWorld(scene);
const savedSkinId = loadSavedSkinId();
const dragon = new Dragon(scene, getSkin(savedSkinId));
dragon.position.set(0, heightAt(0, 140) + GROUND_CLEARANCE, 140);
dragon.isLanded = true;
dragon.yaw = Math.PI;
dragon.syncTransform();

const controls = new Controls();
const fire = new FireBreath(scene);
const ui = new UI();
const sound = new SoundEngine();
ui.bindTouchControls(controls);
ui.buildSkinPicker(DRAGON_SKINS, savedSkinId, (skin) => {
  dragon.applySkin(skin);
  saveSkinId(skin.id);
}, isUnlocked);

// Applies a progress update and, if it unlocked anything new, shows a toast
// for the first one (rare to get more than one at once, but handle it).
function reportProgress(patch) {
  const { newlyUnlocked } = updateProgress(patch);
  if (newlyUnlocked.length > 0) {
    const skin = DRAGON_SKINS.find((s) => s.id === newlyUnlocked[0]);
    if (skin) {
      ui.showUnlockToast(skin.name);
      sound.playIgnite();
    }
  }
}
const weather = createWeather(world, scene);

const settings = loadSettings();
ui.bindVolumeSliders(
  settings.musicVolume, settings.sfxVolume,
  (v) => { sound.setMusicVolume(settings.musicMuted ? 0 : v); saveSettings({ musicVolume: v }); },
  (v) => { sound.setSfxVolume(v); saveSettings({ sfxVolume: v }); },
  settings.musicMuted,
  (muted) => {
    settings.musicMuted = muted;
    sound.setMusicVolume(muted ? 0 : settings.musicVolume);
    saveSettings({ musicMuted: muted });
  }
);

const bestTime = getBestTime();
if (bestTime !== null) ui.setRaceBestHint(`10 rings · best ${formatTime(bestTime)}`);

let totalSpritesScared = getProgress().spritesScared;
let totalGemsCollected = getProgress().gemsCollected;
let bestGemsInFlightSoFar = getProgress().bestGemsInFlight;
let totalFlightsCompleted = getProgress().flightsCompleted;
let mode = null;
let beacons = [];
let enemies = [];
let gems = [];
let sessionGems = 0;
let raceRings = [];
let raceIndex = 0;
let raceActive = false;
let raceFinished = false;
let gameWon = false;
let startTime = null;
let started = false;
let boss = null;

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
    gems = buildGems(scene, heightAt);
    ui.setGoalText(beacons.length);
    ui.showGemCounter();
    ui.updateGemCount(0);
  }

  ui.hideStart();
  ui.showPauseButton();
  startTime = performance.now();
  sound.unlock();
  sound.setMusicVolume(settings.musicMuted ? 0 : settings.musicVolume);
  sound.setSfxVolume(settings.sfxVolume);
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

// --- Pause ---
let paused = false;
function togglePause() {
  if (!started || gameWon || raceFinished) return;
  paused = !paused;
  if (paused) ui.showPause(); else ui.hidePause();
}
ui.onPauseButtonClick(togglePause);
ui.onResume(togglePause);
ui.onQuit(() => window.location.reload());
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') togglePause();
});

// --- Stats screen ---
ui.onOpenStats(() => {
  sound.unlock();
  sound.playUIClick();
  ui.showStats(getProgress(), DRAGON_SKINS);
});
ui.onCloseStats(() => {
  sound.playUIClick();
  ui.hideStats();
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

// "Character select" camera: slowly orbits the dragon on the start screen so
// its skin color is clearly visible from every angle, well clear of the
// dark overlay's center where the title/controls text sits.
let showcaseAngle = 0;
function updateShowcaseCamera(dt) {
  showcaseAngle += dt * 0.22;
  const dragonPos = dragon.group.position;
  const radius = 58;
  const camPos3 = new THREE.Vector3(
    dragonPos.x + Math.sin(showcaseAngle) * radius,
    dragonPos.y + 30,
    dragonPos.z + Math.cos(showcaseAngle) * radius
  );
  const lookTarget = new THREE.Vector3(dragonPos.x, dragonPos.y + 8, dragonPos.z);
  // Aim well past the dragon (not straight at it) so it renders in the clear
  // right-hand zone of the screen (see #startOverlay CSS), not hidden behind
  // the left-aligned title/flavor/controls text.
  const forward = lookTarget.clone().sub(camPos3).normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  lookTarget.addScaledVector(right, -20);
  camera.position.copy(camPos3);
  camera.up.set(0, 1, 0);
  camera.lookAt(lookTarget);
}

// Projects a world-space objective into screen space so the HUD can show
// either a glowing ring right on top of it (when it's actually in view) or a
// big arrow clamped to the screen edge pointing toward it (when it's not) —
// tied to the real camera transform, unlike a dragon-heading-based compass.
const _ndc = new THREE.Vector3();
const _viewSpace = new THREE.Vector3();
function updateWaypoint(targetPos, label) {
  if (!targetPos) { ui.setWaypoint(null); return; }

  const dist = camera.position.distanceTo(targetPos);
  _viewSpace.copy(targetPos).applyMatrix4(camera.matrixWorldInverse);
  const inFront = _viewSpace.z < 0;

  _ndc.copy(targetPos).project(camera);
  const onScreen = inFront && Math.abs(_ndc.x) <= 0.92 && Math.abs(_ndc.y) <= 0.92;

  const w = window.innerWidth, h = window.innerHeight;
  let x, y, angleDeg = 0;
  if (onScreen) {
    x = (_ndc.x * 0.5 + 0.5) * w;
    y = (1 - (_ndc.y * 0.5 + 0.5)) * h;
  } else {
    let dx = _ndc.x, dy = _ndc.y;
    if (!inFront) { dx = -dx; dy = -dy; } // flip: projecting a behind-camera point mirrors it
    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) dx = 1e-4;
    angleDeg = Math.atan2(dx, dy) * (180 / Math.PI);

    const margin = 56;
    const halfW = w / 2 - margin, halfH = h / 2 - margin;
    const pxDirX = dx * (w / 2), pxDirY = -dy * (h / 2);
    const len = Math.hypot(pxDirX, pxDirY) || 1e-6;
    const nx = pxDirX / len, ny = pxDirY / len;
    const scale = Math.min(halfW / (Math.abs(nx) || 1e-6), halfH / (Math.abs(ny) || 1e-6));
    x = w / 2 + nx * scale;
    y = h / 2 + ny * scale;
  }

  ui.setWaypoint({ x, y, onScreen, angleDeg, distance: Math.round(dist), label });
}

const showcaseLight = new THREE.PointLight(0xfff4ea, 0, 220, 1.4);
scene.add(showcaseLight);
function updateShowcaseLight(dt, active) {
  showcaseLight.position.set(dragon.group.position.x, dragon.group.position.y + 35, dragon.group.position.z + 30);
  const target = active ? 3.4 : 0;
  showcaseLight.intensity = THREE.MathUtils.lerp(showcaseLight.intensity, target, 1 - Math.pow(0.01, dt));
}

function litCount() {
  return beacons.filter((b) => b.lit).length;
}

// Nearest unlit beacon, or the Blossom Ring once every beacon is lit.
function currentObjective() {
  const unlit = beacons.filter((b) => !b.lit);
  if (unlit.length === 0) return { pos: world.landingPad.position, label: 'Blossom Ring' };
  let nearest = unlit[0];
  let nearestDist = Infinity;
  for (const b of unlit) {
    const d = dragon.position.distanceTo(b.position);
    if (d < nearestDist) { nearestDist = d; nearest = b; }
  }
  return { pos: nearest.position, label: 'Wishlight' };
}

function checkWin(state, isStorm) {
  if (gameWon) return;
  // Hard Skies' completion path is the Storm Queen boss fight (see
  // spawnBoss/updateBoss) once all 8 wishlights are lit, not landing.
  if (mode !== 'easy') return;
  if (beacons.length > 0 && litCount() === beacons.length && state.isLanded) {
    const distToPad = dragon.position.distanceTo(world.landingPad.position);
    if (distToPad < world.landingPad.radius + 10) {
      gameWon = true;
      const elapsed = (performance.now() - startTime) / 1000;
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = Math.floor(elapsed % 60).toString().padStart(2, '0');
      ui.showWin(`${m}:${s}`);
      ui.hidePauseButton();
      sound.playWin();
      totalFlightsCompleted += 1;
      const patch = { completedEasy: true, flightsCompleted: totalFlightsCompleted };
      if (isStorm) patch.stormCompletion = true;
      reportProgress(patch);
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
  ui.hidePauseButton();
  sound.playWin();
  totalFlightsCompleted += 1;
  reportProgress({ completedRace: true, bestRaceTime: getBestTime(), flightsCompleted: totalFlightsCompleted });
}

// Loading splash lives in index.html so it paints before any JS runs; hide it
// once the scene has actually painted a frame, with a small minimum display
// time so it doesn't just flash on fast machines.
const loadStart = performance.now();
let firstFrame = true;
function hideLoadingScreen() {
  const el = document.getElementById('loading');
  if (!el) return;
  const minDisplay = 500;
  const remaining = Math.max(0, minDisplay - (performance.now() - loadStart));
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 550);
  }, remaining);
}

const clock = new THREE.Clock();
let elapsedTime = 0;
let prevIsLanded = true;
let prevLitCount = 0;
let prevBoost = false;
let prevStorming = false;

// Adaptive quality: shadows and bloom are the priciest effects, and device
// GPUs vary wildly (integrated laptop chips vs. discrete desktops). Rather
// than pick one fixed setting, sample real frame time during actual gameplay
// and drop the expensive effects if the device can't keep up — checked once,
// a few seconds in, so startup jank doesn't trigger a false downgrade.
let perfCheckStart = null;
let perfFrames = 0;
let perfChecked = false;
const PERF_SAMPLE_SECONDS = 3;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  if (paused) { composer.render(); return; }
  elapsedTime += dt;

  if (started && !perfChecked) {
    if (perfCheckStart === null) perfCheckStart = performance.now();
    perfFrames++;
    const elapsedMs = performance.now() - perfCheckStart;
    if (elapsedMs > PERF_SAMPLE_SECONDS * 1000) {
      perfChecked = true;
      const avgFps = (perfFrames / elapsedMs) * 1000;
      if (avgFps < 45) bloomPass.enabled = false;
      if (avgFps < 30) renderer.shadowMap.enabled = false;
    }
  }

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
    sound.update(dt, { speed: state.speed, maxSpeed: dragon.boostMaxSpeed, firing, isLanded: state.isLanded, stormIntensity: weatherState.stormIntensity });

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
      ui.updateRaceHUD(state, raceIndex, raceRings.length, elapsedStr);
      updateWaypoint(nextRing ? nextRing.position : null, 'Next Ring');
    } else {
      fire.update(dt, dragon, beacons, firing);
      ui.update(state, litCount(), beacons.length);
      checkWin(state, weatherState.isStorm);

      const lit = litCount();
      if (lit > prevLitCount) sound.playIgnite();
      prevLitCount = lit;

      const newGems = updateGems(dt, gems, dragon.position);
      if (newGems > 0) {
        sessionGems += newGems;
        totalGemsCollected += newGems;
        bestGemsInFlightSoFar = Math.max(bestGemsInFlightSoFar, sessionGems);
        sound.playGem();
        ui.updateGemCount(sessionGems);
        reportProgress({ gemsCollected: totalGemsCollected, bestGemsInFlight: bestGemsInFlightSoFar });
      }

      if (enemies.length > 0) {
        const hit = updateEnemies(dt, enemies, dragon);
        if (hit) {
          sound.playHit();
          ui.flashHit();
          hitShake = 0.6;
        }
        if (firing) {
          const scaredCount = checkFireScares(dragon, enemies);
          if (scaredCount > 0) {
            sound.playScare();
            totalSpritesScared += scaredCount;
            reportProgress({ spritesScared: totalSpritesScared });
          }
        }
      }

      // Hard Skies culminates in the Storm Queen once every wishlight is lit.
      if (mode === 'hard' && !boss && !gameWon && lit === beacons.length) {
        boss = spawnBoss(scene, world.landingPad.position.clone().add(new THREE.Vector3(0, 40, 0)));
        ui.showBossIntro();
        weather.forceStorm();
        sound.playThunder();
      }

      if (boss) {
        const mouthPos = dragon.getMouthWorldPosition(new THREE.Vector3());
        const fwdVec = dragon.getForwardWorld(new THREE.Vector3());
        const result = updateBoss(dt, boss, firing, mouthPos, fwdVec);
        ui.updateBossHP(boss.hp);
        if (bossTelegraphActive(boss)) ui.setPrompt('⚡ Storm Queen is charging — brace for wind! ⚡');

        if (result.burst) {
          sound.playStormBurst();
          const toDragon = dragon.position.clone().sub(result.burstPosition);
          const dist = toDragon.length();
          if (dist < BURST_RADIUS) {
            const falloff = 1 - dist / BURST_RADIUS;
            toDragon.normalize();
            dragon.position.addScaledVector(toDragon, BURST_FORCE * falloff);
            dragon.velY += 10 * falloff;
            hitShake = Math.max(hitShake, 0.8);
            ui.flashHit();
          }
        }

        if (result.justDefeated) {
          gameWon = true;
          ui.hideBossBar();
          const elapsed = (performance.now() - startTime) / 1000;
          const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
          const s = Math.floor(elapsed % 60).toString().padStart(2, '0');
          ui.showWin(`${m}:${s}`);
          ui.hidePauseButton();
          sound.playWin();
          totalFlightsCompleted += 1;
          reportProgress({ completedHard: true, stormCompletion: true, flightsCompleted: totalFlightsCompleted });
          const defeatedBoss = boss;
          setTimeout(() => removeBoss(scene, defeatedBoss), 1400);
        }
      }

      if (boss && !boss.defeated) {
        updateWaypoint(boss.position, 'Storm Queen');
      } else if (!gameWon) {
        const objective = currentObjective();
        updateWaypoint(objective.pos, objective.label);
      }
    }

    const shakeTarget = (firing ? 0.35 : 0) + (controls.state.boost && state.speed > 5 ? 0.45 : 0)
      + hitShake + weatherState.stormIntensity * 0.5;
    updateCamera(dt, shakeTarget);
    updateShowcaseLight(dt, false);
  } else if (!started) {
    dragon.syncTransform();
    updateShowcaseCamera(dt);
    updateShowcaseLight(dt, true);
    ui.setWaypoint(null);
  } else {
    updateCamera(dt, weatherState.stormIntensity * 0.3);
    updateShowcaseLight(dt, false);
    ui.setWaypoint(null);
  }

  updateSunShadow(world.sun, dragon.position);
  composer.render();
  if (firstFrame) {
    firstFrame = false;
    hideLoadingScreen();
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  // composer.setSize hands the bloom pass full resolution, which it then halves
  // internally — reapply our extra halving so it stays cheap after a resize too.
  bloomPass.setSize(window.innerWidth / 2, window.innerHeight / 2);
});

requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  window.__debug = {
    dragon, world, heightAt, THREE, fire, controls, sound, checkFireScares, updateEnemies, camera, scene, renderer, weather, DRAGON_SKINS, composer, bloomPass,
    get beacons() { return beacons; },
    get enemies() { return enemies; },
    get raceRings() { return raceRings; },
    get raceIndex() { return raceIndex; },
    get boss() { return boss; },
    get gems() { return gems; },
    get sessionGems() { return sessionGems; },
    updateBoss,
    get mode() { return mode; },
    get gameWon() { return gameWon; },
  };
}

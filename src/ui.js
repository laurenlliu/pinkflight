const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&display=swap');

  #hud { position: fixed; inset: 0; pointer-events: none; font-family: 'Baloo 2', 'Trebuchet MS', sans-serif; color: #fff0f8; z-index: 5; }
  .panel-text { text-shadow: 0 2px 6px rgba(60,10,50,0.85), 0 0 18px rgba(120,20,90,0.5); }

  #objective { position: absolute; top: 22px; left: 50%; transform: translateX(-50%); text-align: center; width: 90vw; max-width: 620px; }
  #objective .title { font-size: 15px; letter-spacing: 3px; opacity: 0.8; text-transform: uppercase; font-weight: 600; }
  #objective .goal { font-size: 20px; margin-top: 4px; font-weight: 600; }
  #beaconCount { color: #ffd166; font-weight: 800; }
  @media (max-width: 480px) {
    #objective .goal { font-size: 15px; }
    #objective .title { font-size: 12px; }
  }

  #bars { position: absolute; left: 26px; bottom: 26px; width: 220px; }
  .bar-row { margin-bottom: 10px; }
  .bar-label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.85; margin-bottom: 3px; font-weight: 600; }
  .bar-track { height: 10px; background: rgba(60,20,55,0.5); border: 1px solid rgba(255,210,240,0.35); border-radius: 6px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 6px; transition: width 0.08s linear; }
  #speedFill { background: linear-gradient(90deg,#7fd0ff,#ffffff); }
  #altFill { background: linear-gradient(90deg,#b06fe0,#e8c9ff); }
  #staminaFill { background: linear-gradient(90deg,#3fae5a,#8ee68a); }
  #fireFill { background: linear-gradient(90deg,#ff6fb0,#ffd166); }

  #promptCenter { position: absolute; top: 62%; left: 50%; transform: translate(-50%,-50%); text-align: center; font-size: 22px; letter-spacing: 1px; opacity: 0; transition: opacity 0.3s; font-weight: 600; }
  #promptCenter.show { opacity: 1; }

  #weatherPrompt { position: absolute; top: 200px; left: 50%; transform: translateX(-50%); text-align: center; font-size: 16px; letter-spacing: 1px; opacity: 0; transition: opacity 0.6s; font-weight: 600; font-style: italic; color: #d9e0ff; }
  #weatherPrompt.show { opacity: 1; }

  #reticle { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 10px; height: 10px; border: 2px solid rgba(255,214,240,0.7); border-radius: 50%; opacity: 0.6; }

  #compass { margin-top: 6px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
  #compassArrow { width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 18px solid #ffd166; filter: drop-shadow(0 2px 4px rgba(60,10,50,0.8)); transition: transform 0.15s ease-out; }
  #compassLabel { font-size: 12px; letter-spacing: 1px; opacity: 0.9; font-weight: 600; }

  #hitFlash { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(176,111,224,0) 40%, rgba(176,111,224,0.35) 100%); opacity: 0; transition: opacity 0.15s; }
  #hitFlash.show { opacity: 1; }

  .overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; background: radial-gradient(ellipse at center, rgba(90,40,110,0.75), rgba(20,8,30,0.96)); z-index: 10; text-align: center; padding: 20px; pointer-events: all; font-family: 'Baloo 2', 'Trebuchet MS', sans-serif; overflow-y: auto; }
  .overlay h1 { font-size: clamp(32px, 6vw, 64px); letter-spacing: 4px; font-weight: 800; color: #ffe3f5; text-shadow: 0 0 30px rgba(255,111,176,0.7), 0 0 60px rgba(176,111,224,0.5); margin: 0 0 6px; }
  .overlay .flavor { color: #f0d9ee; opacity: 0.9; font-size: 15px; max-width: 560px; margin-bottom: 22px; line-height: 1.55; }
  .overlay .controls { display: grid; grid-template-columns: auto auto; gap: 6px 18px; text-align: left; color: #fff0f8; font-size: 14px; margin-bottom: 26px; background: rgba(80,30,90,0.3); padding: 16px 22px; border-radius: 14px; border: 1px solid rgba(255,214,240,0.3); }
  .overlay .controls b { color: #ffd166; }
  .overlay .touchHint { font-size: 13px; opacity: 0.75; margin-top: -14px; margin-bottom: 22px; }

  .modeRow { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
  .modeBtn { pointer-events: all; cursor: pointer; border: 2px solid rgba(255,214,240,0.4); color: #fff0f8; font-family: inherit; font-weight: 700; font-size: 16px; letter-spacing: 1px; padding: 16px 30px; border-radius: 14px; box-shadow: 0 6px 18px rgba(30,8,40,0.5); display: flex; flex-direction: column; align-items: center; gap: 4px; transition: transform 0.12s ease; }
  .modeBtn:hover { transform: translateY(-2px); }
  .modeBtn .sub { font-size: 12px; font-weight: 500; opacity: 0.85; letter-spacing: 0.5px; }
  .modeBtn.easy { background: linear-gradient(180deg,#ffb3e0,#ff6fb0); }
  .modeBtn.hard { background: linear-gradient(180deg,#d9a8ff,#b06fe0); }
  .modeBtn.race { background: linear-gradient(180deg,#7fe8f5,#2ab8cc); }

  .overlay button.primary { pointer-events: all; cursor: pointer; background: linear-gradient(180deg,#ffd166,#ff9f5a); border: none; color: #3a1608; font-weight: 800; font-size: 17px; letter-spacing: 1px; padding: 14px 38px; border-radius: 12px; text-transform: uppercase; box-shadow: 0 6px 18px rgba(30,8,40,0.5); font-family: inherit; }
  .overlay button.primary:hover { filter: brightness(1.08); }
  .hidden { display: none !important; }

  #touchControls { position: absolute; inset: 0; display: none; pointer-events: none; }
  .touch-active #touchControls { display: block; }
  .touch-active #bars { bottom: 148px; }

  #joystickBase { position: absolute; left: 28px; bottom: 28px; width: 116px; height: 116px; border-radius: 50%; background: rgba(80,30,90,0.35); border: 2px solid rgba(255,214,240,0.4); pointer-events: all; touch-action: none; }
  #joystickStick { position: absolute; left: 50%; top: 50%; width: 52px; height: 52px; margin: -26px 0 0 -26px; border-radius: 50%; background: linear-gradient(180deg,#ffb3e0,#ff6fb0); box-shadow: 0 4px 10px rgba(30,8,40,0.5); transition: transform 0.05s linear; }

  #touchButtons { position: absolute; right: 22px; bottom: 22px; display: flex; align-items: flex-end; gap: 14px; }
  .touchBtn { pointer-events: all; touch-action: none; width: 64px; height: 64px; border-radius: 50%; border: 2px solid rgba(255,214,240,0.45); color: #fff0f8; font-family: inherit; font-weight: 700; font-size: 12px; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: center; background: rgba(80,30,90,0.55); box-shadow: 0 4px 10px rgba(30,8,40,0.4); user-select: none; }
  .touchBtn:active, .touchBtn.active { filter: brightness(1.3); transform: scale(0.94); }
  .touchBtn.fire { width: 78px; height: 78px; background: linear-gradient(180deg,#ffd166,#ff6fb0); color: #3a1608; font-size: 22px; }
  .touchBtn.boost { margin-bottom: 18px; }
`;

export class UI {
  constructor() {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const hud = document.createElement('div');
    hud.id = 'hud';
    if (isTouch) document.body.classList.add('touch-active');
    hud.innerHTML = `
      <div id="objective" class="panel-text">
        <div class="title">Pinkflight</div>
        <div class="goal">Light the <span id="beaconCount">0 / 4</span> wishlights, then glide home to the Blossom Ring</div>
        <div id="compass">
          <div id="compassArrow"></div>
          <div id="compassLabel"></div>
        </div>
      </div>
      <div id="reticle"></div>
      <div id="promptCenter" class="panel-text"></div>
      <div id="weatherPrompt"></div>
      <div id="hitFlash"></div>
      <div id="bars">
        <div class="bar-row"><div class="bar-label panel-text">Speed</div><div class="bar-track"><div id="speedFill" class="bar-fill" style="width:0%"></div></div></div>
        <div class="bar-row"><div class="bar-label panel-text">Altitude</div><div class="bar-track"><div id="altFill" class="bar-fill" style="width:0%"></div></div></div>
        <div class="bar-row"><div class="bar-label panel-text">Stamina (Shift)</div><div class="bar-track"><div id="staminaFill" class="bar-fill" style="width:100%"></div></div></div>
        <div class="bar-row"><div class="bar-label panel-text">Dragonfire (F)</div><div class="bar-track"><div id="fireFill" class="bar-fill" style="width:100%"></div></div></div>
      </div>
      <div id="touchControls">
        <div id="joystickBase"><div id="joystickStick"></div></div>
        <div id="touchButtons">
          <button id="btnBoost" class="touchBtn boost">BOOST</button>
          <button id="btnFlap" class="touchBtn">FLAP</button>
          <button id="btnFire" class="touchBtn fire">🔥</button>
        </div>
      </div>
    `;
    document.getElementById('app').appendChild(hud);
    this.els = {
      beaconCount: hud.querySelector('#beaconCount'),
      goalText: hud.querySelector('.goal'),
      prompt: hud.querySelector('#promptCenter'),
      speedFill: hud.querySelector('#speedFill'),
      altFill: hud.querySelector('#altFill'),
      staminaFill: hud.querySelector('#staminaFill'),
      fireFill: hud.querySelector('#fireFill'),
      compassArrow: hud.querySelector('#compassArrow'),
      compassLabel: hud.querySelector('#compassLabel'),
      hitFlash: hud.querySelector('#hitFlash'),
      weatherPrompt: hud.querySelector('#weatherPrompt'),
    };
    this._weatherPromptTimeout = null;

    this.startOverlay = this._buildStart();
    this.winOverlay = this._buildWin();
    this.raceResultOverlay = this._buildRaceResult();
    document.getElementById('app').appendChild(this.startOverlay);
    document.getElementById('app').appendChild(this.winOverlay);
    document.getElementById('app').appendChild(this.raceResultOverlay);

    this._hitFlashTimeout = null;
  }

  setRaceBestHint(text) {
    const el = document.getElementById('raceBestSub');
    if (el) el.textContent = text;
  }

  _buildStart() {
    const el = document.createElement('div');
    el.className = 'overlay';
    el.id = 'startOverlay';
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    el.innerHTML = `
      <h1>PINKFLIGHT</h1>
      <div class="flavor">Somewhere above the Bloomlands, a little dragon dreams of the open sky. Scattered across the hills are wishlights, each waiting for a spark of courage to set it glowing. Find them, light them with your flame, then glide home to the Blossom Ring before the stars come out.</div>
      ${isTouch ? '' : `<div class="controls">
        <div><b>W / S</b></div><div>Climb / Dive</div>
        <div><b>A / D</b></div><div>Turn Left / Right</div>
        <div><b>Space</b></div><div>Flap (lift boost / take off)</div>
        <div><b>Shift</b></div><div>Speed boost</div>
        <div><b>F</b></div><div>Breathe fire</div>
      </div>`}
      ${isTouch ? '<div class="touchHint">Joystick to steer · FLAP to lift off · hold 🔥 to breathe fire</div>' : ''}
      <div class="modeRow">
        <button class="modeBtn easy" data-mode="easy">
          <span>🌸 Easy Skies</span>
          <span class="sub">4 wishlights · calm skies</span>
        </button>
        <button class="modeBtn hard" data-mode="hard">
          <span>⚡ Hard Skies</span>
          <span class="sub">8 wishlights · mischievous Storm Sprites</span>
        </button>
        <button class="modeBtn race" data-mode="race">
          <span>🏁 Ring Race</span>
          <span class="sub" id="raceBestSub">10 rings · beat the clock</span>
        </button>
      </div>
    `;
    return el;
  }

  _buildWin() {
    const el = document.createElement('div');
    el.className = 'overlay hidden';
    el.id = 'winOverlay';
    el.innerHTML = `
      <h1>FLIGHT COMPLETE</h1>
      <div class="flavor" id="winText">Every wishlight glows across the Bloomlands. Well flown, little dragon.</div>
      <button class="primary" id="restartBtn">Fly Again</button>
    `;
    return el;
  }

  _buildRaceResult() {
    const el = document.createElement('div');
    el.className = 'overlay hidden';
    el.id = 'raceResultOverlay';
    el.innerHTML = `
      <h1>RACE COMPLETE</h1>
      <div class="flavor" id="raceResultText"></div>
      <button class="primary" id="raceRestartBtn">Race Again</button>
    `;
    return el;
  }

  onStart(cb) {
    this.startOverlay.querySelectorAll('.modeBtn').forEach((btn) => {
      btn.addEventListener('click', () => cb(btn.dataset.mode));
    });
  }

  onRestart(cb) {
    this.winOverlay.querySelector('#restartBtn').addEventListener('click', cb);
  }

  // Wires the on-screen joystick + buttons to a Controls instance. Safe to call
  // even on non-touch devices (the elements just stay hidden via CSS).
  bindTouchControls(controls) {
    const base = document.getElementById('joystickBase');
    const stick = document.getElementById('joystickStick');
    const maxR = 40;
    let touchId = null;
    let centerX = 0, centerY = 0;

    const resetStick = () => { stick.style.transform = 'translate(0px, 0px)'; };

    const setFromDelta = (dx, dy) => {
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, maxR);
      const angle = Math.atan2(dy, dx);
      const cx = Math.cos(angle) * clamped;
      const cy = Math.sin(angle) * clamped;
      stick.style.transform = `translate(${cx}px, ${cy}px)`;

      const deadzone = 12;
      controls.setTouch('yawLeft', dx < -deadzone);
      controls.setTouch('yawRight', dx > deadzone);
      controls.setTouch('pitchUp', dy < -deadzone);
      controls.setTouch('pitchDown', dy > deadzone);
    };

    base.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      touchId = t.identifier;
      const rect = base.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
      setFromDelta(t.clientX - centerX, t.clientY - centerY);
      controls.begin();
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (touchId === null) return;
      const t = Array.from(e.changedTouches).find((x) => x.identifier === touchId);
      if (!t) return;
      e.preventDefault();
      setFromDelta(t.clientX - centerX, t.clientY - centerY);
    }, { passive: false });

    const endJoystick = (e) => {
      if (touchId === null) return;
      const t = Array.from(e.changedTouches).find((x) => x.identifier === touchId);
      if (!t) return;
      touchId = null;
      resetStick();
      controls.setTouch('yawLeft', false);
      controls.setTouch('yawRight', false);
      controls.setTouch('pitchDown', false);
      controls.setTouch('pitchUp', false);
    };
    window.addEventListener('touchend', endJoystick);
    window.addEventListener('touchcancel', endJoystick);

    const bindButton = (id, key) => {
      const btn = document.getElementById(id);
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.classList.add('active');
        controls.setTouch(key, true);
      }, { passive: false });
      const release = (e) => {
        e.preventDefault();
        btn.classList.remove('active');
        controls.setTouch(key, false);
      };
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('touchcancel', release, { passive: false });
    };
    bindButton('btnFlap', 'flap');
    bindButton('btnBoost', 'boost');
    bindButton('btnFire', 'fire');
  }

  hideStart() {
    this.startOverlay.classList.add('hidden');
  }

  showWin(timeStr) {
    this.winOverlay.querySelector('#winText').textContent =
      `Every wishlight glows across the Bloomlands. Well flown, little dragon. Time: ${timeStr}`;
    this.winOverlay.classList.remove('hidden');
  }

  hideWin() {
    this.winOverlay.classList.add('hidden');
  }

  setPrompt(text) {
    if (!text) {
      this.els.prompt.classList.remove('show');
      return;
    }
    this.els.prompt.textContent = text;
    this.els.prompt.classList.add('show');
  }

  setGoalText(totalBeacons) {
    this.els.goalText.innerHTML = `Light the <span id="beaconCount">0 / ${totalBeacons}</span> wishlights, then glide home to the Blossom Ring`;
    this.els.beaconCount = document.getElementById('beaconCount');
  }

  flashHit() {
    this.els.hitFlash.classList.add('show');
    clearTimeout(this._hitFlashTimeout);
    this._hitFlashTimeout = setTimeout(() => this.els.hitFlash.classList.remove('show'), 220);
  }

  setWeatherPrompt(text) {
    clearTimeout(this._weatherPromptTimeout);
    if (!text) {
      this.els.weatherPrompt.classList.remove('show');
      return;
    }
    this.els.weatherPrompt.textContent = text;
    this.els.weatherPrompt.classList.add('show');
    this._weatherPromptTimeout = setTimeout(() => this.els.weatherPrompt.classList.remove('show'), 4000);
  }

  update(state, litCount, totalBeacons, dragon, beacons, landingPad) {
    this.els.beaconCount.textContent = `${litCount} / ${totalBeacons}`;
    const speedPct = Math.min(100, (state.speed / 96) * 100);
    const altPct = Math.min(100, (state.altitude / 500) * 100);
    this.els.speedFill.style.width = `${speedPct}%`;
    this.els.altFill.style.width = `${altPct}%`;
    this.els.staminaFill.style.width = `${state.stamina * 100}%`;
    this.els.fireFill.style.width = `${state.fireFuel * 100}%`;

    if (state.isLanded) {
      this.setPrompt('Landed — flap to take off');
    } else {
      this.setPrompt('');
    }

    if (dragon && beacons) {
      const allLit = litCount === totalBeacons;
      let targetPos, label;
      if (allLit) {
        targetPos = landingPad.position;
        label = 'Blossom Ring';
      } else {
        const unlit = beacons.filter((b) => !b.lit);
        let nearest = unlit[0];
        let nearestDist = Infinity;
        for (const b of unlit) {
          const d = dragon.position.distanceTo(b.position);
          if (d < nearestDist) { nearestDist = d; nearest = b; }
        }
        targetPos = nearest.position;
        label = 'Wishlight';
      }
      this._pointCompassAt(dragon, targetPos, label);
    }
  }

  _pointCompassAt(dragon, targetPos, label) {
    const dx = targetPos.x - dragon.position.x;
    const dz = targetPos.z - dragon.position.z;
    const dist = Math.hypot(dx, dz);
    const desiredYaw = Math.atan2(-dx, -dz);
    let bearing = desiredYaw - dragon.yaw;
    bearing = Math.atan2(Math.sin(bearing), Math.cos(bearing));
    const deg = -bearing * (180 / Math.PI);

    this.els.compassArrow.style.transform = `rotate(${deg}deg)`;
    this.els.compassLabel.textContent = `${label} · ${Math.round(dist)}m`;
  }

  // --- Ring race mode ---

  setRaceMode(totalRings) {
    this.els.goalText.innerHTML = `Ring <span id="ringCount">0 / ${totalRings}</span> &nbsp;·&nbsp; <span id="raceTimer">00:00.00</span>`;
    this.els.ringCount = document.getElementById('ringCount');
    this.els.raceTimer = document.getElementById('raceTimer');
  }

  updateRaceHUD(state, ringIndex, totalRings, elapsedStr, dragon, nextRingPos) {
    if (this.els.ringCount) this.els.ringCount.textContent = `${Math.min(ringIndex, totalRings)} / ${totalRings}`;
    if (this.els.raceTimer) this.els.raceTimer.textContent = elapsedStr;

    const speedPct = Math.min(100, (state.speed / 96) * 100);
    const altPct = Math.min(100, (state.altitude / 500) * 100);
    this.els.speedFill.style.width = `${speedPct}%`;
    this.els.altFill.style.width = `${altPct}%`;
    this.els.staminaFill.style.width = `${state.stamina * 100}%`;

    if (state.isLanded) {
      this.setPrompt('Landed — flap to take off');
    } else {
      this.setPrompt('');
    }

    if (nextRingPos) this._pointCompassAt(dragon, nextRingPos, 'Next Ring');
  }

  onRaceRestart(cb) {
    this.raceResultOverlay.querySelector('#raceRestartBtn').addEventListener('click', cb);
  }

  showRaceResult(timeStr, isNewBest, bestStr) {
    const text = isNewBest
      ? `New best time! ${timeStr} — the wind has never carried you faster.`
      : `Finished in ${timeStr}. Best so far: ${bestStr}.`;
    this.raceResultOverlay.querySelector('#raceResultText').textContent = text;
    this.raceResultOverlay.classList.remove('hidden');
  }
}

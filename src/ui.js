const STYLE = `
  #hud { position: fixed; inset: 0; pointer-events: none; font-family: 'Trebuchet MS', 'Segoe UI', sans-serif; color: #f1e6c8; z-index: 5; }
  .panel-text { text-shadow: 0 2px 6px rgba(0,0,0,0.85), 0 0 18px rgba(0,0,0,0.5); }

  #objective { position: absolute; top: 22px; left: 50%; transform: translateX(-50%); text-align: center; }
  #objective .title { font-size: 15px; letter-spacing: 3px; opacity: 0.75; text-transform: uppercase; }
  #objective .goal { font-size: 20px; margin-top: 4px; }
  #beaconCount { color: #ffcf5c; font-weight: bold; }

  #bars { position: absolute; left: 26px; bottom: 26px; width: 220px; }
  .bar-row { margin-bottom: 10px; }
  .bar-label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.8; margin-bottom: 3px; }
  .bar-track { height: 10px; background: rgba(20,14,10,0.55); border: 1px solid rgba(255,220,160,0.35); border-radius: 6px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 6px; transition: width 0.08s linear; }
  #speedFill { background: linear-gradient(90deg,#7fd0ff,#ffffff); }
  #altFill { background: linear-gradient(90deg,#8a6bff,#c9b6ff); }
  #staminaFill { background: linear-gradient(90deg,#3fae5a,#8ee68a); }
  #fireFill { background: linear-gradient(90deg,#ff6a1a,#ffcf5c); }

  #promptCenter { position: absolute; top: 62%; left: 50%; transform: translate(-50%,-50%); text-align: center; font-size: 22px; letter-spacing: 2px; opacity: 0; transition: opacity 0.3s; }
  #promptCenter.show { opacity: 1; }

  #reticle { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 10px; height: 10px; border: 2px solid rgba(255,220,160,0.7); border-radius: 50%; opacity: 0.6; }

  #compass { position: absolute; top: 92px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 2px; }
  #compassArrow { width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 18px solid #ffcf5c; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)); transition: transform 0.15s ease-out; }
  #compassLabel { font-size: 12px; letter-spacing: 1px; opacity: 0.85; }

  .overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; background: radial-gradient(ellipse at center, rgba(30,14,8,0.75), rgba(5,4,8,0.96)); z-index: 10; text-align: center; padding: 20px; pointer-events: all; }
  .overlay h1 { font-family: 'Trebuchet MS', serif; font-size: clamp(32px, 6vw, 64px); letter-spacing: 6px; color: #ffdca8; text-shadow: 0 0 30px rgba(255,150,40,0.6); margin: 0 0 6px; }
  .overlay .flavor { color: #d8c7a0; opacity: 0.85; font-size: 15px; max-width: 560px; margin-bottom: 22px; line-height: 1.5; }
  .overlay .controls { display: grid; grid-template-columns: auto auto; gap: 6px 18px; text-align: left; color: #f1e6c8; font-size: 14px; margin-bottom: 26px; background: rgba(0,0,0,0.25); padding: 16px 22px; border-radius: 10px; border: 1px solid rgba(255,220,160,0.25); }
  .overlay .controls b { color: #ffcf5c; }
  .overlay button { pointer-events: all; cursor: pointer; background: linear-gradient(180deg,#ffcf5c,#e0922a); border: none; color: #2a1608; font-weight: bold; font-size: 17px; letter-spacing: 2px; padding: 14px 38px; border-radius: 8px; text-transform: uppercase; box-shadow: 0 6px 18px rgba(0,0,0,0.5); }
  .overlay button:hover { filter: brightness(1.08); }
  .hidden { display: none !important; }
`;

export class UI {
  constructor() {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = `
      <div id="objective" class="panel-text">
        <div class="title">Pinkflight</div>
        <div class="goal">Light the <span id="beaconCount">0 / 5</span> beacons, then return to the Roundtable to land</div>
      </div>
      <div id="reticle"></div>
      <div id="compass" class="panel-text">
        <div id="compassArrow"></div>
        <div id="compassLabel"></div>
      </div>
      <div id="promptCenter" class="panel-text"></div>
      <div id="bars">
        <div class="bar-row"><div class="bar-label panel-text">Speed</div><div class="bar-track"><div id="speedFill" class="bar-fill" style="width:0%"></div></div></div>
        <div class="bar-row"><div class="bar-label panel-text">Altitude</div><div class="bar-track"><div id="altFill" class="bar-fill" style="width:0%"></div></div></div>
        <div class="bar-row"><div class="bar-label panel-text">Stamina (Shift)</div><div class="bar-track"><div id="staminaFill" class="bar-fill" style="width:100%"></div></div></div>
        <div class="bar-row"><div class="bar-label panel-text">Dragonfire (F)</div><div class="bar-track"><div id="fireFill" class="bar-fill" style="width:100%"></div></div></div>
      </div>
    `;
    document.getElementById('app').appendChild(hud);
    this.els = {
      beaconCount: hud.querySelector('#beaconCount'),
      prompt: hud.querySelector('#promptCenter'),
      speedFill: hud.querySelector('#speedFill'),
      altFill: hud.querySelector('#altFill'),
      staminaFill: hud.querySelector('#staminaFill'),
      fireFill: hud.querySelector('#fireFill'),
      compassArrow: hud.querySelector('#compassArrow'),
      compassLabel: hud.querySelector('#compassLabel'),
    };

    this.startOverlay = this._buildStart();
    this.winOverlay = this._buildWin();
    document.getElementById('app').appendChild(this.startOverlay);
    document.getElementById('app').appendChild(this.winOverlay);
  }

  _buildStart() {
    const el = document.createElement('div');
    el.className = 'overlay';
    el.id = 'startOverlay';
    el.innerHTML = `
      <h1>PINKFLIGHT</h1>
      <div class="flavor">Tarnished, mount your wyrm. Five beacon-fires lie scattered across these broken lands, each awaiting the touch of dragonflame. Light them all, then return to the Roundtable ring to complete your flight.</div>
      <div class="controls">
        <div><b>W / S</b></div><div>Dive / Climb</div>
        <div><b>A / D</b></div><div>Turn Left / Right</div>
        <div><b>Space</b></div><div>Flap (lift boost / take off)</div>
        <div><b>Shift</b></div><div>Speed boost</div>
        <div><b>F</b></div><div>Breathe fire</div>
      </div>
      <button id="startBtn">Take Flight</button>
    `;
    return el;
  }

  _buildWin() {
    const el = document.createElement('div');
    el.className = 'overlay hidden';
    el.id = 'winOverlay';
    el.innerHTML = `
      <h1>FLIGHT COMPLETE</h1>
      <div class="flavor" id="winText">All beacons burn bright across the land. Well flown, Tarnished.</div>
      <button id="restartBtn">Fly Again</button>
    `;
    return el;
  }

  onStart(cb) {
    this.startOverlay.querySelector('#startBtn').addEventListener('click', cb);
  }

  onRestart(cb) {
    this.winOverlay.querySelector('#restartBtn').addEventListener('click', cb);
  }

  hideStart() {
    this.startOverlay.classList.add('hidden');
  }

  showWin(timeStr) {
    this.winOverlay.querySelector('#winText').textContent =
      `All beacons burn bright across the land. Well flown, Tarnished. Time: ${timeStr}`;
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

  update(state, litCount, totalBeacons, dragon, beacons, landingPad) {
    this.els.beaconCount.textContent = `${litCount} / ${totalBeacons}`;
    const speedPct = Math.min(100, (state.speed / 96) * 100);
    const altPct = Math.min(100, (state.altitude / 500) * 100);
    this.els.speedFill.style.width = `${speedPct}%`;
    this.els.altFill.style.width = `${altPct}%`;
    this.els.staminaFill.style.width = `${state.stamina * 100}%`;
    this.els.fireFill.style.width = `${state.fireFuel * 100}%`;

    if (state.isLanded) {
      this.setPrompt('Landed — press Space to take flight');
    } else {
      this.setPrompt('');
    }

    if (dragon && beacons) this._updateCompass(dragon, litCount, totalBeacons, beacons, landingPad);
  }

  _updateCompass(dragon, litCount, totalBeacons, beacons, landingPad) {
    const allLit = litCount === totalBeacons;
    let targetPos, label;
    if (allLit) {
      targetPos = landingPad.position;
      label = 'Roundtable';
    } else {
      const unlit = beacons.filter((b) => !b.lit);
      let nearest = unlit[0];
      let nearestDist = Infinity;
      for (const b of unlit) {
        const d = dragon.position.distanceTo(b.position);
        if (d < nearestDist) { nearestDist = d; nearest = b; }
      }
      targetPos = nearest.position;
      label = 'Beacon';
    }

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
}

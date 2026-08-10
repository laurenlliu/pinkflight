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

  #bossBar { position: absolute; top: 90px; left: 50%; transform: translateX(-50%); width: min(72vw, 460px); display: none; text-align: center; }
  #bossBar.show { display: block; }
  #bossBar .bossLabel { font-size: 13px; letter-spacing: 3px; text-transform: uppercase; font-weight: 700; color: #e8c9ff; margin-bottom: 5px; }
  #bossBar .bar-track { height: 14px; border-color: rgba(224,169,255,0.5); }
  #bossHpFill { background: linear-gradient(90deg,#b06fe0,#ff6fc0); transition: width 0.15s linear; }

  #bossIntro { position: fixed; top: 40%; left: 50%; transform: translate(-50%,-50%) scale(0.9); text-align: center; z-index: 15; opacity: 0; transition: opacity 0.6s ease, transform 0.6s ease; pointer-events: none; }
  #bossIntro.show { opacity: 1; transform: translate(-50%,-50%) scale(1); }
  #bossIntro h2 { margin: 0; font-size: clamp(28px, 5vw, 48px); letter-spacing: 3px; font-weight: 800; color: #e8c9ff; text-shadow: 0 0 30px rgba(176,111,224,0.9), 0 0 60px rgba(255,111,196,0.6); }
  #bossIntro p { margin: 8px 0 0; font-size: 15px; color: #f0d9ee; opacity: 0.9; }

  #gemCounter { position: absolute; top: 20px; left: 20px; display: none; align-items: center; gap: 8px; font-size: 18px; font-weight: 800; color: #ffe9c2; background: rgba(80,30,90,0.4); border: 2px solid rgba(255,214,240,0.35); border-radius: 20px; padding: 6px 16px 6px 10px; }
  #gemCounter.show { display: flex; }
  #gemCounter .icon { font-size: 18px; transition: transform 0.15s ease; }
  #gemCounter.pulse .icon { transform: scale(1.4) rotate(20deg); }

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

  /* Waypoint marker: a big clear arrow clamped to the screen edge pointing at
     the objective when it's off-screen, or a glowing reticle sitting right on
     top of it in the 3D world when it's in view. Much more legible than a
     tiny rotating compass triangle. */
  #waypoint { position: absolute; display: none; align-items: center; justify-content: center; flex-direction: column; transform: translate(-50%, -50%); transition: left 0.1s linear, top 0.1s linear; }
  #waypoint.show { display: flex; }
  #waypointArrow { width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-bottom: 26px solid #ffd166; filter: drop-shadow(0 2px 6px rgba(60,10,50,0.9)) drop-shadow(0 0 10px rgba(255,209,102,0.6)); }
  #waypointRing { display: none; width: 30px; height: 30px; border-radius: 50%; border: 3px solid #ffd166; box-shadow: 0 0 14px rgba(255,209,102,0.8), inset 0 0 8px rgba(255,209,102,0.5); }
  #waypoint.onscreen #waypointArrow { display: none; }
  #waypoint.onscreen #waypointRing { display: block; }
  #waypointLabel { margin-top: 8px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; white-space: nowrap; text-shadow: 0 2px 6px rgba(60,10,50,0.9), 0 0 10px rgba(60,10,50,0.7); color: #ffe9c2; }

  #hitFlash { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(176,111,224,0) 40%, rgba(176,111,224,0.35) 100%); opacity: 0; transition: opacity 0.15s; }
  #hitFlash.show { opacity: 1; }

  .overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; background: radial-gradient(ellipse at center, rgba(70,30,90,0.42), rgba(15,6,24,0.72)); z-index: 10; text-align: center; padding: 20px; pointer-events: all; font-family: 'Baloo 2', 'Trebuchet MS', sans-serif; overflow-y: auto; }
  .overlay h1 { font-size: clamp(28px, 5vw, 56px); letter-spacing: 4px; font-weight: 800; color: #ffe3f5; text-shadow: 0 0 30px rgba(255,111,176,0.9), 0 0 60px rgba(176,111,224,0.7), 0 2px 10px rgba(10,4,16,0.8); margin: 0 0 4px; }
  .overlay .flavor { color: #f0d9ee; opacity: 0.95; font-size: 14px; max-width: 560px; margin-bottom: 12px; line-height: 1.4; text-shadow: 0 1px 6px rgba(10,4,16,0.9), 0 0 16px rgba(10,4,16,0.6); }

  /* Default: original centered, full-width-ish layout — fits and scrolls
     safely on any screen. Narrowing this column made text wrap onto more
     lines and pushed the mode buttons below the fold on typical windows, so
     that's now an enhancement gated on screens wide enough to afford both a
     readable column AND a clear showcase zone to its right (see
     updateShowcaseCamera), not the default. The mode-button row lives
     outside this narrow column (see markup) so it can use more width and
     fit 2-per-row instead of stacking 3 deep and blowing the height budget. */
  #startOverlay .startContent { max-width: 720px; width: 100%; }
  #startOverlay .modeRow { margin-top: 8px; }
  @media (min-width: 1000px) {
    #startOverlay { align-items: flex-start; justify-content: flex-start; padding-top: 3vh; padding-bottom: 3vh; }
    #startOverlay .startContent { max-width: 480px; padding-left: 4vw; box-sizing: border-box; }
    #startOverlay .modeRow { max-width: 620px; padding-left: 4vw; box-sizing: border-box; justify-content: flex-start; }
  }
  .overlay .controls { display: grid; grid-template-columns: auto auto; gap: 4px 16px; text-align: left; color: #fff0f8; font-size: 13px; margin-bottom: 14px; background: rgba(80,30,90,0.3); padding: 12px 18px; border-radius: 14px; border: 1px solid rgba(255,214,240,0.3); }
  .overlay .controls b { color: #ffd166; }
  .overlay .touchHint { font-size: 13px; opacity: 0.75; margin-top: -8px; margin-bottom: 14px; }

  .skinPickerWrap { margin-bottom: 4px; }
  .skinPickerLabel { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.75; margin-bottom: 8px; }
  .wideHint { display: none; }
  @media (min-width: 1000px) { .wideHint { display: inline; } }
  .skinPicker { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 6px; }
  .skinSwatch { position: relative; pointer-events: all; cursor: pointer; width: 34px; height: 34px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.28); padding: 0; transition: transform 0.12s ease, border-color 0.12s ease; box-shadow: 0 3px 8px rgba(30,8,40,0.5); }
  .skinSwatch:hover { transform: scale(1.14); }
  .skinSwatch.selected { border-color: #ffd166; box-shadow: 0 0 12px rgba(255,209,102,0.75); }
  .skinSwatch.locked { filter: grayscale(0.85) brightness(0.5); cursor: help; }
  .skinSwatch.locked::after { content: '🔒'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  #skinName { font-size: 12px; font-weight: 600; opacity: 0.85; min-height: 15px; }

  #unlockToast { position: fixed; top: 26px; left: 50%; transform: translateX(-50%) translateY(-12px); z-index: 20; text-align: center; padding: 12px 26px; border-radius: 14px; background: linear-gradient(180deg, rgba(255,209,102,0.95), rgba(255,143,196,0.95)); color: #3a1608; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 8px 24px rgba(30,8,40,0.6); opacity: 0; transition: opacity 0.4s ease, transform 0.4s ease; pointer-events: none; }
  #unlockToast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  .modeRow { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
  .modeBtn { pointer-events: all; cursor: pointer; border: 2px solid rgba(255,214,240,0.4); color: #fff0f8; font-family: inherit; font-weight: 700; font-size: 15px; letter-spacing: 1px; padding: 12px 22px; border-radius: 14px; box-shadow: 0 6px 18px rgba(30,8,40,0.5); display: flex; flex-direction: column; align-items: center; gap: 3px; transition: transform 0.12s ease; }
  .modeBtn:hover { transform: translateY(-2px); }
  .modeBtn .sub { font-size: 12px; font-weight: 500; opacity: 0.85; letter-spacing: 0.5px; }
  .modeBtn.easy { background: linear-gradient(180deg,#ffb3e0,#ff6fb0); }
  .modeBtn.hard { background: linear-gradient(180deg,#d9a8ff,#b06fe0); }
  .modeBtn.race { background: linear-gradient(180deg,#7fe8f5,#2ab8cc); }

  .overlay button.primary { pointer-events: all; cursor: pointer; background: linear-gradient(180deg,#ffd166,#ff9f5a); border: none; color: #3a1608; font-weight: 800; font-size: 17px; letter-spacing: 1px; padding: 14px 38px; border-radius: 12px; text-transform: uppercase; box-shadow: 0 6px 18px rgba(30,8,40,0.5); font-family: inherit; }
  .overlay button.primary:hover { filter: brightness(1.08); }
  .overlay button.secondary { pointer-events: all; cursor: pointer; background: rgba(255,255,255,0.12); border: 2px solid rgba(255,214,240,0.4); color: #fff0f8; font-weight: 700; font-size: 15px; letter-spacing: 1px; padding: 12px 30px; border-radius: 12px; font-family: inherit; }
  .overlay button.secondary:hover { background: rgba(255,255,255,0.2); }
  .hidden { display: none !important; }

  #pauseBtn { position: absolute; top: 20px; right: 20px; pointer-events: all; cursor: pointer; width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(255,214,240,0.4); background: rgba(80,30,90,0.45); color: #fff0f8; font-size: 16px; display: none; align-items: center; justify-content: center; }
  #pauseBtn:hover { background: rgba(80,30,90,0.7); }

  .sliderRow { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; text-align: left; }
  .sliderRow label { width: 90px; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; opacity: 0.85; }
  .sliderRow input[type="range"] { pointer-events: all; flex: 1; accent-color: #ff6fb0; height: 6px; }
  .sliderRow .sliderVal { width: 36px; font-size: 13px; opacity: 0.75; text-align: right; }
  .pauseButtons { display: flex; gap: 14px; justify-content: center; margin-top: 22px; flex-wrap: wrap; }

  .statsBtnLink { pointer-events: all; cursor: pointer; background: none; border: none; color: #f0d9ee; opacity: 0.8; font-family: inherit; font-size: 13px; letter-spacing: 1px; text-decoration: underline; margin-top: 6px; }
  .statsBtnLink:hover { opacity: 1; }
  #statsOverlay { z-index: 12; background: radial-gradient(ellipse at center, rgba(70,30,90,0.92), rgba(15,6,24,0.97)); }
  .statsGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; max-width: 640px; width: 100%; margin: 18px 0 24px; text-align: left; }
  .statCard { background: rgba(80,30,90,0.35); border: 1px solid rgba(255,214,240,0.3); border-radius: 14px; padding: 14px 18px; }
  .statCard .statLabel { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.75; margin-bottom: 4px; }
  .statCard .statValue { font-size: 22px; font-weight: 800; color: #ffe3f5; }
  .statSkinRow { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 8px; }
  .statSkinDot { width: 24px; height: 24px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); }
  .statSkinDot.locked { filter: grayscale(0.9) brightness(0.45); }

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
      </div>
      <div id="gemCounter" class="panel-text"><span class="icon">💎</span><span id="gemCount">0</span></div>
      <div id="bossBar" class="panel-text">
        <div class="bossLabel">Storm Queen</div>
        <div class="bar-track"><div id="bossHpFill" class="bar-fill" style="width:100%"></div></div>
      </div>
      <div id="bossIntro">
        <h2>The Storm Queen Descends</h2>
        <p>Breathe fire on her core — dodge her wind when she charges!</p>
      </div>
      <div id="waypoint" class="panel-text">
        <div id="waypointArrow"></div>
        <div id="waypointRing"></div>
        <div id="waypointLabel"></div>
      </div>
      <div id="reticle"></div>
      <div id="promptCenter" class="panel-text"></div>
      <div id="weatherPrompt"></div>
      <div id="unlockToast"></div>
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
      <button id="pauseBtn" title="Pause (Esc)">⏸</button>
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
      waypoint: hud.querySelector('#waypoint'),
      waypointLabel: hud.querySelector('#waypointLabel'),
      hitFlash: hud.querySelector('#hitFlash'),
      weatherPrompt: hud.querySelector('#weatherPrompt'),
      unlockToast: hud.querySelector('#unlockToast'),
      bossBar: hud.querySelector('#bossBar'),
      bossHpFill: hud.querySelector('#bossHpFill'),
      bossIntro: hud.querySelector('#bossIntro'),
      pauseBtn: hud.querySelector('#pauseBtn'),
      gemCounter: hud.querySelector('#gemCounter'),
      gemCount: hud.querySelector('#gemCount'),
    };
    this._weatherPromptTimeout = null;
    this._unlockToastTimeout = null;

    this.startOverlay = this._buildStart();
    this.winOverlay = this._buildWin();
    this.raceResultOverlay = this._buildRaceResult();
    this.pauseOverlay = this._buildPause();
    this.statsOverlay = this._buildStats();
    document.getElementById('app').appendChild(this.startOverlay);
    document.getElementById('app').appendChild(this.winOverlay);
    document.getElementById('app').appendChild(this.pauseOverlay);
    document.getElementById('app').appendChild(this.raceResultOverlay);
    document.getElementById('app').appendChild(this.statsOverlay);

    this._hitFlashTimeout = null;
  }

  setRaceBestHint(text) {
    const el = document.getElementById('raceBestSub');
    if (el) el.textContent = text;
  }

  // Renders the swatch row into the start screen and wires clicks. onChange
  // fires with the full skin object for live-preview repainting of the dragon
  // already visible behind the overlay. isUnlockedFn(skinId) gates locked
  // skins: they render dim with a lock icon, and clicking one shows its
  // unlock hint instead of selecting it.
  buildSkinPicker(skins, selectedId, onChange, isUnlockedFn) {
    const container = this.startOverlay.querySelector('#skinPicker');
    const nameEl = this.startOverlay.querySelector('#skinName');
    let current = selectedId;
    let hintTimeout = null;
    const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
    const render = () => {
      container.innerHTML = '';
      for (const skin of skins) {
        const unlocked = isUnlockedFn ? isUnlockedFn(skin.id) : true;
        const btn = document.createElement('button');
        btn.className = 'skinSwatch' + (skin.id === current ? ' selected' : '') + (unlocked ? '' : ' locked');
        btn.style.background = skin.animated
          ? 'conic-gradient(from 0deg, #ff5f5f, #ffd166, #7dff9c, #5fe0ff, #a878ff, #ff5fbf, #ff5f5f)'
          : `linear-gradient(135deg, ${hex(skin.body)}, ${hex(skin.belly)})`;
        btn.title = unlocked ? skin.name : `Locked — ${skin.unlockHint}`;
        btn.addEventListener('click', () => {
          if (!unlocked) {
            clearTimeout(hintTimeout);
            if (nameEl) nameEl.textContent = `🔒 ${skin.unlockHint}`;
            hintTimeout = setTimeout(() => {
              const sel = skins.find((s) => s.id === current);
              if (nameEl && sel) nameEl.textContent = sel.name;
            }, 2200);
            return;
          }
          current = skin.id;
          onChange(skin);
          render();
        });
        container.appendChild(btn);
      }
      const sel = skins.find((s) => s.id === current);
      if (nameEl && sel) nameEl.textContent = sel.name;
    };
    render();
  }

  _buildStart() {
    const el = document.createElement('div');
    el.className = 'overlay';
    el.id = 'startOverlay';
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    el.innerHTML = `
      <div class="startContent">
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
        <div class="skinPickerWrap">
          <div class="skinPickerLabel">Choose your dragon<span class="wideHint"> — see it live on the right →</span></div>
          <div id="skinPicker" class="skinPicker"></div>
          <div id="skinName"></div>
        </div>
      </div>
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
      <button class="statsBtnLink" id="statsBtn">📊 View Stats</button>
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

  _buildPause() {
    const el = document.createElement('div');
    el.className = 'overlay hidden';
    el.id = 'pauseOverlay';
    el.innerHTML = `
      <h1>PAUSED</h1>
      <div class="sliderRow">
        <label for="musicSlider">Music</label>
        <input type="range" id="musicSlider" min="0" max="100" value="80" />
        <span class="sliderVal" id="musicSliderVal">80%</span>
      </div>
      <div class="sliderRow">
        <label for="sfxSlider">Sound</label>
        <input type="range" id="sfxSlider" min="0" max="100" value="80" />
        <span class="sliderVal" id="sfxSliderVal">80%</span>
      </div>
      <div class="pauseButtons">
        <button class="primary" id="resumeBtn">Resume</button>
        <button class="secondary" id="quitBtn">Quit to Menu</button>
      </div>
    `;
    return el;
  }

  _buildStats() {
    const el = document.createElement('div');
    el.className = 'overlay hidden';
    el.id = 'statsOverlay';
    el.innerHTML = `
      <h1>YOUR JOURNEY</h1>
      <div class="statSkinRow" id="statSkinRow"></div>
      <div class="statsGrid" id="statsGrid"></div>
      <button class="primary" id="statsCloseBtn">Back</button>
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

  showUnlockToast(skinName) {
    clearTimeout(this._unlockToastTimeout);
    this.els.unlockToast.textContent = `✨ New dragon unlocked: ${skinName}! ✨`;
    this.els.unlockToast.classList.add('show');
    this._unlockToastTimeout = setTimeout(() => this.els.unlockToast.classList.remove('show'), 4500);
  }

  // --- Wishgems ---

  showGemCounter() {
    this.els.gemCounter.classList.add('show');
  }

  hideGemCounter() {
    this.els.gemCounter.classList.remove('show');
  }

  updateGemCount(count) {
    this.els.gemCount.textContent = count;
    this.els.gemCounter.classList.add('pulse');
    clearTimeout(this._gemPulseTimeout);
    this._gemPulseTimeout = setTimeout(() => this.els.gemCounter.classList.remove('pulse'), 220);
  }

  // --- Storm Queen boss ---

  showBossIntro() {
    this.els.goalText.textContent = 'Defeat the Storm Queen!';
    this.els.bossBar.classList.add('show');
    this.els.bossIntro.classList.add('show');
    clearTimeout(this._bossIntroTimeout);
    this._bossIntroTimeout = setTimeout(() => this.els.bossIntro.classList.remove('show'), 4000);
  }

  updateBossHP(hpFraction) {
    this.els.bossHpFill.style.width = `${Math.max(0, hpFraction) * 100}%`;
  }

  hideBossBar() {
    this.els.bossBar.classList.remove('show');
  }

  update(state, litCount, totalBeacons) {
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
  }

  // Positions the waypoint marker from an already-computed screen-space result
  // (see main.js's updateWaypoint, which does the camera projection). Either a
  // glowing ring sitting right on the target in the 3D view (onScreen) or a
  // big arrow clamped to the screen edge pointing toward it (off-screen).
  setWaypoint(info) {
    if (!info) {
      this.els.waypoint.classList.remove('show');
      return;
    }
    this.els.waypoint.classList.add('show');
    this.els.waypoint.classList.toggle('onscreen', info.onScreen);
    this.els.waypoint.style.left = `${info.x}px`;
    this.els.waypoint.style.top = `${info.y}px`;
    if (!info.onScreen) {
      this.els.waypoint.querySelector('#waypointArrow').style.transform = `rotate(${info.angleDeg}deg)`;
    }
    this.els.waypointLabel.textContent = `${info.label} · ${info.distance}m`;
  }

  // --- Ring race mode ---

  setRaceMode(totalRings) {
    this.els.goalText.innerHTML = `Ring <span id="ringCount">0 / ${totalRings}</span> &nbsp;·&nbsp; <span id="raceTimer">00:00.00</span>`;
    this.els.ringCount = document.getElementById('ringCount');
    this.els.raceTimer = document.getElementById('raceTimer');
  }

  updateRaceHUD(state, ringIndex, totalRings, elapsedStr) {
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

  // --- Pause menu ---

  onPauseButtonClick(cb) {
    this.els.pauseBtn.addEventListener('click', cb);
  }

  onResume(cb) {
    this.pauseOverlay.querySelector('#resumeBtn').addEventListener('click', cb);
  }

  onQuit(cb) {
    this.pauseOverlay.querySelector('#quitBtn').addEventListener('click', cb);
  }

  // Wires the volume sliders to live callbacks and sets their initial
  // position from saved settings (values 0..1).
  bindVolumeSliders(initialMusic, initialSfx, onMusicChange, onSfxChange) {
    const musicSlider = this.pauseOverlay.querySelector('#musicSlider');
    const sfxSlider = this.pauseOverlay.querySelector('#sfxSlider');
    const musicVal = this.pauseOverlay.querySelector('#musicSliderVal');
    const sfxVal = this.pauseOverlay.querySelector('#sfxSliderVal');
    musicSlider.value = Math.round(initialMusic * 100);
    sfxSlider.value = Math.round(initialSfx * 100);
    musicVal.textContent = `${musicSlider.value}%`;
    sfxVal.textContent = `${sfxSlider.value}%`;
    musicSlider.addEventListener('input', () => {
      musicVal.textContent = `${musicSlider.value}%`;
      onMusicChange(musicSlider.value / 100);
    });
    sfxSlider.addEventListener('input', () => {
      sfxVal.textContent = `${sfxSlider.value}%`;
      onSfxChange(sfxSlider.value / 100);
    });
  }

  showPause() {
    this.pauseOverlay.classList.remove('hidden');
  }

  hidePause() {
    this.pauseOverlay.classList.add('hidden');
  }

  showPauseButton() {
    this.els.pauseBtn.style.display = 'flex';
  }

  hidePauseButton() {
    this.els.pauseBtn.style.display = 'none';
  }

  onOpenStats(cb) {
    document.getElementById('statsBtn').addEventListener('click', cb);
  }

  onCloseStats(cb) {
    this.statsOverlay.querySelector('#statsCloseBtn').addEventListener('click', cb);
  }

  // Populates the stats overlay from a progress object (see progress.js) and
  // the full DRAGON_SKINS list, then reveals it.
  showStats(progress, skins) {
    const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
    const skinRow = this.statsOverlay.querySelector('#statSkinRow');
    skinRow.innerHTML = '';
    for (const skin of skins) {
      const unlocked = progress.unlocked.includes(skin.id);
      const dot = document.createElement('div');
      dot.className = 'statSkinDot' + (unlocked ? '' : ' locked');
      dot.title = unlocked ? skin.name : `Locked — ${skin.unlockHint}`;
      dot.style.background = skin.animated
        ? 'conic-gradient(from 0deg, #ff5f5f, #ffd166, #7dff9c, #5fe0ff, #a878ff, #ff5fbf, #ff5f5f)'
        : `linear-gradient(135deg, ${hex(skin.body)}, ${hex(skin.belly)})`;
      skinRow.appendChild(dot);
    }

    const cards = [
      ['Skins Unlocked', `${progress.unlocked.length} / ${skins.length}`],
      ['Best Race Time', progress.bestRaceTime !== null ? `${progress.bestRaceTime.toFixed(1)}s` : '—'],
      ['Easy Skies', progress.completedEasy ? '✓ Complete' : 'Not yet'],
      ['Hard Skies', progress.completedHard ? '✓ Complete' : 'Not yet'],
      ['Storm Survived', progress.stormCompletion ? '✓ Yes' : 'Not yet'],
      ['Flights Completed', `${progress.flightsCompleted}`],
      ['Wishgems Collected', `${progress.gemsCollected}`],
      ['Best Gems in One Flight', `${progress.bestGemsInFlight}`],
      ['Storm Sprites Scared', `${progress.spritesScared}`],
    ];
    const grid = this.statsOverlay.querySelector('#statsGrid');
    grid.innerHTML = cards
      .map(([label, value]) => `
        <div class="statCard">
          <div class="statLabel">${label}</div>
          <div class="statValue">${value}</div>
        </div>
      `)
      .join('');

    this.statsOverlay.classList.remove('hidden');
  }

  hideStats() {
    this.statsOverlay.classList.add('hidden');
  }
}

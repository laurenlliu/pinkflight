const KEY_MAP = {
  KeyW: 'pitchDown', ArrowUp: 'pitchDown',
  KeyS: 'pitchUp', ArrowDown: 'pitchUp',
  KeyA: 'yawLeft', ArrowLeft: 'yawLeft',
  KeyD: 'yawRight', ArrowRight: 'yawRight',
  ShiftLeft: 'boost', ShiftRight: 'boost',
  Space: 'flap',
  KeyF: 'fire',
};

export class Controls {
  constructor() {
    this.state = {
      pitchDown: false,
      pitchUp: false,
      yawLeft: false,
      yawRight: false,
      boost: false,
      flap: false,
      fire: false,
    };
    this.flapPressed = false;
    this._flapWasDown = false;
    this.started = false;
    this._onStart = null;

    window.addEventListener('keydown', (e) => this._handle(e, true));
    window.addEventListener('keyup', (e) => this._handle(e, false));
    window.addEventListener('mousedown', (e) => {
      if (this._isUI(e.target)) return;
      this.state.fire = true;
      this._maybeStart();
    });
    window.addEventListener('mouseup', () => { this.state.fire = false; });
    window.addEventListener('touchstart', (e) => {
      if (this._isUI(e.target)) return;
      this._maybeStart();
    }, { passive: true });
  }

  // Clicks/taps on start/win overlays or the touch control buttons are UI actions,
  // not in-game fire/start input — the elements' own handlers own those.
  _isUI(target) {
    return !!(target && target.closest && target.closest('.overlay, #touchControls, button'));
  }

  onStart(cb) { this._onStart = cb; }

  // Public entry point for non-keyboard input sources (touch UI) to set flags and
  // trigger the same "first input begins the flight" behavior as a keypress.
  setTouch(key, value) {
    this.state[key] = value;
    if (value) this._maybeStart();
  }

  begin() { this._maybeStart(); }

  _maybeStart() {
    if (!this.started) {
      this.started = true;
      if (this._onStart) this._onStart();
    }
  }

  _handle(e, isDown) {
    const action = KEY_MAP[e.code];
    if (!action) return;
    if (isDown && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    this.state[action] = isDown;
    if (isDown) this._maybeStart();
  }

  // Returns true only on the frame flap transitions from up to down (edge trigger)
  consumeFlapEdge() {
    const isDown = this.state.flap;
    const edge = isDown && !this._flapWasDown;
    this._flapWasDown = isDown;
    return edge;
  }
}

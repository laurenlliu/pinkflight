// Fully synthesized SFX via Web Audio API — no external audio assets.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.unlocked = false;
    this._wind = null;
    this._fire = null;
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this._buildWind();
    this._buildFire();
    this._buildMusic();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  // --- Generative ambient music: no fixed loop, just an ever-evolving pad +
  // sparkle texture over a major-pentatonic scale, so it never has a jarring
  // loop point and stays fresh through a whole play session. ---
  _buildMusic() {
    const ctx = this.ctx;
    this._musicBus = ctx.createGain();
    this._musicBus.gain.value = 0.2;
    this._musicBus.connect(this.master);
    this._musicOn = true;
    this._musicDuck = 1;
    this._musicScale = [261.63, 293.66, 329.63, 392.0, 440.0]; // C D E G A
    this._queueChord(300);
    this._queueSparkle(1800);
  }

  _queueChord(delayMs) {
    clearTimeout(this._chordTimer);
    this._chordTimer = setTimeout(() => {
      if (this._musicOn) this._playChord();
      this._queueChord(4500 + Math.random() * 3500);
    }, delayMs);
  }

  _queueSparkle(delayMs) {
    clearTimeout(this._sparkleTimer);
    this._sparkleTimer = setTimeout(() => {
      if (this._musicOn && Math.random() < 0.7) this._playSparkle();
      this._queueSparkle(2200 + Math.random() * 2600);
    }, delayMs);
  }

  _playChord() {
    const ctx = this.ctx;
    const scale = this._musicScale;
    const i = Math.floor(Math.random() * scale.length);
    const octave = Math.random() < 0.5 ? 0.5 : 1;
    const chordIdx = [i, (i + 2) % scale.length, (i + 4) % scale.length];
    const t0 = ctx.currentTime;
    chordIdx.forEach((idx, voice) => {
      const freq = scale[idx] * octave * (voice === 2 ? 2 : 1);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 6;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      const g = ctx.createGain();
      const peak = 0.09 - voice * 0.015;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 2.2);
      g.gain.linearRampToValueAtTime(0, t0 + 7.5);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this._musicBus);
      osc.start(t0);
      osc.stop(t0 + 7.6);
    });
  }

  _playSparkle() {
    const ctx = this.ctx;
    const scale = this._musicScale;
    const freq = scale[Math.floor(Math.random() * scale.length)] * 2;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.06, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
    osc.connect(g);
    g.connect(this._musicBus);
    osc.start(t0);
    osc.stop(t0 + 1.5);
  }

  _noiseBuffer(seconds = 2) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  _buildWind() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(2);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    this._wind = { src, filter, gain };
  }

  _buildFire() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(2);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    this._fire = { src, filter, gain, jitterT: 0 };
  }

  // Called every frame with live flight/fire state to modulate ambient loops.
  update(dt, { speed, maxSpeed, firing, isLanded, stormIntensity = 0 }) {
    if (!this.unlocked) return;
    const now = this.ctx.currentTime;
    const speedT = Math.min(1, speed / maxSpeed);

    const windTarget = isLanded ? 0 : 0.05 + speedT * 0.32;
    this._wind.gain.gain.setTargetAtTime(windTarget, now, 0.25);
    this._wind.filter.frequency.setTargetAtTime(250 + speedT * 900, now, 0.2);

    const fireTarget = firing ? 0.34 : 0;
    this._fire.gain.gain.setTargetAtTime(fireTarget, now, firing ? 0.06 : 0.18);
    if (firing) {
      this._fire.jitterT += dt;
      if (this._fire.jitterT > 0.07) {
        this._fire.jitterT = 0;
        this._fire.filter.frequency.setTargetAtTime(700 + Math.random() * 500, now, 0.05);
      }
    }

    // Duck the music bed under thunder/wind during a storm.
    if (this._musicBus) {
      const target = 0.2 * (1 - stormIntensity * 0.55);
      this._musicBus.gain.setTargetAtTime(target, now, 1.5);
    }
  }

  _envTone(freq, { type = 'sine', attack = 0.01, decay = 0.15, sustain = 0, gain = 0.25, detune = 0, delay = 0 } = {}) {
    if (!this.unlocked) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * 0.4), t0 + attack + decay);
    g.gain.linearRampToValueAtTime(0, t0 + attack + decay + sustain);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + attack + decay + sustain + 0.05);
  }

  playIgnite() {
    if (!this.unlocked) return;
    // Bright ascending chime.
    this._envTone(660, { type: 'triangle', attack: 0.005, decay: 0.18, gain: 0.22 });
    this._envTone(880, { type: 'triangle', attack: 0.005, decay: 0.22, gain: 0.2, delay: 0.05 });
    this._envTone(1320, { type: 'sine', attack: 0.005, decay: 0.3, gain: 0.16, delay: 0.1 });
  }

  playRingPass() {
    if (!this.unlocked) return;
    // Short bright blip, distinct from the wishlight chime.
    this._envTone(1046.5, { type: 'sine', attack: 0.002, decay: 0.1, gain: 0.2 });
    this._envTone(1568, { type: 'sine', attack: 0.002, decay: 0.12, gain: 0.14, delay: 0.03 });
  }

  playThunder() {
    if (!this.unlocked) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(1.6);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t0);
    filter.frequency.exponentialRampToValueAtTime(70, t0 + 1.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.4, t0 + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.6);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  playStormBurst() {
    if (!this.unlocked) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(0.7);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(200, t0);
    filter.frequency.exponentialRampToValueAtTime(1800, t0 + 0.3);
    filter.frequency.exponentialRampToValueAtTime(300, t0 + 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.65);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
    this._envTone(110, { type: 'sawtooth', attack: 0.01, decay: 0.3, gain: 0.2 });
  }

  playHit() {
    if (!this.unlocked) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t0);
    osc.frequency.exponentialRampToValueAtTime(60, t0 + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.22);
  }

  playScare() {
    if (!this.unlocked) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, t0);
    osc.frequency.exponentialRampToValueAtTime(200, t0 + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.27);
  }

  playTakeoff() {
    if (!this.unlocked) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.45);
  }

  playLand() {
    if (!this.unlocked) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(0.3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
    this._envTone(110, { type: 'sine', attack: 0.005, decay: 0.2, gain: 0.2 });
  }

  playBoost() {
    if (!this.unlocked) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(0.5);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(400, t0);
    filter.frequency.exponentialRampToValueAtTime(2200, t0 + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  playUIClick() {
    if (!this.unlocked) return;
    this._envTone(520, { type: 'triangle', attack: 0.002, decay: 0.08, gain: 0.15 });
  }

  playWin() {
    if (!this.unlocked) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this._envTone(f, { type: 'triangle', attack: 0.01, decay: 0.35, sustain: 0.05, gain: 0.22, delay: i * 0.14 });
      this._envTone(f * 2, { type: 'sine', attack: 0.01, decay: 0.3, gain: 0.08, delay: i * 0.14 });
    });
  }
}

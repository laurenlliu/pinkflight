const STORAGE_KEY = 'pinkflight_settings';

const DEFAULTS = { musicVolume: 0.8, sfxVolume: 0.8, musicMuted: false };

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch) {
  const s = { ...loadSettings(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  return s;
}

// Tracks lifetime stats and evaluates skin-unlock achievements from them.
// Separate from skins.js (which just defines the palettes + selection) so
// unlock logic has one home regardless of which skin ends up gated on what.
const STORAGE_KEY = 'pinkflight_progress';

const DEFAULT_PROGRESS = {
  unlocked: ['blossom'],
  completedEasy: false,
  completedHard: false,
  completedRace: false,
  bestRaceTime: null,
  spritesScared: 0,
  stormCompletion: false,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROGRESS, ...parsed, unlocked: parsed.unlocked || ['blossom'] };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

function save(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function getProgress() {
  return load();
}

export function isUnlocked(skinId) {
  return load().unlocked.includes(skinId);
}

// Order matters: rainbow's rule checks the others, so it must run last.
const UNLOCK_RULES = {
  mint: (p) => p.completedEasy,
  sunset: (p) => p.completedRace,
  ocean: (p) => p.completedHard,
  lavender: (p) => p.spritesScared >= 5,
  midnight: (p) => p.stormCompletion,
  ruby: (p) => p.bestRaceTime !== null && p.bestRaceTime < 45,
  rainbow: (p) => ['mint', 'sunset', 'ocean', 'lavender', 'midnight', 'ruby'].every((id) => p.unlocked.includes(id)),
};

// Merges a partial stat update, re-evaluates every unlock rule, persists, and
// returns any newly-unlocked skin ids so the caller can show a toast.
export function updateProgress(patch) {
  const p = load();
  Object.assign(p, patch);
  const newlyUnlocked = [];
  for (const [id, rule] of Object.entries(UNLOCK_RULES)) {
    if (!p.unlocked.includes(id) && rule(p)) {
      p.unlocked.push(id);
      newlyUnlocked.push(id);
    }
  }
  save(p);
  return { progress: p, newlyUnlocked };
}

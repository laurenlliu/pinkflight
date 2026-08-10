// Dragon color presets. Each defines the palette applied across the model:
// body/belly/dark (torso, head, tail, feet), membrane (wing skin + its glow),
// and accent (wing bones, legs). Horns and eyes stay constant across skins
// so the dragon keeps a consistent "face" no matter the coat.
export const DRAGON_SKINS = [
  { id: 'blossom', name: 'Blossom', body: 0xe83f96, belly: 0xffd3ea, dark: 0x7a1052, membrane: 0xff6fb8, membraneEmissive: 0x8a1258, accent: 0xb02070 },
  { id: 'lavender', name: 'Lavender Dream', body: 0xa878e8, belly: 0xe6d9ff, dark: 0x4a2f7a, membrane: 0xc9a0ff, membraneEmissive: 0x6a3fc0, accent: 0x8a5fd0 },
  { id: 'sunset', name: 'Sunset', body: 0xff9f4a, belly: 0xffe3b3, dark: 0x8a4a1a, membrane: 0xffb366, membraneEmissive: 0xcc6a1a, accent: 0xe07a2a },
  { id: 'ocean', name: 'Ocean', body: 0x4ac9e8, belly: 0xd3f7ff, dark: 0x1a5a7a, membrane: 0x7fe0ff, membraneEmissive: 0x2a8ab0, accent: 0x2a9fc0 },
  { id: 'mint', name: 'Mint', body: 0x5fe0a8, belly: 0xdffff0, dark: 0x1a6a4a, membrane: 0x8fffcf, membraneEmissive: 0x3ab080, accent: 0x3ac090 },
  { id: 'midnight', name: 'Midnight Gold', body: 0x2a1c38, belly: 0x4a3560, dark: 0x140a1c, membrane: 0x6a4a80, membraneEmissive: 0xffcf5c, accent: 0xffcf5c },
  { id: 'ruby', name: 'Ruby', body: 0xe83a3a, belly: 0xffc9c9, dark: 0x7a1010, membrane: 0xff6f6f, membraneEmissive: 0x8a1a1a, accent: 0xc02020 },
  { id: 'rainbow', name: 'Rainbow', animated: true },
];

export const DEFAULT_SKIN_ID = 'blossom';

export function getSkin(id) {
  return DRAGON_SKINS.find((s) => s.id === id) || DRAGON_SKINS[0];
}

const STORAGE_KEY = 'pinkflight_skin';

export function loadSavedSkinId() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_SKIN_ID;
}

export function saveSkinId(id) {
  localStorage.setItem(STORAGE_KEY, id);
}

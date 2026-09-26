// ── State ────────────────────────────────────────────────────
// One mutable object shared by every module. localStorage keeps the last
// session and the hangar; the URL carries whatever is being shared. The URL
// formats themselves live in links.js, which the CLI shares.

import { PARTS, WEAPONS, MOUNTS } from './slots.js';
import { HOUSES } from './houses.js';
import { GRAMMAR } from './forge.js';
import { decode, forgeLink, garageLink } from './links.js';

const STORAGE_KEY = 'callsign:v1';
export const VIEWS = ['forge', 'garage', 'houses'];
const HANGAR_MAX = 40;
const NOTE_MAX = 120;

const houseOk = (id, fallback) => (HOUSES.some((h) => h.id === id) ? id : fallback);
const partIds = new Set(PARTS.map((p) => p.id));
const weaponIds = new Set(WEAPONS.map((w) => w.id));

// Four mounts, one of each kind of job, so a fresh build already reads as a system.
const WEAPON_DEFAULTS = [
  { cls: 'rifle', house: 'balam', on: true },
  { cls: 'shield', house: 'takigawa', on: true },
  { cls: 'missile', house: 'furlong', on: false },
  { cls: 'drone', house: 'vcpl', on: false },
];

export function blankGarage() {
  return {
    name: '',
    matched: true,
    frameHouse: 'baws',
    frameRoll: 0,
    parts: PARTS.map((p) => ({
      id: p.id, on: p.group === 'frame' || p.id === 'generator',
      house: p.group === 'frame' ? 'baws' : 'ibis', roll: 0, note: '', key: '', locked: false,
    })),
    weapons: MOUNTS.map((m, i) => ({ mount: m.id, ...WEAPON_DEFAULTS[i], roll: 0, note: '', key: '', locked: false })),
  };
}

export const state = {
  view: 'forge',
  forge: { seed: '', house: 'all', slot: 'core', roll: 0 },
  garage: blankGarage(),
  hangar: [],
  // What a shared link could not reproduce, said once above the views.
  notice: '',
};

const str = (v, max = NOTE_MAX) => (typeof v === 'string' ? v.slice(0, max) : '');
const roll = (v) => (Number.isInteger(v) && v >= 0 && v < 1e6 ? v : 0);

/** Accept anything shaped like a garage, keep only what is valid. */
export function sanitizeGarage(g) {
  if (!g || typeof g !== 'object') return null;
  const base = blankGarage();
  const parts = Array.isArray(g.parts) ? g.parts : [];
  const weapons = Array.isArray(g.weapons) ? g.weapons : [];
  return {
    name: str(g.name, 80),
    matched: g.matched !== false,
    frameHouse: houseOk(g.frameHouse, base.frameHouse),
    frameRoll: roll(g.frameRoll),
    parts: base.parts.map((d) => {
      const p = parts.find((x) => x && x.id === d.id && partIds.has(x.id)) || {};
      return { ...d, on: typeof p.on === 'boolean' ? p.on : d.on, house: houseOk(p.house, d.house), roll: roll(p.roll),
        note: str(p.note), key: str(p.key), locked: p.locked === true };
    }),
    weapons: base.weapons.map((d) => {
      const w = weapons.find((x) => x && x.mount === d.mount) || {};
      return { ...d, cls: weaponIds.has(w.cls) ? w.cls : d.cls, on: typeof w.on === 'boolean' ? w.on : d.on,
        house: houseOk(w.house, d.house), roll: roll(w.roll), note: str(w.note), key: str(w.key), locked: w.locked === true };
    }),
  };
}

function sanitizeForge(f, base) {
  if (!f || typeof f !== 'object') return base;
  const slotOk = partIds.has(f.slot) || weaponIds.has(f.slot);
  return {
    seed: str(f.seed),
    house: f.house === 'all' ? 'all' : houseOk(f.house, base.house),
    slot: slotOk ? f.slot : base.slot,
    roll: roll(f.roll),
  };
}

/** Load the last session and the hangar from localStorage. */
export function loadSaved(s) {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw) return;
    if (VIEWS.includes(raw.view)) s.view = raw.view;
    s.forge = sanitizeForge(raw.forge, s.forge);
    s.garage = sanitizeGarage(raw.garage) || s.garage;
    if (Array.isArray(raw.hangar)) {
      s.hangar = raw.hangar
        .map((b) => ({
          id: str(b?.id, 40),
          savedAt: Number(b?.savedAt) || 0,
          // Builds saved before grammars were numbered count as grammar 0.
          grammar: Number.isInteger(b?.grammar) ? b.grammar : 0,
          garage: sanitizeGarage(b?.garage),
        }))
        .filter((b) => b.id && b.garage)
        .slice(0, HANGAR_MAX);
    }
  } catch { /* unreadable storage: start clean */ }
}

/** Persist the session. */
export function save(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      grammar: GRAMMAR, view: s.view, forge: s.forge, garage: s.garage, hangar: s.hangar,
    }));
  } catch { /* quota exceeded or storage blocked */ }
}

/** Keep a copy of the current build in the hangar, newest first. */
export function stash(s) {
  const id = `b${Date.now().toString(36)}`;
  s.hangar = [{ id, savedAt: Date.now(), grammar: GRAMMAR, garage: structuredClone(s.garage) }, ...s.hangar]
    .slice(0, HANGAR_MAX);
  return id;
}

// ── URL ──────────────────────────────────────────────────────

const FORGE_DEFAULTS = { seed: '', house: 'all', slot: 'core', roll: 0 };
const quote = (v) => `"${String(v).slice(0, 24)}"`;

/** Apply a shared link on top of the saved session. The link wins, and what it could not carry is said. */
export function readUrl(s) {
  const q = new URLSearchParams(location.search);
  const notes = [];
  const g = q.get('g');
  if (g !== null && g !== String(GRAMMAR)) {
    notes.push(`This link was made with Callsign grammar ${quote(g)}, and this page runs grammar ${GRAMMAR}, so the names below may differ from the ones that were shared.`);
  }
  if (q.has('b')) {
    const garage = sanitizeGarage(decode(q.get('b')));
    if (garage) { s.garage = garage; s.view = 'garage'; }
    else notes.push('The build in this link could not be read, so your own garage is shown instead.');
  }
  if (['s', 'h', 'p', 'r'].some((k) => q.has(k))) {
    const house = q.get('h') ?? FORGE_DEFAULTS.house;
    const slotId = q.get('p') ?? FORGE_DEFAULTS.slot;
    // Unknown ids fall back to the defaults, never to this viewer's saved
    // session, so one link shows the same page to everyone who opens it.
    s.forge = sanitizeForge({ seed: q.get('s') ?? '', house, slot: slotId, roll: Number(q.get('r')) || 0 }, FORGE_DEFAULTS);
    if (s.forge.house !== house) notes.push(`The link names a house Callsign does not have (${quote(house)}), so every house is shown.`);
    if (s.forge.slot !== slotId) notes.push(`The link names a slot Callsign does not have (${quote(slotId)}), so Core is shown.`);
    s.view = 'forge';
  }
  const hash = location.hash.slice(1);
  if (VIEWS.includes(hash)) s.view = hash;
  s.notice = notes.join(' ');
}

/** A link that reproduces what is on screen, or null when a build is too big for one. */
export function shareUrl(s, { via = '' } = {}) {
  const base = location.origin + location.pathname;
  if (s.view === 'garage') return garageLink(s.garage, { base, via });
  if (s.view === 'forge') return forgeLink(s.forge, { base, via });
  const u = new URL(base);
  if (via) u.searchParams.set('via', via);
  u.hash = s.view;
  return u.toString();
}

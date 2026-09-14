// ── State ────────────────────────────────────────────────────
// One mutable object shared by every module. localStorage keeps the last
// session and the hangar; the URL carries whatever is being shared.

import { PARTS, WEAPONS, MOUNTS } from './slots.js';
import { HOUSES } from './houses.js';

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
        .map((b) => ({ id: str(b?.id, 40), savedAt: Number(b?.savedAt) || 0, garage: sanitizeGarage(b?.garage) }))
        .filter((b) => b.id && b.garage)
        .slice(0, HANGAR_MAX);
    }
  } catch { /* unreadable storage: start clean */ }
}

/** Persist the session. */
export function save(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      view: s.view, forge: s.forge, garage: s.garage, hangar: s.hangar,
    }));
  } catch { /* quota exceeded or storage blocked */ }
}

/** Keep a copy of the current build in the hangar, newest first. */
export function stash(s) {
  const id = `b${Date.now().toString(36)}`;
  s.hangar = [{ id, savedAt: Date.now(), garage: structuredClone(s.garage) }, ...s.hangar].slice(0, HANGAR_MAX);
  return id;
}

// ── URL ──────────────────────────────────────────────────────
// Base64url JSON for a build, plain params for a single forge roll.

function encode(obj) {
  let bin = '';
  new TextEncoder().encode(JSON.stringify(obj)).forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(text) {
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch { return null; }
}

/** Apply a shared link on top of the saved session. The link wins. */
export function readUrl(s) {
  const q = new URLSearchParams(location.search);
  if (q.has('b')) {
    const g = sanitizeGarage(decode(q.get('b')));
    if (g) { s.garage = g; s.view = 'garage'; }
  }
  if (q.has('s') || q.has('h') || q.has('p')) {
    s.forge = sanitizeForge({
      seed: q.get('s') ?? '', house: q.get('h') ?? 'all', slot: q.get('p') ?? 'core', roll: Number(q.get('r')) || 0,
    }, s.forge);
    s.view = 'forge';
  }
  const hash = location.hash.slice(1);
  if (VIEWS.includes(hash)) s.view = hash;
}

/** A link that reproduces what is on screen. */
export function shareUrl(s) {
  const u = new URL(location.origin + location.pathname);
  if (s.view === 'garage') u.searchParams.set('b', encode(s.garage));
  if (s.view === 'forge') {
    const f = s.forge;
    if (f.seed) u.searchParams.set('s', f.seed);
    u.searchParams.set('h', f.house);
    u.searchParams.set('p', f.slot);
    if (f.roll) u.searchParams.set('r', String(f.roll));
  }
  u.hash = s.view;
  return u.toString();
}

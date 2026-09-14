// ── Events ───────────────────────────────────────────────────
// Every listener, wired once. Handlers mutate state, then ask the owning view
// for the smallest render that leaves focus where the user put it.

import { state, save, stash, shareUrl, blankGarage, sanitizeGarage, VIEWS } from './state.js';
import { render } from './render.js';
import { renderForge, rollStep } from './render-forge.js';
import { renderGarage, renderHangar, syncBayRole } from './render-garage.js';
import { garageRows, mountLabel, EMPTY_KEY } from './forge.js';
import { isWeapon, slot as slotDef } from './slots.js';
import { toMarkdown, toJson, toText } from './export.js';
import { ICONS } from './templates.js';
import { $, showToast, copyText, download, slugify, debounce } from './utils.js';

const persist = debounce(() => save(state), 300);
const isFrame = (id) => slotDef(id).group === 'frame';

function setView(view) {
  if (!VIEWS.includes(view)) return;
  state.view = view;
  history.replaceState(null, '', `${location.pathname}#${view}`);
  render(state);
  save(state);
}

// ── Forge ────────────────────────────────────────────────────

/** Put a forged plate into the garage, exactly as rolled, and lock it there. */
function mountPlate({ house, slot, roll }) {
  const g = state.garage;
  const note = state.forge.seed.trim().slice(0, 120);
  const pin = { on: true, house, roll: Number(roll) || 0, note, key: note.toLowerCase() || EMPTY_KEY, locked: true };
  if (isWeapon(slot)) {
    const w = g.weapons.find((x) => !x.on && x.cls === slot) || g.weapons.find((x) => !x.on)
      || g.weapons.find((x) => !x.locked) || g.weapons[0];
    Object.assign(w, pin, { cls: slot });
    showToast(`Mounted on ${mountLabel(w.mount)} and locked. Open Garage to see the build.`);
  } else {
    const p = g.parts.find((x) => x.id === slot);
    if (!p) return;
    const broke = g.matched && isFrame(slot);
    if (broke) setMatched(false, { quiet: true });
    Object.assign(p, pin);
    showToast(broke
      ? `Mounted on ${slotDef(slot).label}. The frame is now mixed parts, so each bay keeps its own house.`
      : `Mounted on ${slotDef(slot).label} and locked. Open Garage to see the build.`);
  }
  save(state);
}

function bindForge() {
  const f = state.forge;
  const refresh = () => { renderForge(state); persist(); };
  $('seed').addEventListener('input', (e) => { f.seed = e.target.value.slice(0, 120); f.roll = 0; refresh(); });
  $('slotSel').addEventListener('change', (e) => { f.slot = e.target.value; refresh(); });
  $('houseSel').addEventListener('change', (e) => { f.house = e.target.value; f.roll = 0; refresh(); });
  $('reroll').addEventListener('click', () => { f.roll += rollStep(f); refresh(); });
  $('prevRoll').addEventListener('click', () => { f.roll = Math.max(0, f.roll - rollStep(f)); refresh(); });
  $('plates').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mount]');
    if (b) mountPlate(b.dataset);
  });
}

// ── Garage ───────────────────────────────────────────────────

function bayOf(el) {
  const bay = el.closest('.bay');
  if (!bay) return null;
  const g = state.garage;
  const src = bay.dataset.kind === 'part'
    ? g.parts.find((p) => p.id === bay.dataset.ref)
    : g.weapons.find((w) => w.mount === bay.dataset.ref);
  return src ? { bay, src } : null;
}

/** Leaving a matched frame keeps its house on every bay that was following it. */
function setMatched(on, { quiet = false } = {}) {
  const g = state.garage;
  if (g.matched === on) return;
  if (!on) for (const p of g.parts) if (isFrame(p.id) && !p.locked) p.house = g.frameHouse;
  g.matched = on;
  if (!quiet) { renderGarage(state, { full: true }); persist(); }
}

function rerollUnlocked() {
  const g = state.garage;
  if (g.matched && !g.parts.some((p) => isFrame(p.id) && p.locked)) g.frameRoll += 1;
  for (const p of g.parts) if (!p.locked && !(g.matched && isFrame(p.id))) p.roll += 1;
  for (const w of g.weapons) if (!w.locked) w.roll += 1;
  renderGarage(state);
  persist();
}

function onBayInput(e) {
  if (e.target.dataset.field !== 'note') return;
  const b = bayOf(e.target);
  if (!b) return;
  b.src.note = e.target.value.slice(0, 120);
  b.src.key = '';
  renderGarage(state);
  persist();
}

function onBayChange(e) {
  const field = e.target.dataset.field;
  const b = field && field !== 'note' && bayOf(e.target);
  if (!b) return;
  if (field === 'on') b.src.on = e.target.checked;
  if (field === 'house') b.src.house = e.target.value;
  if (field === 'cls') { b.src.cls = e.target.value; syncBayRole(b.bay, b.src.cls); }
  renderGarage(state);
  persist();
}

function onBayClick(e) {
  const btn = e.target.closest('[data-act]');
  const b = btn && bayOf(btn);
  if (!b) return;
  const g = state.garage;
  if (btn.dataset.act === 'reroll') {
    b.src.roll += 1;
    renderGarage(state);
  } else if (btn.dataset.act === 'lock') {
    const next = !b.src.locked;
    if (g.matched && b.bay.dataset.kind === 'part' && isFrame(b.src.id)) {
      // A matched frame is one line: locking any of its parts locks all four.
      for (const p of g.parts) if (isFrame(p.id)) p.locked = next;
      renderGarage(state, { full: true });
      document.querySelector(`.bay[data-ref="${b.src.id}"] [data-act="lock"]`)?.focus();
    } else {
      b.src.locked = next;
      btn.setAttribute('aria-pressed', String(next));
      btn.innerHTML = next ? ICONS.locked : ICONS.unlocked;
      renderGarage(state);
    }
  }
  persist();
}

const isBlank = (g) => !g.name.trim() && g.parts.every((p) => !p.note) && g.weapons.every((w) => !w.note);

function newBuild() {
  const kept = !isBlank(state.garage);
  if (kept) stash(state);
  state.garage = blankGarage();
  renderGarage(state, { full: true });
  save(state);
  showToast(kept ? 'Started a new build. The last one is in the hangar.' : 'Started a new build.');
  $('buildName').focus();
}

async function onExport(kind) {
  const menu = $('exportMenu');
  menu.open = false;
  menu.querySelector('summary').focus();
  const g = state.garage;
  const rows = garageRows(g);
  if (!rows.length) { showToast('Nothing to export yet. Switch on at least one bay.'); return; }
  const title = g.name.trim() || 'Untitled build';
  const link = shareUrl({ ...state, view: 'garage' });
  if (kind === 'md-file') { download(`${slugify(title)}.md`, toMarkdown(title, rows), 'text/markdown'); return; }
  if (kind === 'json-file') { download(`${slugify(title)}.json`, toJson(title, rows, link), 'application/json'); return; }
  const text = { 'md-copy': toMarkdown(title, rows), 'text-copy': toText(title, rows), 'link-copy': link }[kind];
  const what = { 'md-copy': 'Markdown', 'text-copy': 'Build text', 'link-copy': 'Share link' }[kind];
  const ok = await copyText(text);
  showToast(ok ? `${what} copied.` : 'The browser blocked the copy. Select the Markdown preview by hand instead.');
}

function onHangarClick(e) {
  const load = e.target.closest('[data-hangar-load]');
  if (load) {
    const saved = state.hangar.find((x) => x.id === load.dataset.hangarLoad);
    const g = saved && sanitizeGarage(structuredClone(saved.garage));
    if (!g) return;
    state.garage = g;
    renderGarage(state, { full: true });
    save(state);
    showToast(`Loaded ${g.name || 'Untitled build'}.`);
    $('buildName').focus();
    return;
  }
  const del = e.target.closest('[data-hangar-delete]');
  if (!del) return;
  if (del.dataset.armed !== 'true') {
    del.dataset.armed = 'true';
    del.textContent = 'Confirm delete';
    setTimeout(() => { if (del.isConnected) { del.dataset.armed = ''; del.textContent = 'Delete'; } }, 3000);
    return;
  }
  state.hangar = state.hangar.filter((x) => x.id !== del.dataset.hangarDelete);
  save(state);
  renderHangar(state);
  showToast('Removed from the hangar.');
  $('hangarList').querySelector('button')?.focus();
}

function bindGarage() {
  const g = () => state.garage;
  $('buildName').addEventListener('input', (e) => { g().name = e.target.value.slice(0, 80); renderGarage(state); persist(); });
  document.querySelectorAll('[data-frame]').forEach((b) =>
    b.addEventListener('click', () => setMatched(b.dataset.frame === 'matched')));
  $('frameHouse').addEventListener('change', (e) => { g().frameHouse = e.target.value; renderGarage(state, { full: true }); persist(); });
  $('rerollFrame').addEventListener('click', () => { g().frameRoll += 1; renderGarage(state); persist(); });
  $('rerollAll').addEventListener('click', rerollUnlocked);
  $('saveBuild').addEventListener('click', () => { stash(state); save(state); renderHangar(state); showToast('Saved to the hangar.'); });
  $('newBuild').addEventListener('click', newBuild);
  $('assembly').addEventListener('input', onBayInput);
  $('assembly').addEventListener('change', onBayChange);
  $('assembly').addEventListener('click', onBayClick);
  $('exportMenu').addEventListener('click', (e) => {
    const b = e.target.closest('[data-export]');
    if (b) onExport(b.dataset.export);
  });
  // The panel hangs from the button's right edge; on a narrow screen that edge
  // can sit near the left of the viewport, so flip it to open rightward.
  $('exportMenu').addEventListener('toggle', (e) => {
    const panel = e.currentTarget.querySelector('.dropdown__panel');
    panel.classList.remove('dropdown__panel--start');
    if (e.currentTarget.open && panel.getBoundingClientRect().left < 8) panel.classList.add('dropdown__panel--start');
  });
  $('hangarList').addEventListener('click', onHangarClick);
}

// ── Page ─────────────────────────────────────────────────────

function bindPage() {
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  window.addEventListener('hashchange', () => {
    const v = location.hash.slice(1);
    if (VIEWS.includes(v) && v !== state.view) setView(v);
  });
  document.addEventListener('click', async (e) => {
    document.querySelectorAll('details.dropdown[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; });
    const use = e.target.closest('[data-use-house]');
    if (use) {
      state.forge.house = use.dataset.useHouse;
      state.forge.roll = 0;
      setView('forge');
      $('seed').focus();
      return;
    }
    const c = e.target.closest('[data-copy]');
    if (c) {
      const ok = await copyText(c.dataset.copy);
      showToast(ok ? `Copied ${c.dataset.copy}` : 'The browser blocked the copy. Select the text instead.');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const d = document.querySelector('details.dropdown[open]');
    if (d) { d.open = false; d.querySelector('summary').focus(); }
  });
  $('shareBtn').addEventListener('click', async () => {
    const ok = await copyText(shareUrl(state));
    showToast(ok ? 'Link copied. It opens this exact view.' : 'The browser blocked the copy.');
  });
}

/** Bind all event listeners. Call once from app.js after the first render. */
export function bindEvents() {
  bindPage();
  bindForge();
  bindGarage();
}

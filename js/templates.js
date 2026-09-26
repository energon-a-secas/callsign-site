// ── Templates ────────────────────────────────────────────────
// HTML fragments more than one view prints. Every interpolated string goes
// through escHtml, generated codes included.

import { HOUSES, GROUPS, houseById } from './houses.js';
import { PARTS, WEAPONS } from './slots.js';
import { escHtml } from './utils.js';

const sel = (on) => (on ? ' selected' : '');
const option = (value, label, selected) =>
  `<option value="${escHtml(value)}"${sel(value === selected)}>${escHtml(label)}</option>`;

export function houseOptions(selected, { all = false } = {}) {
  const head = all ? option('all', 'Every house', selected) : '';
  return head + GROUPS.map((g) => `<optgroup label="${escHtml(g.label)}">${
    HOUSES.filter((h) => h.group === g.id).map((h) => option(h.id, h.name, selected)).join('')
  }</optgroup>`).join('');
}

export function slotOptions(selected) {
  const groups = [
    ['Frame: projects', PARTS.filter((p) => p.group === 'frame')],
    ['Inner parts: platform', PARTS.filter((p) => p.group === 'inner')],
    ['Weapons: tools and services', WEAPONS],
  ];
  return groups.map(([label, list]) =>
    `<optgroup label="${escHtml(label)}">${list.map((s) => option(s.id, s.label, selected)).join('')}</optgroup>`).join('');
}

export const weaponOptions = (selected) => WEAPONS.map((w) => option(w.id, w.label, selected)).join('');

/** Acronym chips, the lead pick first. Each chip copies itself. */
export function chipsHtml(acronym) {
  const chip = (a, lead) =>
    `<button type="button" class="chip${lead ? ' chip--lead' : ''}" data-copy="${escHtml(a)}" aria-label="Copy ${escHtml(a)}">${escHtml(a)}</button>`;
  return `<div class="chips">
    <span class="chips__label" title="Three letters">3</span>${acronym.three.map((a, i) => chip(a, i === 0)).join('')}
    <span class="chips__label" title="Four letters">4</span>${acronym.four.map((a) => chip(a, false)).join('')}
  </div>`;
}

/** A designation with the code muted and the name bright, in the house's order. */
export function designationHtml(p) {
  if (!p.name || !p.code) return `<span class="plate__name">${escHtml(p.designation)}</span>`;
  const code = `<span class="plate__code">${escHtml(p.nameFirst ? p.sep + p.code : p.code + p.sep)}</span>`;
  const name = `<span class="plate__name">${escHtml(p.name)}</span>`;
  return p.nameFirst ? name + code : code + name;
}

/**
 * A full plate leads with its callsign. A compact one, used when every plate on
 * screen shares the acronym, leads with the designation, which is what differs.
 */
export function plateHtml(p, { compact = false } = {}) {
  const head = compact
    ? `<h3 class="plate__title">${designationHtml(p)}</h3>`
    : `<h3 class="plate__callsign">${escHtml(p.callsign)}</h3>
    <p class="plate__designation">${designationHtml(p)}</p>
    ${chipsHtml(p.acronym)}`;
  // Readings from your own words are shown once above the grid; invented ones differ per plate.
  const reads = p.expansion && !(compact && p.acronym.source === 'seed')
    ? `<p class="plate__reads">${compact ? 'Could read as' : 'Reads as'} <span>${escHtml(p.expansion)}</span></p>`
    : '';
  // The plate carries only what re-forges it; every copy format is built on demand.
  return `<article class="plate${compact ? ' plate--compact' : ''}" data-house="${escHtml(p.house)}" data-slot="${escHtml(p.slot)}" data-roll="${p.roll}">
    <div class="plate__meta"><span>${escHtml(p.houseName)}</span><span>${escHtml(p.slotLabel)}</span></div>
    ${head}
    ${reads}
    <div class="plate__actions">
      <details class="dropdown dropdown--start">
        <summary class="btn btn--ghost btn--sm">Copy</summary>
        <div class="dropdown__panel" role="group" aria-label="Copy ${escHtml(p.designation)}">
          <button type="button" data-plate-copy="designation">Designation</button>
          <button type="button" data-plate-copy="badge">README badge</button>
          <button type="button" data-plate-copy="chat">Chat line</button>
          <button type="button" data-plate-copy="wiki">Wiki line</button>
          <button type="button" data-plate-copy="link">Link</button>
        </div>
      </details>
      <button type="button" class="btn btn--ghost btn--sm" data-mount>Mount in garage</button>
      ${houseById(p.house).draws.length ? `<button type="button" class="btn btn--ghost btn--sm" data-lookup="${escHtml(p.designation)}" aria-label="Word family: look up where ${escHtml(p.designation)} gets its words">Word family</button>` : ''}
    </div>
  </article>`;
}

const svg = (body) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  reroll: svg('<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/>'),
  locked: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  unlocked: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-1.9"/>'),
};

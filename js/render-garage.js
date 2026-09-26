// ── Garage view ──────────────────────────────────────────────
// A full render builds the bays; a partial one only swaps plate output, so a
// note input or a select never loses focus mid-edit.

import { garageRows, buildIdentity, GRAMMAR } from './forge.js';
import { slot as slotDef } from './slots.js';
import { toMarkdown } from './export.js';
import { houseOptions, weaponOptions, chipsHtml, ICONS } from './templates.js';
import { $, escHtml } from './utils.js';

const GROUPS = [
  ['frame', 'Frame', 'the project'],
  ['inner', 'Inner parts', 'the platform under it'],
  ['weapons', 'Weapons', 'the tools it carries'],
];

function plateCell(row) {
  const p = row.plate;
  return `<div class="bay__callsign">
      <strong>${escHtml(p.callsign)}</strong>
      <button type="button" class="bay__code" data-copy="${escHtml(p.designation)}" title="Copy designation">${escHtml(p.designation)}</button>
    </div>
    ${chipsHtml({ three: p.acronym.three.slice(0, 2), four: p.acronym.four.slice(0, 1) })}`;
}

function bayHtml(row, g) {
  const isPart = row.kind === 'part';
  const src = isPart ? g.parts.find((x) => x.id === row.ref) : g.weapons.find((x) => x.mount === row.ref);
  const name = isPart ? row.label : row.mount;
  const slotCell = isPart
    ? `<span class="bay__role">${escHtml(row.role)}</span>`
    : `<select class="select select--sm" data-field="cls" aria-label="${escHtml(name)} weapon">${weaponOptions(src.cls)}</select>`;
  return `<div class="bay" data-kind="${row.kind}" data-ref="${escHtml(row.ref)}" data-on="${row.on}">
    <div class="bay__slot">
      <label class="bay__toggle"><input type="checkbox" data-field="on"${row.on ? ' checked' : ''}><span>${escHtml(name)}</span></label>
      ${slotCell}
    </div>
    <input class="input input--sm bay__note" data-field="note" type="text" maxlength="120" autocomplete="off" spellcheck="false"
      value="${escHtml(src.note)}" placeholder="${escHtml(isPart ? 'What is it?' : row.role)}" aria-label="What the ${escHtml(name)} is">
    <select class="select select--sm bay__house" data-field="house" aria-label="${escHtml(name)} house"${row.matched ? ' disabled title="Set by the frame house"' : ''}>${
      houseOptions(row.matched ? g.frameHouse : src.house)}</select>
    <div class="bay__plate" data-plate>${plateCell(row)}</div>
    <div class="bay__actions">
      <button type="button" class="btn btn--ghost btn--icon btn--sm" data-act="reroll" aria-label="Reroll ${escHtml(name)}"${row.matched ? ' disabled' : ''}>${ICONS.reroll}</button>
      <button type="button" class="btn btn--ghost btn--icon btn--sm" data-act="lock" aria-pressed="${row.locked}" aria-label="Lock ${escHtml(name)}">${row.locked ? ICONS.locked : ICONS.unlocked}</button>
    </div>
  </div>`;
}

function identityHtml(g) {
  const id = buildIdentity(g);
  const line = g.matched
    ? `<span>Frame line <code>${escHtml(id.line)}</code> from ${escHtml(id.houseName)}</span>`
    : '<span>Mixed parts, each bay picks its own house</span>';
  const reads = g.name.trim() ? `<span>Reads as ${escHtml(id.expansion)}</span>` : '<span>Name the system to get its acronym</span>';
  return `<div class="build-id__acronym" title="Build acronym">${escHtml(id.acronym.three[0])}</div>
    <div class="build-id__meta">${line}${reads}</div>`;
}

export function renderHangar(s) {
  $('hangarCount').textContent = s.hangar.length ? String(s.hangar.length) : '';
  if (!s.hangar.length) {
    $('hangarList').innerHTML = '<li class="hangar__empty">No saved builds yet. Press Save to hangar and the build lands here.</li>';
    return;
  }
  $('hangarList').innerHTML = s.hangar.map((b) => {
    const id = buildIdentity(b.garage);
    const when = new Date(b.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `<li class="hangar__item">
      <div class="hangar__name"><strong>${escHtml(id.acronym.three[0])}</strong><span>${escHtml(b.garage.name || 'Untitled build')}</span><small>${escHtml(when)}</small>${b.grammar === GRAMMAR ? ''
        : `<small class="hangar__stale">Saved under ${b.grammar ? `grammar ${b.grammar}` : 'an earlier grammar'}, so its names may have changed</small>`}</div>
      <div class="toolbar">
        <button type="button" class="btn btn--secondary btn--sm" data-hangar-load="${escHtml(b.id)}">Load</button>
        <button type="button" class="btn btn--ghost btn--sm" data-hangar-delete="${escHtml(b.id)}">Delete</button>
      </div>
    </li>`;
  }).join('');
}

export function renderGarage(s, { full = false } = {}) {
  const g = s.garage;
  if ($('buildName').value !== g.name) $('buildName').value = g.name;
  document.querySelectorAll('[data-frame]').forEach((b) =>
    b.setAttribute('aria-pressed', String((b.dataset.frame === 'matched') === g.matched)));
  $('frameHouse').value = g.frameHouse;
  $('frameHouseField').hidden = !g.matched;
  $('rerollFrame').hidden = !g.matched;
  $('rerollFrame').disabled = g.parts.some((p) => p.locked && slotDef(p.id).group === 'frame');
  $('buildCallsign').innerHTML = identityHtml(g);

  const rows = garageRows(g, { includeOff: true });
  if (full) {
    $('assembly').innerHTML = GROUPS.map(([gid, title, sub]) => `<section class="bay-group" aria-labelledby="bays-${gid}">
      <h3 class="bay-group__title" id="bays-${gid}">${title} <span>${sub}</span></h3>
      <div class="bay-list">${rows.filter((r) => r.group === gid).map((r) => bayHtml(r, g)).join('')}</div>
    </section>`).join('');
    renderHangar(s);
  } else {
    for (const r of rows) {
      const el = document.querySelector(`.bay[data-kind="${r.kind}"][data-ref="${r.ref}"]`);
      if (!el) continue;
      el.dataset.on = String(r.on);
      el.querySelector('[data-plate]').innerHTML = plateCell(r);
    }
  }
  const active = rows.filter((r) => r.on);
  $('exportPreview').textContent = active.length
    ? toMarkdown(g.name || 'Untitled build', active)
    : 'Switch on at least one bay to see the export.';
}

/** Placeholder text follows the weapon class a bay carries. */
export function syncBayRole(bay, cls) {
  const note = bay.querySelector('[data-field="note"]');
  if (note) note.placeholder = slotDef(cls).names;
}

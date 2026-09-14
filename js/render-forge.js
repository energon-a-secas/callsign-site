// ── Forge view ───────────────────────────────────────────────
// One plate per house, or six from a single house. Only the plate grid is
// rebuilt, so the seed input keeps focus while you type.

import { forge } from './forge.js';
import { HOUSES } from './houses.js';
import { slot as slotDef, isWeapon } from './slots.js';
import { plateHtml, chipsHtml } from './templates.js';
import { $, escHtml } from './utils.js';

export const PER_HOUSE = 6;

/** How far one press of Reroll moves: a whole page of plates. */
export const rollStep = (f) => (f.house === 'all' ? 1 : PER_HOUSE);

export function renderForge(s) {
  const f = s.forge;
  if ($('seed').value !== f.seed) $('seed').value = f.seed;
  $('slotSel').value = f.slot;
  $('houseSel').value = f.house;
  $('prevRoll').disabled = f.roll === 0;

  const def = slotDef(f.slot);
  const kind = isWeapon(f.slot) ? 'Answers to a name.' : 'Answers to an acronym.';
  $('slotHint').innerHTML =
    `<strong>${escHtml(def.label)}</strong>: ${escHtml(def.names)}${def.why ? `, ${escHtml(def.why)}` : ''}. ${kind}`;

  const plates = f.house === 'all'
    ? HOUSES.map((h) => forge({ seed: f.seed, house: h.id, slot: f.slot, roll: f.roll }))
    : Array.from({ length: PER_HOUSE }, (_, i) => forge({ seed: f.seed, house: f.house, slot: f.slot, roll: f.roll + i }));

  // Letters from your own words are identical on every plate, so say them once
  // and let each plate lead with the designation, the part that actually differs.
  const lead = plates[0];
  const shared = ['seed', 'fixed'].includes(lead.acronym.source);
  $('forgeShared').hidden = !shared;
  if (shared) {
    $('forgeShared').innerHTML = `<div class="shared__acronym">${escHtml(lead.acronym.three[0])}</div>
      <div class="shared__body">
        <p class="shared__label">From your words, so every house stamps the same letters</p>
        ${chipsHtml(lead.acronym)}
        ${lead.acronym.source === 'seed' ? `<p class="plate__reads">Reads as <span>${escHtml(lead.expansion)}</span></p>` : ''}
      </div>`;
  }
  $('plates').innerHTML = plates.map((p) => plateHtml(p, { compact: shared })).join('');
  $('forgeStatus').textContent = `${plates.length} names for ${def.label}`;
}

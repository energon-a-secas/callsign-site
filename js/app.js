// ── Entry point ──────────────────────────────────────────────
// Wires the modules together. Keep this file under 50 lines.

import { state, loadSaved, readUrl, save } from './state.js';
import { mount, render } from './render.js';
import { bindEvents } from './events.js';

function init() {
  loadSaved(state);
  readUrl(state);
  // Saving at once keeps a shared link's build and restamps a session saved
  // under an older grammar, so each notice is said once.
  save(state);
  // A shared link is applied once. Strip it so a reload keeps later edits.
  if (location.search) history.replaceState(null, '', `${location.pathname}#${state.view}`);
  mount(state);
  render(state);
  bindEvents();
}

init();

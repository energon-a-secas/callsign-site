// ── Lexicon events ───────────────────────────────────────────
// The Lexicon view's listeners, and the two ways other views open it: a
// house's family on the Houses page, and a plate's designation from Forge.
// setView and persist come from events.js, which owns view switching.

import { state } from './state.js';
import { renderLexicon, expanded, LONG, PREVIEW } from './render-lexicon.js';
import { familyById, wordsOf } from './families.js';
import * as L from './lexicon.js';
import { clip, SEED_MAX } from './links.js';
import { $, debounce } from './utils.js';

function focusFamily(id) {
  const title = document.getElementById(`fam-${id}-title`);
  if (!title) return;
  title.closest('.family').scrollIntoView({ block: 'start' });
  title.focus({ preventScroll: true });
}

/** Show one family on its own, with a word marked, and move focus to it. */
function showFamily(id, word = '') {
  const f = familyById(id);
  if (!f) return;
  Object.assign(state.lexicon, { family: id, subject: 'all', lang: 'all' });
  // A marked word past the preview has to be on screen, so its family opens.
  if (word && wordsOf(f) > LONG && f.pools.some((p) => L[p].indexOf(word) >= PREVIEW)) expanded.add(id);
  renderLexicon(state, { mark: word ? { family: id, word } : null });
  focusFamily(id);
}

export function bindLexicon({ setView, persist }) {
  // Typing re-renders after a pause. A Tab inside the pause renders first, so
  // focus moves into the fresh result instead of a node about to be replaced.
  let pending = false;
  const flush = () => { if (!pending) return; pending = false; renderLexicon(state); persist(); };
  const rerun = debounce(flush, 120);
  $('lookupForm').addEventListener('submit', (e) => { e.preventDefault(); flush(); });
  $('lookupInput').addEventListener('input', (e) => { state.lexicon.find = clip(e.target.value, SEED_MAX); pending = true; rerun(); });
  $('lookupInput').addEventListener('keydown', (e) => { if (e.key === 'Tab') flush(); });

  // Touching a filter drops a picked family, so the two never disagree.
  const onFacet = (key) => (e) => {
    if (!e.target.matches('.facet__input')) return;
    Object.assign(state.lexicon, { [key]: e.target.value, family: '' });
    renderLexicon(state);
    persist();
  };
  $('lexSubjects').addEventListener('change', onFacet('subject'));
  $('lexLangs').addEventListener('change', onFacet('lang'));
  // A picked family shows every chip on All, so picking the checked All fires
  // no change event; a click (Space fires one too) still has to clear it.
  const onAll = (e) => {
    if (!e.target.matches('.facet__input[value="all"]') || !state.lexicon.family) return;
    state.lexicon.family = '';
    renderLexicon(state);
    persist();
  };
  $('lexSubjects').addEventListener('click', onAll);
  $('lexLangs').addEventListener('click', onAll);

  $('view-lexicon').addEventListener('click', (e) => {
    if (e.target.closest('[data-lex-clear]')) {
      Object.assign(state.lexicon, { family: '', subject: 'all', lang: 'all' });
      renderLexicon(state);
      persist();
      $('lexSubjects').querySelector('input[value="all"]').focus();
      return;
    }
    if (e.target.closest('[data-lex-all]')) {
      const id = state.lexicon.family;
      state.lexicon.family = '';
      renderLexicon(state);
      persist();
      focusFamily(id);
      return;
    }
    const more = e.target.closest('[data-family-more]');
    if (more) {
      const id = more.dataset.familyMore;
      if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
      renderLexicon(state, { quiet: true });
      document.querySelector(`[data-family-more="${id}"]`)?.focus();
      return;
    }
    const show = e.target.closest('[data-show-family]');
    if (show) { showFamily(show.dataset.showFamily, show.dataset.mark); persist(); return; }
    const word = e.target.closest('[data-lookup-word]');
    if (word) {
      state.lexicon.find = word.dataset.lookupWord;
      renderLexicon(state);
      persist();
      $('lookupInput').focus();
    }
  });

  // From the Houses page and from a forged plate.
  document.addEventListener('click', (e) => {
    const fam = e.target.closest('[data-lexicon-family]');
    if (fam) {
      Object.assign(state.lexicon, { family: fam.dataset.lexiconFamily, subject: 'all', lang: 'all' });
      setView('lexicon');
      focusFamily(fam.dataset.lexiconFamily);
      return;
    }
    const look = e.target.closest('[data-lookup]');
    if (look) {
      Object.assign(state.lexicon, { find: clip(look.dataset.lookup, SEED_MAX), family: '' });
      setView('lexicon');
      $('lookupInput').focus();
    }
  });
}

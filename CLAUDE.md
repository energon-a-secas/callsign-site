# CLAUDE.md: Callsign

Codenames for projects and services in Armored Core VI manufacturer grammar, for developers who name a lot of repos and services; the same engine runs the page, `tools/callsign.mjs` and the neorgon-forge `callsign` skill.

**Live:** callsign.neorgon.com · **Port:** 8886

## Run

```bash
make serve
```

Then open http://localhost:8886. It must be served over HTTP: the app is ES modules, and `file://` blocks them.

## Architecture

| Module | Lines | Owns |
|---|---:|---|
| `js/neorgon-beacon.js` | 357 | none |
| `js/events.js` | 340 | `bindEvents` |
| `js/houses.js` | 314 | `GROUPS`, `HOUSES`, `houseById`, `hasHouse` |
| `js/state.js` | 205 | `VIEWS`, `blankGarage`, `state`, `isBlank`, `isBuild` |
| `js/forge.js` | 154 | `GRAMMAR`, `EMPTY_KEY`, `forge`, `garageRows`, `buildIdentity` |
| `js/acronym.js` | 138 | `RULES`, `words`, `disemvowel`, `fixedAcronym`, `usedWords` |
| `js/render-garage.js` | 116 | `renderHangar`, `renderGarage`, `syncBayRole` |
| `js/lexicon.js` | 115 | `POETS`, `ENTOMOLOGISTS`, `ASTERISMS_GUARD`, `ASTERISMS_OFFICE`, `ASTERISMS` |
| `js/export.js` | 110 | `toMarkdown`, `toJson`, `toText`, `toChat`, `badgeText` |
| `js/templates.js` | 92 | `houseOptions`, `slotOptions`, `weaponOptions`, `chipsHtml`, `designationHtml` |
| `js/slots.js` | 90 | `PARTS`, `WEAPONS`, `MOUNTS`, `slot`, `hasSlot` |
| `js/utils.js` | 79 | `$`, `escHtml`, `showToast`, `copyText`, `download` |
| `js/links.js` | 74 | `SITE`, `MAX_LINK`, `SEED_MAX`, `ROLL_MAX`, `clip` |
| `js/expand.js` | 65 | `BANKS`, `invent`, `expand` |
| `js/canon.js` | 47 | `CANON_HASHES`, `normalise`, `isCanon` |
| `js/render-forge.js` | 47 | `PER_HOUSE`, `rollStep`, `renderForge` |
| `js/rng.js` | 41 | `hash32`, `rngFrom`, `pick`, `int`, `pad` |
| `js/render-houses.js` | 39 | `renderHouses` |
| `js/render.js` | 37 | `mount`, `renderNotice`, `render` |
| `js/app.js` | 21 | none |

Vendored from `packages/neorgon-ui/`, never edit in place; run the sync script instead: `js/neorgon-header.js`, `js/neorgon-footer.js`.

## Data

- `localStorage['callsign:v1']`

## Conventions

- Zero build step. Plain ES modules loaded by `js/app.js`.
- Header and footer come from the shared kits. Do not add site-local `.neo-footer` or `.header-bar` CSS.
- No single JS file over ~500 lines. It currently holds.

## Gotchas

- **Every name is frozen under `GRAMMAR` in `js/forge.js`.** An edit to `lexicon.js`, `houses.js`, `acronym.js`, `expand.js`, `slots.js` (roles, order), `canon.js` or `rng.js` renames plates: adding one word to a pool renamed 259 of 520 BAWS plates for one seed. `make test` fails through `tests/golden.test.mjs`, which hashes the pools, canon hashes, acronym word lists and reading banks as well as sampled plates; the fix is to bump `GRAMMAR` and run `make golden`, never `--force` a grammar that has shipped. A link with no `g` predates the numbering and counts as grammar 0 (`linkGrammar()` in `js/links.js`, shared by the page and the CLI), so links from the grammar-0 site open with a notice instead of silently different names.
- **`forge()` falls back silently** on an unknown id (house to Balam, slot to Head). Validate at the edge: the CLI exits 2, and `readUrl` sends an unknown `h`/`p` to the defaults (`all`/`core`) and says so, never to the viewer's saved session, or one link would render differently for two people.
- **A matched frame is one draw.** Houses take the name and series from `line` first, in a fixed order, so all four frame parts agree. A house that draws from `line` conditionally splits the frame. Melinite rolls each part on its own on purpose (a bare word cannot tell a head from a core); `tests/engine.test.mjs` checks the rest.
- **`js/canon.js` is hashes, not names.** It holds the 231 in-game designations (from matteosal/ac6-advanced-garage) as `hash32(normalise(name))`, so a collision rerolls without the page republishing the game's catalogue. The only real names shipped are the three `canon` examples per house on the Houses page; never serialize `HOUSES` (the CLI's `houses` prints ids and grammars only).
- **A build link can be too long.** GitHub Pages answers 414 at 8,192 query characters, so `garageLink()` returns `null` above `MAX_LINK` and every caller has to handle that: Copy link refuses in the persistent notice, and the other exports go out without a link and name the grammar instead (`toChat`, `buildBadges`).
- **`app.js` strips the query after `readUrl`,** so a reload keeps later edits. The header kit counts `?via=` before that happens. In a browser test, re-open with a real reload: a navigation that only changes the hash does not re-run the app.
- **Nothing is sent while someone works; what they share carries what it names.** A link holds the words or the whole build in its query, so opening it sends them to GitHub Pages and to any chat unfurler, and a README badge sends the name to shields.io and GitHub's image proxy. The footer, its disclaimer and the README say exactly this. Anything new that sends a name off the page needs the same copy change.
- **One link must show one page.** `SEED_MAX`, `ROLL_MAX` and `clip()` live in `js/links.js` and the page's inputs, `readUrl`, the Reroll cap and the CLI all use them; a CLI that forged from 130 characters printed a plate its own link could not open. A `?b=` link stashes the viewer's non-blank build before replacing it.
- **A locked matched frame cannot go mixed.** Its four names come from one shared `line` draw; mixed parts roll each bay on its own and would rename them. `setMatched` refuses, and mounting a frame plate onto one does too.
- **Node warns `MODULE_TYPELESS_PACKAGE_JSON`** because the monorepo's root `package.json` has no `type`. The Makefile passes `--disable-warning`; do not add a `package.json` here to silence it.

## Do not touch

- `js/neorgon-*.js` and `css/neorgon-*.css`: vendored kits, regenerated by `packages/neorgon-ui/sync-*.sh`.

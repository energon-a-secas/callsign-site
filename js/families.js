// ── Word families ────────────────────────────────────────────
// What every house's words are: one family per house theme (German birds,
// Basho school poets, placeholder elements), with its subjects, languages,
// sources and pools. DOM-free, so the page, the lookup and the tests share it.
//
// The metadata lives here and never in lexicon.js: the golden test hashes
// every array lexicon.js exports as a pool, so a label there would read as a
// renamed grammar. Words are always read as L[pool], never copied.
//
// Family ids are public: a link names one with fam=<id>, so renaming one
// breaks shared links.

import * as L from './lexicon.js';
import { HOUSES, GROUPS } from './houses.js';

export const SUBJECTS = [
  { id: 'space', label: 'Space' },
  { id: 'physics', label: 'Physics' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'animals', label: 'Animals' },
  { id: 'plants', label: 'Plants' },
  { id: 'microbes', label: 'Microbes' },
  { id: 'anatomy', label: 'Anatomy' },
  { id: 'myth', label: 'Myth' },
  { id: 'people', label: 'People' },
  { id: 'mind', label: 'Mind' },
  { id: 'weather', label: 'Weather' },
  { id: 'history', label: 'History of science' },
  { id: 'everyday', label: 'Everyday words' },
];

// tag is the BCP 47 language of a list, set only where the words really are
// written in that language; transliterated Greek and Norse carry none.
export const LANGUAGES = [
  { id: 'en', label: 'English', tag: 'en' },
  { id: 'de', label: 'German', tag: 'de' },
  { id: 'es', label: 'Spanish', tag: 'es' },
  { id: 'zh', label: 'Chinese', tag: 'zh-Latn-pinyin' },
  { id: 'ja', label: 'Japanese', tag: 'ja-Latn' },
  { id: 'la', label: 'Latin', tag: 'la' },
  { id: 'el', label: 'Greek', tag: '' },
  { id: 'non', label: 'Old Norse', tag: '' },
  { id: 'many', label: 'Many languages', tag: '' },
];

/** A short name for each pool a house draws from, as the family card shows it. */
export const POOL_LABELS = {
  ENTOMOLOGISTS: 'Entomologists', POETS: 'Pen names',
  ASTERISMS_GUARD: 'Guards and walls', ASTERISMS_OFFICE: 'Offices and buildings',
  BIRDS: 'Birds', PLUMAGE: 'Parts of a bird',
  SPANISH_STEADY: 'Steadfast words', SPANISH_WEATHER: 'Weather',
  RAD_SCOUT: 'Jobs', RAD_WORKS: 'Heavy plant', RAD_COURSES: 'Courses of a meal',
  RAD_BOOSTERS: 'Kick-start words', RAD_IDIOMS: 'Idioms',
  MELINITE: 'Precious and loud', MINDWORDS: 'Words for the mind', TERSE: 'Terse nouns',
  IA_BODY: 'Anatomy', IA_SKY: 'Sky and light',
  JOVIAN_MOONS: 'Jupiter\'s outer moons', FAR_BODIES: 'Neptune\'s moons and far bodies',
  GIANTS_AND_CENTAURS: 'Saturn\'s moons and centaurs',
  EXOTIC_BODIES: 'Quasiparticles and knots', EXOTIC_FIELDS: 'Hypothetical particles',
  MEGASTRUCTURES: 'Megastructures', DRIVES: 'Drives and launchers',
  SUPERHEAVY: 'Placeholder names', ISLAND_PHYSICS: 'Island of stability',
  FLORA_BODIES: 'Cycads and stone plants', FLORA_HIDDEN: 'Parasites and fungus-fed plants', FLORA_TRAPS: 'Traps and lures',
  ABYSSAL_FAUNA: 'Vent and trench fauna', EXTREMOPHILES: 'Extremophile microbes',
  LOST_SKY: 'Retired constellations', SPENT_SCIENCE: 'Phantom elements and theories',
};

const wiki = (title, label = title.replace(/_/g, ' ')) => ({ label: `Wikipedia: ${label}`, url: `https://en.wikipedia.org/wiki/${title}` });

// In GROUPS order, then house order, the way the Houses page lists them.
export const FAMILIES = [
  {
    id: 'entomologists', label: 'Entomologists', subjects: ['people'], languages: ['many'],
    about: 'Surnames that nearly all belong to noted entomologists, from Merian and Fabre to Nabokov and Eisner. Balam stamps one on every part it makes and adds C3 for a custom frame line.',
    sources: [wiki('List_of_entomologists')], pools: ['ENTOMOLOGISTS'],
  },
  {
    id: 'chinese-asterisms', label: 'Chinese asterisms', subjects: ['space'], languages: ['zh'],
    about: 'Star groups of the Purple Forbidden and Supreme Palace enclosures in hyphenated pinyin: guards, walls and weapons in one list, offices and buildings in the other. Frames draw from both, weapons from the guards and inner parts from the offices.',
    sources: [wiki('Ziwei_enclosure', 'Ziwei (Purple Forbidden) enclosure'), wiki('Supreme_Palace_enclosure')], pools: ['ASTERISMS_GUARD', 'ASTERISMS_OFFICE'],
  },
  {
    id: 'german-birds', label: 'German birds', subjects: ['animals', 'anatomy'], languages: ['de'],
    about: 'Birds of Central Europe under their German names, with umlauts written out as ue and oe, and the parts of a bird for the inner parts.',
    sources: [], pools: ['BIRDS', 'PLUMAGE'],
  },
  {
    id: 'melinite-words', label: 'Melinite words', subjects: ['everyday'], languages: ['en'],
    about: 'Plain words that lean toward precious things and loud sounds: metals and gems, keepsakes, then fanfare, thunderclaps and a little giddiness.',
    sources: [], pools: ['MELINITE'],
  },
  {
    id: 'basho-school', label: 'Basho school poets', subjects: ['people'], languages: ['ja'],
    about: 'Pen names from the wider circle of Matsuo Basho\'s school, in romaji. The Ten Disciples the game already uses, and Basho himself, are left out; Shiko is the one it skipped.',
    sources: [wiki('Matsuo_Bash%C5%8D', 'Matsuo Basho')], pools: ['POETS'],
  },
  {
    id: 'spanish-words', label: 'Spanish words', subjects: ['mind', 'engineering', 'weather'], languages: ['es'],
    about: 'Spanish words for steadfastness, fortifications and first light for the body, and weather, from sea fog to squall lines, for the weapons.',
    sources: [], pools: ['SPANISH_STEADY', 'SPANISH_WEATHER'],
  },
  {
    id: 'rad-phrases', label: 'RaD phrases', subjects: ['everyday', 'engineering'], languages: ['en'],
    about: 'Plain English by series: jobs for the 2000 scouts, heavy plant for the 3000 rigs, courses of a meal for the 5000 combat frames, kick-start words for boosters, and idioms and job titles for the weapons.',
    sources: [], pools: ['RAD_SCOUT', 'RAD_WORKS', 'RAD_COURSES', 'RAD_BOOSTERS', 'RAD_IDIOMS'],
  },
  {
    id: 'allmind-words', label: 'ALLMIND words', subjects: ['mind', 'everyday'], languages: ['en'],
    about: 'Words for the mind, which frames pair with a Greek letter, and terse English nouns (tools, arms, forts and Roman offices) that weapons stamp with their vowels dropped. When you type words, ALLMIND stamps your own longest word instead.',
    sources: [], pools: ['MINDWORDS', 'TERSE'],
  },
  {
    id: 'institute-words', label: 'Institute anatomy and sky', subjects: ['anatomy', 'space'], languages: ['en'],
    about: 'Biology for the body, from cornea and synapse to chrysalis and elytra, and sky and light words for the weapons.',
    sources: [], pools: ['IA_BODY', 'IA_SKY'],
  },
  // ── Callsign originals ─────────────────────────────────────
  {
    id: 'outer-moons', label: 'Outer moons and far bodies', subjects: ['space', 'myth'], languages: ['el', 'non', 'zh', 'many'],
    about: 'Names the IAU gave to small bodies in the outer solar system, each group under its own rule. Jupiter\'s captured outer moons are named for lovers, favourites and descendants of Zeus, and the ending gives the orbit: A or O for prograde (O when steeply inclined), E for retrograde. Neptune\'s moons take sea gods, Nereids and sea creatures, and Saturn\'s outer moons take Gallic gods and Norse giants. Centaurs take names from the centaur myths, and the bodies past Neptune take gods, monsters and heroes from many mythologies.',
    sources: [
      wiki('Moons_of_Jupiter'), wiki('Moons_of_Saturn'), wiki('Moons_of_Neptune'), wiki('Minor-planet_moon'),
      { label: 'NASA JPL Small-Body Database: named trans-Neptunian objects', url: 'https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=full_name,name,a,i,class&sb-class=TNO&sb-ns=n' },
      { label: 'NASA JPL Small-Body Database: named centaurs', url: 'https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=full_name,name,a,i,class&sb-class=CEN&sb-ns=n' },
    ],
    pools: ['JOVIAN_MOONS', 'FAR_BODIES', 'GIANTS_AND_CENTAURS'],
  },
  {
    id: 'exotic-particles', label: 'Exotic particles', subjects: ['physics'], languages: ['en'],
    about: 'Quasiparticles, field configurations, bound states and hypothetical particles from physics: the effective particles physicists use to describe what moves inside a solid, knots and saddles in a field, and particles proposed to complete a theory, most of them never observed.',
    sources: [wiki('List_of_quasiparticles'), wiki('List_of_hypothetical_particles'), wiki('List_of_particles')],
    pools: ['EXOTIC_BODIES', 'EXOTIC_FIELDS'],
  },
  {
    id: 'megastructures', label: 'Megastructures and drives', subjects: ['engineering', 'space'], languages: ['en'],
    about: 'Real proposals from the engineering literature. Frames get habitats, megastructures and the big fixed installations around them (TOPOPOLIS, ORBITAL RING, WORLD HOUSE); inner parts and weapons get drives, sails, beams and launchers (STARWISP, SLINGATRON, STELLASER). Each was proposed, studied, tested or flown, and none is famous outside the field. ZNAMYA and OPSEK are Russian project names.',
    sources: [
      wiki('Megastructure'), wiki('Space_settlement'), wiki('Non-rocket_spacelaunch'), wiki('Spacecraft_propulsion'),
      wiki('Nuclear_thermal_rocket'), wiki('Interstellar_travel'), wiki('Space_tether'), wiki('Space-based_solar_power'),
      wiki('Beam-powered_propulsion'), wiki('Terraforming'), wiki('Terraforming_of_Venus'), wiki('Sahara_Sea'), wiki('Red_Sea_dam'),
    ],
    pools: ['MEGASTRUCTURES', 'DRIVES'],
  },
  {
    id: 'placeholder-elements', label: 'Placeholder elements', subjects: ['chemistry', 'physics'], languages: ['la', 'el', 'en'],
    about: 'The placeholder names IUPAC\'s 1978 rule gives elements past 118 until they are made and named: each spells its atomic number in Latin and Greek number roots, so UNQUADOCTIUM is element 148. None had been made as of September 2026. Weapons take the working vocabulary of the island of stability, the region those elements might reach.',
    sources: [
      { label: 'IUPAC: naming of elements of atomic numbers greater than 100 (1978)', url: 'https://iupac.qmul.ac.uk/AtWt/element.html' },
      wiki('Systematic_element_name'), wiki('Extended_periodic_table'), wiki('Island_of_stability'),
    ],
    pools: ['SUPERHEAVY', 'ISLAND_PHYSICS'],
  },
  {
    id: 'strange-flora', label: 'Strange flora', subjects: ['plants'], languages: ['la', 'el'],
    about: 'Genus names of real plants that look like they came from somewhere else: cycads, Welwitschia and dwarf succulents of the ice-plant family, some of which pass for pebbles; parasites and fungus-fed plants that live off others; and carnivorous plants and carrion-scented lure flowers.',
    sources: [
      wiki('List_of_carnivorous_plants'),
      { label: 'The Parasitic Plant Connection (Southern Illinois University)', url: 'https://parasiticplants.siu.edu/ListParasites.html' },
      { label: 'The Parasitic Plant Connection: mycoheterotrophs', url: 'https://parasiticplants.siu.edu/Mycotrophs/Mycotrophs.html' },
      { label: 'The World List of Cycads', url: 'https://cycadlist.org/' },
      wiki('Aizoaceae'), wiki('Welwitschia'), wiki('Carrion_flower'),
    ],
    pools: ['FLORA_BODIES', 'FLORA_HIDDEN', 'FLORA_TRAPS'],
  },
  {
    id: 'deep-sea-extremophiles', label: 'Deep sea and extremophiles', subjects: ['animals', 'microbes'], languages: ['la', 'el'],
    about: 'Real genus names for life at the limits: creatures of hydrothermal vents, cold seeps, whale falls and the abyssal and hadal deep, and archaea and bacteria that live in boiling water, acid, brine, soda lakes and metal-laden water or withstand radiation. Every frame genus is accepted in the World Register of Marine Species; SYRINGAMMINA is a giant single-celled foraminiferan rather than an animal.',
    sources: [
      { label: 'World Register of Marine Species', url: 'https://www.marinespecies.org/' },
      wiki('Hydrothermal_vent'), wiki('Cold_seep'), wiki('Whale_fall'), wiki('Deep-sea_gigantism'), wiki('Deep-sea_fish'),
      wiki('Siboglinidae'), wiki('List_of_Archaea_genera'), wiki('List_of_bacteria_genera'), wiki('Extremophile'), wiki('Hyperthermophile'),
    ],
    pools: ['ABYSSAL_FAUNA', 'EXTREMOPHILES'],
  },
  {
    id: 'spent-science', label: 'Lost skies and spent science', subjects: ['history', 'space', 'chemistry'], languages: ['la', 'el', 'en'],
    about: 'Names science stopped using. Constellations and constellation names the IAU did not keep when it fixed the modern 88 in 1930; chemical elements that were announced and then withdrawn as mistakes, mixtures or known elements under a new name (NEBULIUM turned out to be oxygen, CORONIUM highly ionised iron); and the forces, fluids and theories later given up, such as PHLOGISTON, AETHER DRIFT and PRIMUM MOBILE.',
    sources: [
      wiki('Former_constellations'), wiki('List_of_misidentified_chemical_elements'), wiki('List_of_discredited_substances'),
      wiki('List_of_superseded_scientific_theories'), wiki('Deferent_and_epicycle'), wiki('Luminiferous_aether'), wiki('Primum_Mobile'),
    ],
    pools: ['LOST_SKY', 'SPENT_SCIENCE'],
  },
];

/** Codes a house adds to a name that come from no family. */
export const MARKS = [
  { house: 'balam', token: 'C3', means: 'a custom frame line' },
  { house: 'baws', token: 'RF', means: 'a variant of one weapon' },
  { house: 'baws', token: 'AR', means: 'a variant of one weapon' },
  ...L.GREEK.map((token) => ({ house: 'allmind', token, means: 'a revision letter' })),
];

/** Houses whose letters come from the words you type, not from a family. */
export const LOOSE = {
  ibis: 'IBIS stamps three letters from your own words, or random ones, so they come from no family.',
  allmind: 'ALLMIND stamps your own longest word with the vowels dropped when it leaves three letters or more.',
};

const BY_ID = new Map(FAMILIES.map((f) => [f.id, f]));
const BY_POOL = new Map(FAMILIES.flatMap((f) => f.pools.map((p) => [p, f])));

export const familyById = (id) => BY_ID.get(id) || null;
export const hasFamily = (id) => BY_ID.has(id);
export const familyOfPool = (pool) => BY_POOL.get(pool) || null;
export const wordsOf = (f) => f.pools.reduce((n, p) => n + L[p].length, 0);
export const subjectLabel = (id) => SUBJECTS.find((s) => s.id === id)?.label || id;
export const language = (id) => LANGUAGES.find((l) => l.id === id) || { id, label: id, tag: '' };

/** Which houses draw a family, and what for. Derived from each house's draws, never stored twice. */
export function usedBy(id) {
  const f = familyById(id);
  if (!f) return [];
  return HOUSES.flatMap((h) => (h.draws || [])
    .filter((d) => f.pools.includes(d.pool))
    .map((d) => ({ house: h, ...d })));
}

/** The group a family is listed under: the group of the first house that draws it. */
export function groupOf(id) {
  const first = usedBy(id)[0];
  return GROUPS.find((g) => g.id === first?.house.group) || null;
}

const matches = (f, { subject = 'all', lang = 'all' } = {}) =>
  (subject === 'all' || f.subjects.includes(subject)) && (lang === 'all' || f.languages.includes(lang));

export const visibleFamilies = (filter) => FAMILIES.filter((f) => matches(f, filter));

/**
 * Faceted counts: how many families each chip would show given the other
 * filter, so a count never promises what the combination cannot deliver.
 */
export function facetCounts({ subject = 'all', lang = 'all' } = {}) {
  return {
    subjects: Object.fromEntries([['all', visibleFamilies({ lang }).length],
      ...SUBJECTS.map((s) => [s.id, visibleFamilies({ subject: s.id, lang }).length])]),
    langs: Object.fromEntries([['all', visibleFamilies({ subject }).length],
      ...LANGUAGES.map((l) => [l.id, visibleFamilies({ subject, lang: l.id }).length])]),
  };
}

// ── Slots ────────────────────────────────────────────────────
// The AC6 assembly screen mapped onto a software system. A frame part names a
// project-level piece, an inner part names the platform under it, a weapon
// names one tool or service that does one job.
//
// `letter` is the part letter houses stamp into codes (IB-C03H, AH-J-124).
// `roles` feed the 4-letter acronym variant and generated expansions.

export const PARTS = [
  { id: 'head', group: 'frame', label: 'Head', letter: 'H',
    names: 'Frontend, dashboard, client app', why: 'what the pilot sees through',
    roles: ['View', 'Panel', 'Deck', 'Lens', 'Console'] },
  { id: 'core', group: 'frame', label: 'Core', letter: 'C',
    names: 'Main API or backend service', why: 'everything else bolts onto it',
    roles: ['Core', 'Engine', 'Kernel', 'Hub', 'Nexus'] },
  { id: 'arms', group: 'frame', label: 'Arms', letter: 'A',
    names: 'Integrations, SDKs, adapters', why: 'what it holds and handles',
    roles: ['Link', 'Bridge', 'Adapter', 'Connector', 'Relay'] },
  { id: 'legs', group: 'frame', label: 'Legs', letter: 'L',
    names: 'Infrastructure, hosting, runtime', why: 'what it stands on',
    roles: ['Platform', 'Stack', 'Base', 'Rail', 'Runtime'] },
  { id: 'booster', group: 'inner', label: 'Booster', letter: 'B',
    names: 'CI/CD, deploys, release automation', why: 'what gets it moving',
    roles: ['Pipeline', 'Launch', 'Rollout', 'Thruster', 'Deploy'] },
  { id: 'fcs', group: 'inner', label: 'FCS', letter: 'F',
    names: 'Monitoring, alerting, analytics', why: 'fire control, what it locks onto',
    roles: ['Monitor', 'Watch', 'Scope', 'Tracker', 'Sentinel'] },
  { id: 'generator', group: 'inner', label: 'Generator', letter: 'G',
    names: 'Database, queue, event bus', why: 'the power supply',
    roles: ['Store', 'Vault', 'Ledger', 'Queue', 'Reactor'] },
  { id: 'expansion', group: 'inner', label: 'Expansion', letter: 'E',
    names: 'Failover, kill switch, backups', why: 'the one-button save',
    roles: ['Failsafe', 'Guard', 'Reserve', 'Recovery', 'Bulwark'] },
];

// `family` groups classes the way houses specialise (Balam shoots bullets,
// VCPL shoots plasma). `code` is the default two-letter type code.
export const WEAPONS = [
  { id: 'rifle', label: 'Rifle', family: 'ballistic', mount: 'arm', code: 'RF',
    names: 'General service or API client', roles: ['Service', 'Client', 'Runner'] },
  { id: 'machinegun', label: 'Machine gun', family: 'ballistic', mount: 'arm', code: 'MG',
    names: 'Worker that fires small jobs all day', roles: ['Worker', 'Consumer', 'Poller'] },
  { id: 'gatling', label: 'Gatling gun', family: 'ballistic', mount: 'arm', code: 'GA',
    names: 'High-throughput stream processor', roles: ['Stream', 'Processor', 'Firehose'] },
  { id: 'shotgun', label: 'Shotgun', family: 'ballistic', mount: 'arm', code: 'SG',
    names: 'Fan-out notifier or broadcaster', roles: ['Broadcast', 'Notifier', 'Fanout'] },
  { id: 'handgun', label: 'Handgun', family: 'ballistic', mount: 'arm', code: 'HG',
    names: 'Small CLI or utility script', roles: ['Utility', 'Script', 'Toolkit'] },
  { id: 'linear', label: 'Linear rifle', family: 'ballistic', mount: 'arm', code: 'LR',
    names: 'Parser, compiler, transformer', roles: ['Parser', 'Compiler', 'Transformer'] },
  { id: 'sniper', label: 'Sniper rifle', family: 'ballistic', mount: 'arm', code: 'SR',
    names: 'Probe, canary, health check', roles: ['Probe', 'Canary', 'Check'] },
  { id: 'bazooka', label: 'Bazooka', family: 'explosive', mount: 'arm', code: 'BZ',
    names: 'Batch job or bulk import', roles: ['Batch', 'Import', 'Bulk'] },
  { id: 'grenade', label: 'Grenade cannon', family: 'explosive', mount: 'back', code: 'GC',
    names: 'Load tester or chaos tool', roles: ['Load', 'Chaos', 'Stress'] },
  { id: 'missile', label: 'Missile launcher', family: 'explosive', mount: 'back', code: 'ML',
    names: 'Scheduler, cron, job queue', roles: ['Scheduler', 'Cron', 'Dispatch'] },
  { id: 'flamer', label: 'Flamethrower', family: 'explosive', mount: 'arm', code: 'FT',
    names: 'Cleanup, purge, garbage collection', roles: ['Purge', 'Cleanup', 'Sweeper'] },
  { id: 'laser', label: 'Laser rifle', family: 'energy', mount: 'arm', code: 'LZ',
    names: 'Search or query engine', roles: ['Query', 'Search', 'Index'] },
  { id: 'plasma', label: 'Plasma rifle', family: 'energy', mount: 'arm', code: 'PR',
    names: 'Heavy compute or ML inference', roles: ['Compute', 'Inference', 'Model'] },
  { id: 'drone', label: 'Laser drone', family: 'energy', mount: 'back', code: 'DR',
    names: 'Bot or background agent', roles: ['Agent', 'Bot', 'Assistant'] },
  { id: 'blade', label: 'Pulse blade', family: 'melee', mount: 'arm', code: 'BL',
    names: 'Codemod or refactor tool', roles: ['Codemod', 'Refactor', 'Cutter'] },
  { id: 'pilebunker', label: 'Pile bunker', family: 'melee', mount: 'arm', code: 'PB',
    names: 'One-shot migration or backfill', roles: ['Migration', 'Backfill', 'Cutover'] },
  { id: 'stun', label: 'Stun needle', family: 'support', mount: 'back', code: 'SN',
    names: 'Circuit breaker or throttle', roles: ['Breaker', 'Throttle', 'Limiter'] },
  { id: 'shield', label: 'Pulse shield', family: 'support', mount: 'back', code: 'SH',
    names: 'Auth, gateway, rate limiter', roles: ['Auth', 'Gateway', 'Guard'] },
];

export const MOUNTS = [
  { id: 'rarm', label: 'R-Arm' },
  { id: 'larm', label: 'L-Arm' },
  { id: 'rback', label: 'R-Back' },
  { id: 'lback', label: 'L-Back' },
];

const BY_ID = new Map([...PARTS, ...WEAPONS].map((s) => [s.id, s]));

/** Look up a part or weapon class by id. */
export const slot = (id) => BY_ID.get(id) || PARTS[0];
export const isWeapon = (id) => WEAPONS.some((w) => w.id === id);

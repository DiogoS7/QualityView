import { describe, it, expect } from 'vitest';
import {
  rng,
  hash,
  nextId,
  parseStory,
  findBoundary,
  generateFromStory,
  healLocator,
  simulateRun,
  jobStateAt,
  nextRun,
  formatSeconds,
} from './automation.js';
import { userStories, initialLibrary, DEVICES } from '../data/automation.js';

describe('helpers', () => {
  it('rng is deterministic per seed', () => {
    const a = rng(42);
    const b = rng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('hash is stable and differs between strings', () => {
    expect(hash('AT-01@chrome')).toBe(hash('AT-01@chrome'));
    expect(hash('AT-01@chrome') === hash('AT-01@pixel')).toBe(false);
  });

  it('nextId continues the numbering', () => {
    expect(nextId('AT', ['AT-01', 'AT-07'])).toBe('AT-08');
    expect(nextId('SCH', [])).toBe('SCH-01');
  });

  it('formats seconds', () => {
    expect(formatSeconds(42)).toBe('42s');
    expect(formatSeconds(95)).toBe('1m 35s');
  });
});

describe('parseStory', () => {
  it('reads role, goal, benefit and criteria', () => {
    const p = parseStory(userStories[0].text);
    expect(p.role).toBe('retail customer');
    expect(p.want).toMatch(/save a beneficiary/);
    expect(p.benefit).toMatch(/pay them again faster/);
    expect(p.criteria).toHaveLength(4);
  });
});

describe('findBoundary', () => {
  it('handles money thresholds', () => {
    expect(findBoundary('Payments above €15,000 go to approval')).toMatchObject({ inside: '€15,000.00', outside: '€15,000.01' });
  });

  it('handles upper limits with units', () => {
    expect(findBoundary('a nickname of up to 30 characters')).toMatchObject({ inside: '30 characters', outside: '31 characters', insideLabel: 'is accepted' });
  });

  it('returns null when there is no number', () => {
    expect(findBoundary('The status updates without refreshing')).toBe(null);
  });
});

describe('generateFromStory', () => {
  it('creates a happy path, one case per criterion and boundary cases', () => {
    const cases = generateFromStory(userStories[1].text);
    expect(cases[0].title).toMatch(/^Happy path/);
    expect(cases.filter((c) => c.title.startsWith('Verify') || c.title.startsWith('Rule'))).toHaveLength(4);
    const boundaries = cases.filter((c) => c.type === 'Boundary').map((c) => c.title);
    expect(boundaries.some((t) => t.includes('€15,000.01'))).toBe(true);
    expect(boundaries.some((t) => t.includes('24 hours'))).toBe(true);
  });

  it('marks prohibitions as negative cases', () => {
    const cases = generateFromStory(userStories[0].text);
    expect(cases.some((c) => c.type === 'Negative' && /cannot be saved twice/.test(c.title))).toBe(true);
  });

  it('gives every case runnable no-code steps', () => {
    for (const c of generateFromStory(userStories[2].text)) {
      expect(c.steps.length >= 2).toBe(true);
      expect(c.steps[0].type).toBe('open');
    }
  });

  it('returns nothing for empty text', () => {
    expect(generateFromStory('   ')).toEqual([]);
  });
});

describe('simulateRun', () => {
  const devices = DEVICES.filter((d) => ['chrome', 'pixel', 'iphone'].includes(d.id));
  const base = { tests: initialLibrary, devices, seed: 7, knownDefects: { 'REQ-104': 'DEF-1042' } };

  it('runs every test on every device', () => {
    const r = simulateRun(base);
    expect(r.summary.total).toBe(initialLibrary.length * 3);
    expect(r.summary.passed + r.summary.healed + r.summary.failed).toBe(r.summary.total);
  });

  it('fails tests linked to a known open defect', () => {
    const r = simulateRun(base);
    expect(r.jobs.filter((j) => j.testId === 'AT-03').every((j) => j.status === 'failed' && j.reason.includes('DEF-1042'))).toBe(true);
  });

  it('heals broken locators only when self-healing is on', () => {
    const on = simulateRun({ ...base, seed: 3 });
    const off = simulateRun({ ...base, seed: 3, selfHealing: false });
    expect(off.summary.healed).toBe(0);
    expect(off.summary.failed).toBe(on.summary.failed + on.summary.healed);
    for (const j of on.jobs.filter((x) => x.status === 'healed')) expect(j.heal.to.startsWith('[data-testid=')).toBe(true);
  });

  it('runs faster with more parallel workers', () => {
    const one = simulateRun({ ...base, workers: 1 });
    const eight = simulateRun({ ...base, workers: 8 });
    expect(one.wall).toBe(one.sequential);
    expect(eight.wall < one.wall / 3).toBe(true);
  });

  it('is deterministic for a seed', () => {
    expect(simulateRun(base).summary).toEqual(simulateRun(base).summary);
  });
});

describe('jobStateAt', () => {
  it('moves from queued to running to its result', () => {
    const job = { start: 5, end: 10, status: 'healed' };
    expect([jobStateAt(job, 0), jobStateAt(job, 7), jobStateAt(job, 10)]).toEqual(['queued', 'running', 'healed']);
  });
});

describe('healLocator', () => {
  it('turns an element name into a broken id and a stable test id', () => {
    expect(healLocator('Confirm button')).toEqual({ from: '#confirm-button', to: '[data-testid="confirm-button"]' });
  });
});

describe('nextRun', () => {
  const fri = new Date(2026, 10, 13, 10, 0); // Friday 13 Nov 2026, 10:00

  it('fires later today when the time has not passed', () => {
    expect(nextRun({ recurrence: 'daily', time: '18:00' }, fri).getDate()).toBe(13);
  });

  it('skips the weekend for weekday schedules', () => {
    const n = nextRun({ recurrence: 'weekdays', time: '02:00' }, fri);
    expect([n.getDay(), n.getDate()]).toEqual([1, 16]);
  });

  it('weekly schedules fire on Monday', () => {
    expect(nextRun({ recurrence: 'weekly', time: '09:00' }, fri).getDay()).toBe(1);
  });
});

// Automation engine behind the Create and Execute views. Pure functions, no React, so the
// logic is unit tested on its own (see automation.test.js).
//
// - generateFromStory: turns a user story with acceptance criteria into test cases
//   (happy path, one per criterion, plus boundary and negative cases it can infer).
// - simulateRun: runs a battery of automated tests across remote devices with N parallel
//   workers, including self-healing of broken element locators.
// - nextRun: works out when a scheduled execution fires next.

// ---------- small helpers ----------

/** Deterministic pseudo-random numbers (mulberry32) so a run can be replayed. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string. */
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Next free id with a prefix: nextId('AT', ['AT-01','AT-07']) → 'AT-08'. */
export function nextId(prefix, ids) {
  const max = ids.reduce((m, id) => {
    const n = Number(String(id).split('-')[1]);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(2, '0')}`;
}

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const clean = (t) => t.replace(/^[\s\-*•\d.)]+/, '').replace(/["“”]/g, '"').trim().replace(/\.$/, '');

// ---------- AI-style test generation from a user story ----------

/** Pull role, goal, benefit and acceptance criteria out of a free-text user story. */
export function parseStory(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const find = (re) => {
    const line = lines.find((l) => re.test(l));
    return line ? clean(line.replace(re, '')) : '';
  };
  const role = find(/^as an?\s+/i);
  const want = find(/^i want( to)?\s+/i);
  const benefit = find(/^so that\s+/i);
  const start = lines.findIndex((l) => /acceptance criteria/i.test(l));
  const criteriaLines = start >= 0 ? lines.slice(start + 1) : lines.filter((l) => /^([-*•]|\d+[.)]|given|when|then)\s*/i.test(l));
  const criteria = criteriaLines.map(clean).filter((c) => c && !/^(as an?|i want|so that)\b/i.test(c));
  return { role, want, benefit, criteria };
}

const LIMIT_RE = /\b(above|over|more than|greater than|up to|at most|maximum of|max|after|within|below|under|less than)\s+(€\s?)?([\d][\d.,]*)\s*(k\b|characters?|chars?|hours?|minutes?|seconds?|days?|attempts?)?/i;

/** Detect a numeric limit in a criterion and describe both sides of the boundary. */
export function findBoundary(criterion) {
  const m = criterion.match(LIMIT_RE);
  if (!m) return null;
  const [, word, euro, raw, unitRaw = ''] = m;
  let value = Number(raw.replace(/,/g, ''));
  if (/^k$/i.test(unitRaw)) value *= 1000;
  if (!Number.isFinite(value)) return null;
  const money = Boolean(euro);
  const unit = money ? '' : unitRaw.replace(/^k$/i, '').toLowerCase();
  const step = money ? 0.01 : 1;
  const fmt = (n) => (money ? `€${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${n}${unit ? ` ${unit}` : ''}`);
  const upper = /up to|at most|maximum|max|within|below|under|less than/i.test(word);
  return upper
    ? { inside: fmt(value), outside: fmt(+(value + step).toFixed(2)), insideLabel: 'is accepted', outsideLabel: 'is rejected' }
    : { inside: fmt(value), outside: fmt(+(value + step).toFixed(2)), insideLabel: 'does not trigger the rule', outsideLabel: 'triggers the rule' };
}

const shorten = (t, n = 42) => {
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > n / 2 ? cut.lastIndexOf(' ') : cut.length).trim()}…`;
};

/**
 * Generate test cases from a user story. Each case has a title, a type
 * (Positive / Negative / Boundary), a priority and no-code steps ready for the builder.
 */
export function generateFromStory(text) {
  const { role, want, benefit, criteria } = parseStory(text);
  if (!want && !criteria.length) return [];
  const screen = want ? cap(shorten(want.replace(/^(to\s+)/i, ''), 40)) : 'Feature under test';
  const actor = role || 'user';
  const cases = [];
  const add = (title, type, priority, steps) => cases.push({ title, type, priority, steps });
  const open = { type: 'open', target: screen, value: '' };

  if (want) {
    add(`Happy path: ${actor} can ${want.replace(/^to\s+/i, '')}`, 'Positive', 'High', [
      open,
      { type: 'click', target: 'Primary action', value: '' },
      { type: 'assertVisible', target: 'Success confirmation', value: '' },
    ]);
  }

  for (const c of criteria) {
    const negative = /\b(cannot|can not|can't|must not|not allowed|never|no longer|expires?)\b/i.test(c);
    const target = shorten(cap(c.replace(/^(the|a|an)\s+/i, '').split(/\s+(appears?|shows?|is|are|go|goes|cannot|can't|needs?|must|expires?|updates?|lists?|has|have)\b/i)[0]), 32);
    add(`${negative ? 'Rule' : 'Verify'}: ${c}`, negative ? 'Negative' : 'Positive', negative ? 'High' : 'Medium', [
      open,
      { type: 'wait', target, value: '' },
      { type: 'assertText', target, value: shorten(c, 48) },
    ]);
    const b = findBoundary(c);
    if (b) {
      add(`Boundary: ${b.inside} ${b.insideLabel}`, 'Boundary', 'High', [
        open,
        { type: 'type', target: 'Value field', value: b.inside },
        { type: 'click', target: 'Continue button', value: '' },
        { type: 'assertText', target: 'Result', value: b.insideLabel },
      ]);
      add(`Boundary: ${b.outside} ${b.outsideLabel}`, 'Boundary', 'High', [
        open,
        { type: 'type', target: 'Value field', value: b.outside },
        { type: 'click', target: 'Continue button', value: '' },
        { type: 'assertText', target: 'Result', value: b.outsideLabel },
      ]);
    }
    if (/\b(needs?|requires?|mandatory|required)\b/i.test(c)) {
      add(`Negative: submit without ${target.toLowerCase()}`, 'Negative', 'Medium', [
        open,
        { type: 'click', target: 'Save button', value: '' },
        { type: 'assertText', target: 'Validation message', value: 'required' },
      ]);
    }
  }
  if (benefit) {
    add(`Outcome: ${benefit.replace(/^i\s+(can\s+)?/i, '')}`, 'Positive', 'Low', [open, { type: 'assertVisible', target: 'Expected outcome', value: '' }]);
  }
  return cases;
}

// ---------- execution at scale with self-healing ----------

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** A plausible broken locator and the stable one self-healing finds instead. */
export function healLocator(target) {
  const s = slug(target) || 'element';
  return { from: `#${s}`, to: `[data-testid="${s}"]` };
}

const DEVICE_SPEED = { Desktop: 1, Tablet: 1.25, Mobile: 1.4 };

/**
 * Simulate a battery run. Every test runs on every selected device; jobs are spread over
 * `workers` parallel slots. Outcomes are deterministic for a given seed:
 * - a test linked to a requirement with a known open defect fails with that defect;
 * - ~12% of jobs hit a changed locator: healed when self-healing is on, failed otherwise;
 * - ~4% fail on an environment hiccup; everything else passes.
 */
export function simulateRun({ tests, devices, workers = 4, selfHealing = true, seed = 1, knownDefects = {} }) {
  const jobs = [];
  for (const t of tests) {
    for (const d of devices) {
      const r = rng(hash(`${seed}|${t.id}|${d.id}`));
      const roll = r();
      const base = (t.steps.length * 2.5 + 3 + r() * 6) * (DEVICE_SPEED[d.kind] ?? 1);
      let status = 'passed';
      let reason = '';
      let heal = null;
      let duration = base;
      const defect = knownDefects[t.reqId];
      if (defect) {
        status = 'failed';
        reason = `Assertion failed – matches open defect ${defect}`;
      } else if (roll < 0.12 && t.steps.some((s) => s.type !== 'open')) {
        const idx = t.steps.findIndex((s) => s.type !== 'open');
        const loc = healLocator(t.steps[idx].target);
        if (selfHealing) {
          status = 'healed';
          heal = { step: idx + 1, ...loc };
          reason = `Locator ${loc.from} not found – healed to ${loc.to}`;
          duration += 2;
        } else {
          status = 'failed';
          reason = `Element not found: ${loc.from}`;
          duration += 10; // waits for the timeout before failing
        }
      } else if (roll < 0.16) {
        status = 'failed';
        reason = 'Timeout waiting for SIT gateway (environment)';
        duration += 15;
      }
      jobs.push({ id: `${t.id}@${d.id}`, testId: t.id, title: t.title, device: d.id, status, reason, heal, duration: Math.round(duration * 10) / 10 });
    }
  }

  // Greedy scheduling onto the earliest free worker.
  const free = Array.from({ length: Math.max(1, workers) }, () => 0);
  for (const j of jobs) {
    const w = free.indexOf(Math.min(...free));
    j.worker = w;
    j.start = free[w];
    j.end = Math.round((free[w] + j.duration) * 10) / 10;
    free[w] = j.end;
  }
  const wall = Math.max(0, ...jobs.map((j) => j.end));
  const sequential = Math.round(jobs.reduce((n, j) => n + j.duration, 0) * 10) / 10;
  const count = (st) => jobs.filter((j) => j.status === st).length;
  const summary = { total: jobs.length, passed: count('passed'), healed: count('healed'), failed: count('failed') };
  summary.passRate = jobs.length ? Math.round(((summary.passed + summary.healed) / jobs.length) * 1000) / 10 : 0;
  return { jobs, wall, sequential, summary };
}

/** Status of a job at a moment of the (replayed) run. */
export function jobStateAt(job, t) {
  if (t < job.start) return 'queued';
  if (t < job.end) return 'running';
  return job.status;
}

// ---------- scheduling ----------

export const RECURRENCES = { daily: 'Every day', weekdays: 'Weekdays', weekly: 'Every Monday', once: 'Once' };

/** Next time a schedule fires at or after `from`. Returns null for a past one-off. */
export function nextRun(schedule, from = new Date()) {
  const [h, m] = schedule.time.split(':').map(Number);
  for (let i = 0; i < 8; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    d.setHours(h, m, 0, 0);
    if (d < from) continue;
    const day = d.getDay();
    if (schedule.recurrence === 'weekdays' && (day === 0 || day === 6)) continue;
    if (schedule.recurrence === 'weekly' && day !== 1) continue;
    return d;
  }
  return null;
}

export function formatWhen(date, now = new Date()) {
  if (!date) return '—';
  const sameDay = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Today ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${time}`;
}

export function formatSeconds(sec) {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  return m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

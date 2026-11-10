// QualityView QA Agent – built-in answer engine.
// Answers questions about the release from the dashboard's own data, with no network calls,
// so it works on a static site. Each answer is { text, actions } where actions are
// [{ label, view, id? }] buttons that take the user to the right place.
// Text supports **bold** and lines starting with "• " as bullets.

import {
  summariseExecution,
  passRate,
  percent,
  openBySeverity,
  isOpen,
  requirementStatus,
  traceability,
  evaluateGates,
  readinessVerdict,
  runSummary,
  formatDuration,
} from './metrics.js';
import { initialBatteries, initialSchedules, DEVICES, userStories } from '../data/automation.js';

export const SUGGESTIONS = [
  'Which user stories need tests?',
  'Are we ready for go-live?',
  'What is blocking the release?',
  'Show open critical defects',
  'Which requirements are not verified?',
  'How did Sprint 14 go?',
  'Tell me about DEF-1042',
];

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const has = (q, ...words) => words.some((w) => q.includes(w));
const list = (items) => items.map((i) => `• ${i}`).join('\n');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const GLOSSARY = {
  'pass rate': 'Pass rate is passed tests ÷ executed tests. Blocked tests count as executed but not passed, so they pull the rate down.',
  'traceability': 'The **requirements traceability matrix (RTM)** links each requirement to the tests that cover it, so you can prove every requirement was tested before go-live.',
  'rtm': 'The **requirements traceability matrix (RTM)** links each requirement to the tests that cover it, so you can prove every requirement was tested before go-live.',
  'blocked': 'A **blocked** test could not run because something outside it failed – an environment, a stub or a dependency. It is not a pass and it is not a product bug yet.',
  'cab': 'The **CAB (Change Advisory Board)** approves production changes. Here it approved the rollback plan for R4.2.',
  'sepa instant': '**SEPA Instant Credit Transfer** moves euros between EU banks in under 10 seconds, 24/7, up to the €100,000 scheme limit.',
  'tips': '**TIPS** is the ECB\'s settlement service for instant payments. If it is unavailable, payments fall back to a standard SEPA transfer (REQ-107).',
  'vop': '**Verification of Payee (VoP)** checks the beneficiary name against the IBAN before the customer confirms (REQ-103).',
  'verification of payee': '**Verification of Payee (VoP)** checks the beneficiary name against the IBAN before the customer confirms (REQ-103).',
  'sca': '**Strong Customer Authentication (SCA)** is the PSD2 rule requiring two factors to approve a payment (REQ-102).',
  'uat': '**UAT (user acceptance testing)** is when the business – here Payments Ops – confirms the release does what they need. Its sign-off is one of the go-live gates.',
  'regression': 'A **regression suite** re-runs existing tests to prove new changes did not break what already worked.',
  'self-heal': '**Self-healing** fixes a test whose element locator broke after a UI change: it finds the element by a more stable attribute (such as data-testid), finishes the run and logs the change, instead of failing.',
  'battery': 'A **test battery** is a named group of automated tests run together, such as the smoke suite or the full R4.2 regression.',
  'no-code': 'The **no-code builder** lets you make an automated test from steps like Open page, Click, Type text and Check text, without writing a script.',
  'severity': '**Severity** is the impact of a defect: Critical blocks go-live, High must be fixed or have an agreed workaround, Medium and Low can be planned.',
};

function personByName(q, people) {
  return Object.entries(people).find(([id, p]) => {
    const first = norm(p.name.split(' ')[0]);
    return new RegExp(`\\b${first}\\b`).test(q) || new RegExp(`\\b${id.toLowerCase()}\\b`).test(q);
  });
}

function sprintFromQuestion(q, scopes) {
  const m = q.match(/(?:sprint|s)\s?(\d{1,2})\b/);
  if (m && scopes[`sprint${m[1]}`]) return `sprint${m[1]}`;
  if (has(q, 'last sprint', 'previous sprint')) return 'sprint14';
  if (has(q, 'this sprint', 'current sprint')) return 'sprint15';
  if (has(q, 'whole release', 'release to date', 'overall', 'all sprints')) return 'release';
  return null;
}

function describeScope(key, scopes) {
  const s = scopes[key];
  const e = summariseExecution(s.series);
  const rate = passRate(e);
  const best = s.series.reduce((a, b) => (b.passed + b.failed + b.blocked > a.passed + a.failed + a.blocked ? b : a));
  const prev = s.previous;
  const diff = Math.round((rate - prev.passRate) * 10) / 10;
  return {
    text:
      `**${s.label}** (${s.range}):\n` +
      list([
        `${e.executed} of ${s.planned} planned tests executed (${percent(e.executed, s.planned)}%)`,
        `Pass rate **${rate}%** (${diff >= 0 ? '+' : ''}${diff}pp vs ${s.comparedTo})`,
        `${e.failed} failed, ${e.blocked} blocked`,
        `Busiest ${s.kind === 'release' ? 'sprint' : 'day'}: ${best.label} with ${best.passed + best.failed + best.blocked} runs`,
      ]),
    actions: [{ label: `Show ${s.label} on Overview`, view: 'overview', scope: key }],
  };
}

function describeDefect(d, ctx) {
  const owner = ctx.people[d.owner];
  const req = ctx.requirements.find((r) => r.id === d.reqId);
  return {
    text:
      `**${d.id}** – ${d.title}\n` +
      list([
        `Severity **${d.severity}**, status **${d.status}**, open for ${d.ageDays} days`,
        `Module: ${d.module}`,
        `Owner: ${owner.name} (${owner.role})`,
        req ? `Traced to **${req.id}** (${req.priority}): ${req.title}` : 'Not traced to a requirement',
      ]) +
      (d.severity === 'Critical' && isOpen(d) ? '\n\nThis is an open Critical defect, so on its own it makes the release **No-Go**.' : ''),
    actions: [
      { label: `Open ${d.id}`, view: 'defects', id: d.id },
      ...(req ? [{ label: `Open ${req.id}`, view: 'traceability', id: req.id }] : []),
    ],
  };
}

function describeRequirement(r, ctx) {
  const status = requirementStatus(r);
  const label = { verified: 'Verified', failing: 'Failing', pending: 'In progress', gap: 'Not covered by any test' }[status];
  const defects = ctx.defects.filter((d) => d.reqId === r.id && isOpen(d));
  return {
    text:
      `**${r.id}** (${r.priority}) – ${r.title}\n` +
      list([
        `Status: **${label}**`,
        r.tests.length ? `Tests: ${r.tests.map((t) => `${t.id} ${t.status}`).join(', ')}` : 'No linked tests yet – this is a coverage gap',
        defects.length ? `Open defects: ${defects.map((d) => `${d.id} (${d.severity})`).join(', ')}` : 'No open defects',
      ]),
    actions: [{ label: `Open ${r.id}`, view: 'traceability', id: r.id }],
  };
}

function describeTest(t, ctx) {
  const tester = ctx.people[t.tester];
  return {
    text:
      `**${t.id}** – ${t.title}\n` +
      list([
        `Latest result: **${t.status}**${t.note ? ` (${t.note})` : ''}`,
        `Suite: ${t.suite}, run by ${tester.name}`,
        `Last run: ${t.lastRun}, duration ${formatDuration(t.durationSec)}`,
        `Covers **${t.reqId}** (${t.priority})`,
      ]),
    actions: [
      { label: `Open ${t.id}`, view: 'runs', id: t.id },
      { label: `Open ${t.reqId}`, view: 'traceability', id: t.reqId },
    ],
  };
}

/** Main entry point. `ctx` holds the dashboard data; see buildAgentContext in App. */
export function answerQuestion(question, ctx) {
  const raw = question.trim();
  const q = norm(raw);
  if (!q) return { text: 'Ask me anything about the release, its tests or its defects.', actions: [] };

  const { release, scopes, scopeKey, defects, requirements, runs, people, agenda, manualGates } = ctx;
  const current = scopes[scopeKey] ?? scopes.sprint15;
  const exec = summariseExecution(current.series);
  const gates = evaluateGates({ execution: exec, planned: current.planned, defects, requirements, manualGates });
  const readiness = readinessVerdict(gates);
  const sev = openBySeverity(defects);
  const trace = traceability(requirements);

  // 1. Specific ids win over everything else.
  const id = raw.toUpperCase().match(/\b(DEF|REQ|TC)-?\s?(\d{3,4})\b/);
  if (id) {
    const key = `${id[1]}-${id[2]}`;
    const d = defects.find((x) => x.id === key);
    if (d) return describeDefect(d, ctx);
    const r = requirements.find((x) => x.id === key);
    if (r) return describeRequirement(r, ctx);
    const t = runs.find((x) => x.id === key);
    if (t) return describeTest(t, ctx);
    return { text: `I couldn't find **${key}** in this release. Defects run DEF-1006 to DEF-1042, requirements REQ-101 to REQ-112 and tests TC-201 to TC-300.`, actions: [] };
  }

  // 2. Greetings and help.
  if (/^(hi|hello|hey|ola|bom dia|boa tarde)\b/.test(q) || has(q, 'what can you do', 'help me', 'how do you work')) {
    return {
      text:
        "I'm the QA Agent. I answer from this release's live data:\n" +
        list(['Go/no-go readiness and what is blocking it', 'Any defect, requirement or test by id', 'Sprint and release execution figures', 'Coverage gaps, owners, the agenda and QA terms']),
      actions: [],
    };
  }

  // 3. Glossary ("what is …", "what does … mean").
  if (has(q, 'what is', 'what are', "what's", 'what does', 'meaning', 'define', 'explain')) {
    const term = Object.keys(GLOSSARY).find((k) => q.includes(k));
    if (term) return { text: GLOSSARY[term], actions: [] };
  }

  // 3b. Automation: generation, execution, devices and schedules.
  if (has(q, 'automat', 'generate', 'battery', 'batteries', 'device', 'parallel', 'schedul', 'nightly', 'self-heal', 'self heal', 'user stor', 'no-code', 'no code')) {
    if (has(q, 'schedul', 'nightly')) {
      return {
        text: `Scheduled executions:\n${list(initialSchedules.map((s) => `**${initialBatteries.find((b) => b.id === s.battery)?.name}** – ${s.recurrence} at ${s.time} on ${s.env}, ${s.devices.length} devices`))}`,
        actions: [{ label: 'Open Execute', view: 'execute' }],
      };
    }
    if (has(q, 'user stor', 'generate', 'without tests', 'alert')) {
      return {
        text: `${plural(userStories.length, 'new user story', 'new user stories')} in the backlog have no tests yet: ${userStories.map((s) => `**${s.id}**`).join(', ')}. Open Create, pick a story and press Generate to get test cases covering the happy path, every acceptance criterion, boundaries and negative cases.`,
        actions: [{ label: 'Open Create', view: 'create' }],
      };
    }
    return {
      text:
        `In **Execute** you pick a battery (${initialBatteries.map((b) => b.name).join(', ')}), any of ${DEVICES.length} remote devices and up to 16 parallel workers. ` +
        'Each test runs on each device; self-healing repairs broken locators so a UI change does not fail the run, and every run shows the time saved against running one by one.',
      actions: [{ label: 'Open Execute', view: 'execute' }],
    };
  }

  // 4. Go / no-go and blockers.
  if (has(q, 'go-live', 'go live', 'golive', 'ready', 'readiness', 'no-go', 'go/no', 'go or', 'release ok', 'ship', 'block', 'risk')) {
    const failing = gates.filter((g) => !g.met);
    const critical = defects.filter((d) => d.severity === 'Critical' && isOpen(d));
    return {
      text:
        `Verdict: **${readiness.verdict}** – ${readiness.met} of ${readiness.total} go-live gates met, go-live in ${release.goLiveInDays} days.\n\n` +
        (failing.length ? `Still open:\n${list(failing.map((g) => `${g.label} – ${g.note}`))}` : 'Every gate is met.') +
        (critical.length ? `\n\nThe hard blocker is ${critical.map((d) => `**${d.id}** (${d.title})`).join(', ')}. Until it is closed the release stays No-Go.` : ''),
      actions: [
        ...critical.map((d) => ({ label: `Open ${d.id}`, view: 'defects', id: d.id })),
        { label: 'See Go/No-Go card', view: 'overview' },
      ],
    };
  }

  // 5. People.
  const person = personByName(q, people);
  if (person && has(q, 'who', 'what', 'doing', 'own', 'assigned', 'working', 'role', norm(person[1].name.split(' ')[0]))) {
    const [pid, p] = person;
    const owned = defects.filter((d) => d.owner === pid && isOpen(d));
    const tests = runs.filter((t) => t.tester === pid);
    const meetings = agenda.filter((a) => a.people.includes(pid));
    return {
      text:
        `**${p.name}** – ${p.role}\n` +
        list([
          owned.length ? `Owns ${plural(owned.length, 'open defect')}: ${owned.map((d) => `${d.id} (${d.severity})`).join(', ')}` : 'No open defects assigned',
          tests.length ? `Runs ${plural(tests.length, 'test case')} (${[...new Set(tests.map((t) => t.suite))].join(', ')})` : 'No test cases assigned',
          meetings.length ? `Today: ${meetings.map((m) => `${m.title} at ${m.time}`).join(', ')}` : 'Nothing on today\'s agenda',
        ]),
      actions: owned.slice(0, 2).map((d) => ({ label: `Open ${d.id}`, view: 'defects', id: d.id })),
    };
  }
  if (has(q, 'who', 'team', 'people')) {
    return {
      text: `The R4.2 team:\n${list(Object.values(people).map((p) => `**${p.name}** – ${p.role}`))}`,
      actions: [],
    };
  }

  // 6. Specific sprint or the release as a whole.
  const sprint = sprintFromQuestion(q, scopes);
  if (sprint) return describeScope(sprint, scopes);

  // 7. Defects.
  if (has(q, 'critical')) {
    const list_ = defects.filter((d) => d.severity === 'Critical' && isOpen(d));
    return {
      text: list_.length
        ? `${plural(list_.length, 'open Critical defect')}:\n${list(list_.map((d) => `**${d.id}** – ${d.title} (${d.status}, owner ${people[d.owner].name})`))}`
        : 'There are no open Critical defects.',
      actions: list_.map((d) => ({ label: `Open ${d.id}`, view: 'defects', id: d.id })),
    };
  }
  if (has(q, 'defect', 'bug', 'issue')) {
    const open = defects.filter(isOpen);
    const oldest = [...open].sort((a, b) => b.ageDays - a.ageDays)[0];
    const retest = open.filter((d) => d.status === 'Retest');
    return {
      text:
        `**${open.length} open defects**: ${sev.Critical} Critical, ${sev.High} High, ${sev.Medium} Medium, ${sev.Low} Low.\n` +
        list([
          `${plural(retest.length, 'defect')} waiting for retest${retest.length ? `: ${retest.map((d) => d.id).join(', ')}` : ''}`,
          oldest ? `Oldest open: **${oldest.id}** (${oldest.ageDays} days) – ${oldest.title}` : 'No open defects',
        ]),
      actions: [{ label: 'Open defect log', view: 'defects' }],
    };
  }

  // 8. Coverage and requirements.
  if (has(q, 'coverage', 'covered', 'requirement', 'gap', 'traceab', 'verified', 'must')) {
    const notVerified = requirements.filter((r) => requirementStatus(r) !== 'verified');
    return {
      text:
        `Coverage is **${trace.coverage}%** (${trace.covered} of ${trace.total} requirements have tests) and **${trace.verifiedRate}%** are fully verified. ${plural(trace.mustGaps, 'Must-have requirement')} still need work.\n\n` +
        `Not yet verified:\n${list(notVerified.map((r) => `**${r.id}** (${r.priority}) – ${{ failing: 'failing', pending: 'in progress', gap: 'no tests' }[requirementStatus(r)]}`))}`,
      actions: [{ label: 'Open traceability matrix', view: 'traceability' }],
    };
  }

  // 9. Tests and execution.
  if (has(q, 'fail', 'blocked', 'not run', 'regression', 'uat', 'functional', 'suite')) {
    const status = has(q, 'blocked') ? 'blocked' : has(q, 'not run') ? 'not run' : 'failed';
    const suite = ['regression', 'uat', 'functional'].find((s) => q.includes(s));
    let rows = runs.filter((t) => (suite ? t.suite.toLowerCase() === suite : t.status === status));
    const title = suite ? `${rows.length} ${suite.toUpperCase() === 'UAT' ? 'UAT' : suite[0].toUpperCase() + suite.slice(1)} test cases` : `${plural(rows.length, `${status} test`)}`;
    return {
      text: `${title}:\n${list(rows.map((t) => `**${t.id}** – ${t.title} (${t.status}${t.note ? `, ${t.note}` : ''})`))}`,
      actions: [{ label: 'Open Test runs', view: 'runs' }],
    };
  }
  if (has(q, 'pass rate', 'passrate', 'test', 'execut', 'progress', 'run', 'how are we', 'status', 'summary', 'overview')) {
    const counts = runSummary(runs);
    const base = describeScope(scopeKey in scopes ? scopeKey : 'sprint15', scopes);
    return {
      text: `${base.text}\n\nLatest result per test case: ${counts.passed} passed, ${counts.failed} failed, ${counts.blocked} blocked, ${counts['not run']} not run.`,
      actions: [{ label: 'Open Test runs', view: 'runs' }],
    };
  }

  // 10. Agenda.
  if (has(q, 'today', 'agenda', 'meeting', 'schedule', 'calendar')) {
    return { text: `Today's agenda:\n${list(agenda.map((a) => `${a.time} – **${a.title}** (${a.people.map((p) => people[p].name.split(' ')[0]).join(', ')})`))}`, actions: [] };
  }

  // 11. Client, project and release.
  if (has(q, 'client', 'bank', 'project', 'programme', 'program', 'release', 'when', 'scope', 'about', 'sepa', 'meridian')) {
    return {
      text:
        `**${release.client}** – ${release.programme}.\nRelease **${release.name}** goes live in ${release.goLiveInDays} days. It lets customers send SEPA Instant payments in under 10 seconds, with IBAN validation, Verification of Payee, SCA, a €100k scheme limit, duplicate protection and fallback to standard SEPA when TIPS is down.\n\n` +
        `${requirements.length} requirements, ${runs.length} test cases, ${defects.length} defects logged (${defects.filter(isOpen).length} open). All data in QualityView is fictional.`,
      actions: [],
    };
  }

  return {
    text: "I'm not sure about that one. I can answer about readiness, defects, requirements, test runs, sprints, the team, today's agenda and QA terms. Try one of the suggestions, or ask about a specific id like DEF-1042.",
    actions: [],
  };
}

/** Compact plain-text snapshot of the release, used as context when Claude is connected. */
export function contextForModel(ctx) {
  const { release, scopes, defects, requirements, runs, people, agenda, manualGates } = ctx;
  const lines = [
    `Client: ${release.client}. Programme: ${release.programme}. Release: ${release.name}. Go-live in ${release.goLiveInDays} days. All data is fictional demo data.`,
    `People: ${Object.entries(people).map(([id, p]) => `${id}=${p.name} (${p.role})`).join('; ')}`,
    'Execution by scope:',
    ...Object.values(scopes).map((s) => {
      const e = summariseExecution(s.series);
      return `- ${s.label} (${s.range}): planned ${s.planned}, executed ${e.executed}, passed ${e.passed}, failed ${e.failed}, blocked ${e.blocked}, pass rate ${passRate(e)}%`;
    }),
    'Defects (id | severity | status | module | owner | age days | requirement | title):',
    ...defects.map((d) => `- ${d.id} | ${d.severity} | ${d.status} | ${d.module} | ${d.owner} | ${d.ageDays} | ${d.reqId} | ${d.title}`),
    'Requirements (id | priority | status | tests | title):',
    ...requirements.map((r) => `- ${r.id} | ${r.priority} | ${requirementStatus(r)} | ${r.tests.map((t) => `${t.id}:${t.status}`).join(' ') || 'none'} | ${r.title}`),
    'Test cases (id | suite | tester | last run | result | requirement | title):',
    ...runs.map((t) => `- ${t.id} | ${t.suite} | ${t.tester} | ${t.lastRun} | ${t.status} | ${t.reqId} | ${t.title}${t.note ? ` (${t.note})` : ''}`),
    `Manual go-live gates: ${manualGates.map((g) => `${g.label}: ${g.met ? 'met' : 'not met'} (${g.note})`).join('; ')}`,
    'Automatic gates: execution >= 90% of planned, pass rate >= 90%, no open Critical defects, every Must-have requirement verified. Verdict is No-Go while a Critical defect is open, Conditional if other gates fail, Go if all are met.',
    `Today's agenda: ${agenda.map((a) => `${a.time} ${a.title}`).join('; ')}`,
  ];
  return lines.join('\n');
}

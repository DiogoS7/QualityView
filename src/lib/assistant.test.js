import { describe, it, expect } from 'vitest';
import { answerQuestion, contextForModel, SUGGESTIONS } from './assistant.js';
import { testRunRows } from './metrics.js';
import { release, scopes, defects, requirements, testCases, people, agenda, manualGates } from '../data/release.js';

const ctx = { release, scopes, scopeKey: 'sprint15', defects, requirements, runs: testRunRows(requirements, testCases), people, agenda, manualGates };
const ask = (q) => answerQuestion(q, ctx);

describe('QA agent – built-in answers', () => {
  it('answers every suggested question with something specific', () => {
    for (const q of SUGGESTIONS) expect(ask(q).text).not.toMatch(/not sure/);
  });

  it('gives the go/no-go verdict and names the blocker', () => {
    const a = ask('Are we ready for go-live?');
    expect(a.text).toMatch(/No-Go/);
    expect(a.text).toMatch(/DEF-1042/);
    expect(a.actions.some((x) => x.view === 'defects' && x.id === 'DEF-1042')).toBe(true);
  });

  it('looks up any id, even typed loosely', () => {
    expect(ask('tell me about def 1042').text).toMatch(/Instant transfer accepted above/);
    expect(ask('what about REQ-111?').text).toMatch(/coverage gap/);
    expect(ask('tc-221').text).toMatch(/VoP stub down/);
    expect(ask('DEF-9999').text).toMatch(/couldn't find/);
  });

  it('reports on a named sprint against the sprint before', () => {
    const a = ask('How did Sprint 14 go?');
    expect(a.text).toMatch(/Sprint 14/);
    expect(a.text).toMatch(/82\.2%/);
    expect(a.actions[0]).toMatchObject({ view: 'overview', scope: 'sprint14' });
  });

  it('lists open critical defects only', () => {
    const a = ask('show open critical defects');
    expect(a.text).toMatch(/DEF-1042/);
    expect(a.text).not.toMatch(/DEF-1015/); // closed Critical
  });

  it('lists requirements that are not verified', () => {
    const a = ask('Which requirements are not verified?');
    expect(a.text).toMatch(/REQ-111/);
    expect(a.text).not.toMatch(/REQ-102/); // verified
  });

  it('knows who people are and what they own', () => {
    const a = ask('What is Ana working on?');
    expect(a.text).toMatch(/Development Lead/);
    expect(a.text).toMatch(/DEF-1042/);
  });

  it('explains QA terms', () => {
    expect(ask('What is a blocked test?').text).toMatch(/could not run/);
    expect(ask('what does RTM mean').text).toMatch(/traceability matrix/);
  });

  it('lists failing and suite-specific tests', () => {
    expect(ask('which tests failed?').text).toMatch(/4 failed tests/);
    expect(ask('show UAT tests').text).toMatch(/TC-240/);
  });

  it('describes the client and release', () => {
    expect(ask('tell me about the client').text).toMatch(/Meridian Bank/);
  });

  it('answers about automation and schedules', () => {
    expect(ask('which user stories need tests?').text).toMatch(/US-431/);
    expect(ask('what runs nightly?').text).toMatch(/Full regression R4.2/);
    expect(ask('what is self-healing?').text).toMatch(/locator/);
  });

  it('falls back politely when it has no answer', () => {
    expect(ask('what is the weather in Lisbon').text).toMatch(/not sure/);
  });
});

describe('contextForModel', () => {
  it('includes every defect, requirement and test case', () => {
    const text = contextForModel(ctx);
    for (const d of defects) expect(text.includes(d.id)).toBe(true);
    for (const r of requirements) expect(text.includes(r.id)).toBe(true);
    expect(text).toMatch(/TC-300/);
  });
});

import { useEffect, useState } from 'react';
import GlassCard, { CardHeader } from '../components/GlassCard.jsx';
import { Ring } from '../components/ReadinessCard.jsx';
import { requirementStatus } from '../lib/metrics.js';

const STATUS = {
  verified: { label: 'Verified', cls: 'bg-pass/15 text-pass' },
  failing: { label: 'Failing', cls: 'bg-fail/15 text-fail' },
  pending: { label: 'In progress', cls: 'bg-blocked/15 text-blocked' },
  gap: { label: 'No tests', cls: 'bg-white/10 text-muted' },
};

const TEST_DOT = {
  passed: 'bg-pass',
  failed: 'bg-fail',
  blocked: 'bg-blocked',
  'not run': 'border border-white/40',
};

const PRIORITY = { Must: 'text-ink', Should: 'text-muted', Could: 'text-faint' };

/** Requirements traceability matrix (RTM): every requirement, its tests and their latest result. */
export default function Traceability({ requirements, trace, highlightId, onOpenTest }) {
  const [gapsOnly, setGapsOnly] = useState(false);

  useEffect(() => {
    if (highlightId) setTimeout(() => document.getElementById(`req-${highlightId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350);
  }, [highlightId]);
  const rows = requirements
    .map((r) => ({ ...r, status: requirementStatus(r) }))
    .filter((r) => !gapsOnly || r.status !== 'verified');

  const summary = [
    { label: 'Coverage', sub: `${trace.covered} of ${trace.total} requirements have tests`, value: trace.coverage, colour: '#8b7bff' },
    { label: 'Verified', sub: `${trace.verified} requirements fully passing`, value: trace.verifiedRate, colour: '#4ade80' },
  ];

  return (
    <div className="grid gap-[18px] lg:grid-cols-3">
      {summary.map((s, i) => (
        <GlassCard key={s.label} delay={0.1 + i * 0.07} className="flex items-center gap-4 p-5">
          <Ring value={s.value} colour={s.colour} size={64} stroke={6} />
          <div>
            <p className="text-[16px] font-semibold">{s.label}</p>
            <p className="mt-0.5 text-[13px] text-muted">{s.sub}</p>
          </div>
        </GlassCard>
      ))}
      <GlassCard delay={0.24} className="flex items-center gap-4 p-5">
        <span className={`grid size-16 shrink-0 place-items-center rounded-full text-2xl font-bold ${trace.mustGaps ? 'bg-fail/15 text-fail' : 'bg-pass/15 text-pass'}`}>
          {trace.mustGaps}
        </span>
        <div>
          <p className="text-[16px] font-semibold">Must-have gaps</p>
          <p className="mt-0.5 text-[13px] text-muted">Must-have requirements not yet verified – these block go-live</p>
        </div>
      </GlassCard>

      <GlassCard lift={false} delay={0.3} className="min-w-0 p-5 lg:col-span-3">
        <CardHeader title="Traceability matrix" subtitle="Requirement → linked test cases → latest result">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted select-none">
            <span>Gaps only</span>
            <button
              role="switch"
              aria-checked={gapsOnly}
              onClick={() => setGapsOnly((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition ${gapsOnly ? 'bg-accent' : 'bg-white/15'}`}
            >
              <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${gapsOnly ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </label>
        </CardHeader>

        <div className="mt-3 flex flex-wrap gap-4 text-[13px] text-muted">
          {Object.entries(TEST_DOT).map(([k, cls]) => (
            <span key={k} className="flex items-center gap-1.5">
              <i className={`size-2.5 rounded-full ${cls}`} />
              {k}
            </span>
          ))}
        </div>

        <div className="scroll-glass mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="text-[13px] text-faint">
              <tr>
                {['Requirement', 'Priority', 'Linked tests', 'Status'].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} id={`req-${r.id}`} className={`border-t border-white/[0.06] transition hover:bg-white/[0.06] ${r.id === highlightId ? 'bg-white/10 outline outline-1 outline-white/25' : ''}`}>
                  <td className="px-3 py-3">
                    <p className="font-semibold">{r.id}</p>
                    <p className="text-muted">{r.title}</p>
                  </td>
                  <td className={`px-3 py-3 font-semibold ${PRIORITY[r.priority]}`}>{r.priority}</td>
                  <td className="px-3 py-3">
                    {r.tests.length ? (
                      <div className="flex flex-wrap gap-2">
                        {r.tests.map((t) => (
                          <button key={t.id} onClick={() => onOpenTest(t.id)} title={`${t.id}: ${t.status} – open in Test runs`} className="glass-inset flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] transition hover:bg-white/15">
                            <i className={`size-2 rounded-full ${TEST_DOT[t.status]}`} />
                            {t.id}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[13px] font-semibold whitespace-nowrap ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

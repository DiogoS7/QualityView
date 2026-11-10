import { useMemo, useState } from 'react';
import { LuSearch, LuX } from 'react-icons/lu';
import GlassCard, { CardHeader } from '../components/GlassCard.jsx';
import Avatar from '../components/Avatar.jsx';
import { RUN_STATUSES, filterRuns, formatDuration, percent, runSummary } from '../lib/metrics.js';

export const RUN_STYLE = {
  passed: { colour: '#4ade80', cls: 'bg-pass/15 text-pass', label: 'Passed' },
  failed: { colour: '#ff8f8f', cls: 'bg-fail/15 text-fail', label: 'Failed' },
  blocked: { colour: '#fcd34d', cls: 'bg-blocked/15 text-blocked', label: 'Blocked' },
  'not run': { colour: '#a8a29e', cls: 'bg-white/10 text-muted', label: 'Not run' },
};

const SUITES = ['All', 'Functional', 'Regression', 'UAT'];

/** Every linked test case with its latest result, filterable by status, suite and text. */
export default function TestRuns({ rows, highlightId, onOpenRequirement }) {
  const [filters, setFilters] = useState({ query: highlightId ?? '', status: 'All', suite: 'All' });
  const shown = useMemo(() => filterRuns(rows, filters), [rows, filters]);
  const counts = runSummary(rows);
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-[18px] lg:grid-cols-4">
      {RUN_STATUSES.map((s, i) => {
        const st = RUN_STYLE[s];
        const active = filters.status === s;
        return (
          <GlassCard key={s} delay={0.1 + i * 0.06} className={`p-0 ${active ? '!border-white/40' : ''}`}>
            <button onClick={() => set({ status: active ? 'All' : s })} className="w-full p-4 text-left sm:p-5" aria-pressed={active}>
              <span className="flex items-center gap-2 text-[13px] text-muted">
                <i className="size-2.5 rounded-full" style={{ background: st.colour }} />
                {st.label}
              </span>
              <span className="mt-2 flex items-baseline gap-2">
                <b className="text-[28px] leading-none font-bold tracking-tight">{counts[s]}</b>
                <span className="text-[13px] text-faint">{percent(counts[s], rows.length)}%</span>
              </span>
              <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <span className="block h-full rounded-full" style={{ width: `${percent(counts[s], rows.length)}%`, background: st.colour }} />
              </span>
            </button>
          </GlassCard>
        );
      })}

      <GlassCard lift={false} delay={0.35} className="col-span-2 min-w-0 p-5 lg:col-span-4">
        <CardHeader title="Test cases" subtitle={`${shown.length} of ${rows.length} test cases · latest result per case`} />

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="glass-inset flex flex-1 items-center gap-2 rounded-full px-4 py-2.5">
            <LuSearch size={15} className="text-muted" />
            <input
              value={filters.query}
              onChange={(e) => set({ query: e.target.value })}
              placeholder="Search test id, title or requirement"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
            />
            {filters.query && (
              <button aria-label="Clear search" onClick={() => set({ query: '' })} className="text-muted hover:text-ink">
                <LuX size={14} />
              </button>
            )}
          </label>
          <div className="glass-inset flex self-start rounded-full p-1">
            {SUITES.map((s) => (
              <button
                key={s}
                onClick={() => set({ suite: s })}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${filters.suite === s ? 'bg-white text-[#0f1524]' : 'text-faint hover:text-ink'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="scroll-glass mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="text-[13px] text-faint">
              <tr>
                {['ID', 'Test case', 'Requirement', 'Suite', 'Tester', 'Last run', 'Duration', 'Result'].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={`border-t border-white/[0.06] transition hover:bg-white/[0.06] ${r.id === highlightId ? 'bg-white/10' : ''}`}>
                  <td className="px-3 py-3 font-semibold whitespace-nowrap">{r.id}</td>
                  <td className="px-3 py-3 text-muted">
                    {r.title}
                    {r.note && <span className="block text-[12px] text-blocked">{r.note}</span>}
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => onOpenRequirement(r.reqId)} className="glass-inset rounded-full px-2 py-1 text-[13px] whitespace-nowrap transition hover:bg-white/15">
                      {r.reqId}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-muted">{r.suite}</td>
                  <td className="px-3 py-3">
                    <Avatar id={r.tester} size={24} />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-faint">{r.lastRun}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-faint">{formatDuration(r.durationSec)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[13px] font-semibold whitespace-nowrap ${RUN_STYLE[r.status].cls}`}>{RUN_STYLE[r.status].label}</span>
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-muted">
                    No test cases match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

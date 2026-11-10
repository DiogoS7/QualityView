import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LuSearch, LuX, LuLink } from 'react-icons/lu';
import GlassCard, { CardHeader } from '../components/GlassCard.jsx';
import Avatar from '../components/Avatar.jsx';
import { SEVERITY_COLOURS } from '../components/SeverityCard.jsx';
import { SEVERITIES, filterDefects, isOpen } from '../lib/metrics.js';
import { people, requirements } from '../data/release.js';

const STATUS_STYLE = {
  Open: 'bg-fail/15 text-fail',
  'In progress': 'bg-accent/15 text-[#8cb4ff]',
  Retest: 'bg-blocked/15 text-blocked',
  Closed: 'bg-white/10 text-muted',
};

function Chip({ active, onClick, children, colour }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${
        active ? 'border-white/30 bg-white text-[#0f1524]' : 'border-white/12 text-muted hover:text-ink'
      }`}
    >
      {colour && <i className="size-2 rounded-full" style={{ background: colour }} />}
      {children}
    </button>
  );
}

export function SeverityPill({ severity }) {
  const c = SEVERITY_COLOURS[severity];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: c }}>
      <i className="size-2 rounded-full" style={{ background: c }} />
      {severity}
    </span>
  );
}

export default function Defects({ defects, filters, onFilters, selectedId, onSelect: setSelectedId, onOpenRequirement }) {
  const rows = useMemo(() => filterDefects(defects, filters), [defects, filters]);
  const selected = defects.find((d) => d.id === selectedId);
  const req = selected && requirements.find((r) => r.id === selected.reqId);
  const set = (patch) => onFilters({ ...filters, ...patch });

  // Bring a defect opened from notifications or search into view.
  useEffect(() => {
    if (selectedId) document.getElementById(`row-${selectedId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [selectedId]);

  return (
    <div className="grid gap-[18px] xl:grid-cols-[1fr_340px]">
      <GlassCard lift={false} delay={0.15} className="min-w-0 p-5">
        <CardHeader title="Defect log" subtitle={`${rows.length} of ${defects.length} defects · ${defects.filter(isOpen).length} open`} />

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="glass-inset flex flex-1 items-center gap-2 rounded-full px-4 py-2.5">
            <LuSearch size={15} className="text-muted" />
            <input
              value={filters.query}
              onChange={(e) => set({ query: e.target.value })}
              placeholder="Search id, title, module or requirement"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
            />
            {filters.query && (
              <button aria-label="Clear search" onClick={() => set({ query: '' })} className="text-muted hover:text-ink">
                <LuX size={14} />
              </button>
            )}
          </label>
          <div className="glass-inset flex rounded-full p-1">
            {['All', 'Open', 'Closed'].map((s) => (
              <button
                key={s}
                onClick={() => set({ status: s })}
                className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${
                  filters.status === s ? 'bg-white text-[#0f1524]' : 'text-faint hover:text-ink'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={filters.severity === 'All'} onClick={() => set({ severity: 'All' })}>
            All severities
          </Chip>
          {SEVERITIES.map((s) => (
            <Chip key={s} active={Array.isArray(filters.severity) ? filters.severity.includes(s) : filters.severity === s} onClick={() => set({ severity: s })} colour={SEVERITY_COLOURS[s]}>
              {s}
            </Chip>
          ))}
        </div>

        <div className="scroll-glass mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[13px]">
            <thead className="text-[13px] text-faint">
              <tr>
                {['ID', 'Title', 'Severity', 'Status', 'Module', 'Owner', 'Age'].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr
                  key={d.id}
                  id={`row-${d.id}`}
                  onClick={() => setSelectedId(d.id)}
                  className={`cursor-pointer border-t border-white/[0.06] transition hover:bg-white/[0.06] ${
                    selectedId === d.id ? 'bg-white/10' : ''
                  }`}
                >
                  <td className="px-3 py-3 font-semibold whitespace-nowrap">{d.id}</td>
                  <td className="max-w-[280px] truncate px-3 py-3 text-muted">{d.title}</td>
                  <td className="px-3 py-3">
                    <SeverityPill severity={d.severity} />
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[13px] font-semibold whitespace-nowrap ${STATUS_STYLE[d.status]}`}>{d.status}</span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted">{d.module}</td>
                  <td className="px-3 py-3">
                    <Avatar id={d.owner} size={24} />
                  </td>
                  <td className="px-3 py-3 text-faint">{d.ageDays}d</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-muted">
                    No defects match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <AnimatePresence mode="wait">
        <motion.div
          key={selected?.id ?? 'empty'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="glass self-start rounded-[22px] p-5"
        >
          {selected ? (
            <>
              <CardHeader title={selected.id} subtitle={selected.module}>
                <button aria-label="Close details" onClick={() => setSelectedId(null)} className="text-muted hover:text-ink">
                  <LuX size={16} />
                </button>
              </CardHeader>
              <p className="mt-3 text-[15px] leading-relaxed">{selected.title}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                <div className="glass-inset rounded-xl p-3">
                  <dt className="text-faint">Severity</dt>
                  <dd className="mt-1">
                    <SeverityPill severity={selected.severity} />
                  </dd>
                </div>
                <div className="glass-inset rounded-xl p-3">
                  <dt className="text-faint">Status</dt>
                  <dd className="mt-1 font-semibold">{selected.status}</dd>
                </div>
                <div className="glass-inset col-span-2 flex items-center gap-3 rounded-xl p-3">
                  <Avatar id={selected.owner} size={30} />
                  <div>
                    <dt className="text-faint">Owner</dt>
                    <dd className="font-semibold">
                      {people[selected.owner].name} <span className="font-normal text-muted">· {people[selected.owner].role}</span>
                    </dd>
                  </div>
                </div>
              </dl>
              {req && (
                <div className="glass-inset mt-3 rounded-xl p-3 text-[13px]">
                  <p className="flex items-center gap-1.5 text-faint">
                    <LuLink size={12} /> Traced to requirement
                  </p>
                  <button onClick={() => onOpenRequirement(req.id)} className="mt-1 font-semibold underline-offset-2 hover:underline">
                    {req.id} <span className="font-normal text-muted">· {req.priority}</span>
                  </button>
                  <p className="mt-0.5 text-muted">{req.title}</p>
                </div>
              )}
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-[15px] font-semibold">Select a defect</p>
              <p className="mt-1 text-[13px] text-muted">Its owner and the requirement it is traced to will show here.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

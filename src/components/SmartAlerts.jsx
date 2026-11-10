import { LuBellRing, LuWandSparkles, LuX } from 'react-icons/lu';
import GlassCard, { CardHeader } from './GlassCard.jsx';

/** New or changed user stories picked up from the backlog that have no tests yet. */
export default function SmartAlerts({ stories, onGenerate, onDismiss, delay = 0, className = '' }) {
  return (
    <GlassCard delay={delay} className={`p-5 ${className}`}>
      <CardHeader title="Smart alerts" subtitle="New user stories without tests">
        <span className="flex items-center gap-1.5 rounded-full bg-blocked/15 px-2.5 py-1 text-[13px] font-semibold text-blocked">
          <LuBellRing size={12} /> {stories.length}
        </span>
      </CardHeader>
      <ul className="mt-3 flex flex-col gap-2">
        {stories.map((s) => (
          <li key={s.id} className="glass-inset group flex items-center gap-3 rounded-[14px] px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px]">
                New user story <b className="font-semibold">{s.id}</b> found in <b className="font-semibold">{s.project}</b>
              </span>
              <span className="block truncate text-[12px] text-faint">
                {s.found} · {s.text.split('\n')[1]?.replace(/^I want( to)?\s*/i, '')}
              </span>
            </span>
            <button
              onClick={() => onGenerate(s)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#7aa2ff]/40 bg-accent/15 px-3 py-1.5 text-[13px] font-semibold transition hover:bg-accent/30"
            >
              <LuWandSparkles size={12} /> Generate tests
            </button>
            <button onClick={() => onDismiss(s.id)} aria-label={`Dismiss ${s.id}`} className="text-faint opacity-60 transition hover:text-ink group-hover:opacity-100">
              <LuX size={14} />
            </button>
          </li>
        ))}
        {!stories.length && <li className="p-4 text-center text-[13px] text-muted">All caught up – every story has tests.</li>}
      </ul>
    </GlassCard>
  );
}

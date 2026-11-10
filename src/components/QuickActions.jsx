import { LuFlaskConical, LuPlay, LuCalendarClock, LuWandSparkles } from 'react-icons/lu';
import GlassCard, { CardHeader } from './GlassCard.jsx';

const ACTIONS = [
  { id: 'create', label: 'Create test', sub: 'No-code builder', icon: LuFlaskConical },
  { id: 'generate', label: 'Generate test cases', sub: 'From a user story', icon: LuWandSparkles },
  { id: 'execute', label: 'Execute battery', sub: 'Across remote devices', icon: LuPlay },
  { id: 'schedule', label: 'Schedule execution', sub: 'Nightly or weekdays', icon: LuCalendarClock },
];

export default function QuickActions({ onAction, delay = 0, className = '' }) {
  return (
    <GlassCard delay={delay} className={`flex flex-col p-5 ${className}`}>
      <CardHeader title="Quick actions" subtitle="Start the most common QA tasks" />
      <div className="mt-4 grid flex-1 gap-2.5 sm:grid-cols-2">
        {ACTIONS.map(({ id, label, sub, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onAction(id)}
            className="glass-inset group flex items-center gap-3 rounded-[16px] p-3.5 text-left transition hover:border-[#7aa2ff]/50 hover:bg-accent/15 hover:"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-[#a9c6ff] transition group-hover:bg-accent/30">
              <Icon size={17} />
            </span>
            <span>
              <span className="block text-[13px] font-semibold">{label}</span>
              <span className="block text-[12px] text-faint">{sub}</span>
            </span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

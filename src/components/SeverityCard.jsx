import { motion } from 'framer-motion';
import GlassCard, { CardHeader } from './GlassCard.jsx';
import { SEVERITIES } from '../lib/metrics.js';

export const SEVERITY_COLOURS = {
  Critical: '#ff8f8f',
  High: '#fdba74',
  Medium: '#fbbf24',
  Low: '#94a3b8',
};

export default function SeverityCard({ counts, delay = 0, onSelect, className = '' }) {
  const total = SEVERITIES.reduce((n, s) => n + counts[s], 0);
  const max = Math.max(1, ...SEVERITIES.map((s) => counts[s]));
  return (
    <GlassCard delay={delay} className={`p-5 ${className}`}>
      <CardHeader title="Open defects" subtitle={`${total} across all modules`} />
      <ul className="mt-4 flex flex-col gap-2">
        {SEVERITIES.map((s, i) => (
          <li key={s}>
            <button
              onClick={() => onSelect?.(s)}
              className="group grid w-full grid-cols-[62px_1fr_22px] items-center gap-3 rounded-lg px-1 py-1.5 text-left transition hover:bg-white/5"
            >
              <span className="text-[13px] text-muted group-hover:text-ink">{s}</span>
              <span className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <motion.span
                  className="block h-full rounded-full"
                  style={{ background: SEVERITY_COLOURS[s] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(counts[s] / max) * 100}%` }}
                  transition={{ duration: 0.8, delay: delay + 0.08 * i }}
                />
              </span>
              <span className="text-right text-[13px] font-semibold">{counts[s]}</span>
            </button>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

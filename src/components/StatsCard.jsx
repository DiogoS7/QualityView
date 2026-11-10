import { LuArrowUpRight, LuTrendingUp, LuTrendingDown } from 'react-icons/lu';
import GlassCard from './GlassCard.jsx';
import Sparkline from './Sparkline.jsx';

/**
 * KPI tile: icon chip, label, value, change badge and sparkline.
 * `change` comes from lib/metrics `delta()` so the badge colour reflects
 * whether the change is good news, not just its direction.
 */
export default function StatsCard({ title, value, change, unit = '', icon: Icon, tint, points, delay = 0, onOpen }) {
  const Trend = change.up ? LuTrendingUp : LuTrendingDown;
  const sign = change.diff > 0 ? '+' : '';
  return (
    <GlassCard delay={delay} className="flex min-h-[150px] flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <span className="grid size-[38px] place-items-center rounded-xl" style={{ background: `${tint}2e`, color: tint }}>
          <Icon size={18} />
        </span>
        <button
          onClick={onOpen}
          aria-label={`Open ${title}`}
          className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink"
        >
          <LuArrowUpRight size={14} />
        </button>
      </div>
      <p className="mt-4 text-[13px] text-muted">{title}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div>
          <h2 className="text-[22px] leading-tight font-bold tracking-tight sm:text-[28px]">{value}</h2>
          <span
            className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-semibold ${
              change.good ? 'bg-pass/15 text-pass' : 'bg-fail/15 text-fail'
            }`}
          >
            <Trend size={11} />
            {sign}
            {change.diff}
            {unit}
          </span>
        </div>
        <Sparkline points={points} color={tint} className="hidden sm:block" />
      </div>
    </GlassCard>
  );
}

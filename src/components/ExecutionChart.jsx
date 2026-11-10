import { motion } from 'framer-motion';
import GlassCard, { CardHeader } from './GlassCard.jsx';
import { niceAxis } from '../lib/metrics.js';

const LEGEND = [
  ['Passed', 'bg-white/60'],
  ['Failed', 'bg-fail'],
  ['Blocked', 'bg-blocked'],
];

/**
 * Glass pill bars: height = tests executed, with failed and blocked runs
 * stacked as a tinted cap. The busiest day/sprint glows blue.
 */
export default function ExecutionChart({ scopeKey, scope, rateChange, delay = 0, className = '' }) {
  const totals = scope.series.map((d) => d.passed + d.failed + d.blocked);
  const { max, ticks } = niceAxis(Math.max(...totals));
  const peak = totals.indexOf(Math.max(...totals));
  const sign = rateChange.diff > 0 ? '+' : '';

  return (
    <GlassCard delay={delay} className={`flex min-h-[340px] flex-col p-5 sm:min-h-[380px] sm:px-6 ${className}`}>
      <CardHeader title="Test execution" subtitle={scope.caption}>
        <span
          className={`rounded-full border px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap ${
            rateChange.good ? 'border-pass/25 bg-pass/10 text-pass' : 'border-fail/25 bg-fail/10 text-fail'
          }`}
        >
          ● {sign}
          {rateChange.diff}pp pass rate vs {scope.comparedTo}
        </span>
      </CardHeader>

      <div className="mt-3 flex gap-4 text-[13px] text-muted">
        {LEGEND.map(([label, dot]) => (
          <span key={label} className="flex items-center gap-1.5">
            <i className={`size-2 rounded-full ${dot}`} />
            {label}
          </span>
        ))}
      </div>

      <div className="mt-4 grid flex-1 grid-cols-[34px_1fr]">
        <div className="flex flex-col justify-between pb-[26px] text-[12px] text-faint">
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="relative flex items-end justify-around pb-[26px]">
          {ticks.slice(0, -1).map((t) => {
            const f = t / max;
            return (
              <div
                key={t}
                className="absolute inset-x-0 h-px bg-white/[0.06]"
                style={{ bottom: `calc(26px + ${f * 100}% - ${f * 26}px)` }}
              />
            );
          })}
          {scope.series.map((d, i) => {
            const total = totals[i];
            const hi = i === peak;
            return (
              <div key={`${scopeKey}-${d.label}`} className="group relative flex h-full w-7 flex-col items-center justify-end sm:w-10">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(2, (total / max) * 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.05 * i, ease: [0.2, 0.8, 0.2, 1] }}
                  className={`relative flex w-5 cursor-pointer flex-col overflow-hidden rounded-full border sm:w-[30px] ${
                    hi
                      ? 'border-[#8cb4ff]/60 bg-gradient-to-b from-[#6aa2ff] to-[#2f6bf0]'
                      : 'border-white/20 bg-gradient-to-b from-white/35 to-white/[0.08] group-hover:from-white/50'
                  }`}
                >
                  <span className="bg-fail/70" style={{ height: `${(d.failed / total) * 100}%` }} />
                  <span className="bg-blocked/70" style={{ height: `${(d.blocked / total) * 100}%` }} />
                </motion.div>
                <div
                  role="tooltip"
                  className="pointer-events-none absolute z-10 translate-y-1 rounded-lg border border-white/15 bg-[#0d1220]/85 px-2.5 py-1.5 text-[13px] whitespace-nowrap opacity-0 backdrop-blur transition group-hover:translate-y-0 group-hover:opacity-100"
                  style={{ bottom: `calc(${Math.max(2, (total / max) * 100)}% + 8px)` }}
                >
                  <b className="font-semibold">{total} runs</b>
                  <span className="text-muted">
                    {' '}
                    · {d.passed} pass · {d.failed} fail · {d.blocked} blocked
                  </span>
                </div>
                <span className={`absolute -bottom-6 text-[13px] ${hi ? 'text-ink' : 'text-faint'}`}>{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

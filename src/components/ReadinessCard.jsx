import { motion } from 'framer-motion';
import { LuCircleCheck, LuCircleX } from 'react-icons/lu';
import GlassCard, { CardHeader } from './GlassCard.jsx';

const VERDICT_STYLE = {
  Go: { colour: '#4ade80', cls: 'border-pass/30 bg-pass/10 text-pass' },
  Conditional: { colour: '#fbbf24', cls: 'border-blocked/30 bg-blocked/10 text-blocked' },
  'No-Go': { colour: '#f87171', cls: 'border-fail/30 bg-fail/10 text-fail' },
};

export function Ring({ value, colour, size = 54, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[13px] font-bold">{Math.round(value)}%</span>
    </div>
  );
}

/** Go / No-Go summary: score ring, verdict and each gate with its evidence. */
export default function ReadinessCard({ gates, readiness, goLiveInDays, delay = 0, className = '' }) {
  const style = VERDICT_STYLE[readiness.verdict];
  return (
    <GlassCard delay={delay} className={`p-5 ${className}`}>
      <CardHeader title="Go / No-Go" subtitle={`Go-live in ${goLiveInDays} days`}>
        <span className={`rounded-full border px-2.5 py-1 text-[13px] font-semibold ${style.cls}`}>{readiness.verdict}</span>
      </CardHeader>
      <div className="glass-inset mt-3 flex items-center gap-3.5 rounded-[14px] p-2.5">
        <Ring value={readiness.score} colour={style.colour} />
        <div>
          <p className="text-[13px] font-semibold">
            {readiness.met} of {readiness.total} gates met
          </p>
          <p className="mt-0.5 text-[12px] text-muted">Release criteria agreed with the client</p>
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {gates.map((g) => (
          <li key={g.id} className="flex items-start gap-2 text-[13px]">
            {g.met ? <LuCircleCheck size={14} className="mt-px shrink-0 text-pass" /> : <LuCircleX size={14} className="mt-px shrink-0 text-fail" />}
            <span className="flex-1 text-muted">
              {g.label}
              <span className="block text-[12px] text-faint">{g.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

import { LuArrowRight } from 'react-icons/lu';
import GlassCard, { CardHeader } from './GlassCard.jsx';
import Avatar from './Avatar.jsx';
import { people } from '../data/release.js';

/** Activity text is an array where odd entries are highlighted (ids, results). */
export default function ActivityFeed({ items, delay = 0, onViewAll, className = '' }) {
  return (
    <GlassCard delay={delay} className={`p-5 ${className}`}>
      <CardHeader title="Recent activity">
        <button onClick={onViewAll} className="flex items-center gap-1 text-[13px] text-muted transition hover:text-ink">
          View defects <LuArrowRight size={12} />
        </button>
      </CardHeader>
      <ul className="mt-3.5 flex flex-col gap-1.5">
        {items.map((a, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5">
            <Avatar id={a.who} size={32} />
            <p className="flex-1 text-[13px] leading-snug text-muted">
              <b className="font-semibold text-ink">{people[a.who].name.split(' ')[0]}</b>{' '}
              {a.text.map((t, j) =>
                j % 2 ? (
                  <b key={j} className="font-semibold text-ink">
                    {t}
                  </b>
                ) : (
                  <span key={j}>{t.charAt(0).toLowerCase() + t.slice(1)}</span>
                ),
              )}
            </p>
            <small className="text-[12px] whitespace-nowrap text-faint">{a.when}</small>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

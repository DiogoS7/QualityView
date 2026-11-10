import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LuPlus, LuX } from 'react-icons/lu';
import GlassCard, { CardHeader } from './GlassCard.jsx';
import { AvatarStack } from './Avatar.jsx';

const COLOURS = ['#4f8bff', '#f5a524', '#34d399', '#8b7bff', '#f472b6'];

/** Today's agenda. The + button adds an event for this session (kept in memory, not saved). */
export default function TodayTimeline({ agenda, delay = 0, className = '' }) {
  const [events, setEvents] = useState(agenda);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ time: '17:00', title: '' });
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

  const add = (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const ev = { time: draft.time, title: draft.title.trim(), range: `${draft.time} · added by you`, color: COLOURS[events.length % COLOURS.length], people: ['DS'] };
    setEvents((xs) => [...xs, ev].sort((a, b) => a.time.localeCompare(b.time)));
    setDraft({ time: '17:00', title: '' });
    setAdding(false);
  };

  return (
    <GlassCard delay={delay} className={`flex flex-col gap-3 p-5 ${className}`}>
      <CardHeader title="Today" subtitle={today}>
        <button
          aria-label={adding ? 'Cancel' : 'Add event'}
          aria-expanded={adding}
          onClick={() => setAdding((v) => !v)}
          className="glass-inset grid size-[30px] place-items-center rounded-full transition hover:bg-white/15"
        >
          {adding ? <LuX size={14} /> : <LuPlus size={14} />}
        </button>
      </CardHeader>

      <AnimatePresence initial={false}>
        {adding && (
          <motion.form
            onSubmit={add}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-inset flex flex-col gap-2 overflow-hidden rounded-[14px] p-3"
          >
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g. Retest DEF-1042"
              className="rounded-lg bg-white/[0.06] px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:bg-white/10"
            />
            <div className="flex gap-2">
              <input
                type="time"
                value={draft.time}
                onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                className="flex-1 rounded-lg bg-white/[0.06] px-3 py-2 text-[13px] outline-none [color-scheme:dark]"
              />
              <button type="submit" disabled={!draft.title.trim()} className="rounded-lg bg-white px-4 text-[13px] font-semibold text-[#0f1524] transition disabled:opacity-40">
                Add
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <ol className="flex flex-col gap-2.5">
        {events.map((e) => (
          <li key={`${e.time}-${e.title}`} className="grid grid-cols-[38px_1fr] gap-2.5">
            <time className="pt-3 text-[12px] text-faint">{e.time}</time>
            <div className="glass-inset rounded-[14px] border-l-[3px] px-3.5 py-3 transition hover:bg-white/10" style={{ borderLeftColor: e.color }}>
              <p className="text-[13px] font-semibold">{e.title}</p>
              <p className="text-[12px] text-muted">{e.range}</p>
              <div className="mt-2">
                <AvatarStack ids={e.people} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </GlassCard>
  );
}

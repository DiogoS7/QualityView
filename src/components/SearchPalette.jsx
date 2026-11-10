import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LuSearch, LuBug, LuNetwork, LuFlaskConical, LuCornerDownLeft } from 'react-icons/lu';
import { searchAll } from '../lib/search.js';

const TYPE = {
  defect: { icon: LuBug, label: 'Defect' },
  requirement: { icon: LuNetwork, label: 'Requirement' },
  test: { icon: LuFlaskConical, label: 'Test case' },
};

/** Command-palette style search (Ctrl/⌘ + K) across defects, requirements and tests. */
export default function SearchPalette({ open, onClose, sources, onPick }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const results = useMemo(() => searchAll(query, sources, 8), [query, sources]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const pick = (r) => {
    onPick(r);
    onClose();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && results[active]) pick(results[active]);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col items-center bg-black/40 px-3.5 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-label="Search"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="glass w-full max-w-xl rounded-[22px] !bg-[#131a2b]/85 p-2"
          >
            <label className="flex items-center gap-3 px-3 py-2.5">
              <LuSearch size={18} className="text-muted" />
              <input
                ref={input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search defects, requirements and tests…"
                className="w-full bg-transparent text-[16px] outline-none placeholder:text-faint"
              />
              <kbd className="rounded-md border border-white/15 px-1.5 py-0.5 text-[12px] text-faint">Esc</kbd>
            </label>
            {query.trim() && <div className="mx-2 h-px bg-white/10" />}
            <ul className="max-h-[50vh] overflow-y-auto">
              {results.map((r, i) => {
                const { icon: Icon, label } = TYPE[r.type];
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(r)}
                      className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${i === active ? 'bg-white/10' : ''}`}
                    >
                      <span className="glass-inset grid size-8 shrink-0 place-items-center rounded-lg text-muted">
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold">
                          {r.id} <span className="font-normal text-faint">· {label}</span>
                        </span>
                        <span className="block truncate text-[13px] text-muted">{r.title}</span>
                      </span>
                      <span className="hidden text-[12px] text-faint sm:block">{r.meta}</span>
                      {i === active && <LuCornerDownLeft size={13} className="text-faint" />}
                    </button>
                  </li>
                );
              })}
              {query.trim() && !results.length && <li className="px-3 py-8 text-center text-[13px] text-muted">No matches for “{query}”.</li>}
            </ul>
            {!query.trim() && <p className="px-3 pt-1 pb-2.5 text-[13px] text-faint">Try “DEF-1042”, “REQ-104”, “limit” or “IBAN”.</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

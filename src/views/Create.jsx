import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LuWandSparkles,
  LuPlus,
  LuTrash2,
  LuArrowUp,
  LuArrowDown,
  LuSave,
  LuPlay,
  LuPencil,
  LuChevronDown,
  LuGlobe,
  LuMousePointerClick,
  LuKeyboard,
  LuListFilter,
  LuHourglass,
  LuTextCursorInput,
  LuEye,
  LuFileText,
  LuCheck,
} from 'react-icons/lu';
import GlassCard, { CardHeader } from '../components/GlassCard.jsx';
import { STEP_TYPES, userStories } from '../data/automation.js';
import { generateFromStory } from '../lib/automation.js';
import { generateCasesWithClaude, getApiKey } from '../lib/claude.js';

export const STEP_ICONS = {
  open: LuGlobe,
  click: LuMousePointerClick,
  type: LuKeyboard,
  select: LuListFilter,
  wait: LuHourglass,
  assertText: LuTextCursorInput,
  assertVisible: LuEye,
};

const TYPE_STYLE = {
  Positive: 'bg-pass/15 text-pass',
  Negative: 'bg-fail/15 text-fail',
  Boundary: 'bg-blocked/15 text-blocked',
};

const field = 'rounded-lg bg-white/[0.06] px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:bg-white/10';

function StepSummary({ step, n }) {
  const Icon = STEP_ICONS[step.type] ?? LuGlobe;
  return (
    <li className="flex items-center gap-2 text-[13px] text-muted">
      <span className="w-4 text-right text-faint">{n}</span>
      <Icon size={12} className="shrink-0 text-accent" />
      <span>
        <b className="font-semibold text-ink">{STEP_TYPES[step.type]?.label ?? step.type}</b> {step.target}
        {step.value && <span className="text-faint"> → “{step.value}”</span>}
      </span>
    </li>
  );
}

/* ---------------- Generate with AI ---------------- */

function Generator({ requirements, initialStory, onAdd }) {
  const [story, setStory] = useState(initialStory ?? userStories[0].text);
  const [storyId, setStoryId] = useState(initialStory ? null : userStories[0].id);
  const [cases, setCases] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [open, setOpen] = useState(null);
  const [reqId, setReqId] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [added, setAdded] = useState(0);
  const apiKey = getApiKey();

  useEffect(() => {
    if (initialStory) {
      setStory(initialStory);
      setStoryId(null);
      setCases([]);
    }
  }, [initialStory]);

  const generate = async () => {
    setBusy(true);
    setNote('');
    setAdded(0);
    let result = generateFromStory(story);
    if (apiKey) {
      try {
        result = await generateCasesWithClaude({ apiKey, story });
        setNote('Written by Claude');
      } catch (e) {
        setNote(`Claude unavailable (${e.message}) – used the built-in generator`);
      }
    } else {
      await new Promise((ok) => setTimeout(ok, 700));
    }
    setCases(result);
    setPicked(new Set(result.map((_, i) => i)));
    setOpen(null);
    setBusy(false);
  };

  const toggle = (i) =>
    setPicked((p) => {
      const n = new Set(p);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });

  const addPicked = () => {
    const chosen = cases.filter((_, i) => picked.has(i));
    onAdd(chosen.map((c) => ({ title: c.title, reqId: reqId || undefined, steps: c.steps, source: 'AI', story: storyId ?? undefined })));
    setAdded(chosen.length);
    setPicked(new Set());
  };

  return (
    <GlassCard lift={false} delay={0.1} className="p-5">
      <CardHeader title="Create tests with AI" subtitle="Paste a user story with its acceptance criteria and generate test cases">
        <span className={`rounded-full border px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap ${apiKey ? 'border-violet/30 bg-violet/10 text-violet' : 'border-white/15 text-muted'}`}>
          {apiKey ? 'Claude connected' : 'Built-in generator'}
        </span>
      </CardHeader>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="self-center text-[13px] text-faint">From the backlog:</span>
        {userStories.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setStory(s.text);
              setStoryId(s.id);
              setCases([]);
            }}
            className={`rounded-full border px-3 py-1.5 text-[13px] transition ${storyId === s.id ? 'border-white/30 bg-white text-[#14141c]' : 'border-white/12 text-muted hover:text-ink'}`}
          >
            {s.id}
          </button>
        ))}
      </div>

      <textarea
        value={story}
        onChange={(e) => {
          setStory(e.target.value);
          setStoryId(null);
        }}
        rows={8}
        className="glass-inset mt-3 w-full resize-y rounded-[16px] p-4 font-mono text-[13px] leading-relaxed outline-none focus:bg-white/10"
        placeholder={'As a …\nI want …\nSo that …\n\nAcceptance criteria:\n- …'}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={generate}
          disabled={busy || !story.trim()}
          className="flex items-center gap-2 rounded-full border border-[#7aa2ff]/50 bg-accent/20 px-5 py-2.5 text-[15px] font-semibold transition hover:bg-accent/30 disabled:opacity-40"
        >
          <LuWandSparkles size={16} className={busy ? 'animate-pulse' : ''} />
          {busy ? 'Generating…' : 'Generate'}
        </button>
        {note && <span className="text-[13px] text-muted">{note}</span>}
      </div>

      <AnimatePresence>
        {cases.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-muted">
                <b className="text-ink">{cases.length} test cases</b> generated · {picked.size} selected
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select value={reqId} onChange={(e) => setReqId(e.target.value)} className={`${field} [color-scheme:dark]`} aria-label="Link to requirement">
                  <option value="">No requirement link</option>
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id} · {r.title.slice(0, 36)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addPicked}
                  disabled={!picked.size}
                  className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#14141c] transition disabled:opacity-40"
                >
                  <LuPlus size={14} /> Add {picked.size} to library
                </button>
              </div>
            </div>
            {added > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-[13px] text-pass">
                <LuCheck size={13} /> {added} automated tests added to the library
              </p>
            )}
            <ul className="mt-3 flex flex-col gap-2">
              {cases.map((c, i) => (
                <li key={i} className="glass-inset rounded-[14px]">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <input type="checkbox" checked={picked.has(i)} onChange={() => toggle(i)} className="size-4 accent-[#5b86f0]" aria-label={`Select ${c.title}`} />
                    <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${TYPE_STYLE[c.type] ?? 'bg-white/10 text-muted'}`}>{c.type}</span>
                    <span className="min-w-0 flex-1 text-[13px]">{c.title}</span>
                    <span className="hidden text-[12px] text-faint sm:inline">{c.priority}</span>
                    <button onClick={() => setOpen(open === i ? null : i)} aria-label="Show steps" className="text-muted hover:text-ink">
                      <LuChevronDown size={15} className={`transition ${open === i ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {open === i && (
                    <ol className="flex flex-col gap-1 border-t border-white/10 px-3 py-2.5">
                      {c.steps.map((st, j) => (
                        <StepSummary key={j} step={st} n={j + 1} />
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

/* ---------------- No-code builder ---------------- */

const blank = () => ({ id: null, title: '', reqId: '', steps: [{ type: 'open', target: '', value: '' }], source: 'Builder' });

function Builder({ editing, requirements, onSave, onCancel }) {
  const [t, setT] = useState(editing ?? blank());
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setT(editing ?? blank());
    setSaved(false);
  }, [editing]);

  const touch = () => setSaved(false);
  const setStep = (i, patch) => touch() || setT((x) => ({ ...x, steps: x.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const move = (i, d) =>
    setT((x) => {
      const steps = [...x.steps];
      const [s] = steps.splice(i, 1);
      steps.splice(i + d, 0, s);
      return { ...x, steps };
    });
  const remove = (i) => setT((x) => ({ ...x, steps: x.steps.filter((_, j) => j !== i) }));
  const add = (type) => setT((x) => ({ ...x, steps: [...x.steps, { type, target: '', value: '' }] }));
  const valid = t.title.trim() && t.steps.length && t.steps.every((s) => s.target.trim());

  return (
    <GlassCard lift={false} delay={0.18} className="p-5">
      <CardHeader title={t.id ? `Edit ${t.id}` : 'No-code test builder'} subtitle="Build an automated test step by step – no scripting">
        {t.id && (
          <button onClick={onCancel} className="text-[13px] text-muted hover:text-ink">
            New test
          </button>
        )}
      </CardHeader>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_220px]">
        <input value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} placeholder="Test name, e.g. Saved beneficiary appears first" className={field} />
        <select value={t.reqId ?? ''} onChange={(e) => setT({ ...t, reqId: e.target.value })} className={`${field} [color-scheme:dark]`} aria-label="Requirement">
          <option value="">Link a requirement…</option>
          {requirements.map((r) => (
            <option key={r.id} value={r.id}>
              {r.id} · {r.title.slice(0, 28)}
            </option>
          ))}
        </select>
      </div>

      <ol className="mt-4 flex flex-col gap-2">
        {t.steps.map((s, i) => {
          const Icon = STEP_ICONS[s.type];
          const def = STEP_TYPES[s.type];
          return (
            <li key={i} className="glass-inset flex flex-wrap items-center gap-2 rounded-[14px] p-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent/15 text-[13px] font-bold text-[#a9c6ff]">{i + 1}</span>
              <span className="flex items-center gap-1.5">
                <Icon size={14} className="text-accent" />
                <select value={s.type} onChange={(e) => setStep(i, { type: e.target.value })} className="bg-transparent text-[13px] font-semibold outline-none [color-scheme:dark]" aria-label="Step type">
                  {Object.entries(STEP_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </span>
              <input value={s.target} onChange={(e) => setStep(i, { target: e.target.value })} placeholder={def.target} className={`${field} min-w-[140px] flex-1`} />
              {def.value && <input value={s.value} onChange={(e) => setStep(i, { value: e.target.value })} placeholder="Value" className={`${field} w-36`} />}
              <span className="ml-auto flex">
                <button disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" className="grid size-7 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-ink disabled:opacity-30">
                  <LuArrowUp size={13} />
                </button>
                <button disabled={i === t.steps.length - 1} onClick={() => move(i, 1)} aria-label="Move down" className="grid size-7 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-ink disabled:opacity-30">
                  <LuArrowDown size={13} />
                </button>
                <button onClick={() => remove(i)} aria-label="Delete step" className="grid size-7 place-items-center rounded-lg text-muted hover:bg-fail/15 hover:text-fail">
                  <LuTrash2 size={13} />
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="self-center text-[13px] text-faint">Add step:</span>
        {Object.entries(STEP_TYPES).map(([k, v]) => {
          const Icon = STEP_ICONS[k];
          return (
            <button key={k} onClick={() => add(k)} className="flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[13px] text-muted transition hover:bg-white/10 hover:text-ink">
              <Icon size={12} /> {v.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          disabled={!valid}
          onClick={() => {
            onSave({ ...t, reqId: t.reqId || undefined });
            setSaved(true);
            if (!t.id) setT(blank());
          }}
          className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#14141c] transition disabled:opacity-40"
        >
          <LuSave size={14} /> Save to library
        </button>
        {!valid && !saved && <span className="text-[13px] text-faint">Give the test a name and fill in every step's target.</span>}
        {saved && <span className="flex items-center gap-1 text-[13px] text-pass"><LuCheck size={13} /> Saved</span>}
      </div>
    </GlassCard>
  );
}

/* ---------------- Library ---------------- */

function Library({ library, onEdit, onDelete, onRun }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => library.filter((t) => !q || `${t.id} ${t.title} ${t.reqId ?? ''}`.toLowerCase().includes(q.toLowerCase())), [library, q]);
  return (
    <GlassCard lift={false} delay={0.24} className="flex flex-col p-5 xl:sticky xl:top-28 xl:max-h-[calc(100vh-140px)]">
      <CardHeader title="Test library" subtitle={`${library.length} automated tests`}>
        <button onClick={() => onRun(library.map((t) => t.id))} className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[13px] text-muted transition hover:bg-white/10 hover:text-ink">
          <LuPlay size={12} /> Run all
        </button>
      </CardHeader>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter tests" className={`${field} mt-3`} />
      <ul className="scroll-glass mt-3 flex flex-col gap-1.5 overflow-y-auto">
        {shown.map((t) => (
          <li key={t.id} className="group rounded-xl p-2.5 transition hover:bg-white/[0.06]">
            <div className="flex items-start gap-2">
              <LuFileText size={14} className="mt-0.5 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">
                  {t.id} <span className={`ml-1 rounded-full px-1.5 py-px text-[11px] font-bold ${t.source === 'AI' ? 'bg-violet/20 text-violet' : 'bg-white/10 text-muted'}`}>{t.source === 'AI' ? 'AI' : 'No-code'}</span>
                </p>
                <p className="truncate text-[13px] text-muted">{t.title}</p>
                <p className="text-[12px] text-faint">
                  {t.steps.length} steps{t.reqId ? ` · ${t.reqId}` : ''}
                </p>
              </div>
              <span className="flex opacity-60 transition group-hover:opacity-100">
                <button onClick={() => onRun([t.id])} aria-label={`Run ${t.id}`} className="grid size-7 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-ink">
                  <LuPlay size={13} />
                </button>
                <button onClick={() => onEdit(t)} aria-label={`Edit ${t.id}`} className="grid size-7 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-ink">
                  <LuPencil size={13} />
                </button>
                <button onClick={() => onDelete(t.id)} aria-label={`Delete ${t.id}`} className="grid size-7 place-items-center rounded-lg text-muted hover:bg-fail/15 hover:text-fail">
                  <LuTrash2 size={13} />
                </button>
              </span>
            </div>
          </li>
        ))}
        {!shown.length && <li className="p-4 text-center text-[13px] text-muted">No tests match.</li>}
      </ul>
    </GlassCard>
  );
}

/** Create: generate test cases from user stories, build them without code, manage the library. */
export default function Create({ auto, dispatch, requirements, initialStory, onRun }) {
  const [editing, setEditing] = useState(null);
  return (
    <div className="grid gap-[18px] xl:grid-cols-[1fr_360px]">
      <div className="flex min-w-0 flex-col gap-[18px]">
        <Generator requirements={requirements} initialStory={initialStory} onAdd={(tests) => dispatch({ type: 'addTests', tests })} />
        <div id="builder">
          <Builder
            editing={editing}
            requirements={requirements}
            onSave={(test) => {
              dispatch({ type: 'saveTest', test });
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      </div>
      <Library
        library={auto.library}
        onEdit={(t) => {
          setEditing(t);
          setTimeout(() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        }}
        onDelete={(id) => dispatch({ type: 'deleteTest', id })}
        onRun={onRun}
      />
    </div>
  );
}

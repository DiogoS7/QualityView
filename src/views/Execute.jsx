import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LuPlay,
  LuCalendarClock,
  LuMonitor,
  LuSmartphone,
  LuTablet,
  LuWrench,
  LuTrash2,
  LuCheck,
  LuX,
  LuZap,
  LuRotateCcw,
  LuChevronDown,
} from 'react-icons/lu';
import GlassCard, { CardHeader } from '../components/GlassCard.jsx';
import { DEVICES, ENVIRONMENTS } from '../data/automation.js';
import { simulateRun, jobStateAt, nextRun, formatWhen, formatSeconds, RECURRENCES } from '../lib/automation.js';

const KIND_ICON = { Desktop: LuMonitor, Mobile: LuSmartphone, Tablet: LuTablet };

const CELL = {
  queued: 'bg-white/[0.06] border-white/10',
  running: 'bg-accent/30 border-[#7aa2ff]/60 animate-pulse',
  passed: 'bg-pass/25 border-pass/50',
  healed: 'bg-violet/25 border-violet/60',
  failed: 'bg-fail/25 border-fail/60',
};
const LABEL = { queued: 'Queued', running: 'Running', passed: 'Passed', healed: 'Self-healed', failed: 'Failed' };

function Toggle({ on, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted select-none">
      <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative h-5 w-9 rounded-full transition ${on ? 'bg-accent' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      {label}
    </label>
  );
}

function Stat({ label, value, sub, tone = 'text-ink' }) {
  return (
    <div className="glass-inset rounded-[14px] p-3">
      <p className="text-[11px] text-faint">{label}</p>
      <p className={`mt-0.5 text-xl font-bold tracking-tight ${tone}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted">{sub}</p>}
    </div>
  );
}

/* ---------------- Live run ---------------- */

function RunPanel({ run, tests, devices, onDone, onClose }) {
  const [t, setT] = useState(0);
  const done = t >= run.wall;
  const logged = useRef(false);

  useEffect(() => {
    setT(0);
    logged.current = false;
    const step = run.wall / (9000 / 60); // replay the whole run in about 9 seconds
    const id = setInterval(() => setT((x) => Math.min(run.wall, x + step)), 60);
    return () => clearInterval(id);
  }, [run]);

  useEffect(() => {
    if (done && !logged.current) {
      logged.current = true;
      onDone();
    }
  }, [done, onDone]);

  const states = run.jobs.map((j) => jobStateAt(j, t));
  const finished = states.filter((s) => !['queued', 'running'].includes(s)).length;
  const live = (st) => run.jobs.filter((j, i) => states[i] === st).length;
  const healedJobs = run.jobs.filter((j, i) => states[i] === 'healed');
  const failedJobs = run.jobs.filter((j, i) => states[i] === 'failed');
  // One line per test and reason, listing the devices it failed on.
  const failureGroups = Object.values(
    failedJobs.reduce((acc, j) => {
      const k = `${j.testId}|${j.reason}`;
      (acc[k] ??= { testId: j.testId, reason: j.reason, devices: [] }).devices.push(DEVICES.find((d) => d.id === j.device)?.label);
      return acc;
    }, {}),
  );
  const byId = Object.fromEntries(run.jobs.map((j, i) => [j.id, states[i]]));

  return (
    <GlassCard lift={false} className="p-5">
      <CardHeader title={done ? 'Execution finished' : 'Executing…'} subtitle={`${run.name} · ${run.env} · ${run.workers} parallel workers${run.selfHealing ? ' · self-healing on' : ''}`}>
        <button onClick={onClose} aria-label="Close run" className="text-muted hover:text-ink">
          <LuX size={16} />
        </button>
      </CardHeader>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#6aa2ff] to-[#2f6bf0] shadow-[0_0_12px_rgba(79,139,255,0.6)] transition-[width] duration-100" style={{ width: `${(finished / run.jobs.length) * 100}%` }} />
        </div>
        <span className="text-xs text-muted tabular-nums">
          {finished}/{run.jobs.length} · {formatSeconds(t)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted">
        {['running', 'passed', 'healed', 'failed'].map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <i className={`size-2.5 rounded-sm border ${CELL[s].replace('animate-pulse', '')}`} />
            {LABEL[s]} <b className="text-ink">{live(s)}</b>
          </span>
        ))}
      </div>

      {/* Test × device grid */}
      <div className="scroll-glass mt-4 overflow-x-auto">
        <table className="text-left text-[11px]">
          <thead>
            <tr>
              <th className="pr-3 pb-2 font-medium text-faint">Test</th>
              {devices.map((d) => {
                const Icon = KIND_ICON[d.kind];
                return (
                  <th key={d.id} className="px-1 pb-2 text-center font-medium text-faint" title={`${d.label} · ${d.os}`}>
                    <Icon size={13} className="mx-auto" />
                    <span className="mt-0.5 block w-14 truncate text-[9px]">{d.label}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {tests.map((tst) => (
              <tr key={tst.id}>
                <td className="max-w-[220px] truncate py-1 pr-3 text-muted" title={tst.title}>
                  <b className="text-ink">{tst.id}</b> {tst.title}
                </td>
                {devices.map((d) => {
                  const st = byId[`${tst.id}@${d.id}`];
                  return (
                    <td key={d.id} className="px-1 py-1">
                      <div title={LABEL[st]} className={`mx-auto grid size-7 place-items-center rounded-lg border transition-colors duration-300 ${CELL[st]}`}>
                        {st === 'passed' && <LuCheck size={13} className="text-pass" />}
                        {st === 'healed' && <LuWrench size={12} className="text-violet" />}
                        {st === 'failed' && <LuX size={13} className="text-fail" />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Stat label="Pass rate" value={`${run.summary.passRate}%`} sub={`${run.summary.passed + run.summary.healed} of ${run.summary.total} jobs`} tone={run.summary.passRate >= 90 ? 'text-pass' : 'text-blocked'} />
              <Stat label="Self-healed" value={run.summary.healed} sub={run.selfHealing ? 'locators fixed automatically' : 'self-healing was off'} tone="text-violet" />
              <Stat label="Wall-clock time" value={formatSeconds(run.wall)} sub={`${formatSeconds(run.sequential)} if run one by one`} />
              <Stat label="Time saved" value={`${Math.round((1 - run.wall / run.sequential) * 100)}%`} sub={`by ${run.workers} parallel workers`} tone="text-accent" />
            </div>

            {healedJobs.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold">Self-healing log</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {healedJobs.map((j) => (
                    <li key={j.id} className="glass-inset flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-[11px]">
                      <LuWrench size={12} className="text-violet" />
                      <b>{j.testId}</b>
                      <span className="text-muted">on {DEVICES.find((d) => d.id === j.device)?.label}, step {j.heal.step}:</span>
                      <code className="rounded bg-fail/15 px-1.5 text-fail line-through">{j.heal.from}</code>
                      <span className="text-faint">→</span>
                      <code className="rounded bg-pass/15 px-1.5 text-pass">{j.heal.to}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {failedJobs.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold">Failures</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {failureGroups.map((g) => (
                    <li key={g.testId + g.reason} className="glass-inset flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-[11px]">
                      <LuX size={12} className="text-fail" />
                      <b>{g.testId}</b>
                      <span>{g.reason}</span>
                      <span className="text-faint">· {g.devices.length === run.devices.length ? 'all devices' : g.devices.join(', ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

/* ---------------- Execute view ---------------- */

/** Execute: run batteries across the remote device farm in parallel, with self-healing and schedules. */
export default function Execute({ auto, dispatch, knownDefects, initialTests }) {
  const { library, batteries, schedules, history } = auto;
  const [batteryId, setBatteryId] = useState(initialTests ? 'custom' : 'regression');
  const [custom, setCustom] = useState(new Set(initialTests ?? []));
  const [showTests, setShowTests] = useState(Boolean(initialTests));
  const [deviceIds, setDeviceIds] = useState(new Set(['chrome', 'firefox', 'pixel', 'iphone']));
  const [env, setEnv] = useState('SIT');
  const [workers, setWorkers] = useState(4);
  const [selfHealing, setSelfHealing] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [sched, setSched] = useState({ recurrence: 'weekdays', time: '02:00' });
  const [run, setRun] = useState(null);
  const [now] = useState(() => new Date());

  useEffect(() => {
    if (initialTests) {
      setBatteryId('custom');
      setCustom(new Set(initialTests));
      setShowTests(true);
    }
  }, [initialTests]);

  const battery = batteries.find((b) => b.id === batteryId);
  const selectedIds = batteryId === 'custom' ? [...custom] : battery?.tests ?? [];
  const tests = library.filter((t) => selectedIds.includes(t.id));
  const devices = DEVICES.filter((d) => deviceIds.has(d.id));
  const preview = useMemo(
    () => (tests.length && devices.length ? simulateRun({ tests, devices, workers, selfHealing, seed: 1, knownDefects }) : null),
    [tests, devices, workers, selfHealing, knownDefects],
  );

  const toggleDevice = (id) =>
    setDeviceIds((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleTest = (id) => {
    const base = new Set(batteryId === 'custom' ? custom : battery?.tests ?? []);
    base.has(id) ? base.delete(id) : base.add(id);
    setBatteryId('custom');
    setCustom(base);
  };

  const start = () => {
    const seed = Date.now() % 100000;
    const r = simulateRun({ tests, devices, workers, selfHealing, seed, knownDefects });
    setRun({ ...r, tests, devices, name: battery?.name ?? `Custom selection (${tests.length} tests)`, env, workers, selfHealing, at: new Date().toISOString() });
    setTimeout(() => document.getElementById('run-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const saveSchedule = () => {
    dispatch({ type: 'addSchedule', schedule: { battery: batteryId === 'custom' ? 'regression' : batteryId, devices: [...deviceIds], env, selfHealing, ...sched } });
    setScheduling(false);
  };

  const batteryName = (id) => batteries.find((b) => b.id === id)?.name ?? id;
  const canRun = tests.length > 0 && devices.length > 0;

  return (
    <div className="grid gap-[18px] xl:grid-cols-[1fr_360px]">
      <div className="flex min-w-0 flex-col gap-[18px]">
        <GlassCard lift={false} delay={0.1} className="p-5">
          <CardHeader title="Execute tests at scale" subtitle="Pick a battery, the remote devices and how many run in parallel" />

          {/* Battery */}
          <p className="mt-5 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">1 · Test battery</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {batteries.map((b) => (
              <button
                key={b.id}
                onClick={() => setBatteryId(b.id)}
                className={`rounded-full border px-3.5 py-1.5 text-xs transition ${batteryId === b.id ? 'border-white/30 bg-white text-[#14141c]' : 'border-white/12 text-muted hover:text-ink'}`}
              >
                {b.name} <span className="opacity-60">· {b.tests.length}</span>
              </button>
            ))}
            <button
              onClick={() => {
                setCustom(new Set(selectedIds));
                setBatteryId('custom');
                setShowTests(true);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-xs transition ${batteryId === 'custom' ? 'border-white/30 bg-white text-[#14141c]' : 'border-white/12 text-muted hover:text-ink'}`}
            >
              Custom selection {batteryId === 'custom' && <span className="opacity-60">· {custom.size}</span>}
            </button>
          </div>
          <button onClick={() => setShowTests((v) => !v)} className="mt-2 flex items-center gap-1 text-[11px] text-muted hover:text-ink">
            <LuChevronDown size={13} className={`transition ${showTests ? 'rotate-180' : ''}`} /> {tests.length} tests selected
          </button>
          {showTests && (
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {library.map((t) => (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-white/[0.05]">
                    <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleTest(t.id)} className="size-3.5 accent-[#5b86f0]" />
                    <b>{t.id}</b>
                    <span className="truncate text-muted">{t.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {/* Devices */}
          <p className="mt-5 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">2 · Remote devices</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DEVICES.map((d) => {
              const on = deviceIds.has(d.id);
              const Icon = KIND_ICON[d.kind];
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDevice(d.id)}
                  aria-pressed={on}
                  className={`flex items-center gap-2.5 rounded-[14px] border p-2.5 text-left transition ${on ? 'border-[#7aa2ff]/50 bg-accent/15 shadow-[0_0_14px_rgba(91,134,240,0.25)]' : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'}`}
                >
                  <Icon size={18} className={on ? 'text-[#a9c6ff]' : 'text-muted'} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{d.label}</span>
                    <span className="flex items-center gap-1 text-[10px] text-faint">
                      <i className="size-1.5 rounded-full bg-pass" /> {d.os}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Settings */}
          <p className="mt-5 text-[11px] font-semibold tracking-[0.14em] text-faint uppercase">3 · Settings</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="glass-inset flex rounded-full p-1">
              {ENVIRONMENTS.map((e) => (
                <button key={e} onClick={() => setEnv(e)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${env === e ? 'bg-white text-[#14141c]' : 'text-faint hover:text-ink'}`}>
                  {e}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-3 text-xs text-muted">
              Parallel workers
              <input type="range" min={1} max={16} value={workers} onChange={(e) => setWorkers(Number(e.target.value))} className="w-32 accent-[#5b86f0]" />
              <b className="w-5 text-ink tabular-nums">{workers}</b>
            </label>
            <Toggle on={selfHealing} onChange={setSelfHealing} label="Intelligent self-healing" />
          </div>

          {/* Estimate + actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <button
              onClick={start}
              disabled={!canRun}
              className="flex items-center gap-2 rounded-full border border-[#7aa2ff]/50 bg-accent/20 px-5 py-2.5 text-sm font-semibold shadow-[0_0_18px_rgba(91,134,240,0.35)] transition hover:bg-accent/30 disabled:opacity-40"
            >
              <LuPlay size={15} /> Run now
            </button>
            <button
              onClick={() => setScheduling((v) => !v)}
              disabled={!canRun}
              className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-xs font-semibold text-muted transition hover:bg-white/10 hover:text-ink disabled:opacity-40"
            >
              <LuCalendarClock size={14} /> Schedule
            </button>
            {preview && (
              <span className="text-[11px] text-muted">
                <b className="text-ink">{preview.jobs.length} jobs</b> ({tests.length} tests × {devices.length} devices) · about <b className="text-ink">{formatSeconds(preview.wall)}</b> with {workers}{' '}
                workers instead of {formatSeconds(preview.sequential)}
              </span>
            )}
            {!canRun && <span className="text-[11px] text-faint">Select at least one test and one device.</span>}
          </div>

          <AnimatePresence initial={false}>
            {scheduling && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="glass-inset mt-3 flex flex-wrap items-center gap-3 rounded-[14px] p-3 text-xs">
                  <select value={sched.recurrence} onChange={(e) => setSched({ ...sched, recurrence: e.target.value })} className="rounded-lg bg-white/[0.06] px-3 py-2 outline-none [color-scheme:dark]">
                    {Object.entries(RECURRENCES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <span className="text-muted">at</span>
                  <input type="time" value={sched.time} onChange={(e) => setSched({ ...sched, time: e.target.value })} className="rounded-lg bg-white/[0.06] px-3 py-2 outline-none [color-scheme:dark]" />
                  <span className="text-muted">
                    on {env}, {devices.length} devices
                  </span>
                  <button onClick={saveSchedule} className="ml-auto rounded-full bg-white px-4 py-1.5 font-semibold text-[#14141c]">
                    Save schedule
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        <div id="run-panel">
          {run && (
            <RunPanel
              run={run}
              tests={run.tests}
              devices={run.devices}
              onClose={() => setRun(null)}
              onDone={() =>
                dispatch({
                  type: 'logRun',
                  run: { at: run.at, name: run.name, env: run.env, jobs: run.summary.total, passRate: run.summary.passRate, healed: run.summary.healed, failed: run.summary.failed, wall: run.wall },
                })
              }
            />
          )}
        </div>
      </div>

      {/* Side column */}
      <div className="flex flex-col gap-[18px]">
        <GlassCard lift={false} delay={0.18} className="p-5">
          <CardHeader title="Scheduled executions" subtitle={`${schedules.length} active`} />
          <ul className="mt-3 flex flex-col gap-2">
            {schedules.map((s) => (
              <li key={s.id} className="glass-inset group rounded-[14px] p-3">
                <div className="flex items-start gap-2">
                  <LuCalendarClock size={15} className="mt-0.5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{batteryName(s.battery)}</p>
                    <p className="text-[11px] text-muted">
                      {RECURRENCES[s.recurrence]} at {s.time} · {s.env} · {s.devices.length} devices
                    </p>
                    <p className="mt-1 text-[10px] text-faint">Next run: {formatWhen(nextRun(s, now), now)}</p>
                  </div>
                  <button onClick={() => dispatch({ type: 'deleteSchedule', id: s.id })} aria-label="Delete schedule" className="grid size-7 place-items-center rounded-lg text-muted opacity-60 hover:bg-fail/15 hover:text-fail group-hover:opacity-100">
                    <LuTrash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
            {!schedules.length && <li className="p-3 text-center text-xs text-muted">Nothing scheduled.</li>}
          </ul>
        </GlassCard>

        <GlassCard lift={false} delay={0.24} className="p-5">
          <CardHeader title="Run history" subtitle="Runs started from this browser">
            {history.length > 0 && (
              <button onClick={() => dispatch({ type: 'reset' })} title="Reset demo data" className="flex items-center gap-1 text-[11px] text-muted hover:text-ink">
                <LuRotateCcw size={12} /> Reset demo
              </button>
            )}
          </CardHeader>
          <ul className="mt-3 flex flex-col gap-1.5">
            {history.map((h, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl p-2 text-[11px] hover:bg-white/[0.05]">
                <LuZap size={13} className={h.failed ? 'text-blocked' : 'text-pass'} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-xs">{h.name}</b>
                  <span className="text-faint">
                    {new Date(h.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {h.env} · {h.jobs} jobs · {formatSeconds(h.wall)}
                  </span>
                </span>
                <span className="text-right">
                  <b className={h.passRate >= 90 ? 'text-pass' : 'text-blocked'}>{h.passRate}%</b>
                  {h.healed > 0 && <span className="block text-violet">{h.healed} healed</span>}
                </span>
              </li>
            ))}
            {!history.length && <li className="p-3 text-center text-xs text-muted">No runs yet – press Run now.</li>}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}

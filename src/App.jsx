import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuDownload } from 'react-icons/lu';
import Scene from './components/Scene.jsx';
import TopBar, { TABS } from './components/TopBar.jsx';
import SideDock from './components/SideDock.jsx';
import Overview from './views/Overview.jsx';
import Defects from './views/Defects.jsx';
import Traceability from './views/Traceability.jsx';
import TestRuns from './views/TestRuns.jsx';
import Create from './views/Create.jsx';
import Execute from './views/Execute.jsx';
import useAutomation from './lib/useAutomation.js';
import { userStories } from './data/automation.js';
import SearchPalette from './components/SearchPalette.jsx';
import ScopePicker from './components/ScopePicker.jsx';
import QaAgent from './components/QaAgent.jsx';
import { release, scopes, defects, requirements, manualGates, testCases, people, agenda } from './data/release.js';
import {
  summariseExecution,
  passRate,
  openBySeverity,
  traceability,
  evaluateGates,
  readinessVerdict,
  filterDefects,
  requirementStatus,
  greeting,
  testRunRows,
  isOpen,
} from './lib/metrics.js';
import { toCsv, downloadCsv } from './lib/csv.js';

const RUN_ROWS = testRunRows(requirements, testCases);
const ALERTS = defects.filter((d) => isOpen(d) && ['Critical', 'High'].includes(d.severity));
const SEARCH_SOURCES = { defects, requirements, runs: RUN_ROWS };
// Tests linked to a requirement with an open Critical or High defect fail with that defect.
const KNOWN_DEFECTS = Object.fromEntries(ALERTS.map((d) => [d.reqId, d.id]));
const VIEW_IDS = TABS.map((t) => t.id);
const DEFAULT_FILTERS = { query: '', severity: 'All', status: 'All' };

/** Client badge: a fictional bank monogram, the client name and the programme. */
function ClientBadge() {
  return (
    <div className="glass inline-flex max-w-full items-center gap-2.5 rounded-full py-1 pr-4 pl-1">
      <span
        className="grid size-7 shrink-0 place-items-center rounded-full text-[14px] font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
        style={{ background: 'linear-gradient(135deg, #2dd4bf 0%, #0e7490 100%)' }}
        aria-hidden="true"
      >
        M
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink">{release.client}</span>
      <span className="hidden h-4 w-px bg-white/20 sm:block" />
      <span className="hidden truncate text-[13px] text-muted sm:inline">{release.programme}</span>
    </div>
  );
}

const tabFromHash = () => {
  const h = window.location.hash.slice(1);
  return VIEW_IDS.includes(h) ? h : 'overview';
};

export default function App() {
  const [tab, setTab] = useState(tabFromHash);
  const [scopeKey, setScopeKey] = useState('sprint15');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [focus, setFocus] = useState({ req: null, test: null });
  const [searchOpen, setSearchOpen] = useState(false);
  const [auto, dispatch] = useAutomation();
  const [createStory, setCreateStory] = useState(null);
  const [executeTests, setExecuteTests] = useState(null);
  const [dismissed, setDismissed] = useState([]);
  const covered = new Set(auto.library.map((t) => t.story).filter(Boolean));
  const openStories = userStories.filter((s) => !dismissed.includes(s.id) && !covered.has(s.id));

  // Ctrl/⌘ + K opens search from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Keep the view in the URL hash so a view can be bookmarked or shared.
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (id, filterPatch, { scroll = true } = {}) => {
    if (filterPatch) setFilters({ ...DEFAULT_FILTERS, status: 'Open', ...filterPatch });
    if (id !== 'traceability') setFocus((f) => ({ ...f, req: null }));
    if (id !== 'runs') setFocus((f) => ({ ...f, test: null }));
    window.location.hash = id === 'overview' ? '' : id;
    setTab(id);
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDefect = (id) => {
    setFilters(DEFAULT_FILTERS);
    setSelectedDefect(id);
    navigate('defects', null, { scroll: false });
  };
  const viewAlerts = () => {
    setSelectedDefect(null);
    navigate('defects', { severity: ['Critical', 'High'] });
  };
  const openRequirement = (id) => {
    navigate('traceability', null, { scroll: false });
    setFocus({ req: id, test: null });
  };
  const openTest = (id) => {
    navigate('runs');
    setFocus({ req: null, test: id });
  };
  // The QA Agent reads the same data the dashboard shows, including the selected period.
  const agentContext = useMemo(
    () => ({ release, scopes, scopeKey, defects, requirements, runs: RUN_ROWS, people, agenda, manualGates }),
    [scopeKey],
  );
  const onAgentAction = (a) => {
    if (a.scope) setScopeKey(a.scope);
    if (a.view === 'defects' && a.id) openDefect(a.id);
    else if (a.view === 'traceability' && a.id) openRequirement(a.id);
    else if (a.view === 'runs' && a.id) openTest(a.id);
    else navigate(a.view);
  };

  const quickAction = (id) => {
    if (id === 'create') {
      navigate('create');
      setTimeout(() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
    } else if (id === 'generate') navigate('create');
    else navigate('execute');
  };
  const generateFor = (story) => {
    setCreateStory(story.text);
    navigate('create');
  };
  const runTests = (ids) => {
    setExecuteTests([...ids]);
    navigate('execute');
  };

  const onSearchPick = (r) => {
    if (r.type === 'defect') openDefect(r.id);
    else if (r.type === 'requirement') openRequirement(r.id);
    else openTest(r.id);
  };

  const scope = scopes[scopeKey];
  const m = useMemo(() => {
    const execution = summariseExecution(scope.series);
    const severity = openBySeverity(defects);
    const gates = evaluateGates({ execution, planned: scope.planned, defects, requirements, manualGates });
    return {
      execution,
      rate: passRate(execution),
      severity,
      openTotal: Object.values(severity).reduce((a, b) => a + b, 0),
      trace: traceability(requirements),
      gates,
      readiness: readinessVerdict(gates),
    };
  }, [scope]);

  const exportCsv = () => {
    if (tab === 'defects') {
      downloadCsv('qualityview-defects.csv', toCsv(filterDefects(defects, filters), ['id', 'title', 'severity', 'status', 'module', 'owner', 'ageDays', 'reqId']));
    } else if (tab === 'create') {
      downloadCsv('qualityview-test-library.csv', toCsv(auto.library.map((t) => ({ ...t, steps: t.steps.length })), ['id', 'title', 'reqId', 'source', 'steps']));
    } else if (tab === 'execute') {
      downloadCsv('qualityview-run-history.csv', toCsv(auto.history, ['at', 'name', 'env', 'jobs', 'passRate', 'healed', 'failed', 'wall']));
    } else if (tab === 'runs') {
      downloadCsv('qualityview-test-runs.csv', toCsv(RUN_ROWS, ['id', 'title', 'reqId', 'suite', 'tester', 'lastRun', 'durationSec', 'status']));
    } else if (tab === 'traceability') {
      const rows = requirements.map((r) => ({ ...r, status: requirementStatus(r), tests: r.tests.map((t) => `${t.id}:${t.status}`).join(' ') }));
      downloadCsv('qualityview-traceability.csv', toCsv(rows, ['id', 'title', 'priority', 'tests', 'status']));
    } else {
      downloadCsv(`qualityview-execution-${scopeKey}.csv`, toCsv(scope.series, ['label', 'passed', 'failed', 'blocked']));
    }
  };

  const titles = {
    overview: `${greeting()}, Diogo`,
    create: 'Create',
    execute: 'Execute',
    runs: 'Test runs',
    defects: 'Defects',
    traceability: 'Traceability',
  };

  return (
    <>
      <Scene />
      <div className="relative z-10 mx-auto min-h-full max-w-[1680px] px-3.5 pt-3 pb-24 sm:px-7 md:pb-8">
        <TopBar tab={tab} onTab={navigate} alerts={ALERTS} onOpenDefect={openDefect} onViewAlerts={viewAlerts} onOpenSearch={() => setSearchOpen(true)} />

        <div className="grid gap-6 md:grid-cols-[56px_1fr]">
          <SideDock tab={tab} onTab={navigate} onOpenSearch={() => setSearchOpen(true)} />

          <main className="min-w-0">
            <motion.section
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-5 flex flex-wrap items-end justify-between gap-4"
            >
              <div>
                <ClientBadge />
                <h1 className="mt-3 text-[22px] font-semibold tracking-tight sm:text-[26px]">{titles[tab]}</h1>
                <p className="mt-1 text-[14px] text-muted">
                  Release {release.name} — go-live in {release.goLiveInDays} days
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                {tab === 'overview' && <ScopePicker value={scopeKey} onChange={setScopeKey} />}
                <button onClick={exportCsv} className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition hover:bg-white/15">
                  <LuDownload size={14} /> Export
                </button>
              </div>
            </motion.section>

            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {tab === 'overview' && (
                  <Overview
                    scopeKey={scopeKey}
                    scope={scope}
                    m={m}
                    onNavigate={navigate}
                    onQuickAction={quickAction}
                    stories={openStories}
                    onGenerate={generateFor}
                    onDismiss={(id) => setDismissed((d) => [...d, id])}
                  />
                )}
                {tab === 'create' && <Create auto={auto} dispatch={dispatch} requirements={requirements} initialStory={createStory} onRun={runTests} />}
                {tab === 'execute' && <Execute auto={auto} dispatch={dispatch} knownDefects={KNOWN_DEFECTS} initialTests={executeTests} />}
                {tab === 'runs' && <TestRuns key={focus.test ?? 'all'} rows={RUN_ROWS} highlightId={focus.test} onOpenRequirement={openRequirement} />}
                {tab === 'defects' && (
                  <Defects
                    defects={defects}
                    filters={filters}
                    onFilters={setFilters}
                    selectedId={selectedDefect}
                    onSelect={setSelectedDefect}
                    onOpenRequirement={openRequirement}
                  />
                )}
                {tab === 'traceability' && <Traceability requirements={requirements} trace={m.trace} highlightId={focus.req} onOpenTest={openTest} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <QaAgent context={agentContext} onAction={onAgentAction} />
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} sources={SEARCH_SOURCES} onPick={onSearchPick} />
    </>
  );
}

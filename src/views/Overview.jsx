import { LuFlaskConical, LuCircleCheck, LuBug, LuNetwork } from 'react-icons/lu';
import StatsCard from '../components/StatsCard.jsx';
import ExecutionChart from '../components/ExecutionChart.jsx';
import TodayTimeline from '../components/TodayTimeline.jsx';
import ActivityFeed from '../components/ActivityFeed.jsx';
import SeverityCard from '../components/SeverityCard.jsx';
import ReadinessCard from '../components/ReadinessCard.jsx';
import QuickActions from '../components/QuickActions.jsx';
import SmartAlerts from '../components/SmartAlerts.jsx';
import { agenda, activity, sparklines, release } from '../data/release.js';
import { delta } from '../lib/metrics.js';

export default function Overview({ scopeKey, scope, m, onNavigate, onQuickAction, stories, onGenerate, onDismiss }) {
  const prev = scope.previous;
  const stats = [
    {
      title: 'Tests executed',
      value: `${m.execution.executed} / ${scope.planned}`,
      change: delta(m.execution.executed, prev.executed),
      icon: LuFlaskConical,
      tint: '#f5a524',
      points: sparklines.executed,
      onOpen: () => onNavigate('runs'),
    },
    {
      title: 'Pass rate',
      value: `${m.rate}%`,
      change: delta(m.rate, prev.passRate),
      unit: 'pp',
      icon: LuCircleCheck,
      tint: '#4ade80',
      points: sparklines.passRate,
      onOpen: () => onNavigate('runs'),
    },
    {
      title: 'Open defects',
      value: m.openTotal,
      change: delta(m.openTotal, prev.openDefects, { higherIsBetter: false }),
      icon: LuBug,
      tint: '#f87171',
      points: sparklines.defects,
      onOpen: () => onNavigate('defects'),
    },
    {
      title: 'Requirement coverage',
      value: `${m.trace.coverage}%`,
      change: delta(m.trace.coverage, prev.coverage),
      unit: 'pp',
      icon: LuNetwork,
      tint: '#8b7bff',
      points: sparklines.coverage,
      onOpen: () => onNavigate('traceability'),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-[18px] xl:grid-cols-4">
      {stats.map((s, i) => (
        <StatsCard key={s.title} {...s} delay={0.2 + i * 0.07} />
      ))}
      <QuickActions onAction={onQuickAction} delay={0.42} className="col-span-2" />
      <SmartAlerts stories={stories} onGenerate={onGenerate} onDismiss={onDismiss} delay={0.46} className="col-span-2" />
      <ExecutionChart scopeKey={scopeKey} scope={scope} rateChange={delta(m.rate, prev.passRate)} delay={0.45} className="col-span-2 xl:col-span-3" />
      <TodayTimeline agenda={agenda} delay={0.55} className="col-span-2 xl:col-span-1" />
      <ActivityFeed items={activity} delay={0.65} onViewAll={() => onNavigate('defects')} className="col-span-2" />
      <SeverityCard counts={m.severity} delay={0.72} onSelect={(s) => onNavigate('defects', { severity: s })} className="col-span-2 sm:col-span-1" />
      <ReadinessCard gates={m.gates} readiness={m.readiness} goLiveInDays={release.goLiveInDays} delay={0.8} className="col-span-2 sm:col-span-1" />
    </div>
  );
}

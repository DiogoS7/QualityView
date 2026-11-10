import { useState } from 'react';
import {
  LuHouse,
  LuFlaskConical,
  LuBug,
  LuNetwork,
  LuMail,
  LuBell,
  LuSearch,
  LuGithub,
  LuLinkedin,
  LuGlobe,
  LuCode,
  LuChevronRight,
} from 'react-icons/lu';
import Avatar from './Avatar.jsx';
import LogoMark from './LogoMark.jsx';
import Popover, { PopoverHeader } from './Popover.jsx';
import { SEVERITY_COLOURS } from './SeverityCard.jsx';
import { messages as initialMessages, people, profileLinks } from '../data/release.js';

export const TABS = [
  { id: 'overview', label: 'Overview', icon: LuHouse },
  { id: 'runs', label: 'Test runs', icon: LuFlaskConical },
  { id: 'defects', label: 'Defects', icon: LuBug },
  { id: 'traceability', label: 'Traceability', icon: LuNetwork },
];

function IconButton({ label, onClick, active, children, className = '' }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      aria-expanded={active}
      className={`relative grid size-10 place-items-center rounded-full border transition hover:bg-white/10 ${active ? 'border-white/25 bg-white/15' : 'border-white/10 bg-white/[0.04]'} ${className}`}
    >
      {children}
    </button>
  );
}

function Badge({ n }) {
  if (!n) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-to-b from-[#ff6b6b] to-[#e5383b] px-1 text-[9px] leading-none font-bold text-white shadow-[0_2px_8px_rgba(229,56,59,0.55),inset_0_1px_0_rgba(255,255,255,0.35)]">
      {n}
    </span>
  );
}

function MessagesMenu() {
  const [items, setItems] = useState(initialMessages);
  const unread = items.filter((m) => m.unread).length;
  const markAll = () => setItems((xs) => xs.map((m) => ({ ...m, unread: false })));
  return (
    <Popover
      width={340}
      trigger={({ open, toggle }) => (
        <IconButton label="Messages" onClick={toggle} active={open} className="hidden md:grid">
          <LuMail size={17} className="opacity-85" />
          <Badge n={unread} />
        </IconButton>
      )}
    >
      <PopoverHeader
        title="Messages"
        action={
          unread > 0 && (
            <button onClick={markAll} className="text-[11px] text-muted hover:text-ink">
              Mark all as read
            </button>
          )
        }
      />
      <ul className="flex flex-col gap-1">
        {items.map((m, i) => (
          <li key={i}>
            <button
              onClick={() => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, unread: false } : x)))}
              className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition hover:bg-white/[0.07]"
            >
              <Avatar id={m.from} size={32} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 text-xs">
                  <b className="font-semibold">{people[m.from].name}</b>
                  <span className="text-[10px] text-faint">{m.when}</span>
                </span>
                <span className={`mt-0.5 block text-xs leading-snug ${m.unread ? 'text-ink' : 'text-muted'}`}>{m.text}</span>
              </span>
              {m.unread && <i className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />}
            </button>
          </li>
        ))}
      </ul>
    </Popover>
  );
}

function NotificationsMenu({ alerts, onOpenDefect, onViewAlerts }) {
  return (
    <Popover
      width={360}
      trigger={({ open, toggle }) => (
        <IconButton label={`${alerts.length} alerts`} onClick={toggle} active={open}>
          <LuBell size={17} className="opacity-85" />
          <Badge n={alerts.length} />
        </IconButton>
      )}
    >
      {(close) => (
        <>
          <PopoverHeader
            title="Needs attention"
            action={
              <button
                onClick={() => {
                  onViewAlerts();
                  close();
                }}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted transition hover:bg-white/10 hover:text-ink"
              >
                Open Critical &amp; High <LuChevronRight size={12} />
              </button>
            }
          />
          <ul className="flex flex-col gap-1">
            {alerts.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => {
                    onOpenDefect(d.id);
                    close();
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-white/[0.07]"
                >
                  <i className="size-2.5 shrink-0 rounded-full" style={{ background: SEVERITY_COLOURS[d.severity], boxShadow: `0 0 8px ${SEVERITY_COLOURS[d.severity]}` }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">
                      {d.id} <span className="font-normal text-muted">· {d.severity} · {d.status}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">{d.title}</span>
                  </span>
                  <LuChevronRight size={14} className="text-faint group-hover:text-ink" />
                </button>
              </li>
            ))}
            {!alerts.length && <li className="p-4 text-center text-xs text-muted">Nothing urgent. Nice.</li>}
          </ul>
        </>
      )}
    </Popover>
  );
}

function ProfileMenu() {
  const me = people.DS;
  const links = [
    { href: profileLinks.repo, label: 'QualityView source code', icon: LuCode },
    { href: profileLinks.github, label: 'GitHub', icon: LuGithub },
    { href: profileLinks.linkedin, label: 'LinkedIn', icon: LuLinkedin },
    { href: profileLinks.portfolio, label: 'Portfolio', icon: LuGlobe },
  ];
  return (
    <Popover
      width={280}
      trigger={({ toggle }) => (
        <button onClick={toggle} aria-label="Profile" className="rounded-full transition hover:brightness-110">
          <Avatar id="DS" size={40} online ring={false} className="shadow-[0_0_0_1.5px_rgba(255,255,255,0.3),0_4px_12px_rgba(0,0,0,0.25)]" />
        </button>
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <Avatar id="DS" size={44} online ring={false} />
        <div>
          <p className="text-sm font-semibold">{me.name}</p>
          <p className="text-xs text-muted">{me.role}</p>
        </div>
      </div>
      <div className="mx-2 my-1 h-px bg-white/10" />
      <ul className="flex flex-col gap-0.5">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={label}>
            <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-muted transition hover:bg-white/[0.07] hover:text-ink">
              <Icon size={15} />
              {label}
            </a>
          </li>
        ))}
      </ul>
    </Popover>
  );
}

export default function TopBar({ tab, onTab, alerts, onOpenDefect, onViewAlerts, onOpenSearch }) {
  return (
    <header className="sticky top-3 z-30 mb-7">
      <div className="glass flex items-center justify-between gap-3 rounded-[22px] !bg-[#131a2b]/55 py-2 pr-2 pl-3 sm:pl-4">
      <button onClick={() => onTab('overview')} className="flex items-center gap-2.5" aria-label="QualityView home">
        <LogoMark size={38} />
        <span className="hidden text-lg font-bold tracking-tight sm:inline">QualityView</span>
      </button>

      <nav className="flex gap-1.5 sm:gap-2" aria-label="Views">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-full border px-3 py-2.5 text-[13px] font-medium transition lg:px-[18px] ${
                active ? 'border-[#7aa2ff]/50 bg-white/10 text-ink shadow-[0_0_14px_rgba(91,134,240,0.4),inset_0_1px_0_rgba(255,255,255,0.18)]' : 'border-transparent text-muted hover:bg-white/[0.07] hover:text-ink'
              }`}
            >
              <Icon size={15} />
              <span className="hidden lg:inline">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 sm:gap-2.5">
        <MessagesMenu />
        <NotificationsMenu alerts={alerts} onOpenDefect={onOpenDefect} onViewAlerts={onViewAlerts} />
        <IconButton label="Search (Ctrl+K)" onClick={onOpenSearch} className="hidden md:grid">
          <LuSearch size={17} className="opacity-85" />
        </IconButton>
        <ProfileMenu />
      </div>
      </div>
    </header>
  );
}

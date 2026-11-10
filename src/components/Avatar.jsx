import { people } from '../data/release.js';

/** Initials avatar with a gradient per person; `online` adds a presence dot. */
export default function Avatar({ id, size = 22, online = false, ring = true, className = '' }) {
  const person = people[id];
  const [from, to] = person?.hue ?? ['#9ca3af', '#4b5563'];
  return (
    <span
      title={person ? `${person.name} · ${person.role}` : id}
      className={`relative inline-grid shrink-0 place-items-center rounded-full font-bold text-white ${
        ring ? 'shadow-[0_0_0_1.5px_rgba(255,255,255,0.28),0_2px_6px_rgba(0,0,0,0.25)]' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, size * 0.36),
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {id}
      {online && (
        <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-pass shadow-[0_0_0_1.5px_rgba(255,255,255,0.35)]" />
      )}
    </span>
  );
}

export function AvatarStack({ ids, size = 22 }) {
  return (
    <div className="flex">
      {ids.map((id, i) => (
        <Avatar key={id} id={id} size={size} className={i ? '-ml-1.5' : ''} />
      ))}
    </div>
  );
}

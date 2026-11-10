import { useId } from 'react';
import { sparkPath } from '../lib/metrics.js';

export default function Sparkline({ points, color, width = 110, height = 44, className = '' }) {
  const id = useId();
  const d = sparkPath(points, width, height);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={`overflow-visible ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${width},${height} L0,${height}Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

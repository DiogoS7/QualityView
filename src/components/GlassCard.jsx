import { motion, useReducedMotion } from 'framer-motion';

/** Frosted card that fades up on mount and lifts slightly on hover. */
export default function GlassCard({ delay = 0, lift = true, className = '', children, ...rest }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] }}
      whileHover={lift && !reduce ? { y: -5 } : undefined}
      className={`glass rounded-[22px] transition-colors duration-300 hover:border-white/25 ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[16px] font-semibold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

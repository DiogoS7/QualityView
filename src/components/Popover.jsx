import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Glass dropdown anchored to its trigger. Closes on outside click, Escape,
 * or when the content calls `close()`.
 */
export default function Popover({ trigger, children, width = 320, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            style={{ width: `min(${width}px, calc(100vw - 28px))` }}
            className={`glass absolute top-[52px] z-50 rounded-[20px] p-2 !bg-[#131a2b] max-md:!fixed max-md:!inset-x-0 max-md:!top-[62px] max-md:!w-auto ${align === 'right' ? 'right-0' : 'left-0'}`}
          >
            {typeof children === 'function' ? children(close) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PopoverHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between px-3 pt-2 pb-2.5">
      <p className="text-[15px] font-semibold">{title}</p>
      {action}
    </div>
  );
}

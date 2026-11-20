import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, Bell, LogIn } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const countVariants = {
  enter: (direction) => ({ y: direction * 8, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (direction) => ({ y: direction * -8, opacity: 0 }),
};

export default function AppHeader({ onNotificationClick, currentUser, onNavigateToLogin, notificationCount = 0 }) {
  const [swingKey, setSwingKey] = useState(0);
  const previousCount = useRef(notificationCount);
  const reducedMotion = useReducedMotion();
  const count = Math.max(0, Number(notificationCount) || 0);
  const displayCount = count > 99 ? '99+' : String(count);
  const direction = count >= previousCount.current ? 1 : -1;

  useEffect(() => {
    if (count > previousCount.current) setSwingKey((key) => key + 1);
    previousCount.current = count;
  }, [count]);

  const handleNotificationClick = () => {
    setSwingKey((key) => key + 1);
    onNotificationClick?.();
  };
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="ml-0.5 flex items-center gap-1.5">
            <div className="flex items-center justify-center text-spu-pink"><GraduationCap size={22} className="brand-cap-icon" strokeWidth={2.5} /></div>
            <span className="text-[1.05rem] font-bold tracking-[-0.3px] text-spu-pink">SPU Market</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
        {!currentUser && (
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-spu-pink-border bg-spu-pink-light px-2.5 py-1 text-[0.72rem] font-bold text-spu-pink transition-all duration-200 hover:-translate-y-px hover:border-spu-pink hover:bg-spu-pink hover:text-white" onClick={onNavigateToLogin} title="เข้าสู่ระบบ">
            <LogIn size={13} strokeWidth={2.4} /><span>เข้าสู่ระบบ</span>
          </button>
        )}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition-colors duration-200 hover:bg-slate-50 hover:text-spu-pink"
          onClick={handleNotificationClick}
          title="การแจ้งเตือน"
          aria-label={count > 0 ? `การแจ้งเตือน มี ${count} รายการที่ยังไม่อ่าน` : 'การแจ้งเตือน'}
          aria-haspopup="dialog"
        >
          <motion.span
            key={swingKey}
            initial={{ rotate: 0 }}
            animate={reducedMotion || swingKey === 0 ? { rotate: 0 } : { rotate: [0, 15, -12, 8, -5, 3, -1.5, 0] }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.9, times: [0, 0.1, 0.26, 0.42, 0.58, 0.74, 0.88, 1], ease: 'easeInOut' }}
            style={{ transformOrigin: 'top center', display: 'inline-flex' }}
          >
            <Bell size={18} strokeWidth={2} />
          </motion.span>
          <AnimatePresence initial={false}>
            {count > 0 ? <motion.span
              key="notification-count"
              className="absolute top-px -right-0.5 z-[1] flex h-4 min-w-4 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-white bg-spu-pink px-[3px] text-[9px] font-extrabold leading-none text-white"
              aria-hidden="true"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 22 }}
            >
              <span className="inline-flex overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                  <motion.span
                    key={displayCount}
                    className="inline-flex tabular-nums"
                    custom={direction}
                    variants={countVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                  >{displayCount}</motion.span>
                </AnimatePresence>
              </span>
            </motion.span> : currentUser ? <motion.span
              key="notification-dot"
              className="absolute top-[7px] right-[7px] h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-spu-pink"
              aria-hidden="true"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 22 }}
            /> : null}
          </AnimatePresence>
        </button>
        </div>
      </div>
    </header>
  );
}

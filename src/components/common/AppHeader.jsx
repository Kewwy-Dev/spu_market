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
    <header className="market-app-header">
      <div className="header-left">
        <div className="brand-logo-group">
          <div className="brand-icon-wrapper"><GraduationCap size={22} className="brand-cap-icon" strokeWidth={2.5} /></div>
          <span className="brand-title">SPU Market</span>
        </div>
      </div>
      <div className="header-right">
        {!currentUser && <>
          <button type="button" className="header-login-btn" onClick={onNavigateToLogin} title="เข้าสู่ระบบ">
            <LogIn size={13} strokeWidth={2.4} /><span>เข้าสู่ระบบ</span>
          </button>
        </>}
        {currentUser && <button type="button" className="icon-action-btn" onClick={handleNotificationClick} title="การแจ้งเตือน" aria-label={count > 0 ? `การแจ้งเตือน มี ${count} รายการที่ยังไม่อ่าน` : 'การแจ้งเตือน'}>
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
              className="notification-count-badge"
              aria-hidden="true"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 22 }}
            >
              <span className="notification-count-clip">
                <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                  <motion.span
                    key={displayCount}
                    className="notification-count-digit"
                    custom={direction}
                    variants={countVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                  >{displayCount}</motion.span>
                </AnimatePresence>
              </span>
            </motion.span> : <motion.span
              key="notification-dot"
              className="notification-dot"
              aria-hidden="true"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 22 }}
            />}
          </AnimatePresence>
        </button>}
      </div>
    </header>
  );
}

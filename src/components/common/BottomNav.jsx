import React, { useEffect, useRef } from 'react';
import { Home, MessageCircle, ShoppingCart, User } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const unreadVariants = {
  enter: (direction) => ({ y: direction * 8, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (direction) => ({ y: direction * -8, opacity: 0 }),
};

function AnimatedCountBadge({ count, tone = 'unread' }) {
  const reducedMotion = useReducedMotion();
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Math.floor(Number(count))) : 0;
  const previousCount = useRef(safeCount);
  const direction = safeCount >= previousCount.current ? 1 : -1;
  useEffect(() => { previousCount.current = safeCount; }, [safeCount]);
  const displayCount = safeCount > 99 ? '99+' : String(safeCount);
  return <AnimatePresence initial={false}>
    {safeCount > 0 && <motion.span
      key={`badge-${tone}`}
      className={`nav-count-badge ${tone === 'cart' ? 'nav-count-badge-cart' : 'nav-count-badge-unread'}`}
      aria-hidden="true"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 22 }}
    >
      <span className="nav-unread-count-clip">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.span
            key={displayCount}
            className="nav-unread-count-digit"
            custom={direction}
            variants={unreadVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
          >{displayCount}</motion.span>
        </AnimatePresence>
      </span>
    </motion.span>}
  </AnimatePresence>;
}

export default function BottomNav({ activeTab, onSelectTab, cartCount = 0, unreadMessageCount = 0 }) {
  return (
    <nav className="fixed-bottom-nav" aria-label="แถบเมนูหลัก">
      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'home' ? 'active' : ''}`}
        aria-label="ไปหน้าแรก"
        aria-current={activeTab === 'home' ? 'page' : undefined}
        onClick={() => {
          if (window.location.pathname !== '/home') window.history.pushState({}, '', '/home');
          onSelectTab('home');
        }}
      >
        <Home size={20} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
        <span className="tab-label">หน้าแรก</span>
      </button>

      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'chat' ? 'active' : ''}`}
        onClick={() => onSelectTab('chat')}
        aria-label={unreadMessageCount > 0 ? `แชท มีข้อความที่ยังไม่อ่าน ${unreadMessageCount} ข้อความ` : 'แชท'}
      >
        <div className="nav-icon-badge-wrapper" style={{ position: 'relative', display: 'inline-flex' }}>
          <MessageCircle size={20} strokeWidth={activeTab === 'chat' ? 2.5 : 2} />
          <AnimatedCountBadge count={unreadMessageCount} />
        </div>
        <span className="tab-label">แชท</span>
      </button>

      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'cart' ? 'active' : ''}`}
        onClick={() => onSelectTab('cart')}
      >
        <div className="nav-icon-badge-wrapper" style={{ position: 'relative', display: 'inline-flex' }}>
          <ShoppingCart size={20} strokeWidth={activeTab === 'cart' ? 2.5 : 2} />
          <AnimatedCountBadge count={cartCount} tone="cart" />
        </div>
        <span className="tab-label">ตะกร้า</span>
      </button>

      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => onSelectTab('profile')}
      >
        <User size={20} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
        <span className="tab-label">โปรไฟล์</span>
      </button>
    </nav>
  );
}


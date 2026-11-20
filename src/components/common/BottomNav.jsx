import React, { useEffect, useRef } from 'react';
import { Home, MessageCircle, ShoppingCart, User } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const unreadVariants = {
  enter: (direction) => ({ y: direction * 8, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (direction) => ({ y: direction * -8, opacity: 0 }),
};

const tabBase = 'relative flex flex-col items-center justify-center gap-[3px] text-[0.68rem] font-semibold transition-all duration-200';
const tabClass = (active) => `${tabBase} ${active ? 'text-spu-pink' : 'text-slate-500 hover:text-slate-700'}`;

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
      className={`absolute -top-1 -right-1.5 z-[2] flex h-4 w-4 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-white text-[9px] font-extrabold leading-none text-white ${tone === 'cart' ? 'bg-amber-500' : 'bg-spu-pink'}`}
      aria-hidden="true"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 22 }}
    >
      <span className="inline-flex items-center justify-center overflow-hidden tabular-nums">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.span
            key={displayCount}
            className="inline-block"
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
    // "fixed-bottom-nav" is kept as a hook: legacy `:has()` rules hide the nav on seller/add-product pages.
    <nav className="fixed-bottom-nav fixed inset-x-0 bottom-0 z-[60] h-16 border-t border-slate-200 bg-white/95 backdrop-blur-md" aria-label="แถบเมนูหลัก">
      <div className="mx-auto grid h-full w-full max-w-2xl grid-cols-4 px-1.5 pt-1 pb-1.5">
        <button
          type="button"
          className={tabClass(activeTab === 'home')}
          aria-label="ไปหน้าแรก"
          aria-current={activeTab === 'home' ? 'page' : undefined}
          onClick={() => {
            if (window.location.pathname !== '/home') window.history.pushState({}, '', '/home');
            onSelectTab('home');
          }}
        >
          <Home size={20} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span className="tracking-[-0.1px]">หน้าแรก</span>
        </button>

        <button
          type="button"
          className={tabClass(activeTab === 'chat')}
          onClick={() => onSelectTab('chat')}
          aria-label={unreadMessageCount > 0 ? `แชท มีข้อความที่ยังไม่อ่าน ${unreadMessageCount} ข้อความ` : 'แชท'}
        >
          <div className="relative inline-flex">
            <MessageCircle size={20} strokeWidth={activeTab === 'chat' ? 2.5 : 2} />
            <AnimatedCountBadge count={unreadMessageCount} />
          </div>
          <span className="tracking-[-0.1px]">แชท</span>
        </button>

        <button
          type="button"
          className={tabClass(activeTab === 'cart')}
          onClick={() => onSelectTab('cart')}
        >
          <div className="relative inline-flex">
            <ShoppingCart size={20} strokeWidth={activeTab === 'cart' ? 2.5 : 2} />
            <AnimatedCountBadge count={cartCount} tone="cart" />
          </div>
          <span className="tracking-[-0.1px]">ตะกร้า</span>
        </button>

        <button
          type="button"
          className={tabClass(activeTab === 'profile')}
          onClick={() => onSelectTab('profile')}
        >
          <User size={20} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
          <span className="tracking-[-0.1px]">โปรไฟล์</span>
        </button>
      </div>
    </nav>
  );
}

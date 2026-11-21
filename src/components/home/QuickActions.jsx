import React from 'react';
import { ShoppingBag, Store, ShieldCheck, Headset } from 'lucide-react';

export default function QuickActions({
  isSeller = false,
  isAdmin = false,
  isLoggedIn = false,
  onNavigateToRegister,
  onNavigateToLogin,
  onActionSelect,
}) {
  const handleRegisterClick = () => {
    if (!isLoggedIn) {
      onNavigateToLogin?.();
      return;
    }
    onNavigateToRegister?.();
  };

  const showSellerAction = isSeller || isAdmin;
  const showRegisterAction = !isSeller || isAdmin;
  const gridColsClass = showSellerAction && showRegisterAction ? 'grid-cols-4' : 'grid-cols-3';

  const cardClass = 'relative flex flex-col items-center gap-[3px] rounded-[14px] border border-slate-200 bg-slate-50 px-1 pt-2.5 pb-2 sm:py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(0,0,0,0.05)]';

  return (
    <div className={`mt-0.5 grid ${gridColsClass} gap-2 sm:gap-3`}>
      {/* 1. ซื้อสินค้า */}
      <button type="button" className={cardClass} onClick={() => onActionSelect?.('buy')}>
        <div className="relative mb-0.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-spu-pink text-white shadow-[0_2px_8px_rgba(230,0,126,0.3)]">
          <ShoppingBag size={20} strokeWidth={2.4} />
        </div>
        <span className="text-[0.74rem] sm:text-[0.8rem] font-bold text-slate-800">สินค้า</span>
        <span className="text-[0.62rem] sm:text-[0.68rem] text-slate-500">ดูทั้งหมด</span>
      </button>

      {/* 2. สำหรับผู้ขาย */}
      {showSellerAction && (
        <button type="button" className={cardClass} onClick={() => onActionSelect?.('seller')}>
          <div className="relative mb-0.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-sky-100 text-spu-blue">
            <Store size={20} strokeWidth={2.2} />
          </div>
          <span className="text-[0.74rem] sm:text-[0.8rem] font-bold text-slate-800">จัดการร้าน</span>
          <span className="text-[0.62rem] sm:text-[0.68rem] text-slate-500">สำหรับผู้ขาย</span>
        </button>
      )}

      {/* 3. ลงทะเบียน */}
      {showRegisterAction && (
        <button type="button" className={cardClass} onClick={handleRegisterClick}>
          <div className="relative mb-0.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-green-100 text-spu-teal">
            <ShieldCheck size={20} strokeWidth={2.2} />
            <span className="absolute -top-1.5 -right-2 rounded-full bg-emerald-500 px-1.5 py-px text-[0.58rem] font-bold text-white shadow-xs">
              เริ่มต้น
            </span>
          </div>
          <span className="text-[0.74rem] sm:text-[0.8rem] font-bold text-slate-800">ลงทะเบียน</span>
          <span className="text-[0.62rem] sm:text-[0.68rem] text-slate-500">ยืนยันตัวตน</span>
        </button>
      )}

      {/* 4. ช่วยเหลือ */}
      <button type="button" className={cardClass} onClick={() => onActionSelect?.('help')}>
        <div className="relative mb-0.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-purple-100 text-violet-600">
          <Headset size={20} strokeWidth={2.2} />
        </div>
        <span className="text-[0.74rem] sm:text-[0.8rem] font-bold text-slate-800">ช่วยเหลือ</span>
        <span className="text-[0.62rem] sm:text-[0.68rem] text-slate-500">แจ้งปัญหา</span>
      </button>
    </div>
  );
}

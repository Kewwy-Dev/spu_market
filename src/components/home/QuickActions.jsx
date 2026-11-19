import React from 'react';
import { ShoppingBag, Store, ShieldCheck, LifeBuoy } from 'lucide-react';

export default function QuickActions({
  isSeller = false,
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

  return (
    <div className="quick-actions-grid">
      {/* 1. ซื้อสินค้า */}
      <button
        type="button"
        className="quick-action-card"
        onClick={() => onActionSelect?.('buy')}
      >
        <div className="action-icon-circle action-pink">
          <ShoppingBag size={20} strokeWidth={2.4} />
        </div>
        <span className="action-main-title">สินค้า</span>
        <span className="action-sub-title">ดูทั้งหมด</span>
      </button>

      {/* 2. สำหรับผู้ขาย (แสดงเฉพาะผู้ที่มีบทบาท Seller) */}
      {isSeller && (
        <button
          type="button"
          className="quick-action-card"
          onClick={() => onActionSelect?.('seller')}
        >
          <div className="action-icon-circle action-blue">
            <Store size={20} strokeWidth={2.2} />
          </div>
          <span className="action-main-title">จัดการร้าน</span>
          <span className="action-sub-title">สำหรับผู้ขาย</span>
        </button>
      )}

      {/* 3. ลงทะเบียน (ซ่อนสำหรับผู้ที่มีบทบาท Seller) */}
      {!isSeller && (
        <button
          type="button"
          className="quick-action-card"
          onClick={handleRegisterClick}
        >
          <div className="action-icon-circle action-green">
            <ShieldCheck size={20} strokeWidth={2.2} />
            <span className="action-pill-tag">เริ่มต้น</span>
          </div>
          <span className="action-main-title">ลงทะเบียน</span>
          <span className="action-sub-title">ยืนยันตัวตน</span>
        </button>
      )}

      {/* 4. ช่วยเหลือ */}
      <button
        type="button"
        className="quick-action-card"
        onClick={() => onActionSelect?.('help')}
      >
        <div className="action-icon-circle action-purple">
          <LifeBuoy size={20} strokeWidth={2.2} />
        </div>
        <span className="action-main-title">ช่วยเหลือ</span>
        <span className="action-sub-title">แจ้งปัญหา</span>
      </button>
    </div>
  );
}

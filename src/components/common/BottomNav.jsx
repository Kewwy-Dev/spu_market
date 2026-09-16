import React from 'react';
import { ShoppingBag, Store, ShieldCheck, Headphones } from 'lucide-react';

export default function BottomNav({ activeTab, onSelectTab }) {
  return (
    <nav className="fixed-bottom-nav" aria-label="แถบเมนูหลัก">
      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onSelectTab('home')}
      >
        <ShoppingBag size={20} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
        <span className="tab-label">ซื้อสินค้า</span>
      </button>

      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'seller' ? 'active' : ''}`}
        onClick={() => onSelectTab('seller')}
      >
        <Store size={20} strokeWidth={activeTab === 'seller' ? 2.5 : 2} />
        <span className="tab-label">สำหรับผู้ขาย</span>
      </button>

      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'register' ? 'active' : ''}`}
        onClick={() => onSelectTab('register')}
      >
        <div className="nav-icon-badge-wrapper">
          <ShieldCheck size={20} strokeWidth={activeTab === 'register' ? 2.5 : 2} />
        </div>
        <span className="tab-label">ลงทะเบียน</span>
      </button>

      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'support' ? 'active' : ''}`}
        onClick={() => onSelectTab('support')}
      >
        <Headphones size={20} strokeWidth={activeTab === 'support' ? 2.5 : 2} />
        <span className="tab-label">ช่วยเหลือ</span>
      </button>
    </nav>
  );
}

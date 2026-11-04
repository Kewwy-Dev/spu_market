import React from 'react';
import { Home, MessageCircle, ShoppingCart, User } from 'lucide-react';

export default function BottomNav({ activeTab, onSelectTab, cartCount = 3 }) {
  return (
    <nav className="fixed-bottom-nav" aria-label="แถบเมนูหลัก">
      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onSelectTab('home')}
      >
        <Home size={20} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
        <span className="tab-label">หน้าแรก</span>
      </button>

      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'chat' ? 'active' : ''}`}
        onClick={() => onSelectTab('chat')}
      >
        <div className="nav-icon-badge-wrapper" style={{ position: 'relative', display: 'inline-flex' }}>
          <MessageCircle size={20} strokeWidth={activeTab === 'chat' ? 2.5 : 2} />
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-6px',
              background: 'var(--spu-pink)',
              color: '#ffffff',
              fontSize: '0.56rem',
              fontWeight: 800,
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid #ffffff',
            }}
          >
            3
          </span>
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
          {cartCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-6px',
                background: '#f59e0b',
                color: '#ffffff',
                fontSize: '0.56rem',
                fontWeight: 800,
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #ffffff',
              }}
            >
              {cartCount}
            </span>
          )}
        </div>
        <span className="tab-label">ตะกร้า</span>
      </button>

      <button
        type="button"
        className={`nav-tab-item ${activeTab === 'profile' || activeTab === 'login' ? 'active' : ''}`}
        onClick={() => onSelectTab('profile')}
      >
        <User size={20} strokeWidth={activeTab === 'profile' || activeTab === 'login' ? 2.5 : 2} />
        <span className="tab-label">โปรไฟล์</span>
      </button>
    </nav>
  );
}


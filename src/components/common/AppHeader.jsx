import React from 'react';
import { GraduationCap, Bell, LogIn, UserCheck, LogOut } from 'lucide-react';

export default function AppHeader({
  onNotificationClick,
  currentUser,
  onNavigateToLogin,
  onLogout,
}) {
  return (
    <header className="market-app-header">
      <div className="header-left">
        <div className="brand-logo-group">
          <div className="brand-icon-wrapper">
            <GraduationCap size={22} className="brand-cap-icon" strokeWidth={2.5} />
          </div>
          <span className="brand-title">SPU Market</span>
        </div>
      </div>

      <div className="header-right">
        {currentUser ? (
          <div className="header-user-status">
            <span className="user-email-chip" title={currentUser.email}>
              <UserCheck size={12} className="user-check-icon" />
              <span>{currentUser.username}</span>
            </span>
            <button
              type="button"
              className="icon-action-btn logout-btn"
              onClick={onLogout}
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="header-login-btn"
            onClick={onNavigateToLogin}
            title="เข้าสู่ระบบด้วย @spumail.net"
          >
            <LogIn size={13} strokeWidth={2.4} />
            <span>เข้าสู่ระบบ</span>
          </button>
        )}

        <button 
          type="button" 
          className="icon-action-btn" 
          onClick={onNotificationClick}
          title="การแจ้งเตือน" 
          aria-label="การแจ้งเตือน"
        >
          <Bell size={18} strokeWidth={2} />
          <span className="notification-dot" />
        </button>
      </div>
    </header>
  );
}

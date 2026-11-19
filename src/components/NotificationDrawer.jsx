import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  MessageCircle,
  PackageCheck,
  Star,
  X,
  XCircle,
} from 'lucide-react';
import { formatRelativeNotificationTime } from '../lib/notifications';

const CATEGORY_META = {
  pickup: {
    label: 'นัดรับ',
    className: 'is-pickup',
  },
  chat: {
    label: 'แชท',
    className: 'is-chat',
  },
  review: {
    label: 'รีวิว',
    className: 'is-review',
  },
};

function getNotificationIcon(item) {
  if (item.category === 'chat') return <MessageCircle size={18} />;
  if (item.category === 'review') return <Star size={18} />;
  if (item.event_type === 'pickup_delivered' || item.event_type === 'pickup_completed') {
    return <PackageCheck size={18} />;
  }
  if (item.event_type === 'pickup_cancelled') {
    return <XCircle size={18} />;
  }
  return <CalendarClock size={18} />;
}

export default function NotificationDrawer({
  isOpen,
  onClose,
  currentUser,
  notifications = [],
  unreadCount = 0,
  isLoading = false,
  onSelectNotification,
  onMarkAllRead,
  onNavigateToLogin,
}) {
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((item) => !item.is_read);
    }
    return notifications;
  }, [filter, notifications]);

  if (!isOpen) return null;

  return (
    <div className="appointment-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="appointment-modal-sheet notification-drawer-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-drawer-title"
      >
        <div className="appointment-sheet-handle" aria-hidden="true" />
        <div className="appointment-sheet-header">
          <div className="appointment-sheet-title-group">
            <div className="appointment-header-icon-wrap">
              <Bell size={20} />
            </div>
            <div>
              <h2 id="notification-drawer-title">การแจ้งเตือน</h2>
              <span className="detail-item-hint">
                {currentUser
                  ? (unreadCount > 0 ? `ยังไม่อ่าน ${unreadCount} รายการ` : 'อ่านครบทุกรายการแล้ว')
                  : 'ศูนย์แจ้งเตือน SPU Market'}
              </span>
            </div>
          </div>

          <div className="notification-header-actions">
            {currentUser && unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all-btn"
                onClick={onMarkAllRead}
              >
                <CheckCheck size={14} />
                <span>อ่านทั้งหมด</span>
              </button>
            )}
            <button
              type="button"
              className="submodal-close"
              onClick={onClose}
              aria-label="ปิดการแจ้งเตือน"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {currentUser && (
          <div className="notification-filter-tabs" role="tablist" aria-label="ตัวกรองการแจ้งเตือน">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              className={`notification-filter-tab ${filter === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilter('all')}
            >
              ทั้งหมด
              {notifications.length > 0 && (
                <span className="notification-tab-count">{notifications.length}</span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'unread'}
              className={`notification-filter-tab ${filter === 'unread' ? 'is-active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              ยังไม่อ่าน
              {unreadCount > 0 && (
                <span className="notification-tab-count is-unread">{unreadCount}</span>
              )}
            </button>
          </div>
        )}

        <div className="notification-drawer-body">
          {!currentUser ? (
            <div className="pickup-history-empty" style={{ padding: '16px 0' }}>
              <div className="guest-card-icon" style={{ margin: '0 auto 12px' }}>
                <Bell size={26} />
              </div>
              <h4 style={{ fontSize: '0.96rem', marginBottom: '6px' }}>เข้าสู่ระบบเพื่อดูการแจ้งเตือน</h4>
              <p style={{ maxWidth: '280px', margin: '0 auto 16px' }}>
                รับแจ้งเตือนแชท นัดรับสินค้า และรีวิวร้านค้าของคุณแบบเรียลไทม์
              </p>
              <button
                type="button"
                className="profile-login-cta-btn"
                style={{ width: '100%', maxWidth: '260px' }}
                onClick={() => {
                  onClose?.();
                  onNavigateToLogin?.();
                }}
              >
                เข้าสู่ระบบ
              </button>
            </div>
          ) : isLoading ? (
            <div className="notification-list">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="notification-skeleton-item" aria-hidden="true" />
              ))}
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="notification-list">
              {filteredNotifications.map((item) => {
                const meta = CATEGORY_META[item.category] || CATEGORY_META.pickup;
                const timeLabel = formatRelativeNotificationTime(item.updated_at || item.created_at);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`notification-item-card ${meta.className} ${item.is_read ? 'is-read' : 'is-unread'}`}
                    onClick={() => onSelectNotification?.(item)}
                  >
                    <div className={`notification-item-icon ${meta.className}`}>
                      {getNotificationIcon(item)}
                    </div>
                    <div className="notification-item-content">
                      <div className="notification-item-top">
                        <span className="notification-item-title">{item.title}</span>
                        <span className="notification-item-time">{timeLabel}</span>
                      </div>
                      <div className="notification-item-bottom">
                        <span className="notification-item-body">{item.body}</span>
                        <span className={`notification-category-pill ${meta.className}`}>{meta.label}</span>
                      </div>
                    </div>
                    <div className="notification-item-trailing">
                      {!item.is_read && <span className="notification-unread-dot" aria-label="ยังไม่อ่าน" />}
                      <ChevronRight size={16} className="notification-item-chevron" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="pickup-history-empty" style={{ padding: '24px 0' }}>
              <div className="pickup-history-empty-icon">
                <BellOff size={42} strokeWidth={1.5} />
              </div>
              <h4>{filter === 'unread' ? 'ไม่มีรายการที่ยังไม่อ่าน' : 'ยังไม่มีการแจ้งเตือน'}</h4>
              <p>
                {filter === 'unread'
                  ? 'คุณอ่านการแจ้งเตือนครบทุกรายการแล้ว'
                  : 'เมื่อมีแชทใหม่ นัดรับสินค้า หรือรีวิวร้านค้า จะแสดงที่นี่'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

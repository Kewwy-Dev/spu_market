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
    cardUnread: 'bg-pink-50 border-spu-pink-border',
    icon: 'bg-pink-100 text-pink-600',
    pill: 'bg-pink-100 text-pink-700',
  },
  chat: {
    label: 'แชท',
    cardUnread: 'bg-sky-50 border-sky-200',
    icon: 'bg-sky-100 text-sky-600',
    pill: 'bg-sky-100 text-sky-700',
  },
  review: {
    label: 'รีวิว',
    cardUnread: 'bg-amber-50 border-amber-200',
    icon: 'bg-amber-100 text-amber-600',
    pill: 'bg-amber-100 text-amber-700',
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
    <div
      className="fixed inset-0 z-[210] flex items-end justify-center bg-slate-900/58 backdrop-blur-xs animate-[appointmentFadeIn_0.2s_cubic-bezier(0.16,1,0.3,1)] sm:items-center sm:p-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[82vh] w-full max-w-[480px] sm:max-w-[520px] flex-col overflow-hidden rounded-t-3xl bg-white pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(15,23,42,0.25)] animate-[appointmentSlideUp_0.28s_cubic-bezier(0.16,1,0.3,1)] sm:rounded-3xl sm:pb-5 sm:animate-[appointmentPopIn_0.22s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-drawer-title"
      >
        <div className="mx-auto mt-2.5 mb-1 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between border-b border-slate-100 px-5 pt-3 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-pink-50 text-pink-600">
              <Bell size={20} />
            </div>
            <div>
              <h2 id="notification-drawer-title" className="m-0 text-[0.98rem] font-extrabold leading-[1.3] text-slate-900">
                การแจ้งเตือน
              </h2>
              <span className="mt-[3px] block text-[0.65rem] text-slate-500">
                {currentUser
                  ? (unreadCount > 0 ? `ยังไม่อ่าน ${unreadCount} รายการ` : 'อ่านครบทุกรายการแล้ว')
                  : 'ศูนย์แจ้งเตือน SPU Market'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && unreadCount > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-[5px] rounded-full border border-spu-pink-border bg-pink-50 px-2.5 py-1.5 text-[0.76rem] font-semibold text-pink-700 transition-all hover:bg-pink-100 active:scale-[0.97]"
                onClick={onMarkAllRead}
              >
                <CheckCheck size={14} />
                <span>อ่านทั้งหมด</span>
              </button>
            )}
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
              onClick={onClose}
              aria-label="ปิดการแจ้งเตือน"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {currentUser && (
          <div className="flex gap-2 px-5 pt-2.5 pb-1.5" role="tablist" aria-label="ตัวกรองการแจ้งเตือน">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8rem] font-semibold transition-all ${
                filter === 'all' ? 'bg-pink-50 text-pink-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
              onClick={() => setFilter('all')}
            >
              ทั้งหมด
              {notifications.length > 0 && (
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-slate-100 px-[5px] text-[0.7rem] font-bold text-slate-600 tabular-nums">
                  {notifications.length}
                </span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'unread'}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8rem] font-semibold transition-all ${
                filter === 'unread' ? 'bg-pink-50 text-pink-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
              onClick={() => setFilter('unread')}
            >
              ยังไม่อ่าน
              {unreadCount > 0 && (
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pink-600 px-[5px] text-[0.7rem] font-bold text-white tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 pt-3.5 pb-6">
          {!currentUser ? (
            <div className="py-4 text-center text-slate-500">
              <div className="mx-auto mb-3 grid h-[52px] w-[52px] place-items-center rounded-2xl bg-pink-100 text-pink-600">
                <Bell size={26} />
              </div>
              <h4 className="mb-1.5 text-[0.96rem] font-extrabold text-slate-800">เข้าสู่ระบบเพื่อดูการแจ้งเตือน</h4>
              <p className="mx-auto mb-4 max-w-[280px] text-[0.74rem] leading-[1.45] text-slate-500">
                รับแจ้งเตือนแชท นัดรับสินค้า และรีวิวร้านค้าของคุณแบบเรียลไทม์
              </p>
              <button
                type="button"
                className="inline-flex min-h-11 w-full max-w-[260px] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#a20857] to-[#ec008c] px-6 text-[0.86rem] font-extrabold text-white shadow-[0_4px_14px_rgba(236,0,140,0.3)]"
                onClick={() => {
                  onClose?.();
                  onNavigateToLogin?.();
                }}
              >
                เข้าสู่ระบบ
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col gap-2.5">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="h-16 rounded-[14px] bg-[linear-gradient(90deg,#f1f5f9_25%,#f8fafc_50%,#f1f5f9_75%)] bg-[length:200%_100%] animate-[notification-shimmer_1.3s_infinite_linear]"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {filteredNotifications.map((item) => {
                const meta = CATEGORY_META[item.category] || CATEGORY_META.pickup;
                const timeLabel = formatRelativeNotificationTime(item.updated_at || item.created_at);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-[14px] border p-3 text-left transition-all hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)] active:scale-[0.99] ${
                      item.is_read ? 'border-slate-100 bg-white' : meta.cardUnread
                    }`}
                    onClick={() => onSelectNotification?.(item)}
                  >
                    <div className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] ${meta.icon}`}>
                      {getNotificationIcon(item)}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-[0.86rem] ${item.is_read ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>
                          {item.title}
                        </span>
                        <span className="shrink-0 text-[0.72rem] text-slate-500">{timeLabel}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[0.78rem] text-slate-600">{item.body}</span>
                        <span className={`shrink-0 rounded-full px-[7px] py-0.5 text-[0.68rem] font-bold ${meta.pill}`}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {!item.is_read && <span className="h-2 w-2 rounded-full bg-pink-600" aria-label="ยังไม่อ่าน" />}
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-500">
              <div className="mx-auto mb-3 flex justify-center text-slate-300">
                <BellOff size={42} strokeWidth={1.5} />
              </div>
              <h4 className="mb-1.5 text-[0.9rem] font-extrabold text-slate-800">
                {filter === 'unread' ? 'ไม่มีรายการที่ยังไม่อ่าน' : 'ยังไม่มีการแจ้งเตือน'}
              </h4>
              <p className="text-[0.72rem] leading-[1.45] text-slate-500">
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

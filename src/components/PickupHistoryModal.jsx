import React, { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  PackageCheck,
  ShoppingBag,
  X,
  ChevronRight,
} from 'lucide-react';

const formatThaiDate = (dateString) => {
  if (!dateString) return 'ไม่ระบุเวลา';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'ไม่ระบุเวลา';
    return new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  } catch {
    return dateString;
  }
};

const formatPrice = (price) => `฿${Number(price || 0).toLocaleString('th-TH')}`;

export default function PickupHistoryModal({
  appointments = [],
  onSelectAppointment,
  onClose,
  currentUser,
}) {
  const [activeFilter, setActiveFilter] = useState('buy'); // 'buy' | 'sell'

  const completedAppointments = appointments.filter((item) => item.status === 'completed');

  const isBuyerItem = (item) =>
    currentUser?.id
      ? item.buyerId === currentUser.id
      : typeof item.isBuyer === 'boolean'
        ? item.isBuyer
        : true;

  const filteredAppointments = completedAppointments.filter((item) =>
    activeFilter === 'buy' ? isBuyerItem(item) : !isBuyerItem(item)
  );

  const counts = {
    buy: completedAppointments.filter((item) => isBuyerItem(item)).length,
    sell: completedAppointments.filter((item) => !isBuyerItem(item)).length,
  };

  return (
    <div className="pickup-history-backdrop" onClick={onClose} role="presentation">
      <section
        className="pickup-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="pickup-history-header">
          <div className="pickup-history-icon">
            <PackageCheck size={20} />
          </div>
          <div>
            <h2 id="pickup-history-title">ประวัติการนัดรับสินค้า</h2>
            <p>รายการนัดรับและส่งมอบสินค้าทั้งหมดของคุณ</p>
          </div>
          <button
            type="button"
            className="pickup-history-close"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </header>

        {/* Filter Tabs for History */}
        <div className="pickup-history-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'buy'}
            className={`history-tab-btn ${activeFilter === 'buy' ? 'active' : ''}`}
            onClick={() => setActiveFilter('buy')}
          >
            ซื้อสินค้า ({counts.buy})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'sell'}
            className={`history-tab-btn ${activeFilter === 'sell' ? 'active' : ''}`}
            onClick={() => setActiveFilter('sell')}
          >
            ขายสินค้า ({counts.sell})
          </button>
        </div>

        {/* List of Completed Appointments */}
        <div className="pickup-history-list">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((item) => (
              <article
                className="pickup-history-card real-card"
                key={item.id}
                onClick={() => onSelectAppointment?.(item)}
                style={{ cursor: 'pointer' }}
              >
                <div className="pickup-history-status-icon complete">
                  <CheckCircle2 size={18} />
                </div>
                <div className="pickup-history-details">
                  <div className="pickup-history-card-top">
                    <h3 className="pickup-history-item-title">{item.title}</h3>
                    <span className="pickup-history-status complete">
                      รับสินค้าแล้ว
                    </span>
                  </div>
                  <div className="pickup-history-meta-row">
                    <span className="pickup-history-price">{formatPrice(item.price)}</span>
                    {item.quantity > 1 && (
                      <span className="pickup-history-qty">({item.quantity} ชิ้น)</span>
                    )}
                  </div>
                  <p className="pickup-history-loc">
                    <MapPin size={12} /> {item.location || 'ไม่ระบุจุดนัดรับ'}
                  </p>
                  <p className="pickup-history-time">
                    <CalendarDays size={12} /> {formatThaiDate(item.scheduledAt)}
                  </p>
                </div>
                <div className="pickup-history-arrow">
                  <ChevronRight size={16} />
                </div>
              </article>
            ))
          ) : (
            <div className="pickup-history-empty">
              <ShoppingBag size={38} className="pickup-history-empty-icon" />
              <h4>
                {activeFilter === 'buy'
                  ? 'ยังไม่มีประวัติการซื้อสินค้าที่สำเร็จ'
                  : 'ยังไม่มีประวัติการขายสินค้าที่สำเร็จ'}
              </h4>
              <p>
                เมื่อคุณนัดรับสินค้ากับเพื่อนในมหาวิทยาลัยสำเร็จแล้ว
                รายการจะถูกบันทึกและแสดงที่นี่แบบ Realtime
              </p>
            </div>
          )}
        </div>

        <button type="button" className="pickup-history-done" onClick={onClose}>
          ปิด
        </button>
      </section>
    </div>
  );
}

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
  const [activeFilter, setActiveFilter] = useState('buy');

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
    <div
      className="fixed inset-0 z-[201] flex items-center justify-center bg-slate-900/56 p-[18px] backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="flex max-h-[min(84vh,720px)] w-full max-w-[440px] sm:max-w-[500px] flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-2.5 border-b border-slate-100 px-[17px] pt-[17px] pb-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-spu-pink-light text-spu-pink">
            <PackageCheck size={20} />
          </div>
          <div>
            <h2 id="pickup-history-title" className="text-[0.88rem] sm:text-base font-extrabold text-slate-900">
              ประวัติการนัดรับสินค้า
            </h2>
            <p className="mt-0.5 text-[0.68rem] text-slate-500">รายการนัดรับและส่งมอบสินค้าทั้งหมดของคุณ</p>
          </div>
          <button
            type="button"
            className="ml-auto grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </header>

        {/* Filter Tabs for History */}
        <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2.5" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'buy'}
            className={`cursor-pointer whitespace-nowrap rounded-full border px-3 py-1.5 text-[0.68rem] font-bold transition-all duration-150 ${
              activeFilter === 'buy'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
            onClick={() => setActiveFilter('buy')}
          >
            ซื้อสินค้า ({counts.buy})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'sell'}
            className={`cursor-pointer whitespace-nowrap rounded-full border px-3 py-1.5 text-[0.68rem] font-bold transition-all duration-150 ${
              activeFilter === 'sell'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
            onClick={() => setActiveFilter('sell')}
          >
            ขายสินค้า ({counts.sell})
          </button>
        </div>

        {/* List of Completed Appointments */}
        <div className="space-y-[9px] overflow-y-auto px-4 pt-3.5 pb-1">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((item) => (
              <article
                className="flex cursor-pointer items-center gap-2.5 rounded-[14px] border border-[#e8edf4] bg-white px-[11px] py-[13px] transition-all duration-150 hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
                key={item.id}
                onClick={() => onSelectAppointment?.(item)}
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-spu-teal-light text-spu-teal">
                  <CheckCircle2 size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h3 className="m-0 min-w-0 truncate text-[0.78rem] font-extrabold text-[#172033]">
                      {item.title}
                    </h3>
                    <span className="whitespace-nowrap rounded-full bg-spu-teal-light px-[7px] py-[3px] text-[0.6rem] font-bold text-emerald-700">
                      รับสินค้าแล้ว
                    </span>
                  </div>
                  <div className="mt-0.5 mb-1 flex items-baseline gap-1.5">
                    <span className="text-[0.86rem] font-extrabold text-pink-600 tabular-nums">
                      {formatPrice(item.price)}
                    </span>
                    {item.quantity > 1 && (
                      <span className="text-[0.65rem] font-semibold text-slate-500">({item.quantity} ชิ้น)</span>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-[5px] text-[0.66rem] text-slate-500">
                    <MapPin size={12} className="shrink-0 text-slate-400" /> {item.location || 'ไม่ระบุจุดนัดรับ'}
                  </p>
                  <p className="mt-1 flex items-center gap-[5px] text-[0.66rem] text-slate-500">
                    <CalendarDays size={12} className="shrink-0 text-slate-400" /> {formatThaiDate(item.scheduledAt)}
                  </p>
                </div>
                <div className="grid place-items-center text-slate-400">
                  <ChevronRight size={16} />
                </div>
              </article>
            ))
          ) : (
            <div className="px-5 py-9 text-center text-slate-500">
              <ShoppingBag size={38} className="mx-auto mb-3 text-slate-300" />
              <h4 className="mb-1.5 text-[0.9rem] font-extrabold text-slate-800">
                {activeFilter === 'buy'
                  ? 'ยังไม่มีประวัติการซื้อสินค้าที่สำเร็จ'
                  : 'ยังไม่มีประวัติการขายสินค้าที่สำเร็จ'}
              </h4>
              <p className="text-[0.72rem] leading-[1.45] text-slate-500">
                เมื่อคุณนัดรับสินค้ากับเพื่อนในมหาวิทยาลัยสำเร็จแล้ว
                รายการจะถูกบันทึกและแสดงที่นี่แบบ Realtime
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          className="mx-[18px] mt-3 mb-[17px] min-h-11 rounded-xl bg-gradient-to-br from-[#a20857] to-[#ec008c] text-[0.82rem] font-extrabold text-white transition-opacity hover:opacity-95"
          onClick={onClose}
        >
          ปิด
        </button>
      </section>
    </div>
  );
}

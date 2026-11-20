import React, { useEffect, useState } from 'react';
import { Flame, Clock } from 'lucide-react';
import ProductCard from './ProductCard';

function formatRelativeUpdate(updatedAt, now) {
  if (!updatedAt) return 'กำลังรอข้อมูล';
  const updatedTime = new Date(updatedAt).getTime();
  if (!Number.isFinite(updatedTime)) return 'ไม่ทราบเวลาอัปเดต';

  const elapsedMinutes = Math.max(0, Math.floor((now - updatedTime) / 60_000));
  if (elapsedMinutes === 0) return 'เมื่อสักครู่';
  if (elapsedMinutes < 60) return `${elapsedMinutes} นาทีที่แล้ว`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} ชั่วโมงที่แล้ว`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays} วันที่แล้ว`;
  return new Date(updatedTime).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ProductGrid({ products, updatedAt, onSelectProduct }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="flex w-full min-w-0 flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Flame size={18} className="text-spu-pink" strokeWidth={2.4} />
          <h3 className="text-[0.88rem] sm:text-base font-bold text-slate-900">สินค้าลงใหม่ในมอ</h3>
        </div>
        <div className="flex items-center gap-1 text-[0.66rem] sm:text-xs text-slate-500">
          <Clock size={12} />
          <span>อัปเดตล่าสุด {formatRelativeUpdate(updatedAt, now)}</span>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="grid w-full min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4 lg:gap-4">
          {products.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-slate-300 bg-slate-50 px-4 py-9 text-center">
          <p className="mb-1 text-[0.88rem] font-bold text-slate-700">ไม่พบสินค้าที่คุณค้นหา</p>
          <span className="text-[0.74rem] text-slate-500">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นดูนะครับ</span>
        </div>
      )}
    </section>
  );
}

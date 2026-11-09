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
    <section className="product-feed-section">
      <div className="section-title-row">
        <div className="title-left">
          <Flame size={18} className="flame-icon-pink" strokeWidth={2.4} />
          <h3 className="section-heading">สินค้าลงใหม่ในมอ</h3>
        </div>
        <div className="feed-update-time">
          <Clock size={12} />
          <span>อัปเดตล่าสุด {formatRelativeUpdate(updatedAt, now)}</span>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="products-two-col-grid">
          {products.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      ) : (
        <div className="products-empty-state">
          <p>ไม่พบสินค้าที่คุณค้นหา</p>
          <span>ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นดูนะครับ</span>
        </div>
      )}
    </section>
  );
}

import React from 'react';
import { Flame, Clock } from 'lucide-react';
import ProductCard from './ProductCard';

export default function ProductGrid({ products, onSelectProduct }) {
  return (
    <section className="product-feed-section">
      <div className="section-title-row">
        <div className="title-left">
          <Flame size={18} className="flame-icon-pink" strokeWidth={2.4} />
          <h3 className="section-heading">สินค้าลงใหม่ในมอ</h3>
        </div>
        <div className="feed-update-time">
          <Clock size={12} />
          <span>อัปเดตล่าสุด 5 นาทีที่แล้ว</span>
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

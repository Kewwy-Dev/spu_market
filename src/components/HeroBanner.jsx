import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function HeroBanner() {
  return (
    <section className="hero-banner" aria-labelledby="hero-heading">
      <div className="hero-content-wrapper">
        <div className="hero-icon-box" aria-hidden="true">
          <ShieldCheck size={28} className="hero-shield-icon" strokeWidth={2.4} />
        </div>

        <div className="hero-text-content">
          <div className="verified-badge">
            <CheckCircle2 size={13} strokeWidth={2.8} className="verified-badge-icon" />
            <span>SPU Verified Seller & Buyer</span>
          </div>

          <h2 id="hero-heading" className="hero-title">
            สร้างพื้นที่ซื้อขายที่ปลอดภัยสำหรับชาวศรีปทุม
          </h2>

          <p className="hero-description">
            ยืนยันตัวตนครั้งเดียว เพื่อสิทธิพิเศษในการโพสต์ขายและส่งข้อความตรงถึงเพื่อนในแคมปัส
          </p>
        </div>
      </div>
    </section>
  );
}

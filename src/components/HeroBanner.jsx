import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function HeroBanner() {
  return <section className="hero-banner" aria-labelledby="hero-heading">
    <div className="hero-content-wrapper">
      <div className="hero-icon-box" aria-hidden="true"><ShieldCheck size={28} className="hero-shield-icon" strokeWidth={2.4} /></div>
      <div className="hero-text-content">
        <div className="verified-badge"><CheckCircle2 size={13} strokeWidth={2.8} className="verified-badge-icon" /><span>SPU Seller</span></div>
        <h2 id="hero-heading" className="hero-title">ยืนยันตัวตนเพื่อเปิดร้านค้า</h2>
        <p className="hero-description">กรอกข้อมูลของคุณและยืนยันอีเมลมหาวิทยาลัยด้วย OTP เพื่อเริ่มขายสินค้าใน SPU Market</p>
      </div>
    </div>
  </section>;
}

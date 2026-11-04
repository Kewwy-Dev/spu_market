import React from 'react';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export default function TrustNotice({ onNavigateToRegister }) {
  return (
    <div className="campus-trust-banner" onClick={onNavigateToRegister}>
      <div className="trust-banner-icon-col">
        <ShieldAlert size={22} className="trust-shield-icon" strokeWidth={2.2} />
      </div>

      <div className="trust-banner-text-col">
        <h4 className="trust-banner-heading">
          ปลอดภัยด้วยการยืนยันตัวตนนักศึกษา SPU
        </h4>
        <p className="trust-banner-desc">
          ผู้ขายทุกคนต้องยืนยันตัวตนด้วยรหัสนักศึกษา หรืออีเมลมหาวิทยาลัย (@spumail.net) นัดรับในมอได้อย่างมั่นใจ
        </p>
      </div>

      <div className="trust-banner-arrow">
        <ArrowRight size={16} />
      </div>
    </div>
  );
}

import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function Header({ onBack }) {
  return <header className="page-header">
    <button type="button" className="back-button" onClick={onBack} title="ย้อนกลับ" aria-label="ย้อนกลับ"><ArrowLeft size={20} strokeWidth={2.2} /></button>
    <h1 className="header-title">สมัครเป็นผู้ขาย</h1>
    <div className="step-badge"><span className="step-dot" /><span>ยืนยันด้วย OTP</span></div>
  </header>;
}

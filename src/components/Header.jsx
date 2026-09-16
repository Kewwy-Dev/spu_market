import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function Header({ onBack }) {
  return (
    <header className="page-header">
      <button 
        type="button" 
        className="back-button" 
        onClick={onBack}
        title="ย้อนกลับ"
        aria-label="ย้อนกลับ"
      >
        <ArrowLeft size={20} strokeWidth={2.2} />
      </button>

      <h1 className="header-title">ลงทะเบียนยืนยันตัวตน SPU</h1>

      <div className="step-badge" aria-label="ขั้นตอนที่ 1 จาก 2">
        <span className="step-dot" />
        <span>ขั้นตอน 1/2</span>
      </div>
    </header>
  );
}

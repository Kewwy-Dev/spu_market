import React, { useState } from 'react';
import { ScrollText, ChevronDown, Check } from 'lucide-react';

export default function PdpaConsent({ consent1, consent2, onToggleConsent1, onToggleConsent2, errors = {} }) {
  const [isOpen, setIsOpen] = useState(true);
  return <section className="pdpa-card">
    <button type="button" className="pdpa-accordion-header" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
      <div className="pdpa-header-left"><ScrollText size={18} className="pdpa-header-icon" /><span className="pdpa-header-title">ข้อกำหนดและเงื่อนไขการใช้งาน (PDPA)</span></div>
      <ChevronDown size={18} className={`pdpa-chevron ${isOpen ? 'open' : ''}`} />
    </button>
    {isOpen && <div className="pdpa-accordion-body">
      <h3 className="pdpa-consent-title">การยืนยันตัวตนและการใช้ข้อมูลส่วนบุคคล</h3>
      <div className="consent-checkboxes">
        <label className={`consent-item ${errors.consent1 ? 'consent-error' : ''}`}>
          <span className="custom-checkbox-wrapper"><input type="checkbox" checked={consent1} onChange={(event) => onToggleConsent1(event.target.checked)} className="hidden-checkbox" /><span className={`checkbox-box ${consent1 ? 'checked' : ''}`}>{consent1 && <Check size={14} strokeWidth={3} />}</span></span>
          <span className="consent-text">ยินยอมให้ SPU Market ตรวจสอบข้อมูลนักศึกษาหรือบุคลากร เพื่อยืนยันตัวตนและสิทธิ์การใช้งาน</span>
        </label>
        {errors.consent1 && <p className="field-error-text inline-error">{errors.consent1}</p>}
        <label className={`consent-item ${errors.consent2 ? 'consent-error' : ''}`}>
          <span className="custom-checkbox-wrapper"><input type="checkbox" checked={consent2} onChange={(event) => onToggleConsent2(event.target.checked)} className="hidden-checkbox" /><span className={`checkbox-box ${consent2 ? 'checked' : ''}`}>{consent2 && <Check size={14} strokeWidth={3} />}</span></span>
          <span className="consent-text">ยอมรับข้อกำหนดการซื้อขาย และยินยอมให้ใช้ข้อมูลติดต่อเพื่อประสานงานเกี่ยวกับรายการสินค้า</span>
        </label>
        {errors.consent2 && <p className="field-error-text inline-error">{errors.consent2}</p>}
      </div>
    </div>}
  </section>;
}

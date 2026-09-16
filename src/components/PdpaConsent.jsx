import React, { useState } from 'react';
import { ScrollText, ChevronDown, Check } from 'lucide-react';

export default function PdpaConsent({
  consent1,
  consent2,
  onToggleConsent1,
  onToggleConsent2,
  errors = {},
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="pdpa-card">
      <button
        type="button"
        className="pdpa-accordion-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="pdpa-header-left">
          <ScrollText size={18} className="pdpa-header-icon" />
          <span className="pdpa-header-title">
            ข้อกำหนดและเงื่อนไขการใช้งาน SPU Market
          </span>
        </div>
        <ChevronDown
          size={18}
          className={`pdpa-chevron ${isOpen ? 'open' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="pdpa-accordion-body">
          <h3 className="pdpa-consent-title">
            ความยินยอมการประมวลผลข้อมูลส่วนบุคคล (PDPA Consent)
          </h3>

          <div className="consent-checkboxes">
            <label className={`consent-item ${errors.consent1 ? 'consent-error' : ''}`}>
              <div className="custom-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={consent1}
                  onChange={(e) => onToggleConsent1(e.target.checked)}
                  className="hidden-checkbox"
                />
                <div className={`checkbox-box ${consent1 ? 'checked' : ''}`}>
                  {consent1 && <Check size={14} strokeWidth={3} />}
                </div>
              </div>
              <span className="consent-text">
                ข้าพเจ้ายินยอมให้ตรวจสอบสถานะนักศึกษา/บุคลากรกับระบบฐานข้อมูลมหาวิทยาลัยศรีปทุม
              </span>
            </label>
            {errors.consent1 && (
              <p className="field-error-text inline-error">{errors.consent1}</p>
            )}

            <label className={`consent-item ${errors.consent2 ? 'consent-error' : ''}`}>
              <div className="custom-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={consent2}
                  onChange={(e) => onToggleConsent2(e.target.checked)}
                  className="hidden-checkbox"
                />
                <div className={`checkbox-box ${consent2 ? 'checked' : ''}`}>
                  {consent2 && <Check size={14} strokeWidth={3} />}
                </div>
              </div>
              <span className="consent-text">
                ข้าพเจ้ายอมรับข้อตกลงการซื้อขายที่ปลอดภัย และจะไม่โพสต์สินค้าผิดกฎหมาย/ระเบียบมหาวิทยาลัย
              </span>
            </label>
            {errors.consent2 && (
              <p className="field-error-text inline-error">{errors.consent2}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

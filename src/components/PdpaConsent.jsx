import React, { useState } from 'react';
import { ScrollText, ChevronDown, Check } from 'lucide-react';

export default function PdpaConsent({ consent1, consent2, onToggleConsent1, onToggleConsent2, errors = {} }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <section className="overflow-hidden rounded-[14px] border-[1.5px] border-slate-100 bg-white shadow-[0_2px_6px_rgba(15,23,42,0.03)]">
      <button
        type="button"
        className="flex w-full items-center justify-between border-b border-red-100 bg-[#fff5f5] p-3 transition-colors hover:bg-red-50"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5">
          <ScrollText size={18} className="text-red-600" />
          <span className="text-[0.8rem] font-bold text-red-700">ข้อกำหนดและเงื่อนไขการใช้งาน (PDPA)</span>
        </div>
        <ChevronDown size={18} className={`text-red-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="flex flex-col gap-2.5 bg-white p-3">
          <h3 className="text-[0.78rem] font-bold text-slate-900">การยืนยันตัวตนและการใช้ข้อมูลส่วนบุคคล</h3>
          <div className="flex flex-col gap-2">
            <label className={`flex cursor-pointer items-start gap-2 ${errors.consent1 ? 'consent-error' : ''}`}>
              <span className="relative mt-px flex items-center">
                <input
                  type="checkbox"
                  checked={consent1}
                  onChange={(event) => onToggleConsent1(event.target.checked)}
                  className="absolute h-0 w-0 opacity-0"
                />
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-[1.5px] text-white transition-all duration-200 ${
                    consent1
                      ? 'border-spu-pink bg-spu-pink shadow-[0_2px_6px_rgba(230,0,126,0.3)]'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {consent1 && <Check size={14} strokeWidth={3} />}
                </span>
              </span>
              <span className="select-none text-[0.74rem] leading-[1.4] text-slate-700">
                ยินยอมให้ SPU Market ตรวจสอบข้อมูลนักศึกษาหรือบุคลากร เพื่อยืนยันตัวตนและสิทธิ์การใช้งาน
              </span>
            </label>
            {errors.consent1 && <p className="mt-0.5 ml-7 text-[0.72rem] font-medium text-rose-600">{errors.consent1}</p>}

            <label className={`flex cursor-pointer items-start gap-2 ${errors.consent2 ? 'consent-error' : ''}`}>
              <span className="relative mt-px flex items-center">
                <input
                  type="checkbox"
                  checked={consent2}
                  onChange={(event) => onToggleConsent2(event.target.checked)}
                  className="absolute h-0 w-0 opacity-0"
                />
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-[1.5px] text-white transition-all duration-200 ${
                    consent2
                      ? 'border-spu-pink bg-spu-pink shadow-[0_2px_6px_rgba(230,0,126,0.3)]'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {consent2 && <Check size={14} strokeWidth={3} />}
                </span>
              </span>
              <span className="select-none text-[0.74rem] leading-[1.4] text-slate-700">
                ยอมรับข้อกำหนดการซื้อขาย และยินยอมให้ใช้ข้อมูลติดต่อเพื่อประสานงานเกี่ยวกับรายการสินค้า
              </span>
            </label>
            {errors.consent2 && <p className="mt-0.5 ml-7 text-[0.72rem] font-medium text-rose-600">{errors.consent2}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function Header({ onBack }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-2.5 px-4 sm:px-6">
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-800 transition-all duration-200 hover:-translate-x-0.5 hover:bg-slate-100 hover:text-spu-pink"
          onClick={onBack}
          title="ย้อนกลับ"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
        <h1 className="flex-1 text-left text-base sm:text-lg font-bold tracking-[-0.2px] text-slate-900">
          สมัครเป็นผู้ขาย
        </h1>
        <div className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-spu-pink-border bg-pink-50 px-2.5 py-1 text-[0.74rem] font-semibold text-pink-700">
          <span className="h-1.5 w-1.5 rounded-full bg-pink-600" />
          <span>ยืนยันด้วย OTP</span>
        </div>
      </div>
    </header>
  );
}

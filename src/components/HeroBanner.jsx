import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function HeroBanner() {
  return (
    <section
      className="rounded-[18px] border-[1.5px] border-pink-100 bg-gradient-to-br from-white to-[#fff7fb] p-3.5 pl-3 shadow-[0_4px_18px_rgba(230,0,126,0.05)]"
      aria-labelledby="hero-heading"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 min-w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-pink-100 to-pink-200 text-spu-pink shadow-[0_4px_10px_rgba(230,0,126,0.12)]"
          aria-hidden="true"
        >
          <ShieldCheck size={28} className="drop-shadow-[0_1px_2px_rgba(230,0,126,0.2)]" strokeWidth={2.4} />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <h2 id="hero-heading" className="mt-0.5 text-[0.95rem] font-bold leading-[1.35] text-slate-900">
            ยืนยันตัวตนเพื่อเปิดร้านค้า
          </h2>
          <p className="text-[0.76rem] leading-[1.45] text-slate-500">
            กรอกข้อมูลของคุณ และ ยืนยันอีเมลมหาวิทยาลัย
          </p>
        </div>
      </div>
    </section>
  );
}

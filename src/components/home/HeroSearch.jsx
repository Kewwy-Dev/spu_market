import React from 'react';
import { Search, ScanLine } from 'lucide-react';

export default function HeroSearch({ searchQuery, onSearchChange }) {
  return (
    <section className="relative mt-2.5 flex flex-col gap-1.5 overflow-hidden rounded-[18px] bg-gradient-to-br from-[#a20857] via-[#d80072] to-[#7e22ce] px-3.5 pt-4 pb-4.5 text-white shadow-[0_8px_24px_rgba(216,0,114,0.28)]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-5 -right-5 h-[120px] w-[120px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,transparent_70%)]"
      />
      <div className="mb-0.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-0.5 text-[0.65rem] font-bold tracking-[0.5px] backdrop-blur-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.4)]" />
        <span>LINE MINI APP • ON CAMPUS</span>
      </div>

      <h1 className="text-[1.15rem] font-extrabold leading-[1.25] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]">
        SPU Student Market
      </h1>

      <p className="mb-2 text-[0.72rem] leading-[1.4] text-white/90">
        ตลาดนัดชาวเด็กแนว ศรีปทุม ช้อป-ส่งต่อปลอดภัยภายในมหาลัย
      </p>

      <div className="flex h-[42px] items-center gap-2 rounded-xl bg-white pr-2.5 pl-3 shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow focus-within:ring-2 focus-within:ring-white/60">
        <div className="flex items-center text-slate-400">
          <Search size={18} strokeWidth={2.4} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ค้นหาหนังสือเรียน, อุปกรณ์การเรียน, เสื้อผ้า..."
          className="min-w-0 flex-1 border-0 bg-transparent text-[0.78rem] text-slate-900 outline-none focus:outline-none placeholder:text-[0.76rem] placeholder:text-slate-400"
        />
        <button
          type="button"
          className="flex items-center rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-spu-pink"
          title="สแกนหรือตั้งค่าตัวกรอง"
          aria-label="ตัวกรอง"
        >
          <ScanLine size={18} strokeWidth={2} />
        </button>
      </div>
    </section>
  );
}

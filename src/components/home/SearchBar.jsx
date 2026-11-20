import React from 'react';
import { Search, ScanLine, X } from 'lucide-react';

export default function SearchBar({ searchQuery, onSearchChange }) {
  return (
    <div className="w-full border-b border-slate-100 bg-white py-2.5">
      <div className="mx-auto w-full max-w-7xl px-3.5 sm:px-6">
        <div className="group flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white pr-2.5 pl-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all focus-within:border-spu-pink focus-within:ring-[3px] focus-within:ring-spu-pink/15">
          <div className="flex items-center text-slate-400 group-focus-within:text-spu-pink" aria-hidden="true">
            <Search size={18} strokeWidth={2.4} />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาหนังสือเรียน, อุปกรณ์การเรียน, เสื้อผ้า..."
            className="min-w-0 flex-1 border-0 bg-transparent text-[0.8rem] sm:text-sm text-slate-900 outline-none focus:outline-none placeholder:text-[0.76rem] placeholder:text-slate-400"
            aria-label="ค้นหาสินค้าใน SPU Market"
          />

          {searchQuery ? (
            <button
              type="button"
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition-colors hover:bg-slate-300 hover:text-slate-800"
              onClick={() => onSearchChange('')}
              title="ล้างคำค้นหา"
              aria-label="ล้างคำค้นหา"
            >
              <X size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="flex items-center rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-spu-pink"
              title="สแกนหรือตั้งค่าตัวกรอง"
              aria-label="ตัวกรอง"
            >
              <ScanLine size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

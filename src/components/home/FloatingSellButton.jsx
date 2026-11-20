import React from 'react';
import { PlusCircle } from 'lucide-react';

export default function FloatingSellButton({ onClick }) {
  return (
    <button
      type="button"
      className="fixed right-4 bottom-[84px] z-50 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#e6007e] to-[#d81b60] px-[18px] py-2.5 text-[0.84rem] font-bold text-white shadow-[0_8px_24px_rgba(230,0,126,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_28px_rgba(230,0,126,0.55)] active:scale-[0.98] sm:right-6 lg:hidden"
      onClick={onClick}
      aria-label="ลงขายสินค้า"
    >
      <PlusCircle size={18} strokeWidth={2.5} />
      <span>ลงขายสินค้า</span>
    </button>
  );
}

import React from 'react';
import { PlusCircle } from 'lucide-react';

export default function FloatingSellButton({ onClick }) {
  return (
    <button
      type="button"
      className="floating-sell-btn"
      onClick={onClick}
      aria-label="ลงขายสินค้า"
    >
      <PlusCircle size={18} strokeWidth={2.5} className="sell-plus-icon" />
      <span>ลงขายสินค้า</span>
    </button>
  );
}

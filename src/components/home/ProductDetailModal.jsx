import React from 'react';
import { X, MapPin, CheckCircle2, MessageCircle } from 'lucide-react';

const TAG_BG = {
  blue: 'bg-slate-800/75 text-white',
  pink: 'bg-spu-pink/85 text-white',
  slate: 'bg-slate-600/85 text-white',
  teal: 'bg-teal-700/85 text-white',
  purple: 'bg-violet-700/85 text-white',
  orange: 'bg-orange-700/85 text-white',
};

export default function ProductDetailModal({ product, onClose, onContactSeller }) {
  if (!product) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('th-TH').format(price);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-[400px] flex-col overflow-y-auto rounded-3xl bg-white shadow-[0_24px_48px_rgba(0,0,0,0.25)] animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-3.5 right-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm transition-colors hover:bg-white hover:text-slate-900"
          onClick={onClose}
          aria-label="ปิด"
        >
          <X size={20} />
        </button>

        <div className="relative aspect-[16/10] w-full shrink-0 bg-slate-900">
          <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
          {product.tag && (
            <span
              className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-[0.7rem] font-bold backdrop-blur-xs ${
                TAG_BG[product.tagColor || 'blue'] || TAG_BG.blue
              }`}
            >
              {product.tag}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3 px-4.5 pt-4 pb-5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[1.4rem] font-extrabold text-spu-pink tabular-nums">
              ฿{formatPrice(product.price)}
            </span>
            <span className="text-[0.72rem] text-slate-400">{product.timeAgo}</span>
          </div>

          <h3 className="text-base font-bold leading-[1.4] text-slate-900">{product.title}</h3>
          {product.description && (
            <p className="text-[0.78rem] leading-relaxed text-slate-600">{product.description}</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[0.74rem] font-semibold text-slate-600">
              <MapPin size={13} />
              <span>{product.location}</span>
            </div>
            {product.building && (
              <div className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-[0.74rem] font-semibold text-violet-600">
                <span>📍 {product.building}</span>
              </div>
            )}
          </div>

          {/* Seller Card */}
          <div className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-slate-50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-pink-200 text-[1.1rem] font-extrabold text-spu-pink">
              {product.seller.charAt(0)}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[0.84rem] font-bold text-slate-900">{product.seller}</span>
                {product.verified && <CheckCircle2 size={14} className="shrink-0 text-spu-teal" />}
              </div>
              <span className="text-[0.68rem] text-slate-500">นักศึกษามหาวิทยาลัยศรีปทุม ยืนยันตัวตนแล้ว</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-1.5">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 text-[0.92rem] font-bold text-white shadow-[0_6px_18px_rgba(5,150,105,0.35)] transition-all duration-200 hover:-translate-y-px hover:from-emerald-700 hover:to-emerald-800"
              onClick={() => onContactSeller(product)}
            >
              <MessageCircle size={18} strokeWidth={2.2} />
              <span>ติดต่อผู้ขาย / นัดรับในมอ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

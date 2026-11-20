import React from 'react';
import { MapPin, CheckCircle2 } from 'lucide-react';

const TAG_BG = {
  blue: 'bg-slate-800/75 text-white',
  pink: 'bg-spu-pink/85 text-white',
  slate: 'bg-slate-600/85 text-white',
  teal: 'bg-teal-700/85 text-white',
  purple: 'bg-violet-700/85 text-white',
  orange: 'bg-orange-700/85 text-white',
};

export default function ProductCard({ product, onSelectProduct }) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('th-TH').format(price);
  };

  return (
    <article
      className="group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-[14px] border border-slate-100 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-spu-pink-border hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)]"
      onClick={() => onSelectProduct?.(product)}
      tabIndex={0}
      role="button"
      aria-label={`${product.title} ราคา ${product.price} บาท`}
    >
      <div className="relative aspect-[1/0.88] w-full overflow-hidden bg-slate-50">
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {product.tag && (
          <span
            className={`absolute top-1.5 left-1.5 rounded-full px-[7px] py-0.5 text-[0.62rem] font-bold backdrop-blur-xs ${
              TAG_BG[product.tagColor || 'blue'] || TAG_BG.blue
            }`}
          >
            {product.tag}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2.5 pt-2 pb-2.5">
        <h4 className="line-clamp-2 min-h-[2.1em] text-[0.78rem] sm:text-sm font-semibold leading-[1.35] text-slate-800" title={product.title}>
          {product.title}
        </h4>

        <div className="text-[0.98rem] sm:text-base font-extrabold tracking-[-0.3px] text-spu-pink tabular-nums">
          ฿{formatPrice(product.price)}
        </div>

        <div className="inline-flex w-fit max-w-full items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.64rem] text-slate-600">
          <MapPin size={11} className="shrink-0 text-slate-400" />
          <span className="truncate">{product.location}</span>
        </div>

        <div className="mt-0.5 flex items-center justify-start gap-1 border-t border-slate-50 pt-1">
          <span className="max-w-[120px] truncate text-[0.65rem] text-slate-500" title={product.seller}>
            {product.seller}
          </span>

          {product.verified && (
            <CheckCircle2 size={14} className="shrink-0 text-spu-teal" />
          )}
        </div>
      </div>
    </article>
  );
}

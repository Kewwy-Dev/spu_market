import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutGrid, X } from 'lucide-react';
import { listCategories } from '../../lib/marketplace';

const ALL_CATEGORY = { id: 'all', slug: 'all', name: 'ทั้งหมด' };

function cleanCategoryName(name = '') {
  return name.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim();
}

export default function CategoryList({ activeCategory, onSelectCategory, categories: propCategories }) {
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categories, setCategories] = useState(propCategories || []);
  const [activeDot, setActiveDot] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;
    if (propCategories?.length) {
      setCategories(propCategories);
      return;
    }
    listCategories()
      .then((rows) => {
        if (!isCurrent) return;
        setCategories(rows);
      })
      .catch((error) => {
        console.warn('Could not load categories in CategoryList:', error);
      });
    return () => {
      isCurrent = false;
    };
  }, [propCategories]);

  const categoryList = [ALL_CATEGORY, ...categories];

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setIsScrollable(maxScroll > 6);
    if (maxScroll > 6) {
      const ratio = el.scrollLeft / maxScroll;
      if (ratio <= 0.25) setActiveDot(0);
      else if (ratio >= 0.75) setActiveDot(2);
      else setActiveDot(1);
    } else {
      setActiveDot(0);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    const handleResize = () => updateScrollState();
    window.addEventListener('resize', handleResize);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateScrollState());
      resizeObserver.observe(el);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [categoryList.length, updateScrollState]);

  const scrollToDot = (index) => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    let target = 0;
    if (index === 1) target = maxScroll / 2;
    else if (index === 2) target = maxScroll;
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  const selectCategory = (categoryKey) => {
    onSelectCategory(categoryKey);
    setCategoryModalOpen(false);
  };

  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-[14px] border border-pink-100 bg-[#fff5f9] px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <LayoutGrid size={17} className="text-spu-pink" strokeWidth={2.2} />
          <h2 className="text-[0.88rem] sm:text-base font-bold text-slate-900">หมวดหมู่สินค้า</h2>
        </div>
        <button
          type="button"
          className="text-[0.74rem] sm:text-xs font-semibold text-spu-pink hover:underline"
          onClick={() => setCategoryModalOpen(true)}
        >
          ดูทั้งหมด
        </button>
      </div>

      <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist" ref={scrollRef} onScroll={updateScrollState}>
        {categoryList.map((cat) => {
          const catKey = cat.slug || cat.id;
          const isActive = activeCategory === catKey;
          const displayName = cleanCategoryName(cat.name || cat.category_name);
          return (
            <button
              key={catKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-[5px] text-[0.72rem] font-semibold transition-all duration-200 ${
                isActive
                  ? 'border-spu-pink bg-spu-pink text-white shadow-[0_2px_8px_rgba(230,0,126,0.25)]'
                  : 'border-pink-100 bg-white text-slate-600 hover:border-spu-pink-border hover:bg-[#fff0f6]'
              }`}
              onClick={() => selectCategory(catKey)}
            >
              {displayName}
            </button>
          );
        })}
      </div>

      {/* Scroll indicator dots */}
      {isScrollable && (
        <div className="-mt-[3px] flex justify-center gap-[5px] pt-px" role="tablist" aria-label="ตัวบอกตำแหน่งการเลื่อนหมวดหมู่">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={activeDot === index}
              aria-label={`เลื่อนหมวดหมู่ไปตำแหน่งที่ ${index + 1}`}
              className={`h-1.5 cursor-pointer rounded-full border-0 p-0 transition-all duration-300 ${
                activeDot === index ? 'w-[18px] bg-spu-pink' : 'w-1.5 bg-[rgba(209,14,120,0.2)]'
              }`}
              onClick={() => scrollToDot(index)}
            />
          ))}
        </div>
      )}

      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/52 p-[18px]"
          onClick={() => setCategoryModalOpen(false)}
        >
          <section
            className="max-h-[80vh] w-full max-w-[420px] overflow-auto rounded-[18px] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.22)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="mb-3 flex items-center justify-between">
              <h2 id="category-modal-title" className="text-[0.9rem] font-bold text-[#172033]">เลือกหมวดหมู่สินค้า</h2>
              <button
                type="button"
                aria-label="ปิด"
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
                onClick={() => setCategoryModalOpen(false)}
              >
                <X size={20} />
              </button>
            </header>
            <div className="grid gap-[7px]">
              {categoryList.map((cat) => {
                const catKey = cat.slug || cat.id;
                const displayName = cleanCategoryName(cat.name || cat.category_name);
                const selected = activeCategory === catKey;
                return (
                  <button
                    type="button"
                    key={catKey}
                    className={`rounded-[11px] border px-3 py-2.5 text-left text-[0.75rem] transition-colors ${
                      selected
                        ? 'border-spu-pink-border bg-spu-pink-light font-bold text-spu-pink'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => selectCategory(catKey)}
                  >
                    {displayName}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

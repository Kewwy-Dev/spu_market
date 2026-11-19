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
    <section className="category-section">
      <div className="section-title-row">
        <div className="title-left">
          <LayoutGrid size={17} className="title-icon-pink" strokeWidth={2.2} />
          <h2 className="section-heading">หมวดหมู่สินค้า</h2>
        </div>
        <button
          type="button"
          className="see-all-link"
          onClick={() => setCategoryModalOpen(true)}
        >
          ดูทั้งหมด
        </button>
      </div>

      <div className="category-pills-scroll" role="tablist" ref={scrollRef} onScroll={updateScrollState}>
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
              className={`category-pill-btn ${isActive ? 'active' : ''}`}
              onClick={() => selectCategory(catKey)}
            >
              {displayName}
            </button>
          );
        })}
      </div>

      {/* Scroll indicator dots */}
      {isScrollable && (
        <div className="slider-dots-container" role="tablist" aria-label="ตัวบอกตำแหน่งการเลื่อนหมวดหมู่">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={activeDot === index}
              aria-label={`เลื่อนหมวดหมู่ไปตำแหน่งที่ ${index + 1}`}
              className={`slider-dot ${activeDot === index ? 'active' : ''}`}
              onClick={() => scrollToDot(index)}
            />
          ))}
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="category-modal-backdrop" onClick={() => setCategoryModalOpen(false)}>
          <section className="category-modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title" onClick={(event) => event.stopPropagation()}>
            <header className="category-modal-header">
              <h2 id="category-modal-title">เลือกหมวดหมู่สินค้า</h2>
              <button type="button" aria-label="ปิด" onClick={() => setCategoryModalOpen(false)}>
                <X size={20} />
              </button>
            </header>
            <div className="category-modal-options">
              {categoryList.map((cat) => {
                const catKey = cat.slug || cat.id;
                const displayName = cleanCategoryName(cat.name || cat.category_name);
                return (
                  <button
                    type="button"
                    key={catKey}
                    className={`category-modal-option ${activeCategory === catKey ? 'selected' : ''}`}
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

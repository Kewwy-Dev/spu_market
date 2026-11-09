import React, { useState } from 'react';
import { LayoutGrid, X } from 'lucide-react';
import { CATEGORIES } from '../../data/products';

export default function CategoryList({ activeCategory, onSelectCategory }) {
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const selectCategory = (category) => {
    onSelectCategory(category);
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

      <div className="category-pills-scroll" role="tablist">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`category-pill-btn ${isActive ? 'active' : ''}`}
              onClick={() => selectCategory(cat.id)}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
      {isCategoryModalOpen && <div className="category-modal-backdrop" onClick={() => setCategoryModalOpen(false)}>
        <section className="category-modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title" onClick={(event) => event.stopPropagation()}>
          <header className="category-modal-header"><h2 id="category-modal-title">เลือกหมวดหมู่สินค้า</h2><button type="button" aria-label="ปิด" onClick={() => setCategoryModalOpen(false)}><X size={20} /></button></header>
          <div className="category-modal-options">
            {CATEGORIES.map((cat) => <button type="button" key={cat.id} className={`category-modal-option ${activeCategory === cat.id ? 'selected' : ''}`} onClick={() => selectCategory(cat.id)}>{cat.name}</button>)}
          </div>
        </section>
      </div>}
    </section>
  );
}

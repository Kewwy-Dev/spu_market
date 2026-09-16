import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { CATEGORIES } from '../../data/products';

export default function CategoryList({ activeCategory, onSelectCategory }) {
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
          onClick={() => onSelectCategory('all')}
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
              onClick={() => onSelectCategory(cat.id)}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}

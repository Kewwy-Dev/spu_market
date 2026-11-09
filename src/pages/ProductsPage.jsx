import React, { useMemo, useState } from 'react';
import { ArrowLeft, SlidersHorizontal, MapPin } from 'lucide-react';
import { CATEGORIES, LOCATIONS } from '../data/products';
import ProductCard from '../components/home/ProductCard';
import { ProductGridSkeleton, SkeletonReveal } from '../components/spectrumui/skeleton-reveal';

export default function ProductsPage({ products, onBack, onSelectProduct, isLoading = false }) {
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const visibleProducts = useMemo(() => [...products]
    .filter((product) => category === 'all' || product.category === category)
    .filter((product) => location === 'all' || product.locationSlug === location)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [products, category, location]);

  return <div className="products-page">
    <header className="products-page-header">
      <button type="button" className="products-header-icon" aria-label="ย้อนกลับ" onClick={onBack}><ArrowLeft size={20} /></button>
      <h1>สินค้าทั้งหมด</h1>
      <button type="button" className={`products-header-icon ${filterOpen ? 'selected' : ''}`} aria-label="กรองสินค้า" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}><SlidersHorizontal size={19} /></button>
    </header>
    {filterOpen && <section className="products-filter-panel">
      <h2><MapPin size={15} /> Pickup Location</h2>
      <div className="products-filter-options">{[{ id: 'all', name: 'ทุกจุดนัดรับ' }, ...LOCATIONS].map((item) => <button type="button" key={item.id} className={location === item.id ? 'selected' : ''} onClick={() => setLocation(item.id)}>{item.name}</button>)}</div>
    </section>}
    <main className="products-page-content">
      <div className="products-category-scroll" aria-label="เลือกหมวดหมู่สินค้า">{CATEGORIES.map((item) => <button type="button" key={item.id} className={category === item.id ? 'selected' : ''} onClick={() => setCategory(item.id)}>{item.name}</button>)}</div>
      <p className="products-result-count">พบสินค้า {visibleProducts.length} รายการ · เรียงจากลงขายล่าสุด</p>
      <SkeletonReveal loading={isLoading} skeleton={<ProductGridSkeleton />}>
        {visibleProducts.length ? <div className="products-two-col-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} onSelectProduct={onSelectProduct} />)}</div> : <div className="products-empty-state"><p>ไม่พบสินค้าในหมวดหมู่นี้</p><span>ลองเปลี่ยนหมวดหมู่หรือจุดนัดรับ</span></div>}
      </SkeletonReveal>
    </main>
  </div>;
}

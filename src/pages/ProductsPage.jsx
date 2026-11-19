import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, SlidersHorizontal, MapPin, LayoutGrid } from 'lucide-react';
import { listCategories, listPickupLocations } from '../lib/marketplace';
import ProductCard from '../components/home/ProductCard';
import SearchBar from '../components/home/SearchBar';
import { ProductGridSkeleton, SkeletonReveal } from '../components/spectrumui/skeleton-reveal';

function cleanCategoryName(name = '') {
  return name.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim();
}

export default function ProductsPage({
  products,
  onBack,
  onSelectProduct,
  isLoading = false,
  initialCategory = 'all',
  initialLocation = 'all',
  initialSearch = '',
  categories: propCategories,
  pickupLocations: propPickupLocations,
}) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [location, setLocation] = useState(initialLocation);
  const [filterOpen, setFilterOpen] = useState(false);
  const [fetchedCategories, setFetchedCategories] = useState([]);
  const [fetchedPickupLocations, setFetchedPickupLocations] = useState([]);
  const [activeDot, setActiveDot] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const scrollRef = useRef(null);

  const [activeLocationDot, setActiveLocationDot] = useState(0);
  const [isLocationScrollable, setIsLocationScrollable] = useState(false);
  const locationScrollRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;
    const needCategories = !propCategories?.length;
    const needLocations = !propPickupLocations?.length;

    if (needCategories || needLocations) {
      Promise.all([
        needCategories ? listCategories() : Promise.resolve(propCategories),
        needLocations ? listPickupLocations() : Promise.resolve(propPickupLocations),
      ])
        .then(([cats, locs]) => {
          if (!isCurrent) return;
          if (needCategories && cats) setFetchedCategories(cats);
          if (needLocations && locs) setFetchedPickupLocations(locs);
        })
        .catch((error) => {
          console.warn('Failed to load master data in ProductsPage:', error);
        });
    }

    return () => {
      isCurrent = false;
    };
  }, [propCategories, propPickupLocations]);

  const categories = propCategories?.length ? propCategories : fetchedCategories;
  const pickupLocations = propPickupLocations?.length ? propPickupLocations : fetchedPickupLocations;

  const visibleProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...products]
      .filter((product) => {
        if (!q) return true;
        return Boolean(product.title?.toLowerCase().includes(q));
      })
      .filter((product) => category === 'all' || product.category === category)
      .filter((product) => (
        location === 'all' ||
        product.locationSlug === location ||
        (location === 'b11' && (product.building?.includes('ตึก 11') || product.location?.includes('ตึก 11'))) ||
        (location === 'b9' && (product.building?.includes('อาคาร 9') || product.location?.includes('อาคาร 9'))) ||
        (location === 'b1' && (product.building?.includes('อาคาร 1') || product.location?.includes('อาคาร 1'))) ||
        (location === 'canteen' && (product.building?.includes('โรงอาหาร') || product.location?.includes('โรงอาหาร')))
      ))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [products, searchQuery, category, location]);

  const allCategories = useMemo(() => [
    { id: 'all', slug: 'all', name: 'ทั้งหมด' },
    ...categories.filter((cat) => (cat.slug || cat.id) !== 'all'),
  ], [categories]);

  const allLocations = useMemo(() => [
    { id: 'all', slug: 'all', name: 'ทุกจุดนัดรับ' },
    ...pickupLocations.filter((loc) => (loc.slug || loc.id) !== 'all'),
  ], [pickupLocations]);

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
  }, [filterOpen, allCategories.length, updateScrollState]);

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

  const updateLocationScrollState = useCallback(() => {
    const el = locationScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setIsLocationScrollable(maxScroll > 6);
    if (maxScroll > 6) {
      const ratio = el.scrollLeft / maxScroll;
      if (ratio <= 0.25) setActiveLocationDot(0);
      else if (ratio >= 0.75) setActiveLocationDot(2);
      else setActiveLocationDot(1);
    } else {
      setActiveLocationDot(0);
    }
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const el = locationScrollRef.current;
    if (!el) return;

    updateLocationScrollState();

    const handleResize = () => updateLocationScrollState();
    window.addEventListener('resize', handleResize);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateLocationScrollState());
      resizeObserver.observe(el);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [filterOpen, allLocations.length, updateLocationScrollState]);

  const scrollToLocationDot = (index) => {
    const el = locationScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    let target = 0;
    if (index === 1) target = maxScroll / 2;
    else if (index === 2) target = maxScroll;
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  return (
    <div className="products-page">
      <header className="products-page-header">
        <div className="products-header-left">
          <button type="button" className="chat-list-back-btn" aria-label="ย้อนกลับ" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <h1>สินค้าทั้งหมด</h1>
        </div>
        <button
          type="button"
          className={`products-header-icon ${filterOpen ? 'selected' : ''}`}
          aria-label="กรองสินค้า"
          aria-expanded={filterOpen}
          onClick={() => setFilterOpen((open) => !open)}
        >
          <SlidersHorizontal size={19} />
        </button>
      </header>

      <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {filterOpen && (
        <section className="products-filter-panel">
          <div className="products-filter-group">
            <h2 className="category-heading"><LayoutGrid size={15} /> หมวดหมู่สินค้า</h2>
            <div className="products-category-scroll" aria-label="เลือกหมวดหมู่สินค้า" ref={scrollRef} onScroll={updateScrollState}>
              {allCategories.map((item) => {
                const itemKey = item.slug || item.id;
                return (
                  <button
                    type="button"
                    key={itemKey}
                    className={category === itemKey ? 'selected' : ''}
                    onClick={() => setCategory(itemKey)}
                  >
                    {cleanCategoryName(item.name || item.category_name)}
                  </button>
                );
              })}
            </div>

            {isScrollable && (
              <div className="slider-dots-container products-category-dots" role="tablist" aria-label="ตัวบอกตำแหน่งการเลื่อนหมวดหมู่">
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
          </div>

          <div className="products-filter-group">
            <h2 className="location-heading"><MapPin size={15} /> จุดนัดรับ (Pickup Location)</h2>
            <div className="products-filter-options" ref={locationScrollRef} onScroll={updateLocationScrollState}>
              {allLocations.map((item) => {
                const itemKey = item.slug || item.id;
                return (
                  <button
                    type="button"
                    key={itemKey}
                    className={location === itemKey ? 'selected' : ''}
                    onClick={() => setLocation(itemKey)}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>

            {isLocationScrollable && (
              <div className="slider-dots-container products-location-dots" role="tablist" aria-label="ตัวบอกตำแหน่งการเลื่อนจุดนัดรับ">
                {[0, 1, 2].map((index) => (
                  <button
                    key={index}
                    type="button"
                    role="tab"
                    aria-selected={activeLocationDot === index}
                    aria-label={`เลื่อนจุดนัดรับไปตำแหน่งที่ ${index + 1}`}
                    className={`slider-dot ${activeLocationDot === index ? 'active' : ''}`}
                    onClick={() => scrollToLocationDot(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <main className="products-page-content">
        <p className="products-result-count">พบสินค้า {visibleProducts.length} รายการ · เรียงจากลงขายล่าสุด</p>

        <SkeletonReveal loading={isLoading} skeleton={<ProductGridSkeleton />}>
          {visibleProducts.length ? (
            <div className="products-two-col-grid">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} onSelectProduct={onSelectProduct} />
              ))}
            </div>
          ) : (
            <div className="products-empty-state">
              <p>ไม่พบสินค้าในหมวดหมู่นี้</p>
              <span>ลองเปลี่ยนหมวดหมู่หรือจุดนัดรับ</span>
            </div>
          )}
        </SkeletonReveal>
      </main>
    </div>
  );
}

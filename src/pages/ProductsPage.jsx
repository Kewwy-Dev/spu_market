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
    <div className="min-h-dvh w-full bg-slate-50">
      <header className="sticky top-0 z-[35] w-full border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-2.5 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 hover:text-spu-pink"
              aria-label="ย้อนกลับ"
              onClick={onBack}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="m-0 truncate text-base sm:text-lg font-bold text-slate-900">สินค้าทั้งหมด</h1>
          </div>
          <button
            type="button"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${
              filterOpen ? 'bg-spu-pink-light text-spu-pink' : 'text-slate-700 hover:bg-slate-100'
            }`}
            aria-label="กรองสินค้า"
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((open) => !open)}
          >
            <SlidersHorizontal size={19} />
          </button>
        </div>
      </header>

      <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {filterOpen && (
        <section className="w-full border-b border-slate-200 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2.5 px-3.5 pt-3 pb-2.5 sm:px-6">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 flex items-center gap-1.5 text-[0.78rem] font-bold text-pink-900">
                <LayoutGrid size={15} className="text-spu-pink" /> หมวดหมู่สินค้า
              </h2>
              <div
                className="scrollbar-none -mx-3.5 flex gap-[7px] overflow-x-auto px-3.5 pb-[3px] sm:mx-0 sm:px-0"
                aria-label="เลือกหมวดหมู่สินค้า"
                ref={scrollRef}
                onScroll={updateScrollState}
              >
                {allCategories.map((item) => {
                  const itemKey = item.slug || item.id;
                  const selected = category === itemKey;
                  return (
                    <button
                      type="button"
                      key={itemKey}
                      className={`shrink-0 max-w-[220px] truncate rounded-full border px-3 py-1.5 text-[0.7rem] font-semibold transition-all duration-200 ${
                        selected
                          ? 'border-spu-pink bg-spu-pink text-white shadow-[0_2px_8px_rgba(230,0,126,0.2)]'
                          : 'border-pink-100 bg-white text-slate-600 hover:border-spu-pink-border hover:bg-[#fff5f9]'
                      }`}
                      onClick={() => setCategory(itemKey)}
                    >
                      {cleanCategoryName(item.name || item.category_name)}
                    </button>
                  );
                })}
              </div>

              {isScrollable && (
                <div className="mt-0.5 mb-0.5 flex justify-center gap-[5px]" role="tablist" aria-label="ตัวบอกตำแหน่งการเลื่อนหมวดหมู่">
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
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="m-0 flex items-center gap-1.5 text-[0.78rem] font-bold text-purple-950">
                <MapPin size={15} className="text-purple-600" /> จุดนัดรับ (Pickup Location)
              </h2>
              <div
                className="scrollbar-none -mx-3.5 flex flex-nowrap gap-[7px] overflow-x-auto px-3.5 pb-[3px] sm:mx-0 sm:px-0"
                ref={locationScrollRef}
                onScroll={updateLocationScrollState}
              >
                {allLocations.map((item) => {
                  const itemKey = item.slug || item.id;
                  const selected = location === itemKey;
                  return (
                    <button
                      type="button"
                      key={itemKey}
                      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[0.7rem] font-semibold transition-all duration-200 ${
                        selected
                          ? 'border-spu-pink bg-spu-pink text-white shadow-[0_2px_8px_rgba(230,0,126,0.2)]'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                      onClick={() => setLocation(itemKey)}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>

              {isLocationScrollable && (
                <div className="mt-0.5 mb-0.5 flex justify-center gap-[5px]" role="tablist" aria-label="ตัวบอกตำแหน่งการเลื่อนจุดนัดรับ">
                  {[0, 1, 2].map((index) => (
                    <button
                      key={index}
                      type="button"
                      role="tab"
                      aria-selected={activeLocationDot === index}
                      aria-label={`เลื่อนจุดนัดรับไปตำแหน่งที่ ${index + 1}`}
                      className={`h-1.5 cursor-pointer rounded-full border-0 p-0 transition-all duration-300 ${
                        activeLocationDot === index ? 'w-[18px] bg-purple-600' : 'w-1.5 bg-purple-600/20'
                      }`}
                      onClick={() => scrollToLocationDot(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto w-full max-w-7xl px-3.5 pt-3 pb-16 sm:px-6">
        <p className="mb-2.5 text-[0.7rem] sm:text-xs text-slate-500">
          พบสินค้า {visibleProducts.length} รายการ · เรียงจากลงขายล่าสุด
        </p>

        <SkeletonReveal loading={isLoading} skeleton={<ProductGridSkeleton />}>
          {visibleProducts.length ? (
            <div className="grid w-full min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4 lg:gap-4">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} onSelectProduct={onSelectProduct} />
              ))}
            </div>
          ) : (
            <div className="rounded-[14px] border border-dashed border-slate-300 bg-white px-4 py-9 text-center">
              <p className="mb-1 text-[0.88rem] font-bold text-slate-700">ไม่พบสินค้าในหมวดหมู่นี้</p>
              <span className="text-[0.74rem] text-slate-500">ลองเปลี่ยนหมวดหมู่หรือจุดนัดรับ</span>
            </div>
          )}
        </SkeletonReveal>
      </div>
    </div>
  );
}

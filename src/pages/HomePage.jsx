import React, { useState, useMemo } from 'react';
import AppHeader from '../components/common/AppHeader';
import SearchBar from '../components/home/SearchBar';
import HeroBannerSlider from '../components/home/HeroBannerSlider';
import QuickActions from '../components/home/QuickActions';
import CategoryList from '../components/home/CategoryList';
import LocationFilter from '../components/home/LocationFilter';
import ProductGrid from '../components/home/ProductGrid';
import TrustNotice from '../components/home/TrustNotice';
import FloatingSellButton from '../components/home/FloatingSellButton';
import { PRODUCTS } from '../data/products';
import { ProductGridSkeleton, SkeletonReveal } from '../components/spectrumui/skeleton-reveal';

export default function HomePage({
  onNavigateToRegister,
  onNavigateToLogin,
  onNavigateToSeller,
  onNavigateToProducts,
  onSelectProduct,
  currentUser,
  onLogout,
  products = PRODUCTS,
  productsUpdatedAt = null,
  productError = '',
  isLoadingProducts = false,
  notificationCount = 0,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeLocation, setActiveLocation] = useState('all');

  // Filter products based on search, category, and location
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Search filter
      const matchesSearch = !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;

      // Location filter
      const matchesLocation = activeLocation === 'all' || item.locationSlug === activeLocation ||
        (activeLocation === 'b11' && item.building.includes('ตึก 11')) ||
        (activeLocation === 'b9' && item.building.includes('อาคาร 9')) ||
        (activeLocation === 'b1' && item.building.includes('อาคาร 1')) ||
        (activeLocation === 'canteen' && item.building.includes('โรงอาหาร'));

      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [products, searchQuery, activeCategory, activeLocation]);

  const _handleContactSeller = (product) => {
    alert(`กำลังเชื่อมต่อไปยัง LINE / ช่องทางแชทของ ${product.seller} เพื่อพูดคุยและนัดรับที่ ${product.location}`);
  };

  const handleSellClick = () => {
    if (onNavigateToSeller) {
      onNavigateToSeller();
    }
  };

  const handleNotification = () => {
    alert('ไม่มีการแจ้งเตือนใหม่ในขณะนี้');
  };

  return (
    <div className="home-page-root">
      {/* 1. App Header — sticky, full width */}
      <AppHeader
        onNotificationClick={handleNotification}
        currentUser={currentUser}
        notificationCount={notificationCount}
        onNavigateToLogin={onNavigateToLogin}
        onLogout={onLogout}
      />

      {(productError || isLoadingProducts) && (
        <div className={`market-data-notice ${productError ? 'is-error' : ''}`} role={productError ? 'alert' : 'status'}>
          {productError || 'Loading marketplace listings...'}
        </div>
      )}
      {!productError && !isLoadingProducts && products.length === 0 && (
        <div className="market-data-notice" role="status">
          No listings are available yet. Confirm that `supabase/seed.sql` has been run in the Supabase SQL Editor.
        </div>
      )}

      {/* 2. Standalone Search Bar — sticky below header, full width */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 3. Auto-sliding Hero Banner Slider — full width with its own margin */}
      <HeroBannerSlider
        onNavigateToRegister={onNavigateToRegister}
      />

      {/* 4-9: Scrollable content */}
      <div className="home-page-content">
        {/* 4. Quick Actions */}
        <QuickActions
          onNavigateToRegister={onNavigateToRegister}
          onActionSelect={(action) => {
            if (action === 'seller') {
              handleSellClick();
            } else if (action === 'buy') {
              onNavigateToProducts?.();
            } else if (action === 'help') {
              alert('ศูนย์ช่วยเหลือ SPU Market: ติดต่อประสานงานแอดมินกลุ่ม หรือแจ้งข้อพิพาท โทร 02-579-1111 หรือ LINE Official @spumarket');
            }
          }}
        />

        {/* 5. Category Pills */}
        <CategoryList
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />

        {/* 6. Campus Location Filter */}
        <LocationFilter
          activeLocation={activeLocation}
          onSelectLocation={setActiveLocation}
        />

        {/* 7. Products Feed */}
        <SkeletonReveal loading={isLoadingProducts} skeleton={<ProductGridSkeleton count={4} />}>
          <ProductGrid products={filteredProducts} updatedAt={productsUpdatedAt} onSelectProduct={onSelectProduct} />
        </SkeletonReveal>

        {/* 8. Trust Guarantee Banner */}
        <TrustNotice onNavigateToRegister={onNavigateToRegister} />
      </div>

      {/* 9. Floating Sell Button */}
      <FloatingSellButton onClick={handleSellClick} />

    </div>
  );
}

import React, { useState, useMemo, useRef, useEffect } from 'react';
import AppHeader from '../components/common/AppHeader';
import NotificationDrawer from '../components/NotificationDrawer';
import SupportReportModal from '../components/SupportReportModal';
import HeroBannerSlider from '../components/home/HeroBannerSlider';
import QuickActions from '../components/home/QuickActions';
import CategoryList from '../components/home/CategoryList';
import LocationFilter from '../components/home/LocationFilter';
import ProductGrid from '../components/home/ProductGrid';
import FloatingSellButton from '../components/home/FloatingSellButton';
import { PRODUCTS } from '../data/products';
import { ProductGridSkeleton, SkeletonReveal } from '../components/spectrumui/skeleton-reveal';

export default function HomePage({
  onNavigateToRegister,
  onNavigateToLogin,
  onNavigateToSeller,
  onNavigateToAddProduct,
  onNavigateToProducts,
  onSelectProduct,
  currentUser,
  onLogout,
  products = PRODUCTS,
  productsUpdatedAt = null,
  productError = '',
  isLoadingProducts = false,
  notificationCount = 0,
  notifications = [],
  notificationsLoading = false,
  onSelectNotification,
  onMarkAllNotificationsRead,
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeLocation, setActiveLocation] = useState('all');
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(() => (
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('help') === '1'
  ));
  const locationSectionRef = useRef(null);

  // Filter products based on category and location
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Category filter
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;

      // Location filter
      const matchesLocation = activeLocation === 'all' || item.locationSlug === activeLocation ||
        (activeLocation === 'b11' && (item.building?.includes('ตึก 11') || item.location?.includes('ตึก 11'))) ||
        (activeLocation === 'b9' && (item.building?.includes('อาคาร 9') || item.location?.includes('อาคาร 9'))) ||
        (activeLocation === 'b1' && (item.building?.includes('อาคาร 1') || item.location?.includes('อาคาร 1'))) ||
        (activeLocation === 'canteen' && (item.building?.includes('โรงอาหาร') || item.location?.includes('โรงอาหาร')));

      return matchesCategory && matchesLocation;
    });
  }, [products, activeCategory, activeLocation]);

  const handleSellClick = () => {
    if (onNavigateToSeller) {
      onNavigateToSeller();
    }
  };

  const handleNotification = () => {
    setShowNotificationDrawer(true);
  };

  const handleScrollToLocations = () => {
    if (locationSectionRef.current) {
      locationSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      const el = document.getElementById('pickup-locations');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    if (!productError && !isLoadingProducts && products.length === 0) {
      console.info('No listings are available yet. Confirm that `supabase/seed.sql` has been run in the Supabase SQL Editor.');
    }
  }, [productError, isLoadingProducts, products.length]);

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col bg-slate-50">
      {/* 1. App Header — sticky, full width */}
      <AppHeader
        onNotificationClick={handleNotification}
        currentUser={currentUser}
        notificationCount={notificationCount}
        onNavigateToLogin={onNavigateToLogin}
        onLogout={onLogout}
      />

      {(productError || isLoadingProducts) && (
        <div className="mx-auto w-full max-w-7xl px-3.5 pt-2 sm:px-6">
          <div
            className={`rounded-[10px] px-3 py-2.5 text-[13px] ${
              productError ? 'bg-rose-50 text-rose-800' : 'bg-slate-100 text-slate-600'
            }`}
            role={productError ? 'alert' : 'status'}
          >
            {productError || 'Loading marketplace listings...'}
          </div>
        </div>
      )}

      {/* 3. Auto-sliding Hero Banner Slider */}
      <div className="mx-auto w-full max-w-7xl px-3.5 pt-3 sm:px-6">
        <HeroBannerSlider
          onNavigateToRegister={onNavigateToRegister}
          onNavigateToProducts={onNavigateToProducts}
          onSelectLocationSection={handleScrollToLocations}
        />
      </div>

      {/* 4-9: Scrollable content */}
      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-3.5 px-3.5 pt-3 pb-24 sm:px-6">
        {/* 4. Quick Actions */}
        <QuickActions
          isSeller={['seller', 'admin'].includes(currentUser?.role?.toLowerCase())}
          isAdmin={currentUser?.role?.toLowerCase() === 'admin'}
          isLoggedIn={Boolean(currentUser)}
          onNavigateToRegister={onNavigateToRegister}
          onNavigateToLogin={() => onNavigateToLogin?.({ type: 'tab', tab: 'register' })}
          onActionSelect={(action) => {
            if (action === 'seller') {
              handleSellClick();
            } else if (action === 'buy') {
              onNavigateToProducts?.();
            } else if (action === 'help') {
              setShowHelpModal(true);
            }
          }}
        />

        {/* 5. Category Pills */}
        <CategoryList
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />

        {/* 6. Campus Location Filter */}
        <div ref={locationSectionRef} id="pickup-locations" className="min-w-0">
          <LocationFilter
            activeLocation={activeLocation}
            onSelectLocation={setActiveLocation}
          />
        </div>

        {/* 7. Products Feed */}
        <SkeletonReveal loading={isLoadingProducts} skeleton={<ProductGridSkeleton count={4} />}>
          <ProductGrid products={filteredProducts} updatedAt={productsUpdatedAt} onSelectProduct={onSelectProduct} />
        </SkeletonReveal>
      </div>

      {/* 9. Floating Sell Button */}
      {['seller', 'admin'].includes(currentUser?.role?.toLowerCase()) && (
        <FloatingSellButton onClick={() => onNavigateToAddProduct?.()} />
      )}

      {/* Notification Drawer / Bottom Sheet */}
      <NotificationDrawer
        isOpen={showNotificationDrawer}
        onClose={() => setShowNotificationDrawer(false)}
        currentUser={currentUser}
        notifications={notifications}
        unreadCount={notificationCount}
        isLoading={notificationsLoading}
        onSelectNotification={(item) => {
          setShowNotificationDrawer(false);
          onSelectNotification?.(item);
        }}
        onMarkAllRead={onMarkAllNotificationsRead}
        onNavigateToLogin={onNavigateToLogin}
      />

      {/* Help & Support Modal */}
      <SupportReportModal
        isOpen={showHelpModal}
        onClose={() => {
          setShowHelpModal(false);
          if (new URLSearchParams(window.location.search).get('help') === '1') {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
        currentUser={currentUser}
        onNavigateToLogin={() => onNavigateToLogin?.({ type: 'tab', tab: 'home' })}
      />

    </div>
  );
}

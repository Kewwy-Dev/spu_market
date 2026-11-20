import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LifeBuoy, Phone, MessageCircle, X } from 'lucide-react';
import AppHeader from '../components/common/AppHeader';
import NotificationDrawer from '../components/NotificationDrawer';
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
  const [showHelpModal, setShowHelpModal] = useState(false);
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
          isSeller={currentUser?.role?.toLowerCase() === 'seller'}
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
      {currentUser?.role?.toLowerCase() === 'seller' && (
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
      {showHelpModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={() => setShowHelpModal(false)}
          role="presentation"
        >
          <div
            className="flex w-full max-w-md flex-col gap-4 rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-help-title"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-spu-teal-light text-spu-teal">
                <LifeBuoy size={20} />
              </div>
              <h3 id="home-help-title" className="flex-1 text-base font-bold text-slate-900">
                ศูนย์ช่วยเหลือ &amp; แจ้งปัญหา
              </h3>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                onClick={() => setShowHelpModal(false)}
                aria-label="ปิดศูนย์ช่วยเหลือ"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3 text-[0.78rem] leading-relaxed text-slate-600">
              <p>หากพบปัญหาในการซื้อขาย ไม่มาตามนัด สินค้าไม่ตรงปก หรือต้องการความช่วยเหลือ ติดต่อผู้ดูแลระบบได้ที่:</p>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                <Phone size={16} className="mt-0.5 shrink-0 text-spu-pink" />
                <div className="flex flex-col gap-0.5">
                  <strong className="text-[0.8rem] font-bold text-slate-900">โทรด่วนฝ่ายประสานงาน SPU Market</strong>
                  <span className="text-[0.74rem] text-slate-500">02-579-1111 ต่อ 1234 (เวลาทำการ 08:30 - 16:30 น.)</span>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                <MessageCircle size={16} className="mt-0.5 shrink-0 text-spu-teal" />
                <div className="flex flex-col gap-0.5">
                  <strong className="text-[0.8rem] font-bold text-slate-900">LINE Official SPU Market</strong>
                  <span className="text-[0.74rem] text-slate-500">@spumarket (ดูแลความปลอดภัยและให้คำปรึกษาตลอด 24 ชม.)</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="h-11 w-full rounded-xl bg-spu-pink text-sm font-bold text-white transition-colors hover:bg-spu-pink-hover"
              onClick={() => setShowHelpModal(false)}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

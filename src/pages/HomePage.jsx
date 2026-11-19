import React, { useState, useMemo, useRef } from 'react';
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
      const el = document.getElementById('pickup-locations') || document.querySelector('.location-section');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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

      {/* 3. Auto-sliding Hero Banner Slider — full width with its own margin */}
      <HeroBannerSlider
        onNavigateToRegister={onNavigateToRegister}
        onNavigateToProducts={onNavigateToProducts}
        onSelectLocationSection={handleScrollToLocations}
      />

      {/* 4-9: Scrollable content */}
      <div className="home-page-content">
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
        <div ref={locationSectionRef} id="pickup-locations">
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
        <div className="appointment-modal-backdrop" onClick={() => setShowHelpModal(false)} role="presentation">
          <div
            className="profile-submodal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-help-title"
          >
            <div className="submodal-header">
              <div className="submodal-icon teal"><LifeBuoy size={20} /></div>
              <h3 id="home-help-title">ศูนย์ช่วยเหลือ &amp; แจ้งปัญหา</h3>
              <button
                type="button"
                className="submodal-close"
                onClick={() => setShowHelpModal(false)}
                aria-label="ปิดศูนย์ช่วยเหลือ"
              >
                <X size={18} />
              </button>
            </div>
            <div className="submodal-body">
              <p>หากพบปัญหาในการซื้อขาย ไม่มาตามนัด สินค้าไม่ตรงปก หรือต้องการความช่วยเหลือ ติดต่อผู้ดูแลระบบได้ที่:</p>
              <div className="help-contact-card">
                <Phone size={16} />
                <div>
                  <strong>โทรด่วนฝ่ายประสานงาน SPU Market</strong>
                  <span>02-579-1111 ต่อ 1234 (เวลาทำการ 08:30 - 16:30 น.)</span>
                </div>
              </div>
              <div className="help-contact-card">
                <MessageCircle size={16} />
                <div>
                  <strong>LINE Official SPU Market</strong>
                  <span>@spumarket (ดูแลความปลอดภัยและให้คำปรึกษาตลอด 24 ชม.)</span>
                </div>
              </div>
            </div>
            <button type="button" className="submodal-done-btn" onClick={() => setShowHelpModal(false)}>
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

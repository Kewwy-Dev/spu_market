import React, { useEffect, useState } from 'react';
import {
  Heart,
  X,
  MapPin,
  ShoppingBag,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { listUserFavorites, toggleFavoriteProduct } from '../lib/marketplace';
import { LikeButton } from './spectrumui/like-button';

const money = (value) => new Intl.NumberFormat('th-TH').format(value || 0);

export default function FavoritesModal({
  currentUser,
  onClose,
  onSelectProduct,
  onNavigateToProducts,
  onNavigateToSeller,
  onFavoritesCountChange,
}) {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!currentUser?.id) {
      setFavorites([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    listUserFavorites(currentUser.id)
      .then((items) => {
        if (!isMounted) return;
        setFavorites(items);
        setIsLoading(false);
        onFavoritesCountChange?.(items.length);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Could not load favorites:', err);
        setError('ไม่สามารถโหลดรายการที่ถูกใจได้');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const handleRemoveFavorite = async (e, product) => {
    e?.stopPropagation?.();
    if (!currentUser?.id || removingId) return;

    setRemovingId(product.id);
    const prevList = [...favorites];
    const nextList = favorites.filter((item) => item.id !== product.id);

    // Optimistic UI update
    setFavorites(nextList);
    onFavoritesCountChange?.(nextList.length);

    try {
      await toggleFavoriteProduct(product.id, currentUser.id);
    } catch (err) {
      console.error('Failed to remove favorite:', err);
      // Rollback on error
      setFavorites(prevList);
      onFavoritesCountChange?.(prevList.length);
    } finally {
      setRemovingId(null);
    }
  };

  const handleProductClick = (e, product) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!product?.id) return;
    onSelectProduct?.(product);
  };

  const handleSellerClick = (e, product) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const sellerId = product?.sellerId || product?.seller_id;
    if (!sellerId) return;
    onNavigateToSeller?.(sellerId);
  };

  return (
    <div className="pickup-history-backdrop" onClick={onClose} role="presentation">
      <section
        className="pickup-history-modal favorites-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorites-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pickup-history-header">
          <div className="pickup-history-icon favorites-header-icon">
            <Heart size={20} fill="currentColor" />
          </div>
          <div>
            <h2 id="favorites-title">สินค้าที่ถูกใจ</h2>
            <p>
              {isLoading
                ? 'กำลังโหลด...'
                : favorites.length
                ? `สินค้าที่คุณบันทึกไว้ (${favorites.length} รายการ)`
                : 'บันทึกสินค้าที่คุณสนใจไว้ดูภายหลัง'}
            </p>
          </div>
          <button
            type="button"
            className="pickup-history-close"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </header>

        {error && (
          <div className="favorites-error-msg" role="alert">
            {error}
          </div>
        )}

        <div className="favorites-list-container">
          {isLoading ? (
            <div className="favorites-loading-state">
              <div className="favorites-skeleton-card" />
              <div className="favorites-skeleton-card" />
              <div className="favorites-skeleton-card" />
            </div>
          ) : favorites.length === 0 ? (
            <div className="pickup-history-empty favorites-empty">
              <div className="favorites-empty-icon-wrap">
                <Heart size={36} />
              </div>
              <h4>ยังไม่มีสินค้าที่ถูกใจ</h4>
              {onNavigateToProducts && (
                <button
                  type="button"
                  className="favorites-explore-btn"
                  onClick={() => {
                    onClose?.();
                    onNavigateToProducts();
                  }}
                >
                  <Sparkles size={16} />
                  <span>ไปเลือกดูสินค้าในตลาด</span>
                </button>
              )}
            </div>
          ) : (
            <div className="favorites-items-list">
              {favorites.map((product) => (
                <article
                  key={product.id}
                  className="favorites-item-card"
                  onClick={(e) => handleProductClick(e, product)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleProductClick(e, product);
                    }
                  }}
                >
                  {/* 1. ชื่อผู้ขายมุมบนซ้าย และมีไอคอน > หลังชื่อ และทำให้กดที่ชื่อได้ */}
                  <div className="favorites-card-header">
                    <button
                      type="button"
                      className="favorites-seller-link"
                      title={`ดูโปรไฟล์ร้านค้าของ ${product.seller || 'ผู้ขาย'}`}
                      aria-label={`ไปหน้าร้านของ ${product.seller || 'ผู้ขาย'}`}
                      onClick={(e) => handleSellerClick(e, product)}
                    >
                      <span className="favorites-seller-name">
                        {product.seller || 'ผู้ขาย SPU'}
                      </span>
                      <ChevronRight size={14} className="favorites-seller-arrow" />
                    </button>
                  </div>

                  {/* Card Main Body */}
                  <div className="favorites-card-body">
                    {/* 2. รูปภาพสินค้า */}
                    <div className="favorites-item-image-wrap">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.title}
                          className="favorites-item-img"
                        />
                      ) : (
                        <div className="favorites-item-placeholder">
                          <ShoppingBag size={20} />
                        </div>
                      )}
                      {product.tag && (
                        <span className="favorites-item-tag">{product.tag}</span>
                      )}
                    </div>

                    {/* ข้างๆรูปภาพสินค้า */}
                    <div className="favorites-item-info">
                      {/* 3. บรรทัดบน: ชื่อสินค้า */}
                      <h3 className="favorites-item-title">{product.title}</h3>

                      {/* 4. ราคาสินค้า */}
                      <div className="favorites-item-price-row">
                        <strong className="favorites-item-price">
                          ฿{money(product.price)}
                        </strong>
                      </div>

                      {/* 5. จุดนัดรับ */}
                      <div className="favorites-item-location-row">
                        <MapPin size={12} className="favorites-pin-icon" />
                        <span>{product.location || 'SPU Campus'}</span>
                      </div>
                    </div>

                    {/* เอาหัวใจไปไว้แทน > ตรงกลางขวามือ */}
                    <div className="favorites-card-action">
                      <LikeButton
                        liked={removingId !== product.id}
                        showCount={false}
                        size="md"
                        className="favorites-heart-btn"
                        title="นำออกจากรายการที่ถูกใจ"
                        label={`นำ ${product.title} ออกจากรายการที่ถูกใจ`}
                        disabled={removingId === product.id}
                        onClick={(e) => e.stopPropagation()}
                        onLikedChange={() => handleRemoveFavorite(null, product)}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

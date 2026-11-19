import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Share2,
  Heart,
  MapPin,
  MessageCircle,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Tag,
} from 'lucide-react';
import {
  isProductFavorited,
  toggleFavoriteProduct,
  getProductById,
  DEFAULT_CATEGORY_LABELS,
} from '../lib/marketplace';
import { supabase } from '../lib/supabase';
import { LikeButton } from '../components/spectrumui/like-button';

const money = (value) => new Intl.NumberFormat('th-TH').format(value || 0);

export default function ProductDetailPage({
  product: initialProduct,
  productId,
  onBack,
  onNavigateToChat,
  onAddToCart,
  onNavigateToSeller,
  isOwner = false,
  currentUser = null,
  onlineUserIds = new Set(),
  onNavigateToLogin = null,
}) {
  const [product, setProduct] = useState(initialProduct || null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(!initialProduct && Boolean(productId));
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // Swipe & Animation states
  const [touchDeltaX, setTouchDeltaX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const isHorizontalSwipe = useRef(null);
  const isMouseDown = useRef(false);
  const mouseStartX = useRef(0);
  const hasMoved = useRef(false);

  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Sync or fetch product if needed
  useEffect(() => {
    if (initialProduct) {
      setProduct(initialProduct);
      setIsLoadingProduct(false);
      return;
    }

    if (!productId) {
      setIsLoadingProduct(false);
      return;
    }

    let active = true;
    setIsLoadingProduct(true);
    getProductById(productId)
      .then((fetched) => {
        if (active) {
          setProduct(fetched);
          setIsLoadingProduct(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load product detail:', err);
        if (active) setIsLoadingProduct(false);
      });

    return () => {
      active = false;
    };
  }, [initialProduct, productId]);

  // Fetch seller profile for latest status if available
  useEffect(() => {
    let active = true;
    const targetSellerId = product?.sellerId || product?.seller_id;
    if (!targetSellerId || !supabase) return;

    supabase
      .from('profiles')
      .select('id, updated_at, created_at, is_verified, display_name, avatar_url')
      .eq('id', targetSellerId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!active) return;
        if (error) {
          const { data: fallbackData } = await supabase
            .from('profiles')
            .select('id, updated_at, created_at, is_verified, display_name')
            .eq('id', targetSellerId)
            .maybeSingle();
          if (active && fallbackData) setSellerProfile(fallbackData);
          return;
        }
        if (data) {
          setSellerProfile(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load seller profile status:', err);
      });

    return () => {
      active = false;
    };
  }, [product?.sellerId, product?.seller_id]);

  const sellerId = product?.sellerId || product?.seller_id;
  const sellerAvatarUrl =
    sellerProfile?.avatar_url ||
    product?.sellerAvatar ||
    product?.seller_avatar ||
    (currentUser?.id && sellerId === currentUser.id ? currentUser.avatar : '');

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [sellerAvatarUrl]);

  // Check if product is favorited in Supabase
  useEffect(() => {
    let active = true;
    if (!product?.id || !currentUser?.id) {
      setIsSaved(false);
      return;
    }

    isProductFavorited(product.id, currentUser.id)
      .then((saved) => {
        if (active) setIsSaved(saved);
      })
      .catch((err) => {
        console.warn('Could not check favorite status:', err);
      });

    return () => {
      active = false;
    };
  }, [product?.id, currentUser?.id]);

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      showToast('กรุณาเข้าสู่ระบบเพื่อบันทึกสินค้าที่ถูกใจ', 'error');
      if (onNavigateToLogin) {
        setTimeout(() => onNavigateToLogin(product?.id ? { type: 'favorite_product', productId: String(product.id) } : undefined), 1000);
      }
      return;
    }

    if (isSaving || !product?.id) return;

    const prevSaved = isSaved;
    const nextSaved = !prevSaved;

    setIsSaved(nextSaved);
    setIsSaving(true);
    showToast(
      nextSaved ? 'บันทึกในรายการที่ถูกใจแล้ว' : 'นำออกจากรายการที่ถูกใจแล้ว',
      nextSaved ? 'favorite' : 'info'
    );

    try {
      const result = await toggleFavoriteProduct(product.id, currentUser.id);
      setIsSaved(result.isFavorite);
    } catch (err) {
      console.error('Failed to update favorite:', err);
      setIsSaved(prevSaved);
      showToast('ไม่สามารถบันทึกรายการโปรดได้ กรุณาลองใหม่', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;

    const shareUrl = window.location.href;
    const shareTitle = `${product.title} | SPU Market`;
    const shareText = `${product.title} - ฿${money(product.price)} ที่ SPU Market`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('คัดลอกลิงก์สินค้าสำเร็จแล้ว!', 'success');
        return;
      }

      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        showToast('คัดลอกลิงก์สินค้าสำเร็จแล้ว!', 'success');
      } else {
        showToast('ไม่สามารถคัดลอกลิงก์ได้ กรุณาลองใหม่', 'error');
      }
    } catch (err) {
      console.error('Could not copy link:', err);
      showToast('ไม่สามารถคัดลอกลิงก์ได้ กรุณาลองใหม่', 'error');
    }
  };

  const images = useMemo(() => {
    if (!product) return [];
    if (product.images?.length) return product.images;
    if (product.image) return [product.image];
    return [];
  }, [product]);

  const shiftImage = (delta) => {
    if (images.length <= 1) return;
    setImageIndex((index) => (index + delta + images.length) % images.length);
  };

  // Touch Swipe Handlers with Animation
  const handleTouchStart = (e) => {
    if (images.length <= 1) return;
    touchStartPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
    setTouchDeltaX(0);
    hasMoved.current = false;
  };

  const handleTouchMove = (e) => {
    if (images.length <= 1 || !isSwiping) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartPos.current.x;
    const diffY = currentY - touchStartPos.current.y;

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isHorizontalSwipe.current) {
      hasMoved.current = true;
      setTouchDeltaX(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (images.length > 1 && isHorizontalSwipe.current) {
      if (touchDeltaX < -40) {
        shiftImage(1);
      } else if (touchDeltaX > 40) {
        shiftImage(-1);
      }
    }
    setIsSwiping(false);
    setTouchDeltaX(0);
    isHorizontalSwipe.current = null;
  };

  // Mouse Drag Handlers for Desktop
  const handleMouseDown = (e) => {
    if (images.length <= 1) return;
    isMouseDown.current = true;
    mouseStartX.current = e.clientX;
    setIsSwiping(true);
    setTouchDeltaX(0);
    hasMoved.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown.current || images.length <= 1) return;
    const diffX = e.clientX - mouseStartX.current;
    if (Math.abs(diffX) > 5) {
      hasMoved.current = true;
    }
    setTouchDeltaX(diffX);
  };

  const handleMouseUp = () => {
    if (!isMouseDown.current) return;
    isMouseDown.current = false;
    if (images.length > 1) {
      if (touchDeltaX < -40) {
        shiftImage(1);
      } else if (touchDeltaX > 40) {
        shiftImage(-1);
      }
    }
    setIsSwiping(false);
    setTouchDeltaX(0);
  };

  const handleMouseLeave = () => {
    if (isMouseDown.current) {
      handleMouseUp();
    }
  };

  if (isLoadingProduct) {
    return (
      <div className="product-detail-page-container">
        <header className="product-view-header">
          <button type="button" aria-label="ย้อนกลับ" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
        </header>
        <div className="product-detail-loading" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p>กำลังโหลดข้อมูลสินค้า...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-not-found">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={18} /> กลับไปหน้าสินค้า
        </button>
        <p>ไม่พบสินค้านี้</p>
      </div>
    );
  }

  const categoryDisplayName =
    product.categoryName ||
    product.category_name ||
    DEFAULT_CATEGORY_LABELS[product.category] ||
    DEFAULT_CATEGORY_LABELS[product.category_slug] ||
    product.category ||
    'ทั่วไป';

  const isCurrentUserSeller = Boolean(currentUser?.id && sellerId && currentUser.id === sellerId);
  const isSellerOnline = Boolean(
    isCurrentUserSeller ||
      (sellerId &&
        (onlineUserIds instanceof Set
          ? onlineUserIds.has(sellerId)
          : Array.isArray(onlineUserIds) && onlineUserIds.includes(sellerId)))
  );
  const sellerStatus = {
    isOnline: isSellerOnline,
    text: isSellerOnline ? 'ออนไลน์' : 'ออฟไลน์',
  };

  const handleViewStore = () => {
    const sellerId = product.sellerId || product.seller_id;
    if (onNavigateToSeller && sellerId) {
      onNavigateToSeller(sellerId);
    }
  };

  return (
    <div className="product-detail-page-container">
      {/* Toast Notification */}
      {toast && (
        <aside
          className={`product-detail-toast toast-${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'favorite' ? (
            <Heart size={16} fill="currentColor" />
          ) : toast.type === 'error' ? (
            <AlertCircle size={16} />
          ) : (
            <CheckCircle2 size={16} />
          )}
          <span>{toast.message}</span>
        </aside>
      )}

      <header className="product-view-header">
        <button type="button" aria-label="ย้อนกลับ" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <button
            type="button"
            aria-label="แชร์สินค้า"
            title="แชร์สินค้านี้"
            onClick={handleShare}
          >
            <Share2 size={19} />
          </button>
          <LikeButton
            liked={isSaved}
            showCount={false}
            size="md"
            label={isSaved ? 'นำออกจากสินค้าที่ถูกใจ' : 'บันทึกเป็นสินค้าที่ถูกใจ'}
            title={isSaved ? 'นำออกจากสินค้าที่ถูกใจ' : 'บันทึกเป็นสินค้าที่ถูกใจ'}
            className={isSaved ? 'saved' : ''}
            onLikedChange={handleToggleFavorite}
            disabled={isSaving}
          />
        </div>
      </header>

      {/* Main Image Slider with Swipe Animation */}
      <div
        className="product-view-image-wrap"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {images.length > 0 ? (
          <div
            className="product-slider-track"
            style={{
              transform: `translateX(calc(-${imageIndex * 100}% + ${touchDeltaX}px))`,
              transition: isSwiping ? 'none' : 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {images.map((imgSrc, idx) => (
              <div
                key={idx}
                className="product-slider-slide"
                onClick={() => {
                  if (!hasMoved.current) {
                    setIsExpanded(true);
                  }
                }}
              >
                <img
                  src={imgSrc}
                  alt={`${product.title} ${idx + 1}`}
                  className="product-view-image"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="product-image-empty">ไม่มีรูปภาพ</div>
        )}

        {product.tag && <span className="product-view-tag">{product.tag}</span>}

        {/* Pagination Dots for multiple images */}
        {images.length > 1 && (
          <div className="product-image-dots">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`product-slider-dot ${idx === imageIndex ? 'active' : ''}`}
                aria-label={`รูปภาพที่ ${idx + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex(idx);
                }}
              />
            ))}
          </div>
        )}

        <span className="product-image-count">
          {images.length ? `${imageIndex + 1}/${images.length}` : '0/0'}
        </span>
      </div>

      <main className="product-view-content">
        <div className="product-view-price-row">
          <strong>฿{money(product.price)}</strong>
          {product.timeAgo && <span>{product.timeAgo}</span>}
        </div>
        <h1>{product.title}</h1>

        {/* 1. รายละเอียดสินค้า */}
        <section className="product-description-card">
          <h2>รายละเอียดสินค้า</h2>
          <p>{product.description || 'ไม่มีรายละเอียดสินค้า'}</p>
        </section>

        {/* 1. หมวดหมู่สินค้า (บรรทัดต่อจาก รายละเอียดสินค้า - หัวข้อสีเดิม เนื้อหาสีดำ) */}
        <section className="product-category-card">
          <div className="product-category-heading">
            <Tag size={16} />
            <strong>หมวดหมู่สินค้า</strong>
          </div>
          <p>{categoryDisplayName}</p>
        </section>

        {/* จุดนัดรับ */}
        <section className="product-pickup-card">
          <div className="product-pickup-heading">
            <MapPin size={18} />
            <strong>จุดนัดรับ</strong>
          </div>
          <p>{product.location || 'ไม่ระบุจุดนัดรับ'}</p>
        </section>

        {/* 2. product-view-seller พร้อมปุ่มดูร้านค้า และ Online-dot ซ้อนทับรูปภาพ */}
        <section className="product-view-seller">
          <div className="product-view-avatar-wrap">
            <div className="product-view-avatar">
              {sellerAvatarUrl && !avatarLoadFailed ? (
                <img
                  src={sellerAvatarUrl}
                  alt={product.seller || 'ผู้ขาย'}
                  className="seller-avatar-img"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                product.seller?.charAt(0) || 'S'
              )}
            </div>
            <span
              className={`seller-avatar-status ${sellerStatus.isOnline ? 'online-dot' : 'offline-dot'}`}
              title={sellerStatus.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
            />
          </div>
          <div className="product-view-seller-info">
            <div className="product-view-seller-name-row">
              <strong>{product.seller || 'ผู้ขาย SPU Market'}</strong>
              {(sellerProfile?.is_verified ?? product?.verified) && (
                <CheckCircle2 size={14} className="profile-verified-icon" />
              )}
            </div>
            <div className="product-view-seller-status">
              <span className="seller-online-label">{sellerStatus.text}</span>
            </div>
          </div>
          <button
            type="button"
            className="product-view-store-btn"
            onClick={handleViewStore}
          >
            ดูร้านค้า
          </button>
        </section>
      </main>

      <footer className="product-view-actions">
        <button
          type="button"
          className="product-chat-action"
          disabled={isOwner}
          onClick={onNavigateToChat}
        >
          <MessageCircle size={17} /> {isOwner ? 'สินค้าของคุณ' : 'แชท'}
        </button>
        <button
          type="button"
          className="product-buy-action"
          disabled={isOwner}
          onClick={() => onAddToCart?.(product)}
        >
          <ShoppingCart size={17} /> {isOwner ? 'สั่งซื้อไม่ได้' : 'สั่งซื้อ'}
        </button>
      </footer>

      {/* 3 & 4. Lightbox: ลบปุ่มปิดภาพออก และทำ Animation สำหรับปัดรูปภาพ */}
      {isExpanded && (
        <div
          className="product-image-lightbox"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="lightbox-slider-viewport"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className="lightbox-slider-track"
              style={{
                transform: `translateX(calc(-${imageIndex * 100}% + ${touchDeltaX}px))`,
                transition: isSwiping ? 'none' : 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {images.map((imgSrc, idx) => (
                <div
                  key={idx}
                  className="lightbox-slide"
                  onClick={() => setIsExpanded(false)}
                >
                  <img
                    src={imgSrc}
                    alt={`${product.title} ${idx + 1}`}
                    draggable={false}
                  />
                </div>
              ))}
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="lightbox-arrow previous"
                  aria-label="รูปภาพก่อนหน้า"
                  onClick={(e) => {
                    e.stopPropagation();
                    shiftImage(-1);
                  }}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  className="lightbox-arrow next"
                  aria-label="รูปภาพถัดไป"
                  onClick={(e) => {
                    e.stopPropagation();
                    shiftImage(1);
                  }}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          <span className="lightbox-count">
            {imageIndex + 1} / {images.length}
          </span>
          <span className="lightbox-hint">แตะที่ว่างหรือรูปเพื่อปิด</span>
        </div>
      )}
    </div>
  );
}
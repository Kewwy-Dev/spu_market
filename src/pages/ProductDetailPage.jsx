import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Share2,
  MapPin,
  MessageCircle,
  ShoppingCart,
  CheckCircle2,
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
import AppToast from '../components/common/AppToast';

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
      <div className="min-h-dvh w-full bg-slate-50 pb-20">
        <header className="sticky top-0 z-[35] w-full border-b border-slate-100 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 hover:text-spu-pink"
              aria-label="ย้อนกลับ"
              onClick={onBack}
            >
              <ArrowLeft size={20} />
            </button>
          </div>
        </header>
        <div className="px-5 py-16 text-center text-sm text-slate-500">
          <p>กำลังโหลดข้อมูลสินค้า...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="grid min-h-[60vh] place-content-center justify-items-center gap-3 px-4 text-center text-slate-500">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 font-semibold text-spu-pink hover:underline"
          onClick={onBack}
        >
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
    <div className="min-h-dvh w-full bg-slate-50 pb-24">
      <AppToast toast={toast} />

      <header className="sticky top-0 z-[35] w-full border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 hover:text-spu-pink"
            aria-label="ย้อนกลับ"
            onClick={onBack}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 hover:text-spu-pink"
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
              className={`!h-9 !w-9 !border-0 !p-0 ${
                isSaved
                  ? '!bg-spu-pink-light !text-spu-pink'
                  : '!bg-transparent !text-slate-700 hover:!bg-slate-100 hover:!text-spu-pink'
              }`}
              onLikedChange={handleToggleFavorite}
              disabled={isSaving}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-3 pt-2.5 sm:px-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:pt-6">
        {/* Main Image Slider with Swipe Animation */}
        <div
          className="relative h-[min(84vw,380px)] select-none overflow-hidden rounded-2xl bg-slate-100 touch-pan-y lg:col-span-7 lg:h-[460px]"
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
              className="flex h-full w-full will-change-transform"
              style={{
                transform: `translateX(calc(-${imageIndex * 100}% + ${touchDeltaX}px))`,
                transition: isSwiping ? 'none' : 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {images.map((imgSrc, idx) => (
                <div
                  key={idx}
                  className="relative h-full w-full shrink-0 select-none"
                  onClick={() => {
                    if (!hasMoved.current) {
                      setIsExpanded(true);
                    }
                  }}
                >
                  <img
                    src={imgSrc}
                    alt={`${product.title} ${idx + 1}`}
                    className="block h-full w-full cursor-zoom-in select-none object-cover"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-500">ไม่มีรูปภาพ</div>
          )}

          {product.tag && (
            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-spu-pink px-2.5 py-1 text-[0.66rem] font-bold text-white">
              {product.tag}
            </span>
          )}

          {/* Pagination Dots for multiple images */}
          {images.length > 1 && (
            <div className="pointer-events-auto absolute bottom-2.5 left-1/2 z-[5] flex -translate-x-1/2 items-center gap-[5px] rounded-full bg-slate-900/45 px-2 py-1 backdrop-blur-xs">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`h-1.5 cursor-pointer rounded-full border-0 p-0 transition-all duration-250 ${
                    idx === imageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                  }`}
                  aria-label={`รูปภาพที่ ${idx + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageIndex(idx);
                  }}
                />
              ))}
            </div>
          )}

          <span className="absolute right-2.5 bottom-2.5 z-[5] rounded-[20px] bg-slate-900/68 px-[9px] py-1 text-[0.7rem] text-white tabular-nums">
            {images.length ? `${imageIndex + 1}/${images.length}` : '0/0'}
          </span>
        </div>

        <div className="min-w-0 px-0.5 pt-3 pb-5 lg:col-span-5 lg:px-0 lg:pt-0">
          <div className="flex items-center justify-between gap-2">
            <strong className="text-[1.35rem] sm:text-2xl font-black text-spu-pink tabular-nums">
              ฿{money(product.price)}
            </strong>
            {product.timeAgo && <span className="text-[0.68rem] text-slate-500">{product.timeAgo}</span>}
          </div>
          <h1 className="mt-1 text-base sm:text-lg font-bold leading-[1.4] text-[#172033]">{product.title}</h1>

          {/* 1. รายละเอียดสินค้า */}
          <section className="mt-2.5 rounded-[14px] border border-[#e8edf4] bg-white p-3">
            <h2 className="text-[0.78rem] font-bold text-spu-pink">รายละเอียดสินค้า</h2>
            <p className="mt-1.5 whitespace-pre-wrap text-[0.74rem] sm:text-[0.8rem] leading-relaxed text-slate-800">
              {product.description || 'ไม่มีรายละเอียดสินค้า'}
            </p>
          </section>

          {/* หมวดหมู่สินค้า */}
          <section className="mt-2.5 rounded-[14px] border border-[#e8edf4] bg-white p-3">
            <div className="flex items-center gap-1.5 text-[0.78rem] text-spu-pink">
              <Tag size={16} />
              <strong>หมวดหมู่สินค้า</strong>
            </div>
            <p className="mt-1.5 text-[0.76rem] sm:text-[0.8rem] font-bold text-slate-800">{categoryDisplayName}</p>
          </section>

          {/* จุดนัดรับ */}
          <section className="mt-2.5 rounded-[14px] border border-[#e8edf4] bg-white p-3">
            <div className="flex items-center gap-1.5 text-[0.78rem] text-spu-pink">
              <MapPin size={18} />
              <strong>จุดนัดรับ</strong>
            </div>
            <p className="mt-1.5 text-[0.76rem] sm:text-[0.8rem] font-bold text-slate-800">
              {product.location || 'ไม่ระบุจุดนัดรับ'}
            </p>
          </section>

          {/* ผู้ขาย */}
          <section className="mt-3 flex items-center gap-2.5 rounded-[14px] border border-[#e8edf4] bg-white px-3.5 py-3">
            <div className="relative h-[42px] w-[42px] shrink-0">
              <div className="relative flex aspect-square h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-rose-400 to-[#ec008c] text-[0.95rem] font-extrabold text-white">
                {sellerAvatarUrl && !avatarLoadFailed ? (
                  <img
                    src={sellerAvatarUrl}
                    alt={product.seller || 'ผู้ขาย'}
                    className="absolute inset-0 block h-full w-full rounded-full object-cover object-center"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  product.seller?.charAt(0) || 'S'
                )}
              </div>
              <span
                className={`absolute bottom-0 left-[30px] z-[2] box-content inline-block h-[11px] w-[11px] rounded-full border-2 border-white ${
                  sellerStatus.isOnline ? 'bg-green-500' : 'bg-slate-400'
                }`}
                title={sellerStatus.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex min-w-0 items-center gap-1.5">
                <strong className="truncate text-[0.8rem] text-slate-800">
                  {product.seller || 'ผู้ขาย SPU Market'}
                </strong>
                {(sellerProfile?.is_verified ?? product?.verified) && (
                  <CheckCircle2 size={14} className="shrink-0 text-spu-teal" />
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-[0.68rem] leading-[1.2] text-slate-500">{sellerStatus.text}</span>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 whitespace-nowrap rounded-full border border-spu-pink-border bg-white px-3 py-1.5 text-[0.72rem] font-bold text-spu-pink transition-all duration-200 hover:-translate-y-px hover:border-spu-pink hover:bg-spu-pink-light"
              onClick={handleViewStore}
            >
              ดูร้านค้า
            </button>
          </section>
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-[39] border-t border-slate-100 bg-white/96 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl gap-2 px-3 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] sm:justify-end sm:px-6">
          <button
            type="button"
            className="flex min-h-[42px] flex-1 sm:flex-none sm:px-6 items-center justify-center gap-1.5 rounded-xl border border-spu-pink text-[0.78rem] font-extrabold text-spu-pink transition-colors hover:bg-spu-pink-light disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isOwner}
            onClick={onNavigateToChat}
          >
            <MessageCircle size={17} /> {isOwner ? 'สินค้าของคุณ' : 'แชท'}
          </button>
          <button
            type="button"
            className="flex min-h-[42px] flex-[1.5] sm:flex-none sm:px-8 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#a20857] to-[#ec008c] text-[0.78rem] font-extrabold text-white shadow-sm transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isOwner}
            onClick={() => onAddToCart?.(product)}
          >
            <ShoppingCart size={17} /> {isOwner ? 'สั่งซื้อไม่ได้' : 'สั่งซื้อ'}
          </button>
        </div>
      </footer>

      {/* Lightbox */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[300] flex cursor-pointer select-none flex-col items-center justify-center bg-black/95"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="relative flex h-[82vh] w-full max-w-[900px] cursor-default items-center overflow-hidden"
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
              className="flex h-full w-full will-change-transform"
              style={{
                transform: `translateX(calc(-${imageIndex * 100}% + ${touchDeltaX}px))`,
                transition: isSwiping ? 'none' : 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {images.map((imgSrc, idx) => (
                <div
                  key={idx}
                  className="flex h-full w-full shrink-0 cursor-pointer items-center justify-center p-3"
                  onClick={() => setIsExpanded(false)}
                >
                  <img
                    src={imgSrc}
                    alt={`${product.title} ${idx + 1}`}
                    className="max-h-full max-w-full select-none rounded-[10px] object-contain"
                    draggable={false}
                  />
                </div>
              ))}
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute top-1/2 left-3.5 z-10 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-all hover:scale-108 hover:bg-white/35"
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
                  className="absolute top-1/2 right-3.5 z-10 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-all hover:scale-108 hover:bg-white/35"
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

          <span className="absolute bottom-8 rounded-full bg-white/18 px-3 py-1 text-[0.76rem] font-bold text-white tabular-nums">
            {imageIndex + 1} / {images.length}
          </span>
          <span className="absolute bottom-3 text-[0.65rem] text-white/50">แตะที่ว่างหรือรูปเพื่อปิด</span>
        </div>
      )}
    </div>
  );
}
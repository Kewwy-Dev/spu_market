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

    setFavorites(nextList);
    onFavoritesCountChange?.(nextList.length);

    try {
      await toggleFavoriteProduct(product.id, currentUser.id);
    } catch (err) {
      console.error('Failed to remove favorite:', err);
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
    <div
      className="fixed inset-0 z-[201] flex items-center justify-center bg-slate-900/56 p-[18px] backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="flex max-h-[min(84vh,720px)] w-full max-w-[440px] sm:max-w-[500px] flex-col overflow-hidden rounded-[22px] bg-white pb-3 shadow-[0_24px_70px_rgba(15,23,42,0.28)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorites-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2.5 border-b border-slate-100 px-[17px] pt-[17px] pb-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pink-50 text-spu-pink">
            <Heart size={20} fill="currentColor" />
          </div>
          <div>
            <h2 id="favorites-title" className="text-[0.88rem] sm:text-base font-extrabold text-slate-900">
              สินค้าที่ถูกใจ
            </h2>
            <p className="mt-0.5 text-[0.68rem] text-slate-500">
              {isLoading
                ? 'กำลังโหลด...'
                : favorites.length
                  ? `สินค้าที่คุณบันทึกไว้ (${favorites.length} รายการ)`
                  : 'บันทึกสินค้าที่คุณสนใจไว้ดูภายหลัง'}
            </p>
          </div>
          <button
            type="button"
            className="ml-auto grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </header>

        {error && (
          <div className="mx-[18px] mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.74rem] font-semibold text-red-600" role="alert">
            {error}
          </div>
        )}

        <div className="max-h-[58vh] overflow-y-auto overscroll-contain px-4 pt-3 pb-1.5">
          {isLoading ? (
            <div className="flex flex-col gap-2.5">
              <div className="h-20 rounded-[14px] bg-[linear-gradient(90deg,#f1f5f9_25%,#e2e8f0_50%,#f1f5f9_75%)] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
              <div className="h-20 rounded-[14px] bg-[linear-gradient(90deg,#f1f5f9_25%,#e2e8f0_50%,#f1f5f9_75%)] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
              <div className="h-20 rounded-[14px] bg-[linear-gradient(90deg,#f1f5f9_25%,#e2e8f0_50%,#f1f5f9_75%)] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
            </div>
          ) : favorites.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-9.5 text-center text-slate-500">
              <div className="mb-3.5 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink-400">
                <Heart size={36} />
              </div>
              <h4 className="mb-1.5 text-[0.9rem] font-extrabold text-slate-800">ยังไม่มีสินค้าที่ถูกใจ</h4>
              {onNavigateToProducts && (
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#a20857] to-[#ec008c] px-[18px] py-[9px] text-[0.78rem] font-bold text-white transition-all hover:-translate-y-px hover:opacity-95"
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
            <div className="flex flex-col gap-2.5">
              {favorites.map((product) => (
                <article
                  key={product.id}
                  className="flex cursor-pointer select-none flex-col gap-2 rounded-[14px] border border-[#e8edf4] bg-white px-[13px] py-[11px] transition-all duration-150 hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
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
                  <div className="flex items-center justify-start">
                    <button
                      type="button"
                      className="group inline-flex items-center gap-1 rounded text-[0.74rem] font-bold text-slate-600 transition-colors hover:text-spu-pink"
                      title={`ดูโปรไฟล์ร้านค้าของ ${product.seller || 'ผู้ขาย'}`}
                      aria-label={`ไปหน้าร้านของ ${product.seller || 'ผู้ขาย'}`}
                      onClick={(e) => handleSellerClick(e, product)}
                    >
                      <span>{product.seller || 'ผู้ขาย SPU'}</span>
                      <ChevronRight size={14} className="text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:text-spu-pink" />
                    </button>
                  </div>

                  <div className="flex w-full items-center gap-3">
                    <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {product.image ? (
                        <img src={product.image} alt={product.title} className="block h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400">
                          <ShoppingBag size={20} />
                        </div>
                      )}
                      {product.tag && (
                        <span className="absolute bottom-1 left-1 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[0.58rem] font-bold leading-none text-white backdrop-blur-xs">
                          {product.tag}
                        </span>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <h3 className="m-0 truncate text-[0.84rem] font-bold leading-[1.35] text-slate-800">
                        {product.title}
                      </h3>
                      <div className="flex items-center">
                        <strong className="text-[0.98rem] font-black text-spu-pink tabular-nums">
                          ฿{money(product.price)}
                        </strong>
                      </div>
                      <div className="inline-flex items-center gap-1 truncate text-[0.68rem] text-slate-500">
                        <MapPin size={12} className="shrink-0 text-slate-400" />
                        <span className="truncate">{product.location || 'SPU Campus'}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-center pl-1">
                      <LikeButton
                        liked={removingId !== product.id}
                        showCount={false}
                        size="md"
                        className="!h-9 !w-9 !shrink-0 !rounded-full !border !border-pink-100 !bg-pink-50 !text-spu-pink hover:!scale-110 hover:!bg-pink-100"
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

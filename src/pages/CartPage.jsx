import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, MapPin, MessageCircle, Package, ShoppingCart, Sparkles, Tag, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { QuantityStepper } from '@/components/spectrumui/quantity-stepper';
import { SkeletonBlock, SkeletonReveal } from '../components/spectrumui/skeleton-reveal';
import DateTimePicker from '../components/spectrumui/datetime-picker';
import {
  getBangkokScheduleLimits,
  getDefaultBangkokPickupDateTime,
  validateBangkokPickupDateTime,
} from '../lib/pickupSchedule';

const cartCache = new Map();

export default function CartPage({ currentUser, products = [], onCartChange, onNavigateHome, onNavigateProducts, onBack, onOpenChat, onOpenProductChat, onSelectProduct, onSelectSeller }) {
  const cacheKey = currentUser?.id || 'guest';
  const [cartItems, setCartItems] = useState(() => cartCache.get(cacheKey) || []);
  const [selectedId, setSelectedId] = useState(null);
  const [failedAvatars, setFailedAvatars] = useState({});
  const [loading, setLoading] = useState(() => !cartCache.has(cacheKey));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState(undefined);

  const loadCart = async () => {
    if (!currentUser?.id || !supabase) { cartCache.set(cacheKey, []); setCartItems([]); setLoading(false); return; }
    setLoading(!cartCache.has(cacheKey)); setError('');
    const { data: rows, error: cartError } = await supabase.from('cart_items').select('id,product_id').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (cartError) { setError(cartError.message); setCartItems([]); setLoading(false); return; }
    const ids = (rows || []).map((row) => row.product_id);
    if (!ids.length) { cartCache.set(cacheKey, []); setCartItems([]); setLoading(false); void onCartChange?.(); return; }
    const [{ data: productRows, error: productError }, { data: imageRows }, { data: locationRows }] = await Promise.all([
      supabase.from('products').select('id,title,price,seller_id,quantity,location_id,status').in('id', ids),
      supabase.from('product_images').select('product_id,image_url,display_order').in('product_id', ids).order('display_order'),
      supabase.from('pickup_locations').select('id,location_name'),
    ]);
    if (productError) setError(productError.message);
    const sellerIds = [...new Set((productRows || []).map((product) => product.seller_id).filter(Boolean))];
    const { data: sellerRows } = sellerIds.length ? await supabase.from('profiles').select('id,display_name,is_verified,avatar_url').in('id', sellerIds) : { data: [] };
    const sellers = new Map((sellerRows || []).map((row) => [row.id, row]));
    const productMap = new Map((products || []).map((p) => [String(p.id), p]));
    const images = new Map(); (imageRows || []).forEach((row) => images.set(row.product_id, [...(images.get(row.product_id) || []), row.image_url]));
    const locations = new Map((locationRows || []).map((row) => [row.id, row.location_name]));
    const mapped = (rows || []).flatMap((row) => {
      const product = productRows?.find((p) => p.id === row.product_id);
      if (!product) return [];
      const known = productMap.get(String(product.id));
      const seller = sellers.get(product.seller_id);
      const existing = cartItems.find((item) => item.productId === product.id);
      const rawStock = product.quantity != null ? Number(product.quantity) : (known?.quantity != null ? Number(known.quantity) : 1);
      const stock = Number.isFinite(rawStock) && rawStock > 0 ? Math.floor(rawStock) : 1;
      const isSold = product.status === 'sold' || product.status === 'archived' || (product.quantity !== null && Number(product.quantity) <= 0);
      const existingQty = existing?.qty != null ? Number(existing.qty) : 1;
      const qty = isSold ? 0 : Math.min(stock, Math.max(1, Number.isFinite(existingQty) ? existingQty : 1));
      return [{
        id: row.id,
        productId: product.id,
        title: product.title,
        price: Number(product.price),
        image: images.get(product.id)?.[0] || known?.image || '',
        seller: seller?.display_name || known?.seller || 'ผู้ขาย SPU Market',
        sellerId: product.seller_id,
        sellerAvatar: seller?.avatar_url || known?.sellerAvatar || known?.avatar_url || '',
        sellerVerified: Boolean(seller?.is_verified || known?.verified),
        location: locations.get(product.location_id) || known?.location || 'ไม่ระบุจุดนัดรับ',
        tag: isSold ? 'สินค้าหมด' : '',
        stock: isSold ? 0 : stock,
        qty,
        isSold,
        status: product.status,
      }];
    });
    if (!productError && mapped.length < (rows || []).length) {
      const visibleIds = new Set(mapped.map((item) => item.id));
      const staleIds = (rows || []).filter((row) => !visibleIds.has(row.id)).map((row) => row.id);
      if (staleIds.length) {
        await supabase.from('cart_items').delete().in('id', staleIds).eq('user_id', currentUser.id);
      }
    }
    cartCache.set(cacheKey, mapped);
    setCartItems(mapped);
    void onCartChange?.();
    const requestedProductId = new URLSearchParams(window.location.search).get('selected');
    setSelectedId(requestedProductId ? mapped.find((item) => !item.isSold && String(item.productId) === requestedProductId)?.id || null : null);
    setLoading(false);
  };
  useEffect(() => { void loadCart(); }, [currentUser?.id]);
  const updateQty = (id, rawQty) => setCartItems((items) => {
    const next = items.map((item) => {
      if (item.id !== id) return item;
      const maxStock = Math.max(1, Number(item.stock || 1));
      const clamped = Math.min(maxStock, Math.max(1, Number(rawQty) || 1));
      return { ...item, qty: clamped };
    });
    cartCache.set(cacheKey, next);
    return next;
  });

  const handleToggleSelect = (item) => {
    if (item.isSold) {
      setError('สินค้านี้หมดแล้วหรือไม่พร้อมจำหน่าย');
      return;
    }
    setError('');
    setSelectedId((id) => id === item.id ? null : item.id);
  };

  const removeItem = async (item) => {
    const { error: removeError } = await supabase.from('cart_items').delete().eq('id', item.id).eq('user_id', currentUser.id);
    if (removeError) { setError(removeError.message); return false; }
    setCartItems((items) => {
      const next = items.filter((entry) => entry.id !== item.id);
      cartCache.set(cacheKey, next);
      return next;
    });
    setSelectedId((selected) => selected === item.id ? null : selected);
    void onCartChange?.();
    return true;
  };
  const selected = cartItems.find((item) => item.id === selectedId);
  const total = useMemo(() => selected && !selected.isSold ? selected.price * selected.qty : 0, [selected]);
  const handlePickup = () => {
    if (!selected) { setError('กรุณาเลือกสินค้าที่ต้องการนัดรับ 1 รายการ'); return; }
    if (selected.isSold) { setError('สินค้านี้หมดแล้วหรือไม่พร้อมจำหน่าย'); return; }
    if (!currentUser?.id) { setError('กรุณาเข้าสู่ระบบก่อนนัดรับสินค้า'); return; }
    setError('');
    setScheduledDateTime(getDefaultBangkokPickupDateTime());
    setShowSchedule(true);
  };
  const submitPickup = async (event) => {
    event.preventDefault();
    if (!selected || !currentUser?.id) return;
    if (selected.isSold) {
      setError('สินค้านี้หมดแล้วหรือไม่พร้อมจำหน่าย');
      return;
    }
    const { valid, scheduledAt, error: scheduleValidationError } = validateBangkokPickupDateTime(scheduledDateTime);
    if (!valid || !scheduledAt) {
      setError(scheduleValidationError);
      return;
    }
    setBusy(true); setError('');
    const maxAllowedStock = Math.max(1, Number(selected.stock || 1));
    const appointmentQty = Math.min(Math.max(1, Number(selected.qty) || 1), maxAllowedStock);
    const { data, error: appointmentError } = await supabase.rpc('request_marketplace_pickup', {
      p_product_id: selected.productId,
      p_scheduled_at: scheduledAt.toISOString(),
      p_quantity: appointmentQty,
    });
    if (appointmentError) { setError(appointmentError.message); setBusy(false); return; }
    const appointment = data?.[0];
    if (!appointment?.conversation_id) { setError('บันทึกการนัดรับไม่สำเร็จ กรุณาลองอีกครั้ง'); setBusy(false); return; }
    const localizedSchedule = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long', timeStyle: 'short', hourCycle: 'h23' }).format(scheduledAt);
    const draftMessage = `ขอนัดรับสินค้า “${selected.title}” จำนวน ${appointmentQty} ชิ้น ราคา ฿${(selected.price * appointmentQty).toLocaleString()} วันที่ ${localizedSchedule} ที่ ${selected.location} สะดวกไหม?`;
    const removed = await removeItem(selected);
    if (!removed) { setBusy(false); return; }
    setShowSchedule(false);
    onOpenChat?.({ id: appointment.conversation_id, name: selected.seller, productTitle: selected.title, image: selected.image, price: selected.price, location: selected.location, draftMessage });
    setBusy(false);
  };

  const scheduleLimits = getBangkokScheduleLimits();

  const isEmptyState = !currentUser || cartItems.length === 0;

  return (
    <div className={`flex min-h-dvh w-full flex-col bg-slate-50 ${isEmptyState ? 'pb-16' : 'pb-36'}`}>
      <header className="sticky top-0 z-30 w-full border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-2.5 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 hover:text-spu-pink"
              onClick={onBack || onNavigateHome}
              aria-label="ย้อนกลับ"
              title="ย้อนกลับ"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base sm:text-lg font-bold tracking-[-0.3px] text-slate-900">ตะกร้าสินค้า</h1>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-[3px] text-xs font-semibold text-slate-500 tabular-nums">
            {cartItems.length} รายการ
          </span>
        </div>
      </header>

      {error && !showSchedule && (
        <div role="alert" className="mx-auto w-full max-w-4xl px-4 pt-3 text-sm font-medium text-rose-700 sm:px-6">
          {error}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-2.5 px-3 py-2.5 sm:px-6 [&>.spectrum-skeleton-reveal]:flex [&>.spectrum-skeleton-reveal]:flex-1 [&>.spectrum-skeleton-reveal]:flex-col [&_.spectrum-skeleton-content]:flex [&_.spectrum-skeleton-content]:flex-1 [&_.spectrum-skeleton-content]:flex-col [&_.spectrum-skeleton-content]:gap-2.5">
        <SkeletonReveal
          loading={loading}
          skeleton={
            <div className="cart-skeleton-list" aria-hidden="true">
              {[0, 1, 2].map((item) => (
                <div className="cart-item-card flex items-start gap-2.5 rounded-[14px] bg-white p-3 shadow-xs" key={item}>
                  <SkeletonBlock className="cart-skeleton-image" />
                  <div className="cart-skeleton-copy">
                    <SkeletonBlock />
                    <SkeletonBlock />
                    <SkeletonBlock />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          {!currentUser ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="mb-2 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ShoppingCart size={52} strokeWidth={1.2} />
              </div>
              <h3 className="text-base font-bold text-slate-800">กรุณาเข้าสู่ระบบ</h3>
              <p className="text-[0.82rem] leading-relaxed text-slate-500">เข้าสู่ระบบเพื่อดูสินค้าในตะกร้าของคุณ</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="mb-2 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ShoppingCart size={52} strokeWidth={1.2} />
              </div>
              <h3 className="text-base font-bold text-slate-800">ตะกร้าของคุณว่างเปล่า</h3>
              <button
                type="button"
                className="mt-2 flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#a20857] to-[#ec008c] px-5 py-2.5 text-[0.85rem] font-bold text-white transition-opacity hover:opacity-90"
                onClick={onNavigateProducts || onNavigateHome}
              >
                <Sparkles size={16} />
                <span>เลือกดูสินค้า</span>
              </button>
            </div>
          ) : (
            cartItems.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-2 rounded-[14px] border-[1.5px] bg-white px-2.5 py-3 sm:px-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all duration-200 ${
                    isSelected ? 'border-[#a20857]/25 shadow-[0_2px_10px_rgba(162,8,87,0.08)]' : 'border-transparent'
                  } ${item.isSold ? 'opacity-72' : ''}`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {item.sellerAvatar && !failedAvatars[item.id] ? (
                        <img
                          src={item.sellerAvatar}
                          alt={item.seller}
                          className="h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] border-slate-200 object-cover"
                          onError={() => setFailedAvatars((prev) => ({ ...prev, [item.id]: true }))}
                        />
                      ) : (
                        <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-slate-200 bg-pink-50 text-[0.6rem] font-bold text-[#a20857]">
                          {item.seller.slice(0, 1)}
                        </span>
                      )}
                      <button
                        type="button"
                        className="group inline-flex min-w-0 items-center gap-0.5 text-left text-[0.72rem] font-medium text-slate-500 transition-colors hover:text-[#a20857] hover:underline"
                        onClick={() => item.sellerId && onSelectSeller?.(item.sellerId)}
                      >
                        <span className="truncate">{item.seller}</span>
                        {item.sellerVerified && <CheckCircle2 size={14} className="shrink-0 text-spu-teal" />}
                        <ChevronRight size={13} strokeWidth={2.2} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-px group-hover:text-[#a20857]" />
                      </button>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border-[1.5px] border-slate-200 bg-slate-50 text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-500"
                        onClick={() =>
                          void onOpenProductChat?.({
                            id: item.productId,
                            sellerId: item.sellerId,
                            seller: item.seller,
                            title: item.title,
                            image: item.image,
                            price: item.price,
                            location: item.location,
                          })
                        }
                        aria-label="แชทกับผู้ขาย"
                      >
                        <MessageCircle size={16} />
                      </button>
                      <button
                        type="button"
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border-[1.5px] border-red-100 bg-red-50 text-red-500 transition-all hover:border-red-300 hover:bg-red-100"
                        onClick={() => void removeItem(item)}
                        aria-label="ลบออกจากตะกร้า"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div
                    className="flex w-full cursor-pointer items-start gap-2.5"
                    onClick={() => {
                      const targetProduct =
                        products.find((p) => String(p.id) === String(item.productId)) || {
                          id: item.productId,
                          title: item.title,
                          price: item.price,
                          image: item.image,
                          location: item.location,
                          seller: item.seller,
                          sellerId: item.sellerId,
                          sellerAvatar: item.sellerAvatar,
                          verified: item.sellerVerified,
                          stock: item.stock,
                          tag: item.tag,
                        };
                      onSelectProduct?.(targetProduct);
                    }}
                  >
                    <button
                      type="button"
                      className="flex shrink-0 items-center justify-center self-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(item);
                      }}
                      disabled={item.isSold}
                      aria-label={item.isSold ? `${item.title} (สินค้าหมด)` : `เลือก ${item.title}`}
                      aria-pressed={isSelected}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-all duration-200 ${
                          isSelected
                            ? 'bg-gradient-to-br from-[#a20857] to-[#ec008c] text-white'
                            : item.isSold
                              ? 'cursor-not-allowed border-2 border-slate-300 bg-slate-100 opacity-40'
                              : 'border-2 border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <CheckCircle2 size={14} strokeWidth={2.5} />}
                      </span>
                    </button>
                    <div className="relative shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="block h-[76px] w-[76px] sm:h-20 sm:w-20 rounded-[10px] object-cover"
                        />
                      ) : (
                        <div className="flex h-[76px] w-[76px] sm:h-20 sm:w-20 items-center justify-center rounded-[10px] bg-slate-100 text-slate-400">
                          <Package size={36} />
                        </div>
                      )}
                      {item.tag && (
                        <span className="absolute -top-[5px] -left-1 flex items-center gap-0.5 whitespace-nowrap rounded-[5px] bg-gradient-to-br from-amber-500 to-orange-500 px-[5px] py-0.5 text-[0.55rem] font-bold text-white">
                          <Tag size={9} />
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <h4 className="line-clamp-2 text-[0.82rem] sm:text-sm font-semibold leading-[1.3] text-slate-800">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-1 text-[0.7rem] text-slate-500">
                        <MapPin size={11} className="shrink-0 text-[#a20857]" />
                        <span className="truncate">{item.location}</span>
                      </div>
                      <div className="mt-1 flex w-full items-center justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[0.9rem] sm:text-base font-extrabold text-[#a20857] tabular-nums">
                            ฿{(item.price * item.qty).toLocaleString()}
                          </span>
                        </div>
                        <div className="ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                          <QuantityStepper
                            value={item.qty}
                            onValueChange={(qty) => updateQty(item.id, qty)}
                            min={item.isSold ? 0 : 1}
                            max={Math.max(1, Number(item.stock || 1))}
                            disabled={item.isSold}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </SkeletonReveal>
      </div>

      {cartItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-[29] border-t border-slate-100 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.72rem] text-slate-500">
                {selected ? `1 รายการ (${selected.qty} ชิ้น)` : 'ยังไม่เลือกสินค้า'}
              </span>
              <span className="text-[1.1rem] font-black tracking-[-0.5px] text-[#a20857] tabular-nums">
                ฿{total.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-[14px] bg-gradient-to-br from-[#a20857] via-[#d80072] to-[#ec008c] px-[22px] py-3 text-[0.9rem] font-extrabold text-white shadow-[0_6px_20px_rgba(162,8,87,0.35)] transition-all duration-200 hover:-translate-y-px hover:opacity-92 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:from-slate-200 disabled:via-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none"
              onClick={handlePickup}
              disabled={!selected || selected.isSold || busy}
            >
              <span>{busy ? 'กำลังสร้างห้องแชท...' : 'นัดรับสินค้า'}</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {showSchedule && selected && (
        <div className="pickup-schedule-backdrop" role="presentation" onClick={() => !busy && setShowSchedule(false)}>
          <form
            className="pickup-schedule-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pickup-schedule-title"
            onSubmit={submitPickup}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="pickup-schedule-title">เลือกวันที่และเวลานัดรับ</h2>
            <DateTimePicker
              value={scheduledDateTime}
              onChange={setScheduledDateTime}
              minDate={scheduleLimits.minDate}
              minTime={scheduleLimits.minTime}
              maxTime="18:00"
              disabled={busy}
            />
            {error && <div className="pickup-schedule-error" role="alert">{error}</div>}
            <div className="pickup-schedule-actions">
              <button type="button" onClick={() => setShowSchedule(false)} disabled={busy}>ยกเลิก</button>
              <button type="submit" disabled={busy}>{busy ? 'กำลังบันทึก...' : 'ยืนยันนัดรับ'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

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
    const draftMessage = `สวัสดีครับ/ค่ะ ขอนัดรับสินค้า “${selected.title}” จำนวน ${appointmentQty} ชิ้น ราคา ฿${(selected.price * appointmentQty).toLocaleString()} วันที่ ${localizedSchedule} ที่ ${selected.location} สะดวกไหมครับ/คะ?`;
    const removed = await removeItem(selected);
    if (!removed) { setBusy(false); return; }
    setShowSchedule(false);
    onOpenChat?.({ id: appointment.conversation_id, name: selected.seller, productTitle: selected.title, image: selected.image, price: selected.price, location: selected.location, draftMessage });
    setBusy(false);
  };

  const scheduleLimits = getBangkokScheduleLimits();

  return <div className="cart-page-root">
    <header className="cart-header">
      <div className="cart-header-left">
        <button type="button" className="chat-list-back-btn" onClick={onBack || onNavigateHome} aria-label="ย้อนกลับ" title="ย้อนกลับ"><ArrowLeft size={20} /></button>
        <h1>ตะกร้าสินค้า</h1>
      </div>
      <span className="cart-header-count">{cartItems.length} รายการ</span>
    </header>
    {error && !showSchedule && <div role="alert" className="cart-error" style={{ padding: '12px 16px', color: '#b42318' }}>{error}</div>}
    <div className="cart-items-section">
      <SkeletonReveal loading={loading} skeleton={<div className="cart-skeleton-list" aria-hidden="true">{[0, 1, 2].map((item) => <div className="cart-item-card" key={item}><SkeletonBlock className="cart-skeleton-image" /><div className="cart-skeleton-copy"><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /></div></div>)}</div>}>
      {!currentUser ? <div className="cart-empty-state"><div className="cart-empty-icon"><ShoppingCart size={52} strokeWidth={1.2} /></div><h3>กรุณาเข้าสู่ระบบ</h3><p>เข้าสู่ระบบเพื่อดูสินค้าในตะกร้าของคุณ</p></div> : cartItems.length === 0 ? <div className="cart-empty-state"><div className="cart-empty-icon"><ShoppingCart size={52} strokeWidth={1.2} /></div><h3>ตะกร้าของคุณว่างเปล่า</h3><button type="button" className="cart-browse-btn" onClick={onNavigateProducts || onNavigateHome}><Sparkles size={16} /><span>เลือกดูสินค้า</span></button></div> : cartItems.map((item) => <div key={item.id} className={`cart-item-card ${selectedId === item.id ? 'selected' : ''} ${item.isSold ? 'out-of-stock' : ''}`}>
        <div className="cart-item-top-row">
          <div className="cart-item-seller-row">{item.sellerAvatar && !failedAvatars[item.id] ? <img src={item.sellerAvatar} alt={item.seller} className="cart-seller-avatar" onError={() => setFailedAvatars((prev) => ({ ...prev, [item.id]: true }))} /> : <span className="cart-seller-avatar cart-seller-avatar-fallback">{item.seller.slice(0, 1)}</span>}<button type="button" className="cart-seller-name" onClick={() => item.sellerId && onSelectSeller?.(item.sellerId)}><span>{item.seller}</span>{item.sellerVerified && <CheckCircle2 size={14} className="profile-verified-icon" />}<ChevronRight size={13} strokeWidth={2.2} className="cart-seller-chevron" /></button></div>
          <div className="cart-item-actions"><button type="button" className="cart-chat-btn" onClick={() => void onOpenProductChat?.({ id: item.productId, sellerId: item.sellerId, seller: item.seller, title: item.title, image: item.image, price: item.price, location: item.location })} aria-label="แชทกับผู้ขาย"><MessageCircle size={16} /></button><button type="button" className="cart-remove-btn" onClick={() => void removeItem(item)} aria-label="ลบออกจากตะกร้า"><Trash2 size={15} /></button></div>
        </div>
        <div className="cart-item-body" onClick={() => {
          const targetProduct = products.find((p) => String(p.id) === String(item.productId)) || {
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
        }}>
          <button type="button" className="cart-item-checkbox-btn" onClick={(e) => { e.stopPropagation(); handleToggleSelect(item); }} disabled={item.isSold} aria-label={item.isSold ? `${item.title} (สินค้าหมด)` : `เลือก ${item.title}`} aria-pressed={selectedId === item.id}><span className={`cart-checkbox ${selectedId === item.id ? 'checked' : ''} ${item.isSold ? 'disabled' : ''}`}>{selectedId === item.id && <CheckCircle2 size={14} strokeWidth={2.5} />}</span></button>
          <div className="cart-item-thumb-wrap">{item.image ? <img src={item.image} alt={item.title} className="cart-item-thumb" /> : <Package size={40} />}{item.tag && <span className="cart-item-tag"><Tag size={9} />{item.tag}</span>}</div>
          <div className="cart-item-info">
            <h4 className="cart-item-title">{item.title}</h4>
            <div className="cart-item-pickup-row"><MapPin size={11} className="cart-pickup-icon" /><span className="cart-pickup-text">{item.location}</span></div>
            <div className="cart-item-price-row">
              <div className="cart-item-price-col">
                <span className="cart-item-price">฿{(item.price * item.qty).toLocaleString()}</span>
              </div>
              <div className="cart-qty-stop" onClick={(e) => e.stopPropagation()}>
                <QuantityStepper value={item.qty} onValueChange={(qty) => updateQty(item.id, qty)} min={item.isSold ? 0 : 1} max={Math.max(1, Number(item.stock || 1))} disabled={item.isSold} size="sm" />
              </div>
            </div>
          </div>
        </div>
      </div>)}
      </SkeletonReveal>
    </div>
    {cartItems.length > 0 && <div className="cart-checkout-bar"><div className="cart-checkout-info"><span className="cart-checkout-item-count">{selected ? `1 รายการ (${selected.qty} ชิ้น)` : 'ยังไม่เลือกสินค้า'}</span><span className="cart-checkout-total">฿{total.toLocaleString()}</span></div><button type="button" className={`cart-checkout-btn ${!selected || selected.isSold || busy ? 'disabled' : ''}`} onClick={handlePickup} disabled={!selected || selected.isSold || busy}><span>{busy ? 'กำลังสร้างห้องแชท...' : 'นัดรับสินค้า'}</span><ArrowRight size={16} strokeWidth={2.5} /></button></div>}
    {showSchedule && selected && <div className="pickup-schedule-backdrop" role="presentation" onClick={() => !busy && setShowSchedule(false)}>
      <form className="pickup-schedule-dialog" role="dialog" aria-modal="true" aria-labelledby="pickup-schedule-title" onSubmit={submitPickup} onClick={(event) => event.stopPropagation()}>
        <h2 id="pickup-schedule-title">เลือกวันที่และเวลานัดรับ</h2>
        <DateTimePicker value={scheduledDateTime} onChange={setScheduledDateTime} minDate={scheduleLimits.minDate} minTime={scheduleLimits.minTime} maxTime="18:00" disabled={busy} />
        {error && <div className="pickup-schedule-error" role="alert">{error}</div>}
        <div className="pickup-schedule-actions">
          <button type="button" onClick={() => setShowSchedule(false)} disabled={busy}>ยกเลิก</button>
          <button type="submit" disabled={busy}>{busy ? 'กำลังบันทึก...' : 'ยืนยันนัดรับ'}</button>
        </div>
      </form>
    </div>}
  </div>;
}

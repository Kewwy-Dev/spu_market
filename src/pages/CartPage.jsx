import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, MapPin, MessageCircle, Package, ShieldCheck, ShoppingCart, Sparkles, Tag, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { QuantityStepper } from '@/components/spectrumui/quantity-stepper';
import { SkeletonBlock, SkeletonReveal } from '../components/spectrumui/skeleton-reveal';

const cartCache = new Map();

export default function CartPage({ currentUser, products = [], onCartChange, onNavigateHome, onNavigateProducts, onBack, onOpenChat }) {
  const cacheKey = currentUser?.id || 'guest';
  const [cartItems, setCartItems] = useState(() => cartCache.get(cacheKey) || []);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(() => !cartCache.has(cacheKey));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadCart = async () => {
    if (!currentUser?.id || !supabase) { cartCache.set(cacheKey, []); setCartItems([]); setLoading(false); return; }
    setLoading(!cartCache.has(cacheKey)); setError('');
    const { data: rows, error: cartError } = await supabase.from('cart_items').select('id,product_id').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (cartError) { setError(cartError.message); setCartItems([]); setLoading(false); return; }
    const ids = (rows || []).map((row) => row.product_id);
    if (!ids.length) { cartCache.set(cacheKey, []); setCartItems([]); setLoading(false); return; }
    const [{ data: productRows, error: productError }, { data: imageRows }, { data: locationRows }] = await Promise.all([
      supabase.from('products').select('id,title,price,seller_id,condition_tag,location_id,status').in('id', ids),
      supabase.from('product_images').select('product_id,image_url,display_order').in('product_id', ids).order('display_order'),
      supabase.from('pickup_locations').select('id,location_name'),
    ]);
    if (productError) setError(productError.message);
    const sellerIds = [...new Set((productRows || []).map((product) => product.seller_id).filter(Boolean))];
    const { data: sellerRows } = sellerIds.length ? await supabase.from('profiles').select('id,display_name,is_verified').in('id', sellerIds) : { data: [] };
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
      return [{ id: row.id, productId: product.id, title: product.title, price: Number(product.price), image: images.get(product.id)?.[0] || known?.image || '', seller: seller?.display_name || known?.seller || 'ผู้ขาย SPU Market', sellerId: product.seller_id, sellerVerified: Boolean(seller?.is_verified || known?.verified), location: locations.get(product.location_id) || known?.location || 'ไม่ระบุจุดนัดรับ', tag: product.condition_tag || '', qty: existing?.qty || 1 }];
    });
    cartCache.set(cacheKey, mapped);
    setCartItems(mapped);
    const requestedProductId = new URLSearchParams(window.location.search).get('selected');
    setSelectedId(requestedProductId ? mapped.find((item) => String(item.productId) === requestedProductId)?.id || null : null);
    setLoading(false);
  };
  useEffect(() => { void loadCart(); }, [currentUser?.id]);
  const updateQty = (id, qty) => setCartItems((items) => {
    const next = items.map((item) => item.id === id ? { ...item, qty } : item);
    cartCache.set(cacheKey, next);
    return next;
  });

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
  const total = useMemo(() => selected ? selected.price * selected.qty : 0, [selected]);
  const handlePickup = async () => {
    if (!selected) { setError('กรุณาเลือกสินค้าที่ต้องการนัดรับ 1 รายการ'); return; }
    if (!currentUser?.id) { setError('กรุณาเข้าสู่ระบบก่อนนัดรับสินค้า'); return; }
    setBusy(true); setError('');
    const { data: conversationId, error: chatError } = await supabase.rpc('open_marketplace_conversation', { p_product_id: selected.productId });
    if (chatError) { setError(chatError.message); setBusy(false); return; }
    const draftMessage = `\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e35\u0e04\u0e23\u0e31\u0e1a/\u0e04\u0e48\u0e30 \u0e2a\u0e19\u0e43\u0e08\u0e19\u0e31\u0e14\u0e23\u0e31\u0e1a\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32 \u201c${selected.title}\u201d \u0e08\u0e33\u0e19\u0e27\u0e19 ${selected.qty} \u0e0a\u0e34\u0e49\u0e19 \u0e23\u0e32\u0e04\u0e32 \u0e3f${(selected.price * selected.qty).toLocaleString()} \u0e2a\u0e30\u0e14\u0e27\u0e01\u0e19\u0e31\u0e14\u0e23\u0e31\u0e1a\u0e27\u0e31\u0e19\u0e41\u0e25\u0e30\u0e40\u0e27\u0e25\u0e32\u0e44\u0e2b\u0e19\u0e04\u0e23\u0e31\u0e1a/\u0e04\u0e30?`;
    const removed = await removeItem(selected);
    if (!removed) { setBusy(false); return; }
    onOpenChat?.({ id: conversationId, name: selected.seller, productTitle: selected.title, image: selected.image, price: selected.price, location: selected.location, draftMessage });
    setBusy(false);
  };

  return <div className="cart-page-root">
    <header className="cart-header">
      <button type="button" className="cart-header-left" onClick={onBack || onNavigateHome} title="ย้อนกลับ" style={{ cursor: 'pointer', border: 0, background: 'none', color: 'inherit' }}><ArrowLeft size={20} /><h1>ตะกร้าสินค้า</h1></button>
      <span className="cart-header-count">{cartItems.length} รายการ</span>
    </header>
    {error && <div role="alert" className="cart-error" style={{ padding: '12px 16px', color: '#b42318' }}>{error}</div>}
    <div className="cart-items-section">
      <SkeletonReveal loading={loading} skeleton={<div className="cart-skeleton-list" aria-hidden="true">{[0, 1, 2].map((item) => <div className="cart-item-card" key={item}><SkeletonBlock className="cart-skeleton-image" /><div className="cart-skeleton-copy"><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /></div></div>)}</div>}>
      {!currentUser ? <div className="cart-empty-state"><div className="cart-empty-icon"><ShoppingCart size={52} strokeWidth={1.2} /></div><h3>กรุณาเข้าสู่ระบบ</h3><p>เข้าสู่ระบบเพื่อดูสินค้าในตะกร้าของคุณ</p></div> : cartItems.length === 0 ? <div className="cart-empty-state"><div className="cart-empty-icon"><ShoppingCart size={52} strokeWidth={1.2} /></div><h3>ตะกร้าของคุณว่างเปล่า</h3><p>เลือกดูสินค้ามือสองของเพื่อนนักศึกษา SPU ได้เลยครับ</p><button type="button" className="cart-browse-btn" onClick={onNavigateProducts || onNavigateHome}><Sparkles size={16} /><span>เลือกดูสินค้า</span></button></div> : cartItems.map((item) => <div key={item.id} className={`cart-item-card ${selectedId === item.id ? 'selected' : ''}`}>
        <button type="button" className="cart-item-checkbox-btn" onClick={() => setSelectedId((id) => id === item.id ? null : item.id)} aria-label={`เลือก ${item.title}`} aria-pressed={selectedId === item.id}><span className={`cart-checkbox ${selectedId === item.id ? 'checked' : ''}`}>{selectedId === item.id && <CheckCircle2 size={13} strokeWidth={2.5} />}</span></button>
        <div className="cart-item-thumb-wrap">{item.image ? <img src={item.image} alt={item.title} className="cart-item-thumb" /> : <Package size={40} />}{item.tag && <span className="cart-item-tag"><Tag size={9} />{item.tag}</span>}</div>
        <div className="cart-item-info"><h4 className="cart-item-title">{item.title}</h4><div className="cart-item-seller-row"><span className="cart-seller-avatar">{item.seller.slice(0, 1)}</span><span className="cart-seller-name">{item.seller}</span>{item.sellerVerified && <ShieldCheck size={12} className="cart-seller-verified" />}</div><div className="cart-item-pickup-row"><MapPin size={11} className="cart-pickup-icon" /><span className="cart-pickup-text">{item.location}</span></div><div className="cart-item-pickup-time"><Clock size={11} className="cart-pickup-time-icon" /><span>เลือกเพื่อนัดรับได้ครั้งละ 1 รายการ</span></div><div className="cart-item-price-row"><span className="cart-item-price">฿{(item.price * item.qty).toLocaleString()}</span><QuantityStepper value={item.qty} onValueChange={(qty) => updateQty(item.id, qty)} min={1} max={99} size="sm" /></div></div>
        <div className="cart-item-actions"><button type="button" className="cart-chat-btn" onClick={() => onOpenChat?.({ id: item.productId, name: item.seller, productTitle: item.title, image: item.image, price: item.price, location: item.location })} aria-label="แชทกับผู้ขาย"><MessageCircle size={16} /></button><button type="button" className="cart-remove-btn" onClick={() => void removeItem(item)} aria-label="ลบออกจากตะกร้า"><Trash2 size={15} /></button></div>
      </div>)}
      </SkeletonReveal>
    </div>
    {cartItems.length > 0 && <><div className="cart-summary-section"><h3 className="cart-summary-title"><Package size={16} /><span>สรุปรายการนัดรับ</span></h3><div className="cart-summary-rows"><div className="cart-summary-row"><span>รายการที่เลือก</span><span>{selected ? '1 ชิ้น' : 'ยังไม่ได้เลือก'}</span></div><div className="cart-summary-row pickup-row"><span>นัดรับสินค้าในมหาวิทยาลัย</span><span className="free-label">ฟรี</span></div></div><div className="cart-summary-divider" /><div className="cart-summary-total-row"><span>ราคาสินค้า</span><span className="cart-summary-total-price">฿{total.toLocaleString()}</span></div><div className="cart-trust-strip"><ShieldCheck size={14} className="cart-trust-icon" /><span>นัดรับสินค้าในมหาวิทยาลัย SPU</span></div></div><div className="cart-checkout-bar"><div className="cart-checkout-info"><span className="cart-checkout-item-count">{selected ? '1 รายการ' : 'ยังไม่เลือกสินค้า'}</span><span className="cart-checkout-total">฿{total.toLocaleString()}</span></div><button type="button" className={`cart-checkout-btn ${!selected || busy ? 'disabled' : ''}`} onClick={handlePickup} disabled={!selected || busy}><span>{busy ? 'กำลังสร้างห้องแชท...' : 'นัดรับสินค้า'}</span><ArrowRight size={16} strokeWidth={2.5} /></button></div></>}
  </div>;
}

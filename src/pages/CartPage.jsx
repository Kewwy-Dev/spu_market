import React, { useState } from 'react';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Tag,
  Package,
  MessageCircle,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const initialCartItems = [
  {
    id: 'cart-01',
    title: 'เคส iPad Air 5 สภาพ 99% สีหมอก',
    price: 350,
    originalPrice: 550,
    qty: 1,
    image:
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&auto=format&fit=crop&q=80',
    seller: 'น้องฟ้า (นิเทศฯ)',
    sellerAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
    sellerVerified: true,
    pickupLocation: 'อาคาร 11 ชั้น 1 (โรงอาหาร)',
    pickupTime: 'วันนี้ 14:00 น.',
    tag: 'ยอดนิยม',
  },
  {
    id: 'cart-02',
    title: 'หนังสือ Data Structures & Algorithms ปี 3',
    price: 180,
    originalPrice: 320,
    qty: 1,
    image:
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300&auto=format&fit=crop&q=80',
    seller: 'พี่บอส ICT',
    sellerAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
    sellerVerified: true,
    pickupLocation: 'โรงอาหารกลาง SPU',
    pickupTime: 'พรุ่งนี้ 12:00 น.',
    tag: 'ส่วนลด 44%',
  },
  {
    id: 'cart-03',
    title: 'เสื้อช็อป SPU ไซส์ L ของแท้ สภาพใหม่',
    price: 420,
    originalPrice: 420,
    qty: 1,
    image:
      'https://images.unsplash.com/photo-1578932750294-f5075e85f44a?w=300&auto=format&fit=crop&q=80',
    seller: 'น้องมายด์',
    sellerAvatar:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80',
    sellerVerified: false,
    pickupLocation: 'ลานจอดรถหน้าตึก 1 (ตึกดำ)',
    pickupTime: 'นัดได้ตามสะดวก',
    tag: null,
  },
];

export default function CartPage({ onNavigateHome, onOpenChat }) {
  const [cartItems, setCartItems] = useState(initialCartItems);
  const [selectedItems, setSelectedItems] = useState(
    new Set(initialCartItems.map((i) => i.id))
  );
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  const toggleSelect = (id) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cartItems.map((i) => i.id)));
    }
  };

  const updateQty = (id, delta) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, qty: Math.max(1, item.qty + delta) }
          : item
      )
    );
  };

  const removeItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedItems((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const applyCoupon = () => {
    if (coupon.trim().toUpperCase() === 'SPU10') {
      setCouponApplied(true);
    } else {
      alert('โค้ดส่วนลดไม่ถูกต้อง ลองใช้ "SPU10"');
    }
  };

  const selectedCartItems = cartItems.filter((i) => selectedItems.has(i.id));
  const subtotal = selectedCartItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );
  const discount = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - discount;
  const totalItems = selectedCartItems.reduce((s, i) => s + i.qty, 0);

  const handleCheckout = () => {
    if (selectedCartItems.length === 0) {
      alert('กรุณาเลือกสินค้าอย่างน้อย 1 รายการก่อนดำเนินการ');
      return;
    }
    alert(
      `✅ ยืนยันการสั่งซื้อ ${totalItems} รายการ\n💰 ยอดรวม ฿${total.toLocaleString()}\n\nผู้ขายจะแชทนัดหมายส่งมอบของภายใน 30 นาทีครับ!`
    );
  };

  return (
    <div className="cart-page-root">
      {/* Header */}
      <header className="cart-header">
        <div
          className="cart-header-left"
          onClick={onNavigateHome}
          style={{ cursor: 'pointer' }}
          title="กลับหน้าแรก"
        >
          <div className="cart-header-icon-wrap">
            <GraduationCap size={18} className="cart-header-cap" />
          </div>
          <h1>ตะกร้าสินค้า</h1>
        </div>
        <span className="cart-header-count">{cartItems.length} รายการ</span>
      </header>

      {/* Select All Bar */}
      {cartItems.length > 0 && (
        <div className="cart-select-all-bar">
          <button
            type="button"
            className="cart-checkbox-wrap"
            onClick={toggleSelectAll}
            aria-label="เลือกทั้งหมด"
          >
            <span
              className={`cart-checkbox ${selectedItems.size === cartItems.length ? 'checked' : ''}`}
            >
              {selectedItems.size === cartItems.length && (
                <CheckCircle2 size={14} strokeWidth={2.5} />
              )}
            </span>
            <span className="cart-select-all-label">
              เลือกทั้งหมด ({cartItems.length})
            </span>
          </button>
          {selectedItems.size > 0 && (
            <button
              type="button"
              className="cart-delete-selected-btn"
              onClick={() => {
                if (
                  window.confirm(
                    `ลบ ${selectedItems.size} รายการที่เลือกใช่หรือไม่?`
                  )
                ) {
                  setCartItems((prev) =>
                    prev.filter((i) => !selectedItems.has(i.id))
                  );
                  setSelectedItems(new Set());
                }
              }}
            >
              <Trash2 size={14} />
              <span>ลบที่เลือก</span>
            </button>
          )}
        </div>
      )}

      {/* Cart Items */}
      <div className="cart-items-section">
        {cartItems.length === 0 ? (
          <div className="cart-empty-state">
            <div className="cart-empty-icon">
              <ShoppingCart size={52} strokeWidth={1.2} />
            </div>
            <h3>ตะกร้าของคุณว่างเปล่า</h3>
            <p>เลือกดูสินค้ามือสองของเพื่อนนักศึกษา SPU ได้เลยครับ!</p>
            <button
              type="button"
              className="cart-browse-btn"
              onClick={onNavigateHome}
            >
              <Sparkles size={16} />
              <span>เลือกดูสินค้า</span>
            </button>
          </div>
        ) : (
          cartItems.map((item) => (
            <div
              key={item.id}
              className={`cart-item-card ${selectedItems.has(item.id) ? 'selected' : ''}`}
            >
              {/* Checkbox */}
              <button
                type="button"
                className="cart-item-checkbox-btn"
                onClick={() => toggleSelect(item.id)}
                aria-label={`เลือก ${item.title}`}
              >
                <span
                  className={`cart-checkbox ${selectedItems.has(item.id) ? 'checked' : ''}`}
                >
                  {selectedItems.has(item.id) && (
                    <CheckCircle2 size={13} strokeWidth={2.5} />
                  )}
                </span>
              </button>

              {/* Thumbnail */}
              <div className="cart-item-thumb-wrap">
                <img
                  src={item.image}
                  alt={item.title}
                  className="cart-item-thumb"
                />
                {item.tag && (
                  <span className="cart-item-tag">
                    <Tag size={9} />
                    {item.tag}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="cart-item-info">
                <h4 className="cart-item-title">{item.title}</h4>

                {/* Seller */}
                <div className="cart-item-seller-row">
                  <img
                    src={item.sellerAvatar}
                    alt={item.seller}
                    className="cart-seller-avatar"
                  />
                  <span className="cart-seller-name">{item.seller}</span>
                  {item.sellerVerified && (
                    <ShieldCheck size={12} className="cart-seller-verified" />
                  )}
                </div>

                {/* Pickup */}
                <div className="cart-item-pickup-row">
                  <MapPin size={11} className="cart-pickup-icon" />
                  <span className="cart-pickup-text">{item.pickupLocation}</span>
                </div>
                <div className="cart-item-pickup-time">
                  <Clock size={11} className="cart-pickup-time-icon" />
                  <span>{item.pickupTime}</span>
                </div>

                {/* Price + Qty */}
                <div className="cart-item-price-row">
                  <div className="cart-item-prices">
                    <span className="cart-item-price">
                      ฿{(item.price * item.qty).toLocaleString()}
                    </span>
                    {item.originalPrice > item.price && (
                      <span className="cart-item-original-price">
                        ฿{item.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="cart-qty-control">
                    <button
                      type="button"
                      className="cart-qty-btn"
                      onClick={() => updateQty(item.id, -1)}
                      aria-label="ลดจำนวน"
                    >
                      <Minus size={12} strokeWidth={2.5} />
                    </button>
                    <span className="cart-qty-num">{item.qty}</span>
                    <button
                      type="button"
                      className="cart-qty-btn"
                      onClick={() => updateQty(item.id, 1)}
                      aria-label="เพิ่มจำนวน"
                    >
                      <Plus size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="cart-item-actions">
                <button
                  type="button"
                  className="cart-chat-btn"
                  onClick={() => onOpenChat && onOpenChat(item.id)}
                  aria-label="แชทกับผู้ขาย"
                  title="แชทกับผู้ขาย"
                >
                  <MessageCircle size={16} />
                </button>
                <button
                  type="button"
                  className="cart-remove-btn"
                  onClick={() => removeItem(item.id)}
                  aria-label="ลบออกจากตะกร้า"
                  title="ลบออกจากตะกร้า"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Coupon Section */}
      {cartItems.length > 0 && (
        <div className="cart-coupon-section">
          <div className="cart-coupon-inner">
            <div className="cart-coupon-icon-wrap">
              <Tag size={16} />
            </div>
            {couponApplied ? (
              <div className="cart-coupon-applied">
                <CheckCircle2 size={15} className="coupon-applied-icon" />
                <span>
                  โค้ด <strong>SPU10</strong> — ส่วนลด 10%
                </span>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className="cart-coupon-input"
                  placeholder='ใส่โค้ดส่วนลด (ลอง "SPU10")'
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                />
                <button
                  type="button"
                  className="cart-coupon-apply-btn"
                  onClick={applyCoupon}
                >
                  ใช้โค้ด
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Order Summary */}
      {cartItems.length > 0 && (
        <div className="cart-summary-section">
          <h3 className="cart-summary-title">
            <Package size={16} />
            <span>สรุปคำสั่งซื้อ</span>
          </h3>

          <div className="cart-summary-rows">
            <div className="cart-summary-row">
              <span>ยอดรวมสินค้า ({totalItems} ชิ้น)</span>
              <span>฿{subtotal.toLocaleString()}</span>
            </div>
            {couponApplied && (
              <div className="cart-summary-row discount-row">
                <span>ส่วนลดโค้ด SPU10</span>
                <span>-฿{discount.toLocaleString()}</span>
              </div>
            )}
            <div className="cart-summary-row pickup-row">
              <span>ค่าจัดส่ง (นัดรับในมหาลัย)</span>
              <span className="free-label">ฟรี!</span>
            </div>
          </div>

          <div className="cart-summary-divider" />

          <div className="cart-summary-total-row">
            <span>ยอดที่ต้องชำระ</span>
            <span className="cart-summary-total-price">
              ฿{total.toLocaleString()}
            </span>
          </div>

          <div className="cart-trust-strip">
            <ShieldCheck size={14} className="cart-trust-icon" />
            <span>นัดรับ-ส่งในมหาวิทยาลัย SPU อย่างปลอดภัย ไม่มีค่าธรรมเนียม</span>
          </div>
        </div>
      )}

      {/* Checkout Bar */}
      {cartItems.length > 0 && (
        <div className="cart-checkout-bar">
          <div className="cart-checkout-info">
            <span className="cart-checkout-item-count">{totalItems} รายการ</span>
            <span className="cart-checkout-total">
              ฿{total.toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            className={`cart-checkout-btn ${selectedItems.size === 0 ? 'disabled' : ''}`}
            onClick={handleCheckout}
            disabled={selectedItems.size === 0}
          >
            <span>นัดรับสินค้า</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}

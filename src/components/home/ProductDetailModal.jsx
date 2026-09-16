import React from 'react';
import { X, MapPin, CheckCircle2, MessageCircle, Heart, Share2 } from 'lucide-react';

export default function ProductDetailModal({ product, onClose, onContactSeller }) {
  if (!product) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('th-TH').format(price);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="product-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="ปิด"
        >
          <X size={20} />
        </button>

        <div className="modal-image-container">
          <img src={product.image} alt={product.title} className="modal-product-img" />
          {product.tag && (
            <span className={`modal-tag-pill tag-${product.tagColor || 'blue'}`}>
              {product.tag}
            </span>
          )}
        </div>

        <div className="modal-body-content">
          <div className="modal-price-row">
            <span className="modal-product-price">฿{formatPrice(product.price)}</span>
            <span className="modal-product-time">{product.timeAgo}</span>
          </div>

          <h3 className="modal-product-title">{product.title}</h3>

          <div className="modal-meta-chips">
            <div className="meta-chip">
              <MapPin size={13} className="chip-icon" />
              <span>{product.location}</span>
            </div>
            {product.building && (
              <div className="meta-chip building-chip">
                <span>📍 {product.building}</span>
              </div>
            )}
          </div>

          {/* Seller Card */}
          <div className="modal-seller-card">
            <div className="seller-avatar">
              {product.seller.charAt(0)}
            </div>
            <div className="seller-info">
              <div className="seller-name-row">
                <span className="seller-title">{product.seller}</span>
                {product.verified && (
                  <span className="spu-verified-tag">
                    <CheckCircle2 size={10} strokeWidth={3} />
                    <span>SPU Verified</span>
                  </span>
                )}
              </div>
              <span className="seller-sub">นักศึกษามหาวิทยาลัยศรีปทุม ยืนยันตัวตนแล้ว</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="modal-cta-buttons">
            <button
              type="button"
              className="btn-chat-seller"
              onClick={() => onContactSeller(product)}
            >
              <MessageCircle size={18} strokeWidth={2.2} />
              <span>ติดต่อผู้ขาย / นัดรับในมอ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

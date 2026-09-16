import React from 'react';
import { MapPin, CheckCircle2 } from 'lucide-react';

export default function ProductCard({ product, onSelectProduct }) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('th-TH').format(price);
  };

  return (
    <article
      className="product-card"
      onClick={() => onSelectProduct?.(product)}
      tabIndex={0}
      role="button"
      aria-label={`${product.title} ราคา ${product.price} บาท`}
    >
      <div className="product-image-box">
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="product-img"
        />
        {product.tag && (
          <span className={`product-tag-pill tag-${product.tagColor || 'blue'}`}>
            {product.tag}
          </span>
        )}
      </div>

      <div className="product-details">
        <h4 className="product-title" title={product.title}>
          {product.title}
        </h4>

        <div className="product-price">
          ฿{formatPrice(product.price)}
        </div>

        <div className="product-location-badge">
          <MapPin size={11} className="loc-icon" />
          <span className="loc-text">{product.location}</span>
        </div>

        <div className="product-seller-row">
          <span className="seller-name" title={product.seller}>
            {product.seller}
          </span>

          {product.verified && (
            <div className="spu-verified-tag" title="ยืนยันตัวตนด้วยบัตรนักศึกษา SPU แล้ว">
              <CheckCircle2 size={10} strokeWidth={3} className="verified-check" />
              <span>SPU</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

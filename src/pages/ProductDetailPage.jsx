import React, { useState } from 'react';
import { ArrowLeft, Share2, Heart, MapPin, MessageCircle, ShoppingCart, X } from 'lucide-react';

const money = (value) => new Intl.NumberFormat('th-TH').format(value || 0);

export default function ProductDetailPage({ product, onBack, onNavigateToChat, onAddToCart, isOwner = false }) {
  const [isSaved, setIsSaved] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  if (!product) return <div className="product-not-found"><button type="button" onClick={onBack}><ArrowLeft size={18} /> กลับไปหน้าสินค้า</button><p>ไม่พบสินค้านี้</p></div>;
  const images = product.images?.length ? product.images : product.image ? [product.image] : [];
  const shiftImage = (delta) => setImageIndex((index) => (index + delta + images.length) % images.length);
  const handleTouchStart = (event) => setTouchStartX(event.touches[0].clientX);
  const handleTouchEnd = (event) => {
    if (touchStartX === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) > 40 && images.length > 1) shiftImage(distance < 0 ? 1 : -1);
    setTouchStartX(null);
  };

  return <div className="product-detail-page-container">
    <header className="product-view-header">
      <button type="button" aria-label="ย้อนกลับ" onClick={onBack}><ArrowLeft size={20} /></button>
      <div><button type="button" aria-label="แชร์สินค้า" onClick={() => navigator.clipboard?.writeText(window.location.href)}><Share2 size={19} /></button><button type="button" aria-label="บันทึกสินค้า" className={isSaved ? 'saved' : ''} onClick={() => setIsSaved((saved) => !saved)}><Heart size={20} fill={isSaved ? 'currentColor' : 'none'} /></button></div>
    </header>
    <div className="product-view-image-wrap" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {images.length > 0 ? <img src={images[imageIndex]} alt={`${product.title} ${imageIndex + 1}`} className="product-view-image" onClick={() => setIsExpanded(true)} /> : <div className="product-image-empty">ไม่มีรูปภาพ</div>}
      {product.tag && <span className="product-view-tag">{product.tag}</span>}
      <span className="product-image-count">{images.length ? `${imageIndex + 1}/${images.length}` : '0/0'}</span>
    </div>
    <main className="product-view-content">
      <div className="product-view-price-row"><strong>฿{money(product.price)}</strong>{product.timeAgo && <span>{product.timeAgo}</span>}</div>
      <h1>{product.title}</h1>
      <section className="product-description-card"><h2>รายละเอียดสินค้า</h2><p>{product.description || 'ไม่มีรายละเอียดสินค้า'}</p></section>
      <section className="product-pickup-card"><div className="product-pickup-heading"><MapPin size={18} /><strong>จุดนัดรับ</strong></div><p>{product.location || 'ไม่ระบุจุดนัดรับ'}</p></section>
      <section className="product-view-seller"><div className="product-view-avatar">{product.seller?.charAt(0) || 'S'}</div><div><strong>{product.seller || 'ผู้ขาย SPU Market'}</strong><span>{product.verified ? 'ยืนยันตัวตนแล้ว' : 'สมาชิก SPU Market'}</span></div></section>
    </main>
    <footer className="product-view-actions">
      <button type="button" className="product-chat-action" disabled={isOwner} onClick={onNavigateToChat}><MessageCircle size={17} /> {isOwner ? 'สินค้าของคุณ' : 'แชท'}</button>
      <button type="button" className="product-buy-action" disabled={isOwner} onClick={() => onAddToCart?.(product)}><ShoppingCart size={17} /> {isOwner ? 'สั่งซื้อไม่ได้' : 'สั่งซื้อ'}</button>
    </footer>
    {isExpanded && <div className="product-image-lightbox" onClick={() => setIsExpanded(false)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}><button aria-label="ปิดภาพ" onClick={() => setIsExpanded(false)}><X /></button><img src={images[imageIndex]} alt={product.title} onClick={(event) => event.stopPropagation()} /><span>{imageIndex + 1}/{images.length}</span></div>}
  </div>;
}

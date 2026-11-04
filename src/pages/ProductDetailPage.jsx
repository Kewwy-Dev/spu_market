import React, { useState } from 'react';
import {
  ArrowLeft,
  Share2,
  Bookmark,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  MessageCircle,
  Star,
  Check,
  Building2,
  AlertCircle,
} from 'lucide-react';

export default function ProductDetailPage({
  product: _product,
  currentUser,
  onBack,
  onNavigateToChat,
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  const photos = [
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?w=800&auto=format&fit=crop&q=80',
  ];

  const handleContactLine = () => {
    if (!currentUser) {
      if (onNavigateToChat) onNavigateToChat();
      return;
    }
    alert('กำลังเปิด LINE เพื่อติดต่อคุณ น้องฟ้า คณะนิเทศฯ (Fah F.) ID: @fah_spu65');
  };

  const handleChat = () => {
    if (!currentUser) {
      if (onNavigateToChat) onNavigateToChat();
      return;
    }
    if (onNavigateToChat) {
      onNavigateToChat();
    } else {
      alert('ระบบแชทในแอป SPU Market: กำลังเชื่อมต่อห้องสนทนากับผู้ขาย...');
    }
  };

  return (
    <div className="product-detail-page-container">
      {/* 1. Header Navigation */}
      <header className="prod-detail-header">
        <button
          type="button"
          className="prod-header-btn"
          onClick={onBack}
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="prod-header-title">รายละเอียดสินค้า</h1>

        <div className="prod-header-actions">
          <button
            type="button"
            className="prod-header-btn"
            title="แชร์สินค้า"
            onClick={() => alert('คัดลอกลิงก์สินค้านี้แล้ว')}
          >
            <Share2 size={18} />
          </button>
          <button
            type="button"
            className={`prod-header-btn ${isSaved ? 'saved' : ''}`}
            title="บันทึกสินค้า"
            onClick={() => setIsSaved(!isSaved)}
          >
            <Bookmark size={18} fill={isSaved ? '#e6007e' : 'none'} color={isSaved ? '#e6007e' : 'currentColor'} />
          </button>
        </div>
      </header>

      {/* 2. Photo Carousel */}
      <div className="prod-carousel-wrap">
        <img
          src={photos[currentPhotoIdx]}
          alt="iPad Air 5"
          className="prod-carousel-img"
        />

        <div className="prod-warranty-badge">
          <ShieldCheck size={13} />
          <span>มีประกันศูนย์เหลือ 6 เดือน</span>
        </div>

        <div className="prod-carousel-counter">
          <span>{currentPhotoIdx + 1}/{photos.length}</span>
        </div>

        {/* Dots */}
        <div className="prod-carousel-dots">
          {photos.map((_, idx) => (
            <span
              key={idx}
              className={`carousel-dot ${currentPhotoIdx === idx ? 'active' : ''}`}
              onClick={() => setCurrentPhotoIdx(idx)}
            />
          ))}
        </div>
      </div>

      <div className="prod-content-body">
        {/* 3. Price & Title */}
        <div className="prod-price-card">
          <div className="prod-price-row">
            <div className="prod-main-price-box">
              <span className="prod-price-val">฿14,500</span>
              <span className="prod-price-original">฿17,900</span>
            </div>
            <span className="prod-discount-pill">ประหยัด 19%</span>
          </div>

          <h2 className="prod-main-title">
            iPad Air 5 64GB WiFi สี Space Gray แบตเตอรี่ 94% สภาพดีมาก
          </h2>

          <div className="prod-tags-row">
            <span className="prod-tag green">#พร้อมอุปกรณ์ครบกล่อง</span>
            <span className="prod-tag">#มีเคสแถมให้</span>
            <span className="prod-tag">#ฟิล์มกระจก</span>
            <span className="prod-tag">#นัดรับในมอ SPU</span>
          </div>

          {/* 3 Spec highlight boxes */}
          <div className="prod-specs-grid">
            <div className="spec-box">
              <span className="spec-title">สภาพภายนอก</span>
              <span className="spec-value">96% สภาพเนียน</span>
            </div>
            <div className="spec-box">
              <span className="spec-title">ประกันศูนย์</span>
              <span className="spec-value">เหลือ 2 เดือน</span>
            </div>
            <div className="spec-box">
              <span className="spec-title">อุปกรณ์</span>
              <span className="spec-value">ครบกล่องแท้</span>
            </div>
          </div>
        </div>

        {/* 4. Meetup & Verification Spot in SPU */}
        <section className="prod-section-card">
          <div className="prod-card-header">
            <div className="prod-card-title">
              <MapPin size={17} className="icon-spu-pink" />
              <h3>จุดนัดรับ & ตรวจสอบสินค้าในมหาวิทยาลัย</h3>
            </div>
          </div>
          <p className="prod-card-subtitle">
            แนะนำให้นัดตรวจสอบสภาพสินค้าและทดลองใช้งานจริงก่อนชำระเงิน
          </p>

          <div className="prod-meetup-box">
            <div className="meetup-row">
              <Building2 size={16} className="meetup-icon" />
              <div className="meetup-text">
                <strong>ตึก 11 ชั้น 1 (ลานกิจกรรมและโรงอาหารใหม่) หรือ โรงอาหารกลาง SPU</strong>
              </div>
            </div>

            <div className="meetup-row">
              <Clock size={16} className="meetup-icon" />
              <div className="meetup-text">
                <span>สะดวกทุกวัน จันทร์ - ศุกร์ หลัง 13:00 น. (ช่วงพักเบรก / เลิกคลาส)</span>
              </div>
            </div>

            <div className="meetup-trust-notice">
              <ShieldCheck size={14} className="trust-check" />
              <span>ปลอดภัย 100%: นัดรับในพื้นที่มหาวิทยาลัย มีกล้องวงจรปิดและผู้คนพลุกพล่าน</span>
            </div>
          </div>
        </section>

        {/* 5. Product Description */}
        <section className="prod-section-card">
          <div className="prod-card-header">
            <div className="prod-card-title">
              <Sparkles size={17} className="icon-spu-pink" />
              <h3>รายละเอียดสินค้าจากผู้ขาย</h3>
            </div>
          </div>

          <div className="prod-desc-content">
            <p>
              สวัสดีค่ะ ปล่อยต่อ iPad Air 5 ความจุ 64GB WiFi สี Space Gray ซื้อมาตอนปี 2 เทอม 1 ใช้งานถนอมมาก ส่วนใหญ่ใช้จดเลกเชอร์ในคลาสเรียนของ SPU กับวาดรูปส่งงาน ติดฟิล์มกระจก Paper-like ให้เรียบร้อย ไม่เคยตกหล่น ใช้งานได้สมบูรณ์ทุกอย่าง แบตเตอรี่อึด 94% สุขภาพแบตดีมาก ไม่เคยแกะซ่อม มีใบเสร็จตอนซื้อให้ดูเพื่อความสบายใจค่ะ
            </p>

            <div className="prod-includes-box">
              <h5>อุปกรณ์และของแถมในกล่อง:</h5>
              <ul>
                <li>
                  <Check size={13} className="check-bullet" />
                  <span>ตัวเครื่อง iPad Air 5 (ติดฟิล์มกระจกด้านเรียบร้อย)</span>
                </li>
                <li>
                  <Check size={13} className="check-bullet" />
                  <span>กล่องแท้ Original เลข Serial ตรงกล่อง</span>
                </li>
                <li>
                  <Check size={13} className="check-bullet" />
                  <span>หัวชาร์จ 20W + สายชาร์จแท้ Type-C</span>
                </li>
                <li>
                  <Check size={13} className="check-bullet" />
                  <span>แถมฟรี! เคสแบบพับตั้งได้สีดำสภาพดี (มูลค่า 490.-)</span>
                </li>
                <li>
                  <Check size={13} className="check-bullet" />
                  <span>แถมฟรี! หัวปากกา Stylus สำรอง พร้อมกล่องใส่ปากกา</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 6. Verified Seller Information */}
        <section className="prod-section-card">
          <div className="prod-card-header">
            <div className="prod-card-title">
              <ShieldCheck size={17} className="icon-spu-pink" />
              <h3>ข้อมูลผู้ขายที่ได้รับการยืนยันตัวตน</h3>
            </div>
            <span className="seller-status-chip">ยืนยันตนแล้ว</span>
          </div>

          <div className="prod-seller-profile">
            <div className="prod-seller-top">
              <div className="prod-seller-avatar-wrap">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                  alt="น้องฟ้า"
                  className="prod-seller-avatar"
                />
                <span className="prod-seller-check">
                  <CheckCircle2 size={13} />
                </span>
              </div>

              <div className="prod-seller-info">
                <h4>น้องฟ้า คณะนิเทศฯ (Fah F.)</h4>
                <div className="prod-seller-sub">
                  <span className="spu-verified-badge">
                    <CheckCircle2 size={11} />
                    <span>นักศึกษาคณะนิเทศศาสตร์ ม.ศรีปทุม (รหัส 65xxxx)</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="prod-seller-stats-strip">
              <div className="seller-stat-cell">
                <span className="stat-score-val">
                  <Star size={13} fill="#f59e0b" color="#f59e0b" />
                  <span>4.9</span>
                </span>
                <span className="stat-score-label">38 รีวิวจากเพื่อน SPU</span>
              </div>
              <div className="stat-cell-divider" />
              <div className="seller-stat-cell">
                <span className="stat-num-val">18</span>
                <span className="stat-score-label">ส่งมอบสำเร็จ 100%</span>
              </div>
              <div className="stat-cell-divider" />
              <div className="seller-stat-cell">
                <span className="stat-num-val">1.4 ปี</span>
                <span className="stat-score-label">สมาชิก SPU Market</span>
              </div>
            </div>

            {/* Buyer Review Quote */}
            <div className="prod-review-quote">
              <div className="quote-header">
                <strong>เอก สถาปัตย์ ม.ศรีปทุม</strong>
                <span className="quote-time">2 วันก่อน</span>
              </div>
              <p>
                "ผู้ขายนิสัยดีมาก นัดรับตรงเวลาที่ตึก 11 สอนตรวจเช็คเครื่องให้อย่างละเอียด แนะนำเลยค่ะ 👍"
              </p>
            </div>
          </div>
        </section>

        {/* 7. Safety Advice Card */}
        <div className="prod-safety-card">
          <div className="safety-card-left">
            <AlertCircle size={18} className="safety-icon" />
          </div>
          <p>
            <strong>ข้อแนะนำการซื้อขายปลอดภัยในมหาลัย:</strong> ควรนัดรับและตรวจเช็คสินค้าจริงในพื้นที่มหาวิทยาลัยที่มีคนพลุกพล่าน และชำระเงินผ่าน SPU PromptPay หรือโอนเข้าบัญชีผู้ขายที่ตรงกับชื่อที่ยืนยันตัวตนเท่านั้น
          </p>
        </div>
      </div>

      {/* 8. Fixed Bottom Action Bar */}
      <div className="prod-bottom-bar">
        <button
          type="button"
          className="prod-bottom-icon-btn"
          onClick={handleChat}
          title="แชทกับผู้ขาย"
        >
          <MessageCircle size={20} />
          <span>แชท</span>
        </button>

        <button
          type="button"
          className={`prod-bottom-icon-btn ${isSaved ? 'active' : ''}`}
          onClick={() => setIsSaved(!isSaved)}
          title="บันทึกสินค้า"
        >
          <Bookmark size={20} fill={isSaved ? '#e6007e' : 'none'} color={isSaved ? '#e6007e' : 'currentColor'} />
          <span>{isSaved ? 'บันทึกแล้ว' : 'สนใจ'}</span>
        </button>

        <button
          type="button"
          className="prod-contact-line-btn"
          onClick={handleContactLine}
        >
          <MessageCircle size={18} strokeWidth={2.4} />
          <span>{currentUser ? 'ติดต่อผ่าน LINE ผู้ขาย' : 'เข้าสู่ระบบเพื่อติดต่อผู้ขาย'}</span>
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  ArrowLeft,
  Share2,
  Bookmark,
  Settings,
  GraduationCap,
  Star,
  Zap,
  CreditCard,
  CheckCircle2,
  PlusCircle,
  Clock,
  MapPin,
  MessageCircle,
  Truck,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Edit3,
  Lock,
} from 'lucide-react';

export default function SellerDashboardPage({
  currentUser,
  userProducts = [],
  onBack,
  onAddNewProduct,
}) {
  const [activeTab, setActiveTab] = useState('selling');

  const seller = currentUser || {
    displayName: 'น้องฟ้า คณะนิเทศฯ',
    nickname: 'Fah F.',
    studentId: '65xxxx',
    faculty: 'นิเทศศาสตร์ ดิจิทัล SPU',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewCount: 38,
    onTimeRate: '98%',
    totalSales: '฿28,450',
    salesGrowth: '+28.4%',
    stats: {
      delivered: 18,
      negotiating: 4,
      available: 2,
    },
  };

  const sellingProducts = [
    {
      id: 'prod-01',
      title: 'iPad Air 5 64GB Wi-Fi Space Gray',
      price: '฿14,500',
      badge: 'สภาพนางฟ้า',
      badgeColor: 'pink',
      location: 'นัดรับ ตึก 11 (ชั้น 1)',
      image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&auto=format&fit=crop&q=80',
      interested: 3,
      status: 'active',
    },
    {
      id: 'prod-02',
      title: 'หนังสือเตรียมสอบ TOEIC ฉบับอัปเดต',
      price: '฿250',
      badge: 'นัดวันนี้ 13:00 น.',
      badgeColor: 'amber',
      location: 'โรงอาหารกลาง SPU',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&auto=format&fit=crop&q=80',
      status: 'pending_pickup',
      pickupLocationTag: 'รอนัดรับ (ตึก 11 SPU)',
    },
    {
      id: 'prod-03',
      title: 'ชีทสรุป ENG101 ฉบับเกียรตินิยม A ทุกบท',
      price: '฿89',
      badge: 'ขายดี',
      badgeColor: 'teal',
      location: 'ส่งทาง LINE ทันที / นัดรับกระดาษ',
      image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&auto=format&fit=crop&q=80',
      status: 'digital',
    },
  ];

  return (
    <div className="seller-dashboard-container">
      {/* 1. Header */}
      <header className="seller-header">
        <div className="seller-header-left">
          <button
            type="button"
            className="seller-back-btn"
            onClick={onBack}
            aria-label="ย้อนกลับ"
            title="ย้อนกลับ"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="seller-header-brand">
            <GraduationCap size={20} className="seller-brand-cap" />
            <span className="seller-brand-title">SPU Market</span>
          </div>
        </div>

        <div className="seller-header-right">
          <button
            type="button"
            className="seller-header-icon-btn"
            title="แชร์ร้านค้า"
            aria-label="แชร์ร้านค้า"
            onClick={() => alert('คัดลอกลิงก์ร้านค้าของคุณเรียบร้อยแล้ว')}
          >
            <Share2 size={18} />
          </button>
          <button
            type="button"
            className="seller-header-icon-btn"
            title="รายการที่บันทึก"
            aria-label="รายการที่บันทึก"
            onClick={() => alert('บันทึกร้านค้านี้แล้ว')}
          >
            <Bookmark size={18} />
          </button>
        </div>
      </header>

      {/* Page Title & Status */}
      <div className="seller-page-title-row">
        <div>
          <h1 className="seller-page-title">จัดการร้านค้า & โปรไฟล์ผู้ขาย</h1>
          <p className="seller-page-subtitle">สถานะบัญชีนักศึกษา ม.ศรีปทุม (บางเขน)</p>
        </div>
        <button
          type="button"
          className="seller-settings-btn"
          title="ตั้งค่าร้านค้า"
          onClick={() => alert('ตั้งค่าร้านค้า: กำลังพัฒนาเมนูตั้งค่า')}
        >
          <Settings size={18} />
        </button>
      </div>

      {/* 2. Seller Profile Card */}
      <div className="seller-profile-card">
        <div className="seller-profile-header">
          <div className="seller-avatar-wrap">
            <img
              src={seller.avatar}
              alt={seller.displayName}
              className="seller-avatar-img"
            />
            <span className="seller-verified-dot" title="SPU Verified">
              <CheckCircle2 size={13} />
            </span>
          </div>

          <div className="seller-profile-info">
            <div className="seller-name-row">
              <h2>{seller.displayName}</h2>
              {seller.nickname && <span className="seller-nickname">({seller.nickname})</span>}
            </div>
            <div className="seller-meta-row">
              <GraduationCap size={13} className="seller-cap-icon" />
              <span>รหัส {seller.studentId} • {seller.faculty}</span>
            </div>
            <div className="seller-badge-row">
              <span className="seller-verified-tag">
                <CheckCircle2 size={12} strokeWidth={2.5} />
                <span>SPU Verified Student</span>
              </span>
            </div>
          </div>
        </div>

        {/* Rating & On-time delivery row */}
        <div className="seller-rating-strip">
          <div className="seller-rating-item">
            <span className="seller-star-val">
              <Star size={13} fill="#f59e0b" color="#f59e0b" />
              <span>{seller.rating}</span>
            </span>
            <span className="seller-rating-desc">({seller.reviewCount} รีวิว) จากการส่งมอบ</span>
          </div>
          <div className="seller-rating-divider" />
          <div className="seller-rating-item">
            <span className="seller-ontime-val">
              <Zap size={13} className="seller-zap-icon" />
              <span>{seller.onTimeRate}</span>
            </span>
            <span className="seller-rating-desc">ตรงต่อเวลานัดหมาย</span>
          </div>
        </div>
      </div>

      {/* 3. Sales & Statistics Card */}
      <section className="seller-stats-section">
        <div className="seller-section-title-row">
          <div className="seller-section-title">
            <CreditCard size={17} className="seller-icon-pink" />
            <h3>ยอดขายและสถิติร้านค้า</h3>
          </div>
          <span className="seller-month-chip">เดือนนี้: ปัจจุบัน</span>
        </div>

        {/* Big Pink Card */}
        <div className="seller-sales-banner">
          <div className="sales-banner-content">
            <span className="sales-banner-label">ยอดขายสะสมเดือนนี้ (SPU PromptPay / เงินสด)</span>
            <div className="sales-banner-amount-row">
              <span className="sales-banner-amount">{seller.totalSales}</span>
              <div className="sales-card-icon-wrap">
                <CreditCard size={22} />
              </div>
            </div>
            <span className="sales-banner-trend">
              📈 {seller.salesGrowth} จากเดือนที่ผ่านมา
            </span>
          </div>
        </div>

        {/* 3 Stats Columns */}
        <div className="seller-counters-grid">
          <div className="seller-counter-box">
            <div className="counter-icon-box teal-light">
              <CheckCircle2 size={14} />
            </div>
            <span className="counter-number">{seller.stats.delivered}</span>
            <span className="counter-label">ส่งมอบสำเร็จ (100%)</span>
          </div>

          <div className="seller-counter-box">
            <div className="counter-icon-box pink-light">
              <Clock size={14} />
            </div>
            <span className="counter-number">{seller.stats.negotiating}</span>
            <span className="counter-label">กำลังเจรจา (2 นัดวันนี้)</span>
          </div>

          <div className="seller-counter-box">
            <div className="counter-icon-box amber-light">
              <Zap size={14} />
            </div>
            <span className="counter-number">{seller.stats.available}</span>
            <span className="counter-label">สินค้าพร้อมส่ง (ลงขายอยู่)</span>
          </div>
        </div>
      </section>

      {/* 4. Large Add New Product Button */}
      <div className="seller-add-btn-wrapper">
        <button
          type="button"
          className="seller-add-product-btn"
          onClick={onAddNewProduct}
        >
          <PlusCircle size={20} strokeWidth={2.5} />
          <span>+ เพิ่มสินค้าใหม่ลงขาย</span>
        </button>
      </div>

      {/* 5. Listing Tabs & Products */}
      <section className="seller-listings-section">
        <div className="seller-tabs-row">
          <button
            type="button"
            className={`seller-tab-btn ${activeTab === 'selling' ? 'active' : ''}`}
            onClick={() => setActiveTab('selling')}
          >
            <span>กำลังขาย ({sellingProducts.length + userProducts.length})</span>
          </button>
          <button
            type="button"
            className={`seller-tab-btn ${activeTab === 'sold' ? 'active' : ''}`}
            onClick={() => setActiveTab('sold')}
          >
            <span>ขายได้แล้ว (18)</span>
          </button>
          <button
            type="button"
            className={`seller-tab-btn ${activeTab === 'draft' ? 'active' : ''}`}
            onClick={() => setActiveTab('draft')}
          >
            <span>ฉบับร่าง (1)</span>
          </button>
        </div>

        {/* Listings items */}
        <div className="seller-products-list">
          {userProducts.map((product) => (
            <article key={product.id} className="seller-product-card">
              <div className="seller-prod-thumb-wrap">
                <img src={product.image} alt={product.title} className="seller-prod-thumb" />
                <span className="seller-prod-tag-pink">{'\u0e43\u0e2b\u0e21\u0e48'}</span>
              </div>
              <div className="seller-prod-details">
                <h4 className="seller-prod-title">{product.title}</h4>
                <span className="seller-prod-price">{'\u0e3f'}{Number(product.price).toLocaleString('th-TH')}</span>
                <div className="seller-prod-location">
                  <MapPin size={11} className="seller-icon-pink" />
                  <span>{product.location}</span>
                </div>
              </div>
            </article>
          ))}
          {/* Item 1 - iPad Air */}
          <div
            className="seller-product-card"
            onClick={onAddNewProduct}
            style={{ cursor: 'pointer' }}
            title="คลิกเพื่อดูตัวอย่างหน้ารายละเอียดสินค้า"
          >
            <div className="seller-prod-thumb-wrap">
              <img
                src={sellingProducts[0].image}
                alt={sellingProducts[0].title}
                className="seller-prod-thumb"
              />
              <span className="seller-prod-tag-pink">{sellingProducts[0].badge}</span>
            </div>

            <div className="seller-prod-details">
              <h4 className="seller-prod-title">{sellingProducts[0].title}</h4>
              <span className="seller-prod-price">{sellingProducts[0].price}</span>
              <div className="seller-prod-location">
                <MapPin size={11} className="seller-icon-pink" />
                <span>{sellingProducts[0].location}</span>
              </div>

              <div className="seller-prod-actions-row">
                <span className="seller-interest-pill">
                  👀 มีคนสนใจ {sellingProducts[0].interested} คน
                </span>
                <button
                  type="button"
                  className="seller-action-pill-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    alert('เปิดแบบฟอร์มแก้ไขข้อมูลสินค้า');
                  }}
                >
                  <Edit3 size={11} />
                  <span>แก้ไข</span>
                </button>
                <button
                  type="button"
                  className="seller-action-pill-btn green"
                  onClick={(e) => {
                    e.stopPropagation();
                    alert('ปิดการขายและยืนยันนัดส่งมอบ');
                  }}
                >
                  <span>ปิดการขาย</span>
                </button>
              </div>
            </div>
          </div>

          {/* Item 2 - TOEIC Book */}
          <div className="seller-product-card">
            <div className="seller-prod-thumb-wrap">
              <img
                src={sellingProducts[1].image}
                alt={sellingProducts[1].title}
                className="seller-prod-thumb"
              />
            </div>

            <div className="seller-prod-details">
              <h4 className="seller-prod-title">{sellingProducts[1].title}</h4>
              <span className="seller-prod-price">{sellingProducts[1].price}</span>
              <div className="seller-prod-location">
                <Clock size={11} className="seller-icon-amber" />
                <span>{sellingProducts[1].badge} • {sellingProducts[1].location}</span>
              </div>

              <div className="seller-prod-actions-row">
                <span className="seller-interest-pill amber">
                  {sellingProducts[1].pickupLocationTag}
                </span>
                <button
                  type="button"
                  className="seller-action-pill-btn"
                  onClick={() => alert('เปิดแชท LINE เพื่อยืนยันเวลานัดส่งมอบ')}
                >
                  <MessageCircle size={11} />
                  <span>แชท LINE</span>
                </button>
                <button
                  type="button"
                  className="seller-action-pill-btn pink-solid"
                  onClick={() => alert('ยืนยันว่าได้ส่งมอบสินค้าและรับเงินเรียบร้อยแล้ว')}
                >
                  <span>ยืนยันส่งมอบ</span>
                </button>
              </div>
            </div>
          </div>

          {/* Item 3 - ENG101 */}
          <div className="seller-product-card">
            <div className="seller-prod-thumb-wrap">
              <img
                src={sellingProducts[2].image}
                alt={sellingProducts[2].title}
                className="seller-prod-thumb"
              />
              <span className="seller-prod-tag-green">{sellingProducts[2].badge}</span>
            </div>

            <div className="seller-prod-details">
              <h4 className="seller-prod-title">{sellingProducts[2].title}</h4>
              <span className="seller-prod-price">{sellingProducts[2].price}</span>
              <div className="seller-prod-location">
                <MapPin size={11} className="seller-icon-pink" />
                <span>{sellingProducts[2].location}</span>
              </div>

              <div className="seller-prod-actions-row">
                <span className="seller-interest-pill green">
                  จัดส่ง PDF ทันที / นัดรับ
                </span>
                <button
                  type="button"
                  className="seller-action-pill-btn"
                  onClick={() => alert('ปรับจำนวนสต็อกชีทสรุป')}
                >
                  <span>ปรับสต็อก</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Meetup Locations for Seller */}
      <section className="seller-section-card">
        <div className="seller-section-header">
          <div className="seller-section-title">
            <MapPin size={17} className="seller-icon-pink" />
            <h3>จุดนัดรับที่ร้านสะดวกส่งมอบ</h3>
          </div>
          <button
            type="button"
            className="seller-edit-link"
            onClick={() => alert('แก้ไขจุดนัดรับของร้านค้า')}
          >
            แก้ไข
          </button>
        </div>
        <p className="seller-section-subtext">
          จุดนัดส่งมอบยอดนิยมในพื้นที่ ม.ศรีปทุม (บางเขน) เพื่อความสบายใจของผู้ซื้อและผู้ขาย
        </p>

        <div className="seller-spots-list">
          <div className="seller-spot-item">
            <div className="seller-spot-left">
              <div className="seller-spot-icon-wrap">
                <MapPin size={15} />
              </div>
              <div className="seller-spot-info">
                <h5>อาคาร 11 (ตึกกิจกรรม) / คณะนิเทศฯ</h5>
                <span>จุดส่งมอบหลัก โซนโรงอาหารใหม่ ชั้น 1 หรือโถงกลาง</span>
              </div>
            </div>
            <CheckCircle2 size={17} className="spot-checked-icon" />
          </div>

          <div className="seller-spot-item">
            <div className="seller-spot-left">
              <div className="seller-spot-icon-wrap">
                <MapPin size={15} />
              </div>
              <div className="seller-spot-info">
                <h5>โรงอาหารกลาง SPU (Canteen)</h5>
                <span>โต๊ะโซนน้ำดื่ม หรือจุดนัดพบกลางโรงอาหาร</span>
              </div>
            </div>
            <CheckCircle2 size={17} className="spot-checked-icon" />
          </div>

          <div className="seller-spot-item">
            <div className="seller-spot-left">
              <div className="seller-spot-icon-wrap truck-wrap">
                <Truck size={15} />
              </div>
              <div className="seller-spot-info">
                <h5>จัดส่งด่วนรอบมอ Flash / Kerry</h5>
                <span>ส่งด่วนถึงหอพักรอบ ม. หรือนอกพื้นที่ SPU บางเขน</span>
              </div>
            </div>
            <span className="seller-spot-tag">พร้อมส่ง</span>
          </div>
        </div>
      </section>

      {/* 7. Seller Tools & Safety */}
      <section className="seller-section-card">
        <div className="seller-section-header">
          <div className="seller-section-title">
            <ShieldCheck size={17} className="seller-icon-pink" />
            <h3>เครื่องมือผู้ขาย & ความปลอดภัย</h3>
          </div>
        </div>

        <div className="seller-menu-items">
          <button
            type="button"
            className="seller-tool-item"
            onClick={() => alert('จัดการข้อความและนัดส่งในระบบ LINE: เชื่อมต่อ LINE Notify แล้ว')}
          >
            <div className="tool-left">
              <div className="tool-icon-box green">
                <MessageCircle size={16} />
              </div>
              <div className="tool-text">
                <h5>จัดการข้อความและนัดส่งในระบบ LINE</h5>
                <p>เตือนออเดอร์และนัดเวลาก่อนส่งมอบอัตโนมัติ</p>
              </div>
            </div>
            <ChevronRight size={15} className="tool-arrow" />
          </button>

          <button
            type="button"
            className="seller-tool-item"
            onClick={() => alert('กฎระเบียบการซื้อขาย: ห้ามจำหน่ายสิ่งผิดกฎหมาย, สินค้าลิขสิทธิ์ละเมิด และต้องนัดพบในพื้นที่ปลอดภัย')}
          >
            <div className="tool-left">
              <div className="tool-icon-box blue">
                <ExternalLink size={16} />
              </div>
              <div className="tool-text">
                <h5>กฎระเบียบและแนวทางการซื้อขายในมหาวิทยาลัย</h5>
                <p>คู่มือนักศึกษาสำหรับผู้ซื้อ-ผู้ขายบนระบบ SPU Market</p>
              </div>
            </div>
            <ChevronRight size={15} className="tool-arrow" />
          </button>

          <button
            type="button"
            className="seller-tool-item"
            onClick={() => alert('อนุมัติระบบความปลอดภัย PDPA: ยืนยันสิทธิ์ด้วยอีเมล @spumail.net เรียบร้อยแล้ว')}
          >
            <div className="tool-left">
              <div className="tool-icon-box purple">
                <Lock size={16} />
              </div>
              <div className="tool-text">
                <h5>อนุมัติระบบความปลอดภัย PDPA / รหัสนักศึกษา</h5>
                <p>นโยบายคุ้มครองข้อมูลส่วนบุคคล (SPU x PDPA)</p>
              </div>
            </div>
            <ChevronRight size={15} className="tool-arrow" />
          </button>
        </div>
      </section>
    </div>
  );
}

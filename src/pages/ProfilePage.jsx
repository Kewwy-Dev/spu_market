import React, { useState } from 'react';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import PickupHistoryModal from '../components/PickupHistoryModal';
import {
  GraduationCap,
  Bell,
  Settings,
  Store,
  ChevronRight,
  Star,
  CheckCircle2,
  Clock,
  MapPin,
  Mail,
  MessageCircle,
  Truck,
  Bookmark,
  LifeBuoy,
  ShieldCheck,
  LogOut,
  Receipt,
  Plus,
  ShoppingBag,
} from 'lucide-react';

export default function ProfilePage({
  currentUser,
  onLogout,
  onBackToHome,
  onSwitchToSeller,
}) {
  const [activeActivityTab, setActiveActivityTab] = useState('pending');
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showPickupHistory, setShowPickupHistory] = useState(false);

  // Default mock user if not logged in yet
  const defaultUser = {
    displayName: 'กิตติพงษ์ สุขสวัสดิ์',
    nickname: 'กาย',
    studentId: '650xxxx',
    faculty: 'วิทยาลัยการบินและคมนาคม',
    email: 'kittipong.suk@spumail.net',
    lineId: '@guy_spu65',
    rating: 5.0,
    reviewCount: 12,
    reputation: 'ผู้ซื้อ/ผู้ขายที่น่าเชื่อถือ • ส่งของตรงเวลา',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    stats: {
      orders: 14,
      selling: 6,
      reviews: 3,
    },
    pickupSpots: [
      'อาคาร 11 ชั้น 1 (โรงอาหาร)',
      'โรงอาหารกลาง SPU',
    ],
  };
  const user = {
    ...defaultUser,
    ...currentUser,
    stats: {
      ...defaultUser.stats,
      ...currentUser?.stats,
    },
    pickupSpots: currentUser?.pickupSpots || defaultUser.pickupSpots,
  };

  const activities = [
    {
      id: 'act-01',
      title: 'เคส iPad Air 5 สภาพ 99% สีหมอก',
      price: 350,
      image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&auto=format&fit=crop&q=80',
      timeBadge: 'นัดวันนี้ 13:30 น.',
      badgeType: 'amber',
      location: 'จุดนัด: อาคาร 11 (โรงอาหารใหม่ ชั้น 1)',
      category: 'it',
    },
    {
      id: 'act-02',
      title: 'เสื้อช็อป SPU ไซส์ L ของแท้ สภาพใหม่',
      price: 420,
      image: 'https://images.unsplash.com/photo-1578932750294-f5075e85f44a?w=200&auto=format&fit=crop&q=80',
      timeBadge: 'นัดพรุ่งนี้ 12:00 น.',
      badgeType: 'blue',
      location: 'จุดนัด: โซนลานจอดรถหน้าตึก 1 (ตึกดำ)',
      category: 'uniform',
    },
  ];

  return (
    <div className="profile-page-container">
      {/* 1. Header */}
      <header className="profile-top-header">
        <div
          className="profile-header-title"
          onClick={onBackToHome}
          style={{ cursor: 'pointer' }}
          title="กลับหน้าแรก"
        >
          <div className="profile-header-icon-wrap">
            <GraduationCap size={20} className="profile-header-cap-icon" />
          </div>
          <h1>โปรไฟล์ของฉัน</h1>
        </div>

        <div className="profile-header-actions">
          <button
            type="button"
            className="profile-action-btn"
            title="การแจ้งเตือน"
            aria-label="การแจ้งเตือน"
            onClick={() => alert('การแจ้งเตือน: ไม่มีรายการใหม่ในขณะนี้')}
          >
            <Bell size={19} />
            <span className="profile-action-dot" />
          </button>
          <button
            type="button"
            className="profile-action-btn"
            title="ตั้งค่า"
            aria-label="ตั้งค่า"
            onClick={() => alert('ตั้งค่าบัญชี: กำลังพัฒนาเมนูตั้งค่าเพิ่มเติม')}
          >
            <Settings size={19} />
          </button>
        </div>
      </header>

      {/* 2. Seller Promo Banner */}
      <div className="profile-seller-banner" onClick={onSwitchToSeller}>
        <div className="seller-banner-icon-box">
          <Store size={22} />
        </div>
        <div className="seller-banner-info">
          <h3>ต้องการขายของของคุณเองหรือยัง?</h3>
          <p>เปิดหน้าร้านบน SPU ฟรี ไม่มีค่าธรรมเนียม</p>
        </div>
        <button type="button" className="seller-banner-btn">
          <span>เปิดโหมดขาย</span>
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* 3. Main Profile Card */}
      <div className="profile-main-card">
        <div className="profile-user-header">
          <div className="profile-avatar-container">
            <img
              src={user.avatar}
              alt={user.displayName}
              className="profile-avatar-img"
            />
            <span className="profile-avatar-badge" title="SPU Verified Student">
              <CheckCircle2 size={14} className="profile-verified-icon" />
            </span>
          </div>

          <div className="profile-user-details">
            <div className="profile-name-row">
              <h2 className="profile-name">{user.displayName}</h2>
              {user.nickname && <span className="profile-nickname">({user.nickname})</span>}
            </div>

            <div className="profile-meta-row">
              <GraduationCap size={13} className="profile-meta-icon" />
              <span>รหัส {user.studentId} • {user.faculty}</span>
            </div>

            <div className="profile-badge-row">
              <span className="spu-verified-student-tag">
                <CheckCircle2 size={12} strokeWidth={2.5} />
                <span>SPU Verified Student</span>
              </span>
            </div>
          </div>
        </div>

        {/* Rating row */}
        <div className="profile-rating-strip" onClick={() => alert('คะแนนรีวิว 5.0 เต็มจากเพื่อนนักศึกษา 12 คน')}>
          <div className="profile-rating-left">
            <span className="profile-star-score">
              <Star size={13} fill="#f59e0b" color="#f59e0b" />
              <span>{user.rating.toFixed(1)}</span>
            </span>
            <span className="profile-reputation-text">{user.reputation}</span>
          </div>
          <div className="profile-rating-right">
            <span>ดู {user.reviewCount} รีวิว</span>
            <ChevronRight size={13} />
          </div>
        </div>

        {/* Stat counters */}
        <div className="profile-stats-grid">
          <div className="profile-stat-item">
            <span className="profile-stat-number stat-pink">{user.stats.orders}</span>
            <span className="profile-stat-label">ซื้อแล้ว (ออเดอร์)</span>
          </div>
          <div className="profile-stat-divider" />
          <div className="profile-stat-item">
            <span className="profile-stat-number stat-blue">{user.stats.selling}</span>
            <span className="profile-stat-label">กำลังลงขาย</span>
          </div>
          <div className="profile-stat-divider" />
          <div className="profile-stat-item">
            <span className="profile-stat-number stat-teal">{user.stats.reviews}</span>
            <span className="profile-stat-label">คำขอรีวิว</span>
          </div>
        </div>
      </div>

      {/* 4. Buyer Activities Section */}
      <section className="profile-section-card">
        <div className="profile-section-header">
          <div className="profile-section-title">
            <ShoppingBag size={18} className="profile-section-icon" />
            <h3>กิจกรรมการซื้อของฉัน</h3>
          </div>
          <button
            type="button"
            className="profile-link-btn"
            onClick={() => alert('แสดงรายการกิจกรรมการซื้อทั้งหมด 8 รายการ')}
          >
            <span>ดูทั้งหมด (8)</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="profile-activity-tabs">
          <button
            type="button"
            className={`activity-tab-btn ${activeActivityTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveActivityTab('pending')}
          >
            <Clock size={13} />
            <span>กำลังนัดรับ (2)</span>
          </button>

          <button
            type="button"
            className={`activity-tab-btn ${activeActivityTab === 'success' ? 'active' : ''}`}
            onClick={() => setActiveActivityTab('success')}
          >
            <CheckCircle2 size={13} />
            <span>สำเร็จแล้ว (4)</span>
          </button>

          <button
            type="button"
            className={`activity-tab-btn ${activeActivityTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveActivityTab('cancelled')}
          >
            <span>ยกเลิก</span>
          </button>
        </div>

        {/* Activity Items List */}
        <div className="profile-activity-list">
          {activities.map((item) => (
            <div key={item.id} className="profile-activity-card">
              <img src={item.image} alt={item.title} className="activity-thumb" />

              <div className="activity-card-body">
                <div className="activity-top-row">
                  <span className={`activity-time-pill pill-${item.badgeType}`}>
                    {item.timeBadge}
                  </span>
                  <span className="activity-price">฿{item.price}</span>
                </div>

                <h4 className="activity-title">{item.title}</h4>

                <div className="activity-location-row">
                  <MapPin size={12} className="activity-pin-icon" />
                  <span>{item.location}</span>
                </div>
              </div>

              <button
                type="button"
                className="activity-action-btn"
                title="ดูรายละเอียดการนัดรับ"
                aria-label="ดูรายละเอียดการนัดรับ"
                onClick={() => alert(`รายละเอียดคำสั่งซื้อ: ${item.title}\nราคา: ฿${item.price}\n${item.location}\nเวลานัด: ${item.timeBadge}`)}
              >
                <Receipt size={17} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Verification & Contact Info */}
      <section className="profile-section-card">
        <div className="profile-section-header">
          <div className="profile-section-title">
            <ShieldCheck size={18} className="profile-section-icon" />
            <h3>การยืนยันตัวตน & ช่องทางติดต่อ</h3>
          </div>
          <span className="profile-verified-pill">
            ยืนยันแล้ว
          </span>
        </div>

        <div className="profile-verify-list">
          {/* Email row */}
          <div className="verify-item-row">
            <div className="verify-icon-wrap email-icon-wrap">
              <Mail size={16} />
            </div>
            <div className="verify-item-info">
              <span className="verify-item-title">อีเมลนักศึกษา มหาวิทยาลัยศรีปทุม</span>
              <span className="verify-item-value">{user.email}</span>
            </div>
            <CheckCircle2 size={18} className="verify-check-icon" />
          </div>

          {/* LINE ID row */}
          <div className="verify-item-row">
            <div className="verify-icon-wrap line-icon-wrap">
              <MessageCircle size={16} />
            </div>
            <div className="verify-item-info">
              <span className="verify-item-title">LINE ID สำหรับติดต่อและนัดหมาย</span>
              <span className="verify-item-value">{user.lineId}</span>
            </div>
            <button
              type="button"
              className="verify-edit-btn"
              onClick={() => alert('แก้ไข LINE ID: ติดต่อสอบถามหรือแก้ไขข้อมูลที่ฝ่ายทะเบียนนักศึกษา')}
            >
              แก้ไข
            </button>
          </div>

          {/* Preferred Pickup Spots */}
          <div className="verify-item-column">
            <div className="verify-spot-header">
              <div className="verify-spot-title">
                <MapPin size={15} className="verify-spot-icon" />
                <span>จุดนัดรับที่สะดวกในมหาลัย</span>
              </div>
              <button
                type="button"
                className="verify-edit-btn"
                onClick={() => alert('เปลี่ยนจุดนัดรับ: คุณสามารถเลือกตึกที่เรียนประจำหรือจุดนัดพบยอดนิยมได้')}
              >
                เปลี่ยน
              </button>
            </div>

            <div className="verify-spot-chips">
              {user.pickupSpots.map((spot, idx) => (
                <span key={idx} className="spot-chip">
                  <MapPin size={11} />
                  <span>{spot}</span>
                </span>
              ))}
              <button
                type="button"
                className="spot-chip spot-chip-add"
                onClick={() => alert('เพิ่มจุดนัดรับใหม่: ระบบเปิดให้เลือกอาคาร 1, อาคาร 9, อาคาร 11 หรือหอพักใกล้เคียง')}
              >
                <Plus size={12} />
                <span>เพิ่มจุดนัด</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Settings & Navigation Menu List */}
      <div className="profile-menu-list">
        <button
          type="button"
          className="profile-menu-item"
          onClick={() => setShowPickupHistory(true)}
        >
          <div className="menu-item-left">
            <div className="menu-icon-box pink-box">
              <Truck size={17} />
            </div>
            <div className="menu-item-text">
              <h4>ประวัติการแวะรับ/ส่งของในมหาลัย</h4>
              <p>มารยาทและการส่งมอบ ณ ที่นัดหมาย</p>
            </div>
          </div>
          <div className="menu-item-right">
            <span className="menu-unread-dot" />
            <ChevronRight size={15} />
          </div>
        </button>

        <button
          type="button"
          className="profile-menu-item"
          onClick={() => alert('รายการที่ถูกใจ: คุณมีสินค้าที่บันทึกไว้ 5 ชิ้น')}
        >
          <div className="menu-item-left">
            <div className="menu-icon-box purple-box">
              <Bookmark size={17} />
            </div>
            <div className="menu-item-text">
              <h4>รายการที่ถูกใจ / สินค้าที่บันทึกไว้</h4>
              <p>หนังสือเรียน, อุปกรณ์ไอที และอื่นๆ</p>
            </div>
          </div>
          <div className="menu-item-right">
            <ChevronRight size={15} />
          </div>
        </button>

        <button
          type="button"
          className="profile-menu-item"
          onClick={() => alert('การแจ้งเตือนผ่าน LINE Official: เปิดใช้งานแล้ว (เตือนล่วงหน้า 1 ชั่วโมงก่อนนัดหมาย)')}
        >
          <div className="menu-item-left">
            <div className="menu-icon-box blue-box">
              <Bell size={17} />
            </div>
            <div className="menu-item-text">
              <h4>การแจ้งเตือนผ่าน LINE Official</h4>
              <p>แจ้งเตือนเมื่อถึงเวลานัดหมาย 1 ชั่วโมง</p>
            </div>
          </div>
          <div className="menu-item-right">
            <ChevronRight size={15} />
          </div>
        </button>

        <button
          type="button"
          className="profile-menu-item"
          onClick={() => alert('ศูนย์ช่วยเหลือ & แจ้งปัญหา: โทรด่วน 02-579-1111 หรือ LINE @spumarket')}
        >
          <div className="menu-item-left">
            <div className="menu-icon-box teal-box">
              <LifeBuoy size={17} />
            </div>
            <div className="menu-item-text">
              <h4>ศูนย์ช่วยเหลือ & แจ้งปัญหาการซื้อขาย</h4>
              <p>รายงานผู้ขายไม่มาตามนัด หรือสินค้าไม่ตรงปก</p>
            </div>
          </div>
          <div className="menu-item-right">
            <ChevronRight size={15} />
          </div>
        </button>

        <button
          type="button"
          className="profile-menu-item"
          onClick={() => setShowPrivacyPolicy(true)}
        >
          <div className="menu-item-left">
            <div className="menu-icon-box slate-box">
              <ShieldCheck size={17} />
            </div>
            <div className="menu-item-text">
              <h4>นโยบายความเป็นส่วนตัว & PDPA</h4>
              <p>การคุ้มครองข้อมูลส่วนบุคคลนักศึกษา SPU</p>
            </div>
          </div>
          <div className="menu-item-right">
            <ChevronRight size={15} />
          </div>
        </button>
      </div>

      {/* 7. Footer & Logout */}
      <div className="profile-footer-section">
        <button
          type="button"
          className="profile-logout-btn"
          onClick={onLogout}
        >
          <LogOut size={16} />
          <span>ออกจากระบบ LINE Mini App</span>
        </button>

        <p className="profile-version-text">
          SPU Student Peer-to-Peer Market v2.4.0 (Build 2026)
        </p>
      </div>
      {showPrivacyPolicy && <PrivacyPolicyModal onClose={() => setShowPrivacyPolicy(false)} />}
      {showPickupHistory && <PickupHistoryModal onClose={() => setShowPickupHistory(false)} />}
    </div>
  );
}

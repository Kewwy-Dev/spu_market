import React, { useState } from 'react';
import {
  Search,
  MoreVertical,
  ScanLine,
  Plus,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Pin,
  Clock,
  SquarePen,
  Calendar,
  GraduationCap,
  CheckCheck,
} from 'lucide-react';

export default function ChatListPage({
  onSelectChat,
  onNavigateHome,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const onlineFriends = [
    { id: 'fah', name: 'น้องฟ้า', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', online: true },
    { id: 'nat', name: 'พี่นัท ICT', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', online: true },
    { id: 'krit', name: 'Krit_SPU', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', online: true },
    { id: 'mild', name: 'น้องมายด์', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', online: false },
  ];

  const chatList = [
    {
      id: 'fah',
      name: 'น้องฟ้า (นิเทศฯ)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      online: true,
      verified: true,
      pinned: true,
      time: '13:48',
      pickupBadge: 'นัดรับ 14:00',
      productName: 'iPad Air 5 64GB Wi-Fi Space Grey',
      productThumb: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=120&auto=format&fit=crop&q=80',
      lastMessage: 'สวัสดีค่ะ สภาพ 98% ไร้รอยตกหล่น...',
      unreadCount: 1,
      category: 'trading',
    },
    {
      id: 'krit',
      name: 'Krit_SPU',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      online: true,
      verified: true,
      customerBadge: 'ลูกค้าคุณ',
      time: '09:15',
      productName: 'ชีทสรุป ENG101 ข้อสอบ... (ฉบับส่งสำเร็จแล้ว)',
      productThumb: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=120&auto=format&fit=crop&q=80',
      lastMessage: 'โอนเงินเรียบร้อยแล้วครับ รบกวนส่งไฟล์ซี...',
      unreadCount: 2,
      category: 'trading',
    },
    {
      id: 'nat',
      name: 'พี่นัท ICT',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      online: false,
      seniorBadge: 'รุ่นพี่ SPU',
      time: 'เมื่อวาน',
      productName: 'เสื้อช็อป SPU ไซส์ L (สีกรมท่า สภาพใหม่)',
      productThumb: 'https://images.unsplash.com/photo-1578932750294-f5075e85f44a?w=120&auto=format&fit=crop&q=80',
      lastMessage: 'พี่เอาเสื้อช็อปไปซักรีดให้แล้วนะครับ พรุ่งนี้...',
      isRead: true,
      category: 'friends',
    },
    {
      id: 'mild',
      name: 'น้องมายด์ (สถาปัตย์ ปี 2)',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      online: false,
      time: '2 วันที่แล้ว',
      productName: 'ชุดโต๊ะดราฟต์ไฟ A2 พับได้ ปรับระดับได้',
      productThumb: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=120&auto=format&fit=crop&q=80',
      offerPrice: 'ยื่น ฿850',
      lastMessage: 'พี่ยังลดราคาได้อีกนิดหน่อยไหมคะ...',
      category: 'trading',
    },
    {
      id: 'official',
      name: 'SPU Market Official',
      avatar: null,
      isOfficial: true,
      verified: true,
      time: '3 วันที่แล้ว',
      isOfficialNotice: true,
      productName: 'ประกาศทางการจากระบบแคมปัส',
      lastMessage: 'ยืนยันตัวตนสำเร็จ! นศ. พร้อมใช้งานแลกเปลี่ยนสินค้...',
      isRead: true,
      category: 'all',
    },
  ];

  const filteredChats = chatList.filter((chat) => {
    const matchesSearch = !searchQuery.trim() ||
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.productName && chat.productName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeCategory === 'friends') return matchesSearch && (chat.category === 'friends' || chat.seniorBadge);
    if (activeCategory === 'trading') return matchesSearch && chat.category === 'trading';
    if (activeCategory === 'unread') return matchesSearch && (chat.unreadCount && chat.unreadCount > 0);
    return matchesSearch;
  });

  return (
    <div className="chat-list-page-container">
      {/* 1. Header */}
      <header className="chat-main-header">
        <div className="chat-header-top-row">
          <div
            className="chat-brand-status"
            onClick={onNavigateHome}
            style={{ cursor: 'pointer' }}
            title="กลับหน้าหลัก"
          >
            <span className="online-indicator-dot" />
            <span className="brand-label">SPU Market</span>
          </div>

          <div className="chat-hub-chip">
            <span>อาคาร 11 Hub</span>
          </div>
        </div>

        <div className="chat-header-nav-row">
          <div className="chat-title-group">
            <h1>Chats</h1>
            <span className="chat-unread-total-badge">3</span>
          </div>

          <div className="chat-header-actions">
            <button
              type="button"
              className="chat-head-icon-btn"
              title="ค้นหา"
              onClick={() => {}}
            >
              <Search size={19} />
            </button>
            <button
              type="button"
              className="chat-head-icon-btn"
              title="สร้างแชทใหม่"
              onClick={() => alert('สร้างแชทใหม่: เลือกเพื่อนนักศึกษาหรือร้านค้าใน SPU')}
            >
              <SquarePen size={19} />
            </button>
            <button
              type="button"
              className="chat-head-icon-btn"
              title="ตัวเลือกเพิ่มเติม"
              onClick={() => alert('ตัวเลือกแชท: จัดการข้อความที่ซ่อนไว้')}
            >
              <MoreVertical size={19} />
            </button>
          </div>
        </div>

        {/* 2. Search Box */}
        <div className="chat-search-wrap">
          <Search size={16} className="chat-search-icon" />
          <input
            type="text"
            className="chat-search-input"
            placeholder="ค้นหาเพื่อน แชท หรือสินค้าที่คุยไว้..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="button"
            className="chat-scan-btn"
            title="สแกน QR"
            onClick={() => alert('สแกน QR Code เพื่อเปิดแชทกับเพื่อน')}
          >
            <ScanLine size={16} />
          </button>
        </div>
      </header>

      {/* 3. Online Stories Row */}
      <section className="chat-stories-section">
        <div className="stories-header">
          <div className="stories-title-wrap">
            <span>เพื่อนในมอที่ออนไลน์</span>
            <span className="online-green-dot" />
          </div>
          <button
            type="button"
            className="stories-view-all-link"
            onClick={() => alert('เพื่อนใน SPU ที่ออนไลน์อยู่ทั้งหมด 18 คน')}
          >
            ดูทั้งหมด (18)
          </button>
        </div>

        <div className="stories-scroll-container">
          {/* Your Story item */}
          <div
            className="story-item"
            onClick={() => alert('เพิ่มสตอรี่สินค้าหรือสถานะนัดรับของคุณ')}
          >
            <div className="story-avatar-wrap story-add-wrap">
              <Plus size={18} className="story-add-icon" />
            </div>
            <span className="story-name">สตอรี่คุณ</span>
          </div>

          {/* Friends Stories */}
          {onlineFriends.map((friend) => (
            <div
              key={friend.id}
              className="story-item"
              onClick={() => onSelectChat(friend.id)}
            >
              <div className="story-avatar-wrap">
                <img src={friend.avatar} alt={friend.name} className="story-avatar-img" />
                {friend.online && <span className="story-online-dot" />}
              </div>
              <span className="story-name">{friend.name}</span>
            </div>
          ))}

          {/* Building 11 Hub item */}
          <div
            className="story-item"
            onClick={() => alert('ตึก 11 Hub: จุดนัดพบยอดนิยมของนักศึกษา SPU มีกล้องวงจรปิด')}
          >
            <div className="story-avatar-wrap story-hub-wrap">
              <MapPin size={18} />
            </div>
            <span className="story-name">ตึก 11 Hub</span>
          </div>
        </div>
      </section>

      {/* 4. Filter Tabs */}
      <div className="chat-filter-tabs">
        <button
          type="button"
          className={`chat-tab-pill ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          ทั้งหมด
        </button>
        <button
          type="button"
          className={`chat-tab-pill ${activeCategory === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveCategory('friends')}
        >
          เพื่อนในมอ 4
        </button>
        <button
          type="button"
          className={`chat-tab-pill ${activeCategory === 'trading' ? 'active' : ''}`}
          onClick={() => setActiveCategory('trading')}
        >
          ซื้อ-ขาย 3
        </button>
        <button
          type="button"
          className={`chat-tab-pill ${activeCategory === 'unread' ? 'active' : ''}`}
          onClick={() => setActiveCategory('unread')}
        >
          <span className="unread-dot-inline" />
          ยังไม่อ่าน
        </button>
      </div>

      {/* 5. Trust Guarantee Notice */}
      <div className="chat-trust-banner">
        <div className="trust-banner-left">
          <ShieldCheck size={16} className="trust-banner-icon" />
          <p>
            แชทปลอดภัย SPU: ยืนยันตัวตน นศ. 100% นัดรับที่...
          </p>
        </div>
        <button
          type="button"
          className="trust-banner-btn"
          onClick={() => alert('แนะนำจุดนัดรับ: อาคาร 11 ชั้น 1, โรงอาหารกลาง')}
        >
          ดูจุดนัด
        </button>
      </div>

      {/* 6. Chat Conversations List */}
      <div className="chat-items-list">
        {filteredChats.map((chat) => (
          <div
            key={chat.id}
            className={`chat-list-card ${chat.pinned ? 'pinned' : ''}`}
            onClick={() => onSelectChat(chat.id)}
          >
            {/* Avatar */}
            <div className="chat-card-avatar-wrap">
              {chat.isOfficial ? (
                <div className="chat-official-avatar">
                  <ShieldCheck size={22} />
                </div>
              ) : (
                <img src={chat.avatar} alt={chat.name} className="chat-card-avatar" />
              )}
              {chat.online && <span className="chat-online-badge" />}
            </div>

            {/* Middle Info */}
            <div className="chat-card-content">
              <div className="chat-card-top-row">
                <div className="chat-card-sender-name">
                  <span className="sender-title">{chat.name}</span>
                  {chat.verified && <CheckCircle2 size={13} className="sender-verified-icon" />}
                  {chat.pickupBadge && (
                    <span className="chat-pickup-badge">
                      <Clock size={10} />
                      <span>{chat.pickupBadge}</span>
                    </span>
                  )}
                  {chat.customerBadge && (
                    <span className="chat-customer-badge">
                      <span>{chat.customerBadge}</span>
                    </span>
                  )}
                  {chat.seniorBadge && (
                    <span className="chat-senior-badge">
                      <GraduationCap size={10} />
                      <span>{chat.seniorBadge}</span>
                    </span>
                  )}
                </div>

                <div className="chat-card-time-row">
                  {chat.pinned && <Pin size={11} className="chat-pin-icon" />}
                  <span className="chat-time-label">{chat.time}</span>
                </div>
              </div>

              {/* Product Reference Name */}
              {chat.productName && (
                <div className="chat-product-ref-label">
                  <span>{chat.productName}</span>
                </div>
              )}

              {/* Last Message snippet */}
              <div className="chat-card-bottom-row">
                <div className="chat-last-msg-box">
                  <p className="chat-last-message">{chat.lastMessage}</p>
                  {chat.isRead && <CheckCheck size={14} className="chat-read-icon" />}
                </div>

                {chat.unreadCount && (
                  <span className="chat-unread-count-pill">{chat.unreadCount}</span>
                )}
                {chat.offerPrice && (
                  <span className="chat-offer-price-pill">{chat.offerPrice}</span>
                )}
              </div>
            </div>

            {/* Product Thumbnail on the right */}
            {chat.productThumb && (
              <div className="chat-card-prod-thumb-wrap">
                <img
                  src={chat.productThumb}
                  alt={chat.productName || 'สินค้า'}
                  className="chat-card-prod-thumb"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 7. Recommended Meetup Spots in SPU */}
      <section className="chat-recommended-spots">
        <div className="spots-section-header">
          <div className="spots-title-wrap">
            <Calendar size={15} className="spots-icon-pink" />
            <h4>จุดนัดรับแชทแนะนำใน ม.ศรีปทุม</h4>
          </div>
          <button
            type="button"
            className="spots-map-link"
            onClick={() => alert('แผนผังจุดนัดรับในมหาวิทยาลัยศรีปทุม (บางเขน)')}
          >
            แผนผังจุดนัดรับ
          </button>
        </div>

        <div className="spots-cards-grid">
          <div className="spot-guide-card">
            <h5>อาคาร 11</h5>
            <span>โถงหน้าที่ 1</span>
          </div>

          <div className="spot-guide-card">
            <h5>โรงอาหารกลาง</h5>
            <span>โซนเสา 4</span>
          </div>

          <div className="spot-guide-card">
            <h5>ตึก 5 สถาปัตย์</h5>
            <span>ลานกิจกรรม</span>
          </div>
        </div>
      </section>

      {/* 8. Floating Action Button */}
      <button
        type="button"
        className="chat-floating-fab"
        title="เริ่มแชทใหม่"
        onClick={() => alert('เริ่มบทสนทนาใหม่: ค้นหาเพื่อนหรือสินค้าในตลาด')}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
}

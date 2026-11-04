import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  MoreVertical,
  CheckCircle2,
  MapPin,
  Tag,
  ShieldCheck,
  Plus,
  Camera,
  Mic,
  Send,
  Sparkles,
  CheckCheck,
} from 'lucide-react';

export default function ChatRoomPage({
  chatPartner,
  onBack,
  onViewProductDetail,
}) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'me',
      text: 'สวัสดีครับพี่ฟ้า พอดีสนใจ iPad Air 5 สภาพเครื่องมีรอยอะไรไหมครับ แล้วแบตยังอึดอยู่ไหมครับ',
      time: '13:46 น.',
      status: 'read',
    },
    {
      id: 2,
      sender: 'partner',
      text: 'สวัสดีค่ะ สภาพ 98% ไร้รอยตกหล่นเลยค่ะ ติดฟิล์มกระดาษไว้ตลอด แบต 94% ใช้งานเรียนจดโน้ตได้ทั้งวันเลยค่ะ มีกล่องแท้กับสายชาร์จให้ครบเลยน้า',
      time: '13:48 น.',
    },
    {
      id: 3,
      sender: 'partner',
      image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80',
      caption: 'Battery Health 94%',
      time: '13:49 น.',
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef(null);

  const partner = chatPartner || {
    name: 'น้องฟ้า (นิเทศฯ)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    verified: true,
    statusText: 'ออนไลน์เมื่อสักครู่ • นศ. ปี 3',
  };

  const product = {
    title: 'iPad Air 5 64GB WiFi สี Space Gray',
    price: '฿14,500',
    location: 'อาคาร 11',
    thumb: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=150&auto=format&fit=crop&q=80',
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (textToSend) => {
    const text = typeof textToSend === 'string' ? textToSend : inputVal;
    if (!text.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'me',
      text: text.trim(),
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.',
      status: 'sent',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputVal('');

    // Simulated reply after 1.5s
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'partner',
          text: 'รับทราบค่ะ สะดวกนัดรับที่ตึก 11 ชั้น 1 วันนี้ช่วงบ่ายได้เลยนะคะ!',
          time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.',
        },
      ]);
    }, 1500);
  };

  const quickReplies = [
    'กำลังเดินทางไปครับ 🚶',
    'ถึงจุดนัดรับแล้วครับ 📍',
    'ขอเลขพร้อมเพย์...',
  ];

  return (
    <div className="chat-room-container">
      {/* 1. Header */}
      <header className="chat-room-header">
        <button
          type="button"
          className="chat-room-back-btn"
          onClick={onBack}
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="chat-partner-info-box">
          <div className="partner-avatar-wrap">
            <img src={partner.avatar} alt={partner.name} className="partner-avatar" />
            <span className="partner-online-dot" />
          </div>

          <div className="partner-details">
            <div className="partner-name-row">
              <h2>{partner.name}</h2>
              {partner.verified && (
                <span className="spu-verified-chip">
                  <CheckCircle2 size={10} />
                  <span>SPU Verified</span>
                </span>
              )}
            </div>
            <span className="partner-subtext">🟢 {partner.statusText}</span>
          </div>
        </div>

        <div className="chat-room-actions">
          <button
            type="button"
            className="room-head-btn"
            title="โทรติดต่อ"
            onClick={() => alert(`โทรติดต่อคุณ ${partner.name}: 08x-xxx-xxxx`)}
          >
            <Phone size={18} />
          </button>
          <button
            type="button"
            className="room-head-btn"
            title="ตัวเลือก"
            onClick={() => alert('ตัวเลือก: รายงานผู้ใช้ / ปิดการแจ้งเตือน')}
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* 2. Pinned Product Reference Card */}
      <div className="chat-pinned-product-card">
        <div
          className="pinned-product-main"
          onClick={onViewProductDetail}
          style={{ cursor: 'pointer' }}
          title="คลิกเพื่อดูรายละเอียดสินค้า"
        >
          <img src={product.thumb} alt={product.title} className="pinned-prod-thumb" />

          <div className="pinned-prod-info">
            <h4 className="pinned-prod-title">{product.title}</h4>
            <div className="pinned-prod-meta">
              <span className="pinned-prod-price">{product.price}</span>
              <span className="pinned-prod-loc">
                <MapPin size={11} />
                <span>{product.location}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="pinned-prod-actions">
          <button
            type="button"
            className="pinned-action-btn offer-btn"
            onClick={() => {
              const offer = prompt('ระบุราคาที่ต้องการยื่นข้อเสนอต่อรอง (บาท):', '13500');
              if (offer) {
                handleSend(`ยื่นข้อเสนอราคา ฿${offer} สำหรับสินค้านี้ครับ`);
              }
            }}
          >
            <Tag size={13} />
            <span>ยื่นข้อเสนอ/ต่อรอง</span>
          </button>

          <button
            type="button"
            className="pinned-action-btn meetup-btn"
            onClick={() => {
              alert('สร้างการนัดรับในมอ: เลือกสถานที่ อาคาร 11 ชั้น 1 (โรงอาหารใหม่) นัดเวลา 14:00 น.');
              handleSend('สร้างการนัดหมาย: นัดรับที่ อาคาร 11 ชั้น 1 วันนี้ เวลา 14:00 น. ครับ');
            }}
          >
            <Sparkles size={13} />
            <span>สร้างการนัดรับในมอ</span>
          </button>
        </div>
      </div>

      {/* 3. Safety Notice Box */}
      <div className="chat-room-safety-notice">
        <ShieldCheck size={18} className="safety-notice-icon" />
        <div className="safety-notice-text">
          <strong>คำแนะนำความปลอดภัย SPU Market</strong>
          <p>
            แนะนำนัดรับสินค้าและตรวจสอบสภาพในเวลากลางวัน ณ จุดนัดรับยอดนิยม เช่น อาคาร 11 ชั้น 1 หรือ โรงอาหารกลาง ก่อนโอนเงินทุกครั้ง
          </p>
        </div>
      </div>

      {/* 4. Chat Messages Scroll Area */}
      <div className="chat-room-messages-area">
        <div className="chat-date-separator">
          <span>วันนี้ 13:45 น.</span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble-row ${msg.sender === 'me' ? 'row-me' : 'row-partner'}`}
          >
            {msg.sender === 'partner' && (
              <img
                src={partner.avatar}
                alt={partner.name}
                className="bubble-avatar"
              />
            )}

            <div className={`chat-bubble ${msg.sender === 'me' ? 'bubble-me' : 'bubble-partner'}`}>
              {msg.text && <p className="bubble-text">{msg.text}</p>}

              {msg.image && (
                <div className="bubble-image-wrap">
                  <img src={msg.image} alt={msg.caption || 'รูปภาพ'} className="bubble-img" />
                  <div className="battery-health-mock">
                    <span className="health-title">Battery Health & Charging</span>
                    <span className="health-val">94%</span>
                  </div>
                </div>
              )}

              <div className="bubble-meta">
                <span className="bubble-time">{msg.time}</span>
                {msg.sender === 'me' && (
                  <CheckCheck size={13} className="bubble-check-icon" />
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 5. Quick Replies Chips Bar */}
      <div className="chat-quick-replies-bar">
        {quickReplies.map((reply, idx) => (
          <button
            key={idx}
            type="button"
            className="quick-reply-pill"
            onClick={() => handleSend(reply)}
          >
            {reply}
          </button>
        ))}
      </div>

      {/* 6. Fixed Bottom Chat Input */}
      <div className="chat-room-input-bar">
        <button
          type="button"
          className="chat-input-tool-btn"
          title="แนบรูป/เมนูเพิ่มเติม"
          onClick={() => alert('เลือกส่งรูปภาพสินค้า, สลิปโอนเงิน หรือพิกัดจุดนัดรับ')}
        >
          <Plus size={20} />
        </button>

        <div className="chat-input-field-wrap">
          <input
            type="text"
            className="chat-room-input"
            placeholder={`พิมพ์ข้อความถึง ${partner.name}...`}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
          />
          <button
            type="button"
            className="chat-field-icon-btn"
            title="ถ่ายภาพ"
            onClick={() => alert('เปิดกล้องเพื่อถ่ายภาพสินค้า')}
          >
            <Camera size={18} />
          </button>
          <button
            type="button"
            className="chat-field-icon-btn"
            title="ส่งข้อความเสียง"
            onClick={() => alert('กดค้างเพื่อส่งข้อความเสียง')}
          >
            <Mic size={18} />
          </button>
        </div>

        <button
          type="button"
          className="chat-send-btn"
          title="ส่งข้อความ"
          onClick={() => handleSend()}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

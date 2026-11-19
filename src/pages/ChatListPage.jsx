import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, MapPin, Search, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SkeletonBlock, SkeletonReveal } from '../components/spectrumui/skeleton-reveal';

const formatChatDate = (value) => {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  if (sameDay) return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const dateStartOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
  if (dateStartOfWeek.getTime() === startOfWeek.getTime()) return ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][date.getDay()];
  if (date.getFullYear() === now.getFullYear()) {
    const parts = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).formatToParts(date);
    return `${parts.find((part) => part.type === 'day')?.value}/${parts.find((part) => part.type === 'month')?.value.replace('.', '')}`;
  }
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric', year: '2-digit' });
};

const getMessagePreview = (message) => message?.message_type === 'image' ? 'ส่งรูปภาพ' : (message?.message_text || '').replace(/^__SYSTEM__:/, '') || 'เริ่มการสนทนา';
const conversationCache = new Map();
const CHAT_FILTER_TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'chatting', label: 'พูดคุย' },
  { key: 'pending', label: 'รอนัดรับ' },
  { key: 'completed', label: 'นัดรับสำเร็จ' },
  { key: 'cancelled', label: 'ยกเลิกนัดรับ' },
];
const matchesCategory = (conversation, category) => {
  if (category === 'completed') return Boolean(conversation.isPickupCompleted);
  if (category === 'cancelled') return Boolean(conversation.isPickupCancelled);
  if (category === 'chatting') return !conversation.hasAppointment;
  if (category === 'pending') return Boolean(conversation.isPickupPending);
  return !conversation.isPickupCompleted && !conversation.isPickupCancelled;
};

export default function ChatListPage({ currentUser, onSelectChat, onNavigateHome }) {
  const cacheKey = currentUser?.id || 'guest';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [conversations, setConversations] = useState(() => conversationCache.get(cacheKey) || []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(() => !conversationCache.has(cacheKey));

  useEffect(() => {
    if (!currentUser?.id || !supabase) { setLoading(false); return undefined; }
    let active = true;
    const load = async () => {
      const { data, error: queryError } = await supabase.from('conversations')
        .select('id,buyer_id,seller_id,product_id,updated_at,products(title,price,pickup_locations(location_name),product_images(image_url,display_order))')
        .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
        .order('updated_at', { ascending: false });
      if (queryError) { if (active) setError(queryError.message); setLoading(false); return; }
      const rows = data || [];
      const ids = rows.map((row) => row.id);
      let latestByRoom = new Map();
      const appointmentByRoom = new Map();
      if (ids.length) {
        const [{ data: latestMessages, error: messagesError }, { data: appointments }] = await Promise.all([
          supabase.from('messages').select('conversation_id,sender_id,message_text,message_type,is_read,created_at').in('conversation_id', ids).order('created_at', { ascending: false }),
          supabase.from('pickup_appointments').select('conversation_id,status,scheduled_at,created_at').in('conversation_id', ids).order('created_at', { ascending: false }),
        ]);
        if (messagesError) { if (active) setError(messagesError.message); }
        (latestMessages || []).forEach((message) => {
          const summary = latestByRoom.get(message.conversation_id) || { latest: null, unreadCount: 0 };
          if (!summary.latest) summary.latest = message;
          if (message.sender_id !== currentUser.id && !message.is_read) summary.unreadCount += 1;
          latestByRoom.set(message.conversation_id, summary);
        });
        const now = Date.now();
        (appointments || []).forEach((appt) => {
          if (!appt.conversation_id || appointmentByRoom.has(appt.conversation_id)) return;
          const scheduledTime = appt.scheduled_at ? new Date(appt.scheduled_at).getTime() : 0;
          const minutesPastScheduled = scheduledTime ? (now - scheduledTime) / (60 * 1000) : 0;
          const isCompleted = appt.status === 'completed' || (appt.status === 'delivered' && minutesPastScheduled >= 60);
          const isCancelled = appt.status === 'cancelled' || (appt.status === 'pending' && minutesPastScheduled > 0);
          appointmentByRoom.set(appt.conversation_id, {
            hasAppointment: true,
            isCompleted,
            isCancelled,
            isPending: !isCompleted && !isCancelled,
          });
        });
      }
      let sellerNames = new Map();
      if (rows.length) {
        const { data: ownProducts } = await supabase.from('marketplace_products').select('id,seller_name').in('id', rows.map((row) => row.product_id));
        sellerNames = new Map((ownProducts || []).map((row) => [row.id, row.seller_name]));
      }
      const displayNamesByRoom = new Map();
      if (rows.length) {
        const participantResults = await Promise.all(rows.map(async (row) => {
          const { data: profiles, error: profileError } = await supabase.rpc('conversation_participant_display_names', { p_conversation_id: row.id });
          if (profileError) return [row.id, null];
          const otherUserId = row.seller_id === currentUser.id ? row.buyer_id : row.seller_id;
          return [row.id, profiles?.find((profile) => profile.user_id === otherUserId)?.display_name || null];
        }));
        participantResults.forEach(([roomId, displayName]) => displayNamesByRoom.set(roomId, displayName));
      }
      if (active) setConversations((previous) => {
        const next = rows.map((row) => ({
        ...row,
        productTitle: row.products?.title || 'สินค้าซื้อขาย',
        price: row.products?.price,
        location: row.products?.pickup_locations?.location_name,
        name: displayNamesByRoom.get(row.id) || (row.seller_id === currentUser.id ? 'SPU Market' : (sellerNames.get(row.product_id) || 'SPU Market')),
        roleLabel: row.seller_id === currentUser.id ? 'ผู้ซื้อ' : 'ผู้ขาย',
        image: row.products?.product_images?.slice().sort((a, b) => a.display_order - b.display_order)[0]?.image_url,
        hasAppointment: Boolean(appointmentByRoom.get(row.id)?.hasAppointment),
        isPickupPending: Boolean(appointmentByRoom.get(row.id)?.isPending),
        isPickupCompleted: Boolean(appointmentByRoom.get(row.id)?.isCompleted),
        isPickupCancelled: Boolean(appointmentByRoom.get(row.id)?.isCancelled),
        unreadCount: latestByRoom.get(row.id)?.unreadCount || 0,
        lastMessage: (() => {
          const summary = latestByRoom.get(row.id);
          if (summary?.latest?.sender_id === currentUser.id) return `คุณ: ${getMessagePreview(summary.latest)}`;
          if (summary?.unreadCount) return `ข้อความใหม่ ${summary.unreadCount} ข้อความ`;
          return getMessagePreview(summary?.latest);
        })(),
        }));
        conversationCache.set(cacheKey, next);
        return next;
      });
      setLoading(false);
    };
    void load();
    const channel = supabase.channel(`chat-list:${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { void load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_appointments' }, () => { void load(); })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  const visibleConversations = conversations.filter((conversation) => {
    const searchMatch = `${conversation.name || ''} ${conversation.productTitle || ''} ${conversation.location || ''}`.toLocaleLowerCase('th-TH').includes(searchQuery.trim().toLocaleLowerCase('th-TH'));
    return searchMatch && matchesCategory(conversation, activeCategory);
  });
  return <section className="chat-list-page-container">
    <header className="chat-main-header">
      <div className="chat-list-titlebar"><button type="button" className="chat-list-back-btn" onClick={onNavigateHome} aria-label="ย้อนกลับ"><ArrowLeft size={20} /></button><h1>SPU Market Chats</h1></div>
      <label className="chat-search-wrap"><Search size={16} className="chat-search-icon" /><input className="chat-search-input" placeholder="ค้นหาแชทหรือสินค้า..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></label>
    </header>
    <div className="chat-filter-tabs">{CHAT_FILTER_TABS.map((tab) => {
      const hasUnread = conversations.some((conversation) => matchesCategory(conversation, tab.key) && conversation.unreadCount > 0);
      return <button type="button" key={tab.key} className={`chat-tab-pill ${activeCategory === tab.key ? 'active' : ''}`} onClick={() => setActiveCategory(tab.key)}><span>{tab.label}</span>{hasUnread && <span className="unread-dot-inline" aria-label="มีข้อความที่ยังไม่ได้อ่าน" />}</button>;
    })}</div>
    {error && <p className="chat-live-error" role="alert">โหลดแชทไม่สำเร็จ: {error}</p>}
    <SkeletonReveal loading={loading} skeleton={<div className="chat-items-list chat-skeleton-list" aria-hidden="true">{[0, 1, 2, 3].map((item) => <div className="chat-list-card" key={item}><SkeletonBlock className="chat-skeleton-avatar" /><div className="chat-skeleton-copy"><SkeletonBlock /><SkeletonBlock /><SkeletonBlock /></div></div>)}</div>}>
    {visibleConversations.length === 0 ? <div className="chat-live-empty"><div className="chat-empty-icon"><Search size={26} /></div><p>{searchQuery ? 'ไม่พบแชทที่ค้นหา' : activeCategory === 'completed' ? 'ยังไม่มีรายการนัดรับสำเร็จ' : activeCategory === 'cancelled' ? 'ยังไม่มีรายการยกเลิกนัดรับ' : activeCategory === 'pending' ? 'ยังไม่มีรายการรอนัดรับ' : activeCategory === 'chatting' ? 'ยังไม่มีห้องแชทพูดคุย' : 'ยังไม่มีห้องแชทซื้อขาย'}</p><small>เริ่มแชทได้จากหน้ารายละเอียดสินค้า</small></div> : <div className="chat-items-list">{visibleConversations.map((chat) => <button type="button" key={chat.id} className="chat-list-card" onClick={() => onSelectChat(chat)}>
      <div className="chat-card-avatar-wrap">{chat.image ? <img src={chat.image} alt="" className="chat-card-avatar" /> : <div className="chat-official-avatar"><ShieldCheck size={22} /></div>}{chat.unreadCount > 0 && <span className="chat-unread-avatar-badge">{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>}</div>
      <div className="chat-card-content"><div className="chat-card-top-row"><div className="chat-card-sender-name"><span className="sender-title">{chat.name}</span><CheckCircle2 size={14} className="profile-verified-icon" /><span className="chat-role-badge">{chat.roleLabel}</span></div><div className="chat-card-time-row"><Clock size={11} /><span className="chat-time-label">{formatChatDate(chat.updated_at)}</span></div></div>
        <div className="chat-product-ref-label"><span className="chat-product-title-badge">{chat.productTitle}</span>{chat.location && <span className="chat-pickup-location-badge"><MapPin size={11} />{chat.location}</span>}{chat.isPickupCompleted && <span className="chat-completed-badge"><CheckCircle2 size={11} />นัดรับสำเร็จ</span>}{chat.isPickupCancelled && <span className="chat-cancelled-badge">ยกเลิกนัดรับ</span>}</div><div className="chat-card-bottom-row"><div className="chat-last-msg-box"><p className={`chat-last-message ${chat.unreadCount ? 'has-unread' : ''}`}>{chat.lastMessage}</p></div></div>
      </div>
    </button>)}</div>}
    </SkeletonReveal>
  </section>;
}

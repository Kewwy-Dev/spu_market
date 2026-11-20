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
  return (
    <section className="relative flex min-h-[calc(100dvh-64px)] w-full flex-col bg-white pb-16 text-[#172033]">
      <header className="sticky top-0 z-30 w-full border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-2.5 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 hover:text-spu-pink"
              onClick={onNavigateHome}
              aria-label="ย้อนกลับ"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="m-0 truncate text-base sm:text-lg font-bold tracking-[-0.2px] text-slate-900">
              SPU Market Chats
            </h1>
          </div>
          <span className="shrink-0 rounded-full border border-spu-pink-border bg-spu-pink-light px-2.5 py-0.5 text-[0.7rem] font-bold text-pink-700 tabular-nums">
            {conversations.length} ห้องแชท
          </span>
        </div>
      </header>

      <div className="w-full border-b border-pink-100 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2.5 px-3.5 py-2.5 sm:px-6">
          <label className="flex items-center gap-2 rounded-[14px] border border-spu-pink-border bg-[#fff7fb] px-3 py-2 focus-within:border-spu-pink focus-within:bg-white focus-within:ring-2 focus-within:ring-spu-pink/15">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-[0.78rem] sm:text-sm text-[#172033] outline-none focus:outline-none placeholder:text-[#be8aa2]"
              placeholder="ค้นหาแชทหรือสินค้า..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-0.5">
            {CHAT_FILTER_TABS.map((tab) => {
              const hasUnread = conversations.some((conversation) => matchesCategory(conversation, tab.key) && conversation.unreadCount > 0);
              const isActive = activeCategory === tab.key;
              return (
                <button
                  type="button"
                  key={tab.key}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-[14px] px-3 py-1.5 text-[0.68rem] sm:text-xs transition-all duration-150 ${
                    isActive
                      ? 'bg-spu-pink font-bold text-white shadow-xs'
                      : 'bg-slate-100 font-semibold text-slate-500 hover:bg-slate-200/70'
                  }`}
                  onClick={() => setActiveCategory(tab.key)}
                >
                  <span>{tab.label}</span>
                  {hasUnread && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-spu-pink'}`}
                      aria-label="มีข้อความที่ยังไม่ได้อ่าน"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <p className="mx-auto mt-2 w-full max-w-5xl px-3.5 text-[0.74rem] text-rose-700 sm:px-6" role="alert">
          <span className="block rounded-[10px] bg-rose-50 px-3.5 py-2">โหลดแชทไม่สำเร็จ: {error}</span>
        </p>
      )}

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col [&>.spectrum-skeleton-reveal]:flex [&>.spectrum-skeleton-reveal]:flex-1 [&>.spectrum-skeleton-reveal]:flex-col [&_.spectrum-skeleton-content]:flex [&_.spectrum-skeleton-content]:flex-1 [&_.spectrum-skeleton-content]:flex-col">
        <SkeletonReveal
          loading={loading}
          skeleton={
            <div className="chat-skeleton-list px-3.5 py-2 sm:px-6" aria-hidden="true">
              {[0, 1, 2, 3].map((item) => (
                <div className="chat-list-card flex items-center gap-3 py-3" key={item}>
                  <SkeletonBlock className="chat-skeleton-avatar" />
                  <div className="chat-skeleton-copy">
                    <SkeletonBlock />
                    <SkeletonBlock />
                    <SkeletonBlock />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          {visibleConversations.length === 0 ? (
            <div className="grid flex-1 place-content-center justify-items-center gap-2 px-4 py-12 text-center text-[0.8rem] text-slate-500">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-pink-100 text-pink-700">
                <Search size={26} />
              </div>
              <p className="font-semibold text-slate-700">
                {searchQuery
                  ? 'ไม่พบแชทที่ค้นหา'
                  : activeCategory === 'completed'
                    ? 'ยังไม่มีรายการนัดรับสำเร็จ'
                    : activeCategory === 'cancelled'
                      ? 'ยังไม่มีรายการยกเลิกนัดรับ'
                      : activeCategory === 'pending'
                        ? 'ยังไม่มีรายการรอนัดรับ'
                        : activeCategory === 'chatting'
                          ? 'ยังไม่มีห้องแชทพูดคุย'
                          : 'ยังไม่มีห้องแชทซื้อขาย'}
              </p>
              <small className="text-slate-400">เริ่มแชทได้จากหน้ารายละเอียดสินค้า</small>
            </div>
          ) : (
            <div className="flex w-full min-w-0 flex-col divide-y divide-slate-100">
              {visibleConversations.map((chat) => (
                <button
                  type="button"
                  key={chat.id}
                  className="flex w-full min-w-0 items-center gap-3 bg-white px-3.5 py-3 text-left transition-colors duration-150 hover:bg-[#fff7fb] sm:px-6"
                  onClick={() => onSelectChat(chat)}
                >
                  <div className="relative h-[46px] w-[46px] shrink-0">
                    {chat.image ? (
                      <img src={chat.image} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-spu-pink text-white">
                        <ShieldCheck size={22} />
                      </div>
                    )}
                    {chat.unreadCount > 0 && (
                      <span className="absolute top-1/2 left-1/2 grid h-[23px] min-w-[23px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-pink-500 px-[5px] text-[0.62rem] font-extrabold leading-none text-white shadow-[0_2px_8px_rgba(190,24,93,0.3)] tabular-nums">
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-1">
                        <span className="max-w-[min(48vw,210px)] sm:max-w-[300px] truncate text-[0.82rem] sm:text-sm font-extrabold text-[#172033]">
                          {chat.name}
                        </span>
                        <CheckCircle2 size={14} className="shrink-0 text-spu-teal" />
                        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-pink-300 bg-[#fff1f7] px-[7px] py-0.5 text-[0.58rem] font-extrabold leading-[1.3] text-pink-700">
                          {chat.roleLabel}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-slate-400">
                        <Clock size={11} />
                        <span className="text-[0.62rem] text-slate-500 tabular-nums">{formatChatDate(chat.updated_at)}</span>
                      </div>
                    </div>
                    <div className="my-1 flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="max-w-[62%] min-w-0 truncate rounded-full border border-spu-pink-border bg-spu-pink-light px-2 py-[3px] text-[0.62rem] font-bold leading-[1.35] text-pink-700">
                        {chat.productTitle}
                      </span>
                      {chat.location && (
                        <span className="inline-flex max-w-[62%] min-w-0 items-center gap-1 truncate rounded-full border border-slate-200 bg-white px-2 py-[3px] text-[0.62rem] font-semibold leading-[1.35] text-slate-500">
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{chat.location}</span>
                        </span>
                      )}
                      {chat.isPickupCompleted && (
                        <span className="inline-flex items-center gap-[3px] whitespace-nowrap rounded-full border border-spu-teal-border bg-spu-teal-light px-[7px] py-0.5 text-[0.58rem] font-bold text-spu-teal">
                          <CheckCircle2 size={11} />นัดรับสำเร็จ
                        </span>
                      )}
                      {chat.isPickupCancelled && (
                        <span className="inline-flex items-center gap-[3px] whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-[7px] py-0.5 text-[0.58rem] font-bold text-rose-700">
                          ยกเลิกนัดรับ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        <p
                          className={`m-0 truncate text-[0.7rem] sm:text-xs ${
                            chat.unreadCount ? 'font-bold text-pink-700' : 'text-slate-500'
                          }`}
                        >
                          {chat.lastMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SkeletonReveal>
      </div>
    </section>
  );
}

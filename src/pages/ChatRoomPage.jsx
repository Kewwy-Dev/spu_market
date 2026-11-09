import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, MapPin, ShieldCheck, ImagePlus, Send, CheckCheck, Pencil, Trash2, X, Reply, ArrowDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImagePreview from '../components/spectrumui/image-preview';
import { SkeletonBlock, SkeletonReveal } from '../components/spectrumui/skeleton-reveal';

const messageCache = new Map();

export default function ChatRoomPage({ conversationId, currentUser, chatPartner, draftMessage = '', onBack, onViewProduct }) {
  const messageCacheKey = `${currentUser?.id || 'guest'}:${conversationId || 'unknown'}`;
  const hiddenStorageKey = `spu-market-hidden-chat-messages:${currentUser?.id || 'guest'}:${conversationId || 'unknown'}`;
  const [messages, setMessages] = useState(() => messageCache.get(messageCacheKey) || []);
  const [isLoadingMessages, setIsLoadingMessages] = useState(() => !messageCache.has(messageCacheKey));
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState(() => new Set());
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [showSafetyNotice, setShowSafetyNotice] = useState(true);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [messageMenuClosing, setMessageMenuClosing] = useState(false);
  const [swipeOffsets, setSwipeOffsets] = useState({});
  const [replySwipeIndicator, setReplySwipeIndicator] = useState(null);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [focusedMessageId, setFocusedMessageId] = useState(null);
  const endRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const messageRefs = useRef(new Map());
  const shouldStickToLatestRef = useRef(true);
  const focusedMessageTimer = useRef(null);
  const fileRef = useRef(null);
  const touchStartX = useRef(null);
  const messageMenuTimer = useRef(null);
  const messageMenuHideTimer = useRef(null);
  const lastTap = useRef(null);

  useEffect(() => {
    setText(draftMessage || '');
    setReplyTarget(null);
    setEditingMessage(null);
  }, [conversationId, draftMessage]);

  useEffect(() => {
    try {
      const savedIds = JSON.parse(window.localStorage.getItem(hiddenStorageKey) || '[]');
      setHiddenMessageIds(new Set(Array.isArray(savedIds) ? savedIds : []));
    } catch {
      setHiddenMessageIds(new Set());
    }
  }, [hiddenStorageKey]);

  useEffect(() => {
    if (!selectedImage) { setImagePreview(''); return undefined; }
    const preview = URL.createObjectURL(selectedImage);
    setImagePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [selectedImage]);

  useEffect(() => () => {
    window.clearTimeout(messageMenuTimer.current);
    window.clearTimeout(messageMenuHideTimer.current);
    window.clearTimeout(focusedMessageTimer.current);
  }, []);

  useEffect(() => {
    setIsLoadingMessages(!messageCache.has(messageCacheKey));
    if (!conversationId || !supabase || !currentUser?.id) { setIsLoadingMessages(false); return undefined; }
    let mounted = true;
    const loadRoomInfo = async () => {
      const { data } = await supabase.from('conversations').select('buyer_id,seller_id,product_id,products(title,price,pickup_locations(location_name),product_images(image_url,display_order))').eq('id', conversationId).maybeSingle();
      if (!mounted || !data) return;
      let sellerName = null;
      if (data.buyer_id === currentUser?.id) {
        const { data: productData } = await supabase.from('marketplace_products').select('seller_name').eq('id', data.product_id).maybeSingle();
        sellerName = productData?.seller_name;
      }
      const { data: participantProfiles, error: profileError } = await supabase.rpc('conversation_participant_display_names', { p_conversation_id: conversationId });
      if (!mounted) return;
      const otherUserId = data.buyer_id === currentUser.id ? data.seller_id : data.buyer_id;
      const participantName = profileError ? null : participantProfiles?.find((profile) => profile.user_id === otherUserId)?.display_name;
      const images = data.products?.product_images?.slice().sort((a, b) => a.display_order - b.display_order);
      setRoomInfo({ productId: data.product_id, name: participantName || sellerName || 'SPU Market', roleLabel: data.buyer_id === currentUser.id ? 'ผู้ขาย' : 'ผู้ซื้อ', productTitle: data.products?.title, price: data.products?.price, location: data.products?.pickup_locations?.location_name, image: images?.[0]?.image_url });
    };
    void loadRoomInfo();
    const loadMessages = async () => {
      const { data, error: loadError } = await supabase.from('messages').select('id,sender_id,message_type,message_text,image_url,created_at,reply_to_message_id,edited_at').eq('conversation_id', conversationId).order('created_at');
      if (loadError) { if (mounted) { setError(loadError.message); setIsLoadingMessages(false); } return; }
      const replyIds = [...new Set((data || []).map((message) => message.reply_to_message_id).filter(Boolean))];
      let originalsById = new Map();
      if (replyIds.length) {
        const { data: originals } = await supabase.from('messages').select('id,sender_id,message_type,message_text,image_url').in('id', replyIds);
        originalsById = new Map((originals || []).map((message) => [message.id, message]));
      }
      if (mounted) {
        const nextMessages = (data || []).map((message) => ({ ...message, reply: originalsById.get(message.reply_to_message_id) || null }));
        messageCache.set(messageCacheKey, nextMessages);
        setMessages(nextMessages);
        setIsLoadingMessages(false);
      }
      const { error: readError } = await supabase.from('messages').update({ is_read: true }).eq('conversation_id', conversationId).neq('sender_id', currentUser.id).eq('is_read', false);
      if (readError && mounted) setError(readError.message);
    };
    void loadMessages();
    const channel = supabase.channel(`conversation:${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async ({ eventType, new: message }) => {
        if (eventType === 'INSERT') {
          let received = message;
          if (message.reply_to_message_id) {
            const { data: original } = await supabase.from('messages').select('id,sender_id,message_type,message_text,image_url').eq('id', message.reply_to_message_id).maybeSingle();
            received = { ...message, reply: original || null };
          }
          setMessages((current) => {
            const next = current.some((item) => item.id === message.id) ? current : [...current, received];
            messageCache.set(messageCacheKey, next);
            return next;
          });
          if (message.sender_id !== currentUser?.id) void supabase.from('messages').update({ is_read: true }).eq('id', message.id).eq('is_read', false);
        } else if (eventType === 'UPDATE') {
          setMessages((current) => {
            const next = current.map((item) => item.id === message.id ? { ...item, ...message } : item);
            messageCache.set(messageCacheKey, next);
            return next;
          });
        }
      })
      .subscribe();
    return () => { mounted = false; void supabase.removeChannel(channel); };
  }, [conversationId, currentUser?.id]);

  useEffect(() => {
    if (shouldStickToLatestRef.current) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMessagesScroll = () => {
    const area = messagesAreaRef.current;
    if (!area) return;
    const atLatest = area.scrollHeight - area.scrollTop - area.clientHeight < 80;
    shouldStickToLatestRef.current = atLatest;
    setShowScrollToLatest(!atLatest);
  };

  const scrollToLatest = () => {
    shouldStickToLatestRef.current = true;
    setShowScrollToLatest(false);
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const focusMessage = (messageId) => {
    const node = messageRefs.current.get(messageId);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFocusedMessageId(messageId);
    window.clearTimeout(focusedMessageTimer.current);
    focusedMessageTimer.current = window.setTimeout(() => setFocusedMessageId(null), 1050);
  };

  const send = async ({ messageText = '', imageUrl = null, replyTo = replyTarget } = {}) => {
    if (!currentUser?.id || !conversationId || sending) return;
    if (!messageText.trim() && !imageUrl) return;
    setSending(true); setError('');
    const { error: sendError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      message_type: imageUrl ? 'image' : 'text',
      message_text: imageUrl ? '' : messageText.trim(),
      image_url: imageUrl,
      reply_to_message_id: replyTo?.id || null,
    });
    if (sendError) setError(sendError.message);
    else { setText(''); setReplyTarget(null); }
    setSending(false);
  };

  const sendImage = async (file, replyTo = replyTarget) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { setError('ไฟล์ภาพต้องมีขนาดไม่เกิน 5 MB'); return; }
    setSending(true); setError('');
    const path = `${conversationId}/${currentUser.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await supabase.storage.from('chat-images').upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) { setError(uploadError.message); setSending(false); return; }
    const { data } = supabase.storage.from('chat-images').getPublicUrl(path);
    const { error: messageError } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: currentUser.id, message_type: 'image', message_text: '', image_url: data.publicUrl, reply_to_message_id: replyTo?.id || null });
    if (messageError) setError(messageError.message);
    else { setSelectedImage(null); setReplyTarget(null); }
    setSending(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (editingMessage) {
      const updatedText = text.trim();
      if (!updatedText) return;
      setSending(true); setError('');
      const { data, error: editError } = await supabase.rpc('edit_marketplace_message', { p_message_id: editingMessage.id, p_message_text: updatedText });
      if (editError) setError(editError.message);
      else {
        setMessages((current) => {
          const next = current.map((message) => message.id === data.id ? { ...message, ...data } : message);
          messageCache.set(messageCacheKey, next);
          return next;
        });
        setEditingMessage(null);
        setText('');
      }
      setSending(false);
      return;
    }
    const reply = replyTarget;
    if (text.trim()) await send({ messageText: text, replyTo: reply });
    if (selectedImage) await sendImage(selectedImage, reply);
  };

  const startReply = (message) => { setEditingMessage(null); setReplyTarget(message); };
  const startEdit = (message) => {
    if (message.message_type !== 'text' || message.sender_id !== currentUser?.id) return;
    setReplyTarget(null); setEditingMessage(message); setText(message.message_text);
  };
  const cancelReply = () => { setReplyTarget(null); setText(''); };
  const cancelEdit = () => { setEditingMessage(null); setText(''); };
  const hideMessage = (message) => setHiddenMessageIds((current) => {
    const next = new Set(current).add(message.id);
    try { window.localStorage.setItem(hiddenStorageKey, JSON.stringify([...next])); } catch { /* Keep the hide action for this open room if storage is unavailable. */ }
    return next;
  });
  const showMessageActions = (messageId) => {
    window.clearTimeout(messageMenuTimer.current);
    window.clearTimeout(messageMenuHideTimer.current);
    setMessageMenuClosing(false);
    setActiveMessageMenu(messageId);
    messageMenuTimer.current = window.setTimeout(() => {
      setMessageMenuClosing(true);
      messageMenuHideTimer.current = window.setTimeout(() => {
        setActiveMessageMenu((active) => active === messageId ? null : active);
        setMessageMenuClosing(false);
      }, 260);
    }, 2740);
  };
  const closeMessageActions = () => {
    window.clearTimeout(messageMenuTimer.current);
    window.clearTimeout(messageMenuHideTimer.current);
    setActiveMessageMenu(null);
    setMessageMenuClosing(false);
  };
  const endSwipe = (message, event) => {
    if (touchStartX.current === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX.current.x;
    const mine = message.sender_id === currentUser?.id;
    const didSwipeToReply = (mine && deltaX < -28) || (!mine && deltaX > 28);
    if (didSwipeToReply) {
      startReply(message);
      setSwipeOffsets((current) => ({ ...current, [message.id]: mine ? -34 : 34 }));
      setReplySwipeIndicator((current) => current?.messageId === message.id ? { ...current, opacity: 0 } : current);
      window.requestAnimationFrame(() => setSwipeOffsets((current) => ({ ...current, [message.id]: 0 })));
    } else {
      setSwipeOffsets((current) => ({ ...current, [message.id]: 0 }));
      if (Math.abs(deltaX) < 10 && mine) {
        const now = Date.now();
        if (lastTap.current?.messageId === message.id && now - lastTap.current.time < 360) {
          showMessageActions(message.id);
          lastTap.current = null;
        } else {
          lastTap.current = { messageId: message.id, time: now };
        }
      }
    }
    window.setTimeout(() => setReplySwipeIndicator((current) => current?.messageId === message.id ? null : current), 220);
    touchStartX.current = null;
  };
  const beginTouch = (message, event) => {
    touchStartX.current = { x: event.touches[0].clientX, rowLeft: event.currentTarget.getBoundingClientRect().left };
  };
  const moveTouch = (message, event) => {
    if (touchStartX.current === null) return;
    const touchX = event.touches[0].clientX;
    const deltaX = touchX - touchStartX.current.x;
    const mine = message.sender_id === currentUser?.id;
    const isReplyDirection = mine ? deltaX < 0 : deltaX > 0;
    if (!isReplyDirection) return;
    const offset = Math.sign(deltaX) * Math.min(Math.abs(deltaX), 38);
    setSwipeOffsets((current) => ({ ...current, [message.id]: offset }));
    if (Math.abs(deltaX) > 5) setReplySwipeIndicator({ messageId: message.id, opacity: Math.min(Math.abs(deltaX) / 26, 1) });
  };
  const endTouch = (message, event) => endSwipe(message, event);
  const chooseImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('กรุณาเลือกไฟล์รูปภาพ'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('ไฟล์ภาพต้องมีขนาดไม่เกิน 5 MB'); return; }
    setError(''); setSelectedImage(file);
  };

  const quickReplies = ['สวัสดีครับ/ค่ะ สนใจสินค้าครับ', 'สินค้ายังอยู่ไหมครับ/คะ', 'สะดวกนัดรับที่ไหนครับ/คะ'];
  const partner = { ...(chatPartner || {}), ...(roomInfo || {}) };

  return <div className="chat-room-container chat-room-live">
    <header className="chat-room-header">
      <button type="button" className="chat-room-back-btn" onClick={onBack} aria-label="ย้อนกลับ"><ArrowLeft size={18} /></button>
      <div className="chat-partner-info-box"><div className="partner-avatar-wrap"><div className="chat-partner-avatar-fallback">{partner.name?.charAt(0) || 'SPU'}</div><span className="partner-online-dot" /></div><div className="partner-details"><div className="partner-name-row"><h2>{partner.name || 'คู่สนทนา'}</h2>{partner.roleLabel && <span className="chat-role-badge">{partner.roleLabel}</span>}<span className="spu-verified-chip"><CheckCircle2 size={10} /><span>SPU Market</span></span></div><span className="partner-subtext">ห้องแชทซื้อขาย</span></div></div>
    </header>
    <button type="button" className="chat-pinned-product-card" onClick={() => { if (roomInfo?.productId) onViewProduct?.(roomInfo.productId); }} disabled={!roomInfo?.productId} aria-label="ดูรายละเอียดสินค้าในแชท"><div className="pinned-product-main">
      {partner?.image ? <img src={partner.image} alt={partner.productTitle || 'สินค้า'} className="pinned-prod-thumb" /> : <div className="pinned-prod-thumb chat-product-placeholder"><ShieldCheck size={20} /></div>}
      <div className="pinned-prod-info"><h4 className="pinned-prod-title">{partner?.productTitle || 'ห้องซื้อขาย SPU Market'}</h4><div className="pinned-prod-meta">{partner?.price != null && <span className="pinned-prod-price">฿{Number(partner.price).toLocaleString('th-TH')}</span>}{partner?.location && <span className="pinned-prod-loc"><MapPin size={11} />{partner.location}</span>}</div></div>
    </div></button>
    {showSafetyNotice && <div className="chat-room-safety-notice"><ShieldCheck size={18} className="safety-notice-icon" /><div className="safety-notice-text"><strong>ซื้อขายอย่างปลอดภัย</strong><p>นัดรับและตรวจสอบสินค้าก่อนชำระเงินทุกครั้ง</p></div><button type="button" className="chat-safety-dismiss" aria-label="ซ่อนคำแนะนำ" onClick={() => setShowSafetyNotice(false)}><X size={16} /></button></div>}
    <div ref={messagesAreaRef} onScroll={handleMessagesScroll} className="chat-room-messages-area chat-live-messages">
      <SkeletonReveal loading={isLoadingMessages} className="chat-message-skeleton-wrap" skeleton={<div className="chat-message-skeleton" aria-hidden="true">{[0, 1, 2, 3].map((item) => <div className={`chat-message-skeleton-row ${item % 2 ? 'mine' : ''}`} key={item}><SkeletonBlock /><SkeletonBlock /></div>)}</div>}>
      {messages.length === 0 && <div className="chat-live-start-note">เริ่มต้นบทสนทนาเกี่ยวกับสินค้านี้ได้เลย</div>}
      {messages.filter((message) => !hiddenMessageIds.has(message.id)).map((message) => { const mine = message.sender_id === currentUser?.id; const otherName = partner?.name || '\u0e04\u0e39\u0e48\u0e2a\u0e19\u0e17\u0e19\u0e32'; const replyLabel = message.reply?.sender_id === currentUser?.id ? (mine ? '\u0e15\u0e2d\u0e1a\u0e01\u0e25\u0e31\u0e1a\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13' : `${otherName} \u0e15\u0e2d\u0e1a\u0e01\u0e25\u0e31\u0e1a\u0e04\u0e38\u0e13`) : `\u0e15\u0e2d\u0e1a\u0e01\u0e25\u0e31\u0e1a ${otherName}`; return <div key={message.id} ref={(node) => { if (node) messageRefs.current.set(message.id, node); else messageRefs.current.delete(message.id); }} className={`chat-bubble-row ${mine ? 'row-me' : 'row-partner'} ${focusedMessageId === message.id ? 'message-focus-pop' : ''} ${mine && activeMessageMenu === message.id ? 'message-menu-open' : ''} ${mine && activeMessageMenu === message.id && messageMenuClosing ? 'message-menu-closing' : ''}`} onTouchStart={(event) => beginTouch(message, event)} onTouchMove={(event) => moveTouch(message, event)} onTouchEnd={(event) => endTouch(message, event)} onTouchCancel={() => { touchStartX.current = null; setSwipeOffsets((current) => ({ ...current, [message.id]: 0 })); setReplySwipeIndicator(null); }} onDoubleClick={() => { if (mine) showMessageActions(message.id); }} onContextMenu={(event) => { event.preventDefault(); if (mine) activeMessageMenu === message.id ? closeMessageActions() : showMessageActions(message.id); }}>
        {replySwipeIndicator?.messageId === message.id && <span className="chat-swipe-reply-indicator" style={{ opacity: replySwipeIndicator.opacity }}><Reply size={16} /></span>}
        {!mine && <div className="bubble-avatar chat-bubble-avatar-fallback">{partner?.name?.charAt(0) || 'S'}</div>}
        <div className={`chat-bubble ${mine ? 'bubble-me' : 'bubble-partner'}`} style={{ transform: `translateX(${swipeOffsets[message.id] || 0}px)` }}>
          {message.reply && <button type="button" className="chat-reply-quote" onTouchStart={(event) => event.stopPropagation()} onTouchEnd={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); focusMessage(message.reply.id); }} aria-label="เลื่อนไปยังข้อความที่ตอบกลับ"><strong>{replyLabel}</strong>{message.reply.message_type === 'image' ? <span className="chat-reply-image-content"><img src={message.reply.image_url} alt="รูปภาพที่ตอบกลับ" loading="lazy" /><span>รูปภาพ</span></span> : <span>{message.reply.message_text}</span>}</button>}
          {message.message_type === 'image' ? <div className="bubble-image-wrap"><ImagePreview src={message.image_url} alt="ภาพที่ส่งในแชท" width={480} height={360} className="bubble-img chat-message-image" /></div> : <p className="bubble-text">{message.message_text}{message.edited_at && <small className="chat-edited-mark"> (แก้ไขแล้ว)</small>}</p>}
          <div className="bubble-meta"><span className="bubble-time">{new Date(message.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>{mine && <CheckCheck size={13} className="bubble-check-icon" />}</div>
        </div>
        {mine && activeMessageMenu === message.id && <div className="chat-message-actions"><button type="button" title="แก้ไขข้อความ" aria-label="แก้ไขข้อความ" onClick={() => { startEdit(message); closeMessageActions(); }}><Pencil size={15} /></button><button type="button" title="ซ่อนข้อความจากหน้าจอนี้" aria-label="ซ่อนข้อความ" onClick={() => { hideMessage(message); closeMessageActions(); }}><Trash2 size={15} /></button></div>}
      </div>; })}
      </SkeletonReveal>
      <div ref={endRef} />
    </div>
    {showScrollToLatest && <button type="button" className="chat-scroll-latest-btn" onClick={scrollToLatest} aria-label="เลื่อนไปยังข้อความล่าสุด" title="ข้อความล่าสุด"><ArrowDown size={20} /></button>}
    {error && <p className="chat-live-error" role="alert">{error}</p>}
    {!editingMessage && <div className="chat-quick-replies-bar">{quickReplies.map((reply) => <button key={reply} type="button" className="quick-reply-pill" onClick={() => { setReplyTarget(null); setText(reply); }}>{reply}</button>)}</div>}
    <form className="chat-room-input-bar chat-compose-form" onSubmit={handleSubmit}>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { chooseImage(event.target.files?.[0]); event.target.value = ''; }} />
      {(replyTarget || editingMessage || imagePreview) && <div className="chat-compose-preview">
        {imagePreview && <img src={imagePreview} alt="ตัวอย่างภาพก่อนส่ง" />}
        {(replyTarget || editingMessage) && <div className="chat-compose-reference"><strong>{editingMessage ? 'กำลังแก้ไขข้อความ' : `ตอบกลับ ${replyTarget.sender_id === currentUser?.id ? 'ข้อความของคุณ' : partner?.name || 'คู่สนทนา'}`}</strong>{editingMessage ? <span>{text}</span> : replyTarget.message_type === 'image' ? <span className="chat-compose-reply-image"><img src={replyTarget.image_url} alt="รูปภาพที่ตอบกลับ" loading="lazy" /><span>รูปภาพ</span></span> : <span>{replyTarget.message_text}</span>}</div>}
        {(imagePreview || replyTarget || editingMessage) && <button type="button" aria-label={editingMessage ? 'ยกเลิกการแก้ไข' : 'ปิดตัวอย่าง'} onClick={() => { if (imagePreview) setSelectedImage(null); if (editingMessage) cancelEdit(); else if (replyTarget) cancelReply(); }}><X size={17} /></button>}
      </div>}
      <button type="button" className="chat-input-tool-btn" aria-label="แนบรูปภาพ" disabled={sending} onClick={() => fileRef.current?.click()}><ImagePlus size={19} /></button>
      <div className="chat-input-field-wrap"><input className="chat-room-input" value={text} onChange={(event) => setText(event.target.value)} placeholder="พิมพ์ข้อความ..." aria-label="ข้อความ" /></div>
      <button type="submit" className="chat-send-btn" aria-label={editingMessage ? 'บันทึกการแก้ไข' : 'ส่งข้อความ'} disabled={sending || (!text.trim() && !selectedImage)}><Send size={17} /></button>
    </form>
  </div>;
}

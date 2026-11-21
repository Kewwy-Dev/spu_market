import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, MapPin, ShieldCheck, ImagePlus, Send, CheckCheck, Pencil, Trash2, X, Reply, ArrowDown, CalendarClock, ClipboardCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImagePreview from '../components/spectrumui/image-preview';
import { SkeletonBlock, SkeletonReveal } from '../components/spectrumui/skeleton-reveal';
import DateTimePicker from '../components/spectrumui/datetime-picker';
import AppointmentDetailModal from '../components/AppointmentDetailModal';
import {
  fromIsoToBangkokPickerDate,
  getBangkokScheduleLimits,
  validateBangkokPickupDateTime,
} from '../lib/pickupSchedule';

const SYSTEM_NOTICE_PREFIX = '__SYSTEM__:';
const messageCache = new Map();

export default function ChatRoomPage({ conversationId, currentUser, chatPartner, onlineUserIds = new Set(), draftMessage = '', onBack, onViewProduct }) {
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
  const [roomAppointment, setRoomAppointment] = useState(null);
  const [partnerMeta, setPartnerMeta] = useState({ contact: '', isVerified: false });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState(undefined);
  const [scheduleError, setScheduleError] = useState('');
  const [appointmentBusy, setAppointmentBusy] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [messageMenuClosing, setMessageMenuClosing] = useState(false);
  const [swipeOffsets, setSwipeOffsets] = useState({});
  const [replySwipeIndicator, setReplySwipeIndicator] = useState(null);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [focusedMessageId, setFocusedMessageId] = useState(null);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState('');
  const endRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const messageRefs = useRef(new Map());
  const shouldStickToLatestRef = useRef(true);
  const autoScrollingToLatestRef = useRef(false);
  const autoScrollTimerRef = useRef(null);
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
    setRoomAppointment(null);
    setShowScheduleModal(false);
    setShowAppointmentModal(false);
    setScheduleError('');
    shouldStickToLatestRef.current = true;
    autoScrollingToLatestRef.current = false;
    setShowScrollToLatest(false);
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
    window.clearTimeout(autoScrollTimerRef.current);
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
      const otherUserId = data.buyer_id === currentUser.id ? data.seller_id : data.buyer_id;
      const [{ data: participantProfiles, error: profileError }, { data: otherProfile }] = await Promise.all([
        supabase.rpc('conversation_participant_profiles', { p_conversation_id: conversationId }),
        supabase.from('profiles').select('avatar_url,display_name,contact,is_verified').eq('id', otherUserId).maybeSingle(),
      ]);
      if (!mounted) return;
      const participant = profileError ? null : participantProfiles?.find((profile) => profile.user_id === otherUserId);
      const images = data.products?.product_images?.slice().sort((a, b) => a.display_order - b.display_order);
      setPartnerMeta({
        contact: otherProfile?.contact || '',
        isVerified: Boolean(otherProfile?.is_verified),
      });
      setRoomInfo({
        partnerId: otherUserId,
        productId: data.product_id,
        name: participant?.display_name || otherProfile?.display_name || sellerName || 'SPU Market',
        avatarUrl: participant?.avatar_url || otherProfile?.avatar_url || '',
        roleLabel: data.buyer_id === currentUser.id ? 'ผู้ขาย' : 'ผู้ซื้อ',
        productTitle: data.products?.title,
        price: data.products?.price,
        location: data.products?.pickup_locations?.location_name,
        image: images?.[0]?.image_url,
      });
    };
    const loadAppointment = async () => {
      const { data: apptRows, error: apptError } = await supabase
        .from('pickup_appointments')
        .select('id,product_id,quantity,scheduled_at,status,created_at,buyer_id,seller_id,conversation_id,seller_delivered_at,buyer_confirmed_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!mounted) return;
      if (apptError) {
        setRoomAppointment(null);
        return;
      }
      setRoomAppointment(apptRows?.[0] || null);
    };
    void loadRoomInfo();
    void loadAppointment();
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_appointments', filter: `conversation_id=eq.${conversationId}` }, () => {
        void loadAppointment();
      })
      .subscribe();
    return () => { mounted = false; void supabase.removeChannel(channel); };
  }, [conversationId, currentUser?.id]);

  const scrollContainerToBottom = (behavior = 'smooth') => {
    const area = messagesAreaRef.current;
    if (area) {
      area.scrollTo({ top: area.scrollHeight, behavior });
      return;
    }
    endRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  useEffect(() => {
    if (!isLoadingMessages && shouldStickToLatestRef.current) scrollContainerToBottom('smooth');
  }, [messages, isLoadingMessages]);

  const [viewportStyle, setViewportStyle] = useState(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return null;
    return {
      top: window.visualViewport.offsetTop,
      height: window.visualViewport.height,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return undefined;
    const vv = window.visualViewport;
    const syncViewport = () => {
      setViewportStyle({
        top: vv.offsetTop,
        height: vv.height,
      });
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
      if (shouldStickToLatestRef.current) {
        window.requestAnimationFrame(() => scrollContainerToBottom('auto'));
      }
    };
    syncViewport();
    vv.addEventListener('resize', syncViewport);
    vv.addEventListener('scroll', syncViewport);
    return () => {
      vv.removeEventListener('resize', syncViewport);
      vv.removeEventListener('scroll', syncViewport);
    };
  }, []);

  const stopAutoScroll = () => {
    autoScrollingToLatestRef.current = false;
    window.clearTimeout(autoScrollTimerRef.current);
  };

  const handleMessagesScroll = () => {
    const area = messagesAreaRef.current;
    if (!area) return;
    const atLatest = area.scrollHeight - area.scrollTop - area.clientHeight < 80;
    if (autoScrollingToLatestRef.current) {
      if (atLatest) {
        stopAutoScroll();
        shouldStickToLatestRef.current = true;
        setShowScrollToLatest(false);
      }
      return;
    }
    shouldStickToLatestRef.current = atLatest;
    setShowScrollToLatest(!atLatest);
  };

  const scrollToLatest = () => {
    shouldStickToLatestRef.current = true;
    autoScrollingToLatestRef.current = true;
    setShowScrollToLatest(false);
    window.clearTimeout(autoScrollTimerRef.current);
    autoScrollTimerRef.current = window.setTimeout(() => {
      autoScrollingToLatestRef.current = false;
      const area = messagesAreaRef.current;
      if (!area) return;
      const atLatest = area.scrollHeight - area.scrollTop - area.clientHeight < 80;
      shouldStickToLatestRef.current = atLatest;
      setShowScrollToLatest(!atLatest);
    }, 900);
    scrollContainerToBottom('smooth');
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

  const partner = { ...(chatPartner || {}), ...(roomInfo || {}) };
  const partnerId = partner.id || partner.partnerId || roomInfo?.partnerId;
  const isPartnerOnline = Boolean(
    partnerId && (onlineUserIds instanceof Set ? onlineUserIds.has(partnerId) : Array.isArray(onlineUserIds) && onlineUserIds.includes(partnerId)),
  );
  const partnerAvatarUrl = partner.avatarUrl || partner.avatar || '';
  const showPartnerAvatar = Boolean(partnerAvatarUrl) && failedAvatarUrl !== partnerAvatarUrl;
  const scheduleLimits = getBangkokScheduleLimits();
  const isAppointmentClosed = roomAppointment?.status === 'completed' || roomAppointment?.status === 'cancelled';

  const sendSystemNotice = async (noticeText) => {
    if (!currentUser?.id || !conversationId || !supabase || !noticeText) return;
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      message_type: 'text',
      message_text: `${SYSTEM_NOTICE_PREFIX}${noticeText}`,
    });
  };

  const openScheduleModal = () => {
    if (!roomAppointment || isAppointmentClosed) return;
    setScheduleError('');
    setScheduledDateTime(fromIsoToBangkokPickerDate(roomAppointment.scheduled_at));
    setShowScheduleModal(true);
  };

  const submitScheduleUpdate = async (event) => {
    event.preventDefault();
    if (!roomAppointment || !currentUser?.id || !supabase) return;
    const { valid, scheduledAt, error: validationError } = validateBangkokPickupDateTime(scheduledDateTime);
    if (!valid || !scheduledAt) {
      setScheduleError(validationError);
      return;
    }
    setAppointmentBusy(true);
    setScheduleError('');
    const nowIso = new Date().toISOString();
    const { data: updatedRow, error: updateError } = await supabase
      .from('pickup_appointments')
      .update({ scheduled_at: scheduledAt.toISOString(), updated_at: nowIso })
      .eq('id', roomAppointment.id)
      .select('id,product_id,quantity,scheduled_at,status,created_at,buyer_id,seller_id,conversation_id,seller_delivered_at,buyer_confirmed_at')
      .maybeSingle();
    if (updateError || !updatedRow) {
      setScheduleError(updateError?.message || 'ไม่สามารถอัปเดตวันและเวลานัดรับได้');
      setAppointmentBusy(false);
      return;
    }
    setRoomAppointment(updatedRow);
    setShowScheduleModal(false);
    setAppointmentBusy(false);
    const actorLabel = roomAppointment.buyer_id === currentUser.id ? 'ผู้ซื้อ' : 'ผู้ขาย';
    const formattedSchedule = new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'medium',
      timeStyle: 'short',
      hourCycle: 'h23',
    }).format(scheduledAt);
    void sendSystemNotice(`${actorLabel} แก้ไขวัน/เวลานัดรับเป็น ${formattedSchedule} น.`);
  };

  const handleUpdateAppointmentStatus = async (appointmentId, action) => {
    if (!supabase || !currentUser?.id) return;
    const nowIso = new Date().toISOString();
    let nextStatus = '';
    const updatePayload = { updated_at: nowIso };
    if (action === 'seller_delivered') {
      nextStatus = 'delivered';
      updatePayload.status = 'delivered';
      updatePayload.seller_delivered_at = nowIso;
    } else if (action === 'buyer_received') {
      nextStatus = 'completed';
      updatePayload.status = 'completed';
      updatePayload.buyer_confirmed_at = nowIso;
    } else if (action === 'cancel') {
      nextStatus = 'cancelled';
      updatePayload.status = 'cancelled';
      updatePayload.cancelled_at = nowIso;
    }
    const { error: rpcError } = await supabase.rpc('update_pickup_appointment_status', {
      p_appointment_id: appointmentId,
      p_action: action,
    });
    if (rpcError) {
      const { data: updatedRows, error: directError } = await supabase
        .from('pickup_appointments')
        .update(updatePayload)
        .eq('id', appointmentId)
        .select();
      if (directError) throw new Error(directError.message || rpcError.message);
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('ไม่สามารถอัปเดตสถานะนัดรับในฐานข้อมูลได้');
      }
    }
    setRoomAppointment((prev) => (prev && prev.id === appointmentId ? {
      ...prev,
      status: nextStatus,
      ...(action === 'seller_delivered' ? { seller_delivered_at: nowIso } : {}),
      ...(action === 'buyer_received' ? { buyer_confirmed_at: nowIso } : {}),
    } : prev));
    const actorLabel = roomAppointment?.buyer_id === currentUser.id ? 'ผู้ซื้อ' : 'ผู้ขาย';
    const actionText = action === 'seller_delivered'
      ? `${actorLabel} อัปเดตสถานะ: ส่งมอบสินค้าแล้ว`
      : action === 'buyer_received'
      ? `${actorLabel} อัปเดตสถานะ: ยืนยันได้รับสินค้าแล้ว`
      : `${actorLabel} ยกเลิกการนัดรับสินค้าแล้ว`;
    void sendSystemNotice(actionText);
  };

  const appointmentDetail = roomAppointment ? {
    id: roomAppointment.id,
    productId: roomAppointment.product_id,
    title: partner?.productTitle || 'สินค้า SPU Market',
    price: Number(partner?.price || 0) * (roomAppointment.quantity || 1),
    unitPrice: Number(partner?.price || 0),
    quantity: roomAppointment.quantity || 1,
    image: partner?.image || '',
    location: partner?.location || 'ไม่ระบุจุดนัดรับ',
    scheduledAt: roomAppointment.scheduled_at,
    status: roomAppointment.status,
    rawStatus: roomAppointment.status,
    createdAt: roomAppointment.created_at,
    sellerDeliveredAt: roomAppointment.seller_delivered_at,
    buyerConfirmedAt: roomAppointment.buyer_confirmed_at,
    buyerId: roomAppointment.buyer_id,
    sellerId: roomAppointment.seller_id,
    conversationId: roomAppointment.conversation_id || conversationId,
    isBuyer: roomAppointment.buyer_id === currentUser?.id,
    partnerName: partner.name || 'คู่สนทนา',
    partnerContact: partnerMeta.contact || '',
    partnerVerified: partnerMeta.isVerified,
    sellerName: roomAppointment.seller_id === currentUser?.id ? (currentUser?.displayName || 'คุณ') : (partner.name || 'ผู้ขาย SPU'),
    sellerContact: roomAppointment.seller_id === currentUser?.id ? (currentUser?.contact || '') : partnerMeta.contact,
    buyerName: roomAppointment.buyer_id === currentUser?.id ? (currentUser?.displayName || 'คุณ') : (partner.name || 'ผู้ซื้อ SPU'),
    buyerContact: roomAppointment.buyer_id === currentUser?.id ? (currentUser?.contact || '') : partnerMeta.contact,
  } : null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-10 flex w-full flex-col overflow-hidden bg-[#fff7fb] text-[#172033]"
      style={viewportStyle ? { top: `${viewportStyle.top}px`, height: `${viewportStyle.height}px` } : { height: '100dvh' }}
    >
      <header className="z-20 w-full shrink-0 border-b border-pink-100 bg-white">
        <div className="mx-auto flex min-h-14 w-full max-w-4xl items-center justify-between gap-2.5 px-3.5 sm:px-6">
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-pink-700 transition-colors hover:bg-pink-100"
            onClick={onBack}
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="relative h-10 w-10 shrink-0">
              {showPartnerAvatar ? (
                <img
                  src={partnerAvatarUrl}
                  alt={partner.name || 'คู่สนทนา'}
                  className="h-full w-full rounded-full object-cover"
                  onError={() => setFailedAvatarUrl(partnerAvatarUrl)}
                />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 font-extrabold text-white">
                  {partner.name?.charAt(0) || 'SPU'}
                </div>
              )}
              <span
                className={`absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                  isPartnerOnline ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-px">
              <div className="flex items-center gap-1.5">
                <h2 className="m-0 truncate text-[0.88rem] sm:text-base font-extrabold text-[#172033]">
                  {partner.name || 'คู่สนทนา'}
                </h2>
                {partnerMeta.isVerified && <CheckCircle2 size={14} className="shrink-0 text-spu-teal" />}
                {partner.roleLabel && (
                  <span className="inline-flex items-center whitespace-nowrap rounded-full border border-pink-300 bg-[#fff1f7] px-[7px] py-0.5 text-[0.58rem] font-extrabold leading-[1.3] text-pink-700">
                    {partner.roleLabel}
                  </span>
                )}
              </div>
              <span className={`text-[0.62rem] ${isPartnerOnline ? 'font-semibold text-spu-teal' : 'text-slate-500'}`}>
                {isPartnerOnline ? 'ออนไลน์' : 'ออฟไลน์'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl shrink-0 flex-col px-2.5 pt-2 sm:px-6">
        <button
          type="button"
          className="flex w-full cursor-pointer flex-col gap-2 rounded-[14px] border border-spu-pink-border bg-white px-3.5 py-2.5 text-left shadow-[0_3px_12px_rgba(15,23,42,0.05)] transition-all duration-150 hover:-translate-y-px hover:border-pink-400 hover:shadow-[0_6px_18px_rgba(190,24,93,0.12)] disabled:cursor-default disabled:opacity-100 disabled:hover:translate-y-0 disabled:hover:border-spu-pink-border disabled:hover:shadow-[0_3px_12px_rgba(15,23,42,0.05)]"
          onClick={() => { if (roomInfo?.productId) onViewProduct?.(roomInfo.productId); }}
          disabled={!roomInfo?.productId}
          aria-label="ดูรายละเอียดสินค้าในแชท"
        >
          <div className="flex items-center gap-2.5">
            {partner?.image ? (
              <img src={partner.image} alt={partner.productTitle || 'สินค้า'} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-pink-100 text-pink-700">
                <ShieldCheck size={20} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="mb-0.5 truncate text-[0.78rem] sm:text-sm font-bold text-slate-800">
                {partner?.productTitle || 'ห้องซื้อขาย SPU Market'}
              </h4>
              <div className="flex items-center gap-2">
                {partner?.price != null && (
                  <span className="text-[0.86rem] font-extrabold text-spu-pink tabular-nums">
                    ฿{Number(partner.price).toLocaleString('th-TH')}
                  </span>
                )}
                {partner?.location && (
                  <span className="inline-flex items-center gap-0.5 truncate text-[0.62rem] text-slate-500">
                    <MapPin size={11} className="shrink-0" />
                    <span className="truncate">{partner.location}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>

        {roomAppointment && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-spu-pink-border bg-white px-3 py-2 text-[0.74rem] font-bold text-pink-700 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-px hover:border-pink-400 hover:bg-spu-pink-light disabled:cursor-not-allowed disabled:opacity-50"
              onClick={openScheduleModal}
              disabled={isAppointmentClosed}
              title={isAppointmentClosed ? 'ไม่สามารถแก้ไขเวลานัดรับของรายการที่เสร็จสิ้นหรือยกเลิกแล้ว' : 'แก้ไขวันที่และเวลานัดรับ'}
            >
              <CalendarClock size={15} className="shrink-0" />
              <span className="truncate">แก้ไขวันที่/เวลานัดรับ</span>
            </button>
            <button
              type="button"
              className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-pink-300 bg-pink-50 px-3 py-2 text-[0.74rem] font-bold text-pink-800 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-px hover:border-pink-400 hover:bg-pink-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setShowAppointmentModal(true)}
            >
              <ClipboardCheck size={15} className="shrink-0" />
              <span className="truncate">อัพเดตสถานะนัดรับ</span>
            </button>
          </div>
        )}
      </div>

      <div
        ref={messagesAreaRef}
        onScroll={handleMessagesScroll}
        onWheel={stopAutoScroll}
        onTouchStart={stopAutoScroll}
        className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-1.5 overflow-y-auto px-3.5 py-3.5 sm:px-6"
      >
        <SkeletonReveal
          loading={isLoadingMessages}
          className="chat-message-skeleton-wrap"
          skeleton={
            <div className="chat-message-skeleton" aria-hidden="true">
              {[0, 1, 2, 3].map((item) => (
                <div className={`chat-message-skeleton-row ${item % 2 ? 'mine' : ''}`} key={item}>
                  <SkeletonBlock />
                  <SkeletonBlock />
                </div>
              ))}
            </div>
          }
        >
          {messages.length === 0 && (
            <div className="mx-auto my-2.5 block w-fit max-w-[calc(100%-16px)] rounded-[20px] bg-slate-200 px-3.5 py-1.5 text-center text-[0.68rem] leading-[1.4] text-slate-500">
              เริ่มต้นบทสนทนาเกี่ยวกับสินค้านี้ได้เลย
            </div>
          )}
          {messages.filter((message) => !hiddenMessageIds.has(message.id)).map((message) => {
            if (message.message_type === 'text' && message.message_text?.startsWith(SYSTEM_NOTICE_PREFIX)) {
              return (
                <div
                  key={message.id}
                  className="mx-auto my-2.5 block w-fit max-w-[calc(100%-16px)] rounded-[20px] bg-slate-200 px-3.5 py-1.5 text-center text-[0.68rem] leading-[1.4] text-slate-500"
                >
                  {message.message_text.slice(SYSTEM_NOTICE_PREFIX.length)}
                </div>
              );
            }
            const mine = message.sender_id === currentUser?.id;
            const otherName = partner?.name || 'คู่สนทนา';
            const replyLabel = message.reply?.sender_id === currentUser?.id
              ? (mine ? 'ตอบกลับข้อความของคุณ' : `${otherName} ตอบกลับคุณ`)
              : `ตอบกลับ ${otherName}`;

            return (
              <div
                key={message.id}
                ref={(node) => { if (node) messageRefs.current.set(message.id, node); else messageRefs.current.delete(message.id); }}
                className={`chat-bubble-row relative flex touch-pan-y select-none items-end gap-2 ${
                  mine ? 'row-me justify-end' : 'row-partner justify-start'
                } ${focusedMessageId === message.id ? 'message-focus-pop' : ''} ${
                  mine && activeMessageMenu === message.id ? 'message-menu-open' : ''
                } ${mine && activeMessageMenu === message.id && messageMenuClosing ? 'message-menu-closing' : ''}`}
                onTouchStart={(event) => beginTouch(message, event)}
                onTouchMove={(event) => moveTouch(message, event)}
                onTouchEnd={(event) => endTouch(message, event)}
                onTouchCancel={() => { touchStartX.current = null; setSwipeOffsets((current) => ({ ...current, [message.id]: 0 })); setReplySwipeIndicator(null); }}
                onDoubleClick={() => { if (mine) showMessageActions(message.id); }}
                onContextMenu={(event) => { event.preventDefault(); if (mine) activeMessageMenu === message.id ? closeMessageActions() : showMessageActions(message.id); }}
              >
                {replySwipeIndicator?.messageId === message.id && (
                  <span
                    className={`pointer-events-none absolute top-1/2 z-[2] grid h-[30px] w-[30px] -translate-y-1/2 scale-85 place-items-center rounded-full bg-white text-pink-700 shadow-[0_2px_8px_rgba(190,24,93,0.2)] transition-all duration-130 ${
                      mine ? 'right-2' : 'left-[42px]'
                    }`}
                    style={{ opacity: replySwipeIndicator.opacity }}
                  >
                    <Reply size={16} />
                  </span>
                )}
                {!mine && (
                  showPartnerAvatar ? (
                    <img
                      src={partnerAvatarUrl}
                      alt={partner.name || 'คู่สนทนา'}
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                      onError={() => setFailedAvatarUrl(partnerAvatarUrl)}
                    />
                  ) : (
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-[0.65rem] font-extrabold text-white">
                      {partner?.name?.charAt(0) || 'S'}
                    </div>
                  )
                )}
                <div
                  className={`chat-bubble relative flex max-w-[78%] sm:max-w-[65%] flex-col gap-1 rounded-2xl px-3 py-2.5 transition-transform duration-180 ease-[cubic-bezier(.2,.75,.25,1)] will-change-transform ${
                    mine
                      ? 'rounded-br-[4px] bg-spu-pink text-white'
                      : 'rounded-bl-[4px] border border-spu-pink-border bg-white text-slate-800'
                  } ${mine && activeMessageMenu === message.id ? 'scale-[1.01]' : ''}`}
                  style={{ transform: `translateX(${swipeOffsets[message.id] || 0}px)` }}
                >
                  {message.reply && (
                    <button
                      type="button"
                      className={`mb-1 grid w-full max-w-full cursor-pointer gap-0.5 overflow-hidden rounded-[5px] border-l-[3px] px-2 py-1 text-left ${
                        mine
                          ? 'border-l-white/80 bg-white/18 text-white'
                          : 'border-l-pink-400 bg-white/48 text-slate-500'
                      }`}
                      onTouchStart={(event) => event.stopPropagation()}
                      onTouchEnd={(event) => event.stopPropagation()}
                      onClick={(event) => { event.stopPropagation(); focusMessage(message.reply.id); }}
                      aria-label="เลื่อนไปยังข้อความที่ตอบกลับ"
                    >
                      <strong className={`truncate text-[0.62rem] ${mine ? 'text-white' : 'text-pink-800'}`}>
                        {replyLabel}
                      </strong>
                      {message.reply.message_type === 'image' ? (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <img src={message.reply.image_url} alt="รูปภาพที่ตอบกลับ" loading="lazy" className="h-[34px] w-[34px] shrink-0 rounded-[5px] object-cover" />
                          <span className="truncate text-[0.62rem]">รูปภาพ</span>
                        </span>
                      ) : (
                        <span className="truncate text-[0.62rem]">{message.reply.message_text}</span>
                      )}
                    </button>
                  )}
                  {message.message_type === 'image' ? (
                    <div className="relative mt-1 overflow-hidden rounded-[10px]">
                      <ImagePreview
                        src={message.image_url}
                        alt="ภาพที่ส่งในแชท"
                        width={480}
                        height={360}
                        className="block w-full cursor-zoom-in rounded-[10px]"
                      />
                    </div>
                  ) : (
                    <p className="m-0 text-[0.8rem] leading-[1.45] whitespace-pre-wrap break-words">
                      {message.message_text}
                      {message.edited_at && <small className="text-[0.58rem] opacity-75"> (แก้ไขแล้ว)</small>}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-1 self-end text-[0.58rem] opacity-85 tabular-nums">
                    <span>{new Date(message.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                    {mine && <CheckCheck size={13} className="text-white" />}
                  </div>
                </div>
                {mine && activeMessageMenu === message.id && (
                  <div className="chat-message-actions">
                    <button
                      type="button"
                      className="grid h-7 w-7 place-items-center rounded-full bg-white text-pink-700 shadow-[0_1px_5px_rgba(15,23,42,0.12)] hover:bg-pink-100 hover:text-pink-800"
                      title="แก้ไขข้อความ"
                      aria-label="แก้ไขข้อความ"
                      onClick={() => { startEdit(message); closeMessageActions(); }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="grid h-7 w-7 place-items-center rounded-full bg-white text-pink-700 shadow-[0_1px_5px_rgba(15,23,42,0.12)] hover:bg-pink-100 hover:text-pink-800"
                      title="ซ่อนข้อความจากหน้าจอนี้"
                      aria-label="ซ่อนข้อความ"
                      onClick={() => { hideMessage(message); closeMessageActions(); }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </SkeletonReveal>
        <div ref={endRef} />
      </div>

      {showScrollToLatest && (
        <button
          type="button"
          className="absolute bottom-24 left-1/2 z-[6] grid h-[42px] w-[42px] -translate-x-1/2 place-items-center rounded-full border border-spu-pink-border bg-white/96 text-pink-700 shadow-[0_4px_14px_rgba(190,24,93,0.18)] hover:bg-spu-pink-light animate-[chat-scroll-latest-pop_180ms_ease-out_both]"
          onClick={scrollToLatest}
          aria-label="เลื่อนไปยังข้อความล่าสุด"
          title="ข้อความล่าสุด"
        >
          <ArrowDown size={20} />
        </button>
      )}

      {error && (
        <p className="mx-auto w-full max-w-4xl bg-rose-50 px-3.5 py-2 text-[0.72rem] text-rose-700 sm:px-6" role="alert">
          {error}
        </p>
      )}

      <form className="w-full shrink-0 border-t border-pink-100 bg-white" onSubmit={handleSubmit}>
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2 px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] sm:px-6">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { chooseImage(event.target.files?.[0]); event.target.value = ''; }} />
          {(replyTarget || editingMessage || imagePreview) && (
            <div className="flex w-full min-w-0 flex-[1_0_100%] items-center gap-2.5 rounded-xl border border-spu-pink-border bg-[#fff7fb] px-2.5 py-1.5">
              {imagePreview && <img src={imagePreview} alt="ตัวอย่างภาพก่อนส่ง" className="h-[54px] w-[54px] shrink-0 rounded-lg object-cover" />}
              {(replyTarget || editingMessage) && (
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <strong className="truncate text-[0.65rem] text-pink-800">
                    {editingMessage ? 'กำลังแก้ไขข้อความ' : `ตอบกลับ ${replyTarget.sender_id === currentUser?.id ? 'ข้อความของคุณ' : partner?.name || 'คู่สนทนา'}`}
                  </strong>
                  {editingMessage ? (
                    <span className="truncate text-[0.65rem] text-slate-500">{text}</span>
                  ) : replyTarget.message_type === 'image' ? (
                    <span className="flex items-center gap-1.5">
                      <img src={replyTarget.image_url} alt="รูปภาพที่ตอบกลับ" loading="lazy" className="h-[38px] w-[38px] shrink-0 rounded-[7px] object-cover" />
                      <span className="text-[0.65rem] text-slate-500">รูปภาพ</span>
                    </span>
                  ) : (
                    <span className="truncate text-[0.65rem] text-slate-500">{replyTarget.message_text}</span>
                  )}
                </div>
              )}
              {(imagePreview || replyTarget || editingMessage) && (
                <button
                  type="button"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pink-100 text-pink-700 hover:bg-pink-200"
                  aria-label={editingMessage ? 'ยกเลิกการแก้ไข' : 'ปิดตัวอย่าง'}
                  onClick={() => { if (imagePreview) setSelectedImage(null); if (editingMessage) cancelEdit(); else if (replyTarget) cancelReply(); }}
                >
                  <X size={17} />
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-700 transition-colors hover:bg-pink-200 disabled:opacity-50"
            aria-label="แนบรูปภาพ"
            disabled={sending}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus size={19} />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[20px] border border-spu-pink-border bg-[#fff7fb] px-3 py-1.5 transition-all focus-within:border-spu-pink focus-within:bg-white focus-within:ring-2 focus-within:ring-spu-pink/15">
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-[0.8rem] text-slate-900 outline-none focus:outline-none placeholder:text-slate-400"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="พิมพ์ข้อความ..."
              aria-label="ข้อความ"
            />
          </div>
          <button
            type="submit"
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-spu-pink text-white shadow-[0_3px_10px_rgba(230,0,126,0.35)] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            aria-label={editingMessage ? 'บันทึกการแก้ไข' : 'ส่งข้อความ'}
            disabled={sending || (!text.trim() && !selectedImage)}
          >
            <Send size={17} />
          </button>
        </div>
      </form>

      {showScheduleModal && roomAppointment && (
        <div className="pickup-schedule-backdrop" role="presentation" onClick={() => !appointmentBusy && setShowScheduleModal(false)}>
          <form className="pickup-schedule-dialog" role="dialog" aria-modal="true" aria-labelledby="chat-pickup-schedule-title" onSubmit={submitScheduleUpdate} onClick={(event) => event.stopPropagation()}>
            <h2 id="chat-pickup-schedule-title">เลือกวันที่และเวลานัดรับ</h2>
            <DateTimePicker value={scheduledDateTime} onChange={setScheduledDateTime} minDate={scheduleLimits.minDate} minTime={scheduleLimits.minTime} maxTime="18:00" disabled={appointmentBusy} />
            {scheduleError && <div className="pickup-schedule-error" role="alert">{scheduleError}</div>}
            <div className="pickup-schedule-actions">
              <button type="button" onClick={() => setShowScheduleModal(false)} disabled={appointmentBusy}>ยกเลิก</button>
              <button type="submit" disabled={appointmentBusy}>{appointmentBusy ? 'กำลังบันทึก...' : 'ยืนยันนัดรับ'}</button>
            </div>
          </form>
        </div>
      )}
      {showAppointmentModal && appointmentDetail && (
        <AppointmentDetailModal
          appointment={appointmentDetail}
          currentUser={currentUser}
          onClose={() => setShowAppointmentModal(false)}
          onOpenChat={() => setShowAppointmentModal(false)}
          onUpdateStatus={handleUpdateAppointmentStatus}
        />
      )}
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import PickupHistoryModal from '../components/PickupHistoryModal';
import AppointmentDetailModal from '../components/AppointmentDetailModal';
import FavoritesModal from '../components/FavoritesModal';
import { FACULTIES, getMajorsByFaculty } from '../data/faculties';
import { supabase } from '../lib/supabase';
import { countUserFavorites } from '../lib/marketplace';
import {
  ArrowLeft,
  GraduationCap,
  Settings,
  Store,
  ChevronRight,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Truck,
  LifeBuoy,
  ShieldCheck,
  LogOut,
  ShoppingBag,
  LogIn,
  X,
  Phone,
  Heart,
  Camera,
  User,
  Landmark,
  Save,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';
const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export default function ProfilePage({
  currentUser,
  onLogout,
  onBackToHome,
  onSwitchToSeller,
  onNavigateToLogin,
  onOpenChat,
  onSelectProduct,
  onNavigateToProducts,
  onNavigateToSeller,
  onUpdateProfile,
}) {
  const [activeActivityTab, setActiveActivityTab] = useState('pending');
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showPickupHistory, setShowPickupHistory] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [showFavoritesModal, setShowFavoritesModal] = useState(() => (
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'favorites'
  ));
  const [favoritesCount, setFavoritesCount] = useState(0);

  useEffect(() => {
    const handlePopState = () => {
      const isFav = new URLSearchParams(window.location.search).get('tab') === 'favorites';
      setShowFavoritesModal(isFav);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenFavorites = () => {
    if (!currentUser) {
      onNavigateToLogin?.();
      return;
    }
    if (new URLSearchParams(window.location.search).get('tab') !== 'favorites') {
      window.history.replaceState({ modal: 'favorites' }, '', `${window.location.pathname}?tab=favorites`);
    }
    setShowFavoritesModal(true);
  };

  const handleCloseFavorites = () => {
    setShowFavoritesModal(false);
    if (new URLSearchParams(window.location.search).get('tab') === 'favorites') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsDisplayName, setSettingsDisplayName] = useState('');
  const [settingsFaculty, setSettingsFaculty] = useState('');
  const [settingsMajor, setSettingsMajor] = useState('');
  const [settingsContact, setSettingsContact] = useState('');
  const [settingsAvatarFile, setSettingsAvatarFile] = useState(null);
  const [settingsAvatarPreview, setSettingsAvatarPreview] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const avatarInputRef = useRef(null);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(Boolean(currentUser?.id));
  const [activitiesError, setActivitiesError] = useState('');

  useEffect(() => () => {
    if (settingsAvatarPreview) {
      URL.revokeObjectURL(settingsAvatarPreview);
    }
  }, [settingsAvatarPreview]);

  const openSettingsModal = () => {
    const initialFaculty = currentUser?.faculty || '';
    const initialMajor = currentUser?.major || '';
    setSettingsDisplayName(currentUser?.displayName || currentUser?.username || '');
    setSettingsFaculty(initialFaculty);
    setSettingsMajor(initialMajor);
    setSettingsContact(currentUser?.contact || currentUser?.lineId || '');
    setSettingsAvatarFile(null);
    setSettingsAvatarPreview('');
    setSettingsError('');
    setShowSettingsModal(true);
  };

  const handleSettingsFacultyChange = (event) => {
    const nextFaculty = event.target.value;
    const nextMajors = getMajorsByFaculty(nextFaculty);
    setSettingsFaculty(nextFaculty);
    setSettingsMajor((previousMajor) => (nextMajors.includes(previousMajor) ? previousMajor : ''));
  };

  const closeSettingsModal = () => {
    if (settingsSaving) return;
    setSettingsAvatarFile(null);
    setSettingsAvatarPreview('');
    setSettingsError('');
    setShowSettingsModal(false);
  };

  const handleAvatarFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
      setSettingsError('รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WebP เท่านั้น');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setSettingsError('ขนาดรูปภาพต้องไม่เกิน 5 MB');
      return;
    }

    setSettingsError('');
    setSettingsAvatarFile(file);
    setSettingsAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfileSettings = async (event) => {
    event.preventDefault();
    if (!currentUser) {
      closeSettingsModal();
      onNavigateToLogin?.();
      return;
    }

    const trimmedName = settingsDisplayName.trim();
    if (!trimmedName) {
      setSettingsError('กรุณากรอก Display Name');
      return;
    }

    setSettingsSaving(true);
    setSettingsError('');
    try {
      await onUpdateProfile?.({
        displayName: trimmedName,
        faculty: settingsFaculty.trim(),
        major: settingsMajor.trim(),
        contact: settingsContact.trim(),
        avatarFile: settingsAvatarFile,
      });
      setSettingsAvatarFile(null);
      setSettingsAvatarPreview('');
      setShowSettingsModal(false);
    } catch (error) {
      setSettingsError(error.message || 'ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSettingsSaving(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) {
      setFavoritesCount(0);
      return;
    }
    let isMounted = true;
    countUserFavorites(currentUser.id)
      .then((count) => {
        if (isMounted) setFavoritesCount(count);
      })
      .catch((err) => {
        console.warn('Could not load favorites count:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const loadActivities = async () => {
    if (!currentUser?.id || !supabase) {
      setActivities([]);
      setActivitiesLoading(false);
      return;
    }

    setActivitiesLoading(true);
    setActivitiesError('');

    try {
      // 1. Fetch appointments where current user is either buyer or seller
      const { data: rows, error } = await supabase
        .from('pickup_appointments')
        .select('id,product_id,quantity,scheduled_at,status,created_at,buyer_id,seller_id,conversation_id,seller_delivered_at,buyer_confirmed_at')
        .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
        .order('scheduled_at', { ascending: false });

      if (error) {
        setActivitiesError(error.message);
        setActivities([]);
        setActivitiesLoading(false);
        return;
      }

      const productIds = [...new Set((rows || []).map((row) => row.product_id).filter(Boolean))];
      if (!productIds.length) {
        setActivities([]);
        setActivitiesLoading(false);
        return;
      }

      // Collect buyer, seller and conversation IDs
      const buyerIds = [...new Set((rows || []).map((row) => row.buyer_id).filter(Boolean))];
      const sellerIds = [...new Set((rows || []).map((row) => row.seller_id).filter(Boolean))];
      const profileIds = [...new Set([...buyerIds, ...sellerIds])];
      const conversationIds = [...new Set((rows || []).map((row) => row.conversation_id).filter(Boolean))];

      // 2. Load products, images, locations, public seller names, and participant profiles
      const [{ data: products }, { data: images }, { data: locations }, { data: profiles }, { data: marketProducts }] = await Promise.all([
        supabase.from('products').select('id,title,price,location_id,seller_id').in('id', productIds),
        supabase.from('product_images').select('product_id,image_url,display_order').in('product_id', productIds).order('display_order'),
        supabase.from('pickup_locations').select('id,location_name'),
        profileIds.length ? supabase.from('profiles').select('id,display_name,contact,is_verified').in('id', profileIds) : { data: [] },
        productIds.length ? supabase.from('marketplace_products').select('id,seller_name').in('id', productIds) : { data: [] },
      ]);

      // 3. Fallback: get participant display names from conversations via security-definer RPC
      const convNameMap = new Map();
      if (conversationIds.length > 0) {
        const convResults = await Promise.allSettled(
          conversationIds.map((cId) =>
            supabase.rpc('conversation_participant_display_names', { p_conversation_id: cId })
          )
        );
        convResults.forEach((res) => {
          if (res.status === 'fulfilled' && res.value?.data) {
            res.value.data.forEach((p) => {
              if (p.user_id && p.display_name) {
                convNameMap.set(p.user_id, p.display_name);
              }
            });
          }
        });
      }

      const productMap = new Map((products || []).map((product) => [product.id, product]));
      const imageMap = new Map();
      (images || []).forEach((image) => {
        if (!imageMap.has(image.product_id)) imageMap.set(image.product_id, image.image_url);
      });
      const locationMap = new Map((locations || []).map((location) => [location.id, location.location_name]));
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const marketProductMap = new Map((marketProducts || []).map((mp) => [mp.id, mp.seller_name]));

      const now = Date.now();

      // 4. Map into complete appointment activity items with effective status rules
      const next = (rows || []).flatMap((row) => {
        const product = productMap.get(row.product_id);
        if (!product) return [];

        const isBuyer = row.buyer_id === currentUser.id;

        // Resolve display names strictly from database
        const buyerProfile = profileMap.get(row.buyer_id);
        const sellerProfile = profileMap.get(row.seller_id);

        const buyerDisplayName =
          row.buyer_id === currentUser.id
            ? currentUser.displayName || 'คุณ'
            : buyerProfile?.display_name || convNameMap.get(row.buyer_id) || 'ผู้ซื้อ SPU';

        const sellerDisplayName =
          row.seller_id === currentUser.id
            ? currentUser.displayName || 'คุณ'
            : sellerProfile?.display_name || marketProductMap.get(product.id) || convNameMap.get(row.seller_id) || 'ผู้ขาย SPU';

        const partnerName = isBuyer ? sellerDisplayName : buyerDisplayName;
        const partnerContact = isBuyer ? sellerProfile?.contact : buyerProfile?.contact;
        const partnerVerified = isBuyer ? Boolean(sellerProfile?.is_verified) : Boolean(buyerProfile?.is_verified);

        // Time offset calculations for Flow rules:
        const scheduledTime = row.scheduled_at ? new Date(row.scheduled_at).getTime() : 0;
        const minutesPastScheduled = scheduledTime ? (now - scheduledTime) / (60 * 1000) : 0;

        // Rule 3: Seller delivered and > 1 hour past scheduled_at -> auto-completed
        const isAutoCompleted = row.status === 'delivered' && minutesPastScheduled >= 60;

        // Rule 5: Pending and past scheduled_at -> auto-cancelled
        const isAutoCancelled = row.status === 'pending' && minutesPastScheduled > 0;

        // Effective status
        let effectiveStatus = row.status;
        if (isAutoCompleted) effectiveStatus = 'completed';
        else if (isAutoCancelled) effectiveStatus = 'cancelled';

        return [{
          id: row.id,
          productId: product.id,
          title: product.title,
          price: Number(product.price) * (row.quantity || 1),
          unitPrice: Number(product.price),
          quantity: row.quantity || 1,
          image: imageMap.get(product.id) || '',
          location: locationMap.get(product.location_id) || 'ไม่ระบุจุดนัดรับ',
          scheduledAt: row.scheduled_at,
          status: effectiveStatus,
          rawStatus: row.status,
          createdAt: row.created_at,
          sellerDeliveredAt: row.seller_delivered_at,
          buyerConfirmedAt: row.buyer_confirmed_at,
          buyerId: row.buyer_id,
          sellerId: row.seller_id || product.seller_id,
          conversationId: row.conversation_id,
          isBuyer,
          partnerName,
          partnerContact: partnerContact || '',
          partnerVerified,
          sellerName: sellerDisplayName,
          sellerContact: sellerProfile?.contact || '',
          buyerName: buyerDisplayName,
          buyerContact: buyerProfile?.contact || '',
          isAutoCompleted,
          isAutoCancelled,
        }];
      });

      setActivities(next);
      setActivitiesLoading(false);
    } catch (err) {
      setActivitiesError(err.message || 'ไม่สามารถโหลดข้อมูลการนัดรับได้');
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!currentUser?.id || !supabase) {
      setActivities([]);
      setActivitiesLoading(false);
      return undefined;
    }

    void loadActivities();

    // Subscribe to realtime changes on pickup_appointments
    const channel = supabase.channel(`pickup-appointments-user:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_appointments' },
        () => {
          if (active) void loadActivities();
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const handleUpdateAppointmentStatus = async (appointmentId, action) => {
    let nextStatus = 'completed';
    const nowIso = new Date().toISOString();
    const updatePayload = { updated_at: nowIso };

    if (action === 'buyer_received' || action === 'completed') {
      nextStatus = 'completed';
      updatePayload.status = 'completed';
      updatePayload.buyer_confirmed_at = nowIso;
    } else if (action === 'seller_delivered' || action === 'delivered') {
      nextStatus = 'delivered';
      updatePayload.status = 'delivered';
      updatePayload.seller_delivered_at = nowIso;
    } else if (action === 'cancel' || action === 'cancelled') {
      nextStatus = 'cancelled';
      updatePayload.status = 'cancelled';
      updatePayload.cancelled_at = nowIso;
    }

    // 1. Try calling database RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('update_pickup_appointment_status', {
      p_appointment_id: appointmentId,
      p_action: action,
    });

    if (rpcError) {
      console.warn('RPC update_pickup_appointment_status failed or not found, falling back to direct table update:', rpcError.message);

      // 2. Fallback to direct table update
      const { data: updatedRows, error: directError } = await supabase
        .from('pickup_appointments')
        .update(updatePayload)
        .eq('id', appointmentId)
        .select();

      if (directError) {
        throw new Error(directError.message || rpcError.message);
      }

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('ไม่สามารถอัปเดตสถานะในฐานข้อมูลได้ กรุณารัน SQL Migration ใน Supabase SQL Editor ก่อน');
      }
    }

    // 3. Only update client state after DB write succeeded!
    // Note: Product quantity deduction and conditional 'sold' status are handled
    // atomically inside the update_pickup_appointment_status database RPC.
    setActivities((prev) =>
      prev.map((item) => (item.id === appointmentId ? { ...item, status: nextStatus, rawStatus: nextStatus } : item))
    );
    setSelectedAppointment((prev) =>
      prev && prev.id === appointmentId ? { ...prev, status: nextStatus, rawStatus: nextStatus } : prev
    );
  };

  const buyerActivities = activities.filter((item) => item.isBuyer);

  const buyerActivityCounts = {
    pending: buyerActivities.filter((item) => item.status === 'pending' || item.status === 'delivered').length,
    success: buyerActivities.filter((item) => item.status === 'completed').length,
    cancelled: buyerActivities.filter((item) => item.status === 'cancelled').length,
  };

  const hasPendingActivities = activities.some(
    (item) => item.status === 'pending' || item.status === 'delivered'
  );

  const visibleActivities =
    activeActivityTab === 'all'
      ? buyerActivities
      : activeActivityTab === 'pending'
      ? buyerActivities.filter((item) => item.status === 'pending' || item.status === 'delivered')
      : buyerActivities.filter((item) =>
          item.status === (activeActivityTab === 'success' ? 'completed' : activeActivityTab)
        );

  const user = currentUser
    ? {
        displayName: currentUser.displayName || currentUser.username || 'นักศึกษา SPU',
        nickname: currentUser.nickname || '',
        studentId: currentUser.studentId || '—',
        faculty: currentUser.faculty || 'มหาวิทยาลัยศรีปทุม',
        major: currentUser.major || '',
        email: currentUser.email || '—',
        lineId: currentUser.contact || currentUser.lineId || '—',
        avatar: currentUser.avatar || DEFAULT_AVATAR_URL,
        verified: Boolean(currentUser.verified),
        stats: currentUser.stats || { orders: 0, selling: 0, reviews: 0 },
        pickupSpots: currentUser.pickupSpots || ['ตึก 11 (ตึกกิจกรรม)', 'โรงอาหารกลาง SPU'],
      }
    : null;

  return (
    <div className="profile-page-container">
      {/* 1. Header */}
      <header className="profile-top-header">
        <div className="profile-header-title">
          <button
            type="button"
            className="chat-list-back-btn"
            onClick={onBackToHome}
            aria-label="ย้อนกลับ"
            title="กลับหน้าแรก"
          >
            <ArrowLeft size={20} />
          </button>
          <h1>โปรไฟล์ของฉัน</h1>
        </div>

        <div className="profile-header-actions">
          <button
            type="button"
            className="profile-action-btn"
            title="ตั้งค่าโปรไฟล์"
            aria-label="ตั้งค่าโปรไฟล์"
            onClick={openSettingsModal}
          >
            <Settings size={19} />
          </button>
        </div>
      </header>

      {/* 2. Login Prompt if guest, else Profile Card */}
      {!currentUser ? (
        <div className="profile-guest-card">
          <div className="guest-card-icon">
            <LogIn size={28} />
          </div>
          <h3>เข้าสู่ระบบ SPU Market</h3>
          <p>เข้าสู่ระบบด้วยอีเมล @spumail.net หรือ Google เพื่อดูรายการนัดรับและจัดการร้านค้า</p>
          <button
            type="button"
            className="profile-login-cta-btn"
            onClick={onNavigateToLogin}
          >
            <LogIn size={16} />
            <span>เข้าสู่ระบบตอนนี้</span>
          </button>
        </div>
      ) : (
        <>
          {/* Seller Promo Banner (ซ่อนสำหรับผู้ที่มีบทบาท Seller) */}
          {currentUser?.role?.toLowerCase() !== 'seller' && (
            <div className="profile-seller-banner" onClick={onSwitchToSeller}>
              <div className="seller-banner-icon-box">
                <Store size={22} />
              </div>
              <div className="seller-banner-info">
                <h3>เปิดหน้าร้านบน SPU ฟรี</h3>
              </div>
              <button type="button" className="seller-banner-btn">
                <span>เปิดโหมดขาย</span>
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Main Profile Card */}
          <div className="profile-main-card">
            <div className="profile-user-header">
              <div className="profile-avatar-container">
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="profile-avatar-img"
                />
                {user.verified && (
                  <span className="profile-avatar-badge" title="SPU Verified Student">
                    <CheckCircle2 size={14} className="profile-verified-icon" />
                  </span>
                )}
              </div>

              <div className="profile-user-details">
                <div className="profile-name-row">
                  <h2 className="profile-name">{user.displayName}</h2>
                  {user.nickname && <span className="profile-nickname">({user.nickname})</span>}
                </div>

                <div className="profile-meta-row">  
                  <span>
                    รหัสนักศึกษา {user.studentId} • {user.faculty}{user.major ? ` สาขา • ${user.major}` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 3. Appointments Activities Section */}
      <section className="profile-section-card">
        <div className="profile-section-header">
          <div className="profile-section-title">
            <ShoppingBag size={18} className="profile-section-icon" />
            <h3>กิจกรรมการนัดรับของฉัน</h3>
          </div>
          <button
            type="button"
            className="profile-link-btn"
            onClick={() => setActiveActivityTab('all')}
          >
            <span>ทั้งหมด ({buyerActivities.length})</span>
            <ChevronRight size={13} />
          </button>
        </div>

        <div className="profile-activity-tabs">
          <button
            type="button"
            className={`activity-tab-btn ${activeActivityTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveActivityTab('pending')}
          >
            <Clock size={13} />
            <span>กำลังนัดรับ ({buyerActivityCounts.pending})</span>
          </button>
          <button
            type="button"
            className={`activity-tab-btn ${activeActivityTab === 'success' ? 'active' : ''}`}
            onClick={() => setActiveActivityTab('success')}
          >
            <CheckCircle2 size={13} />
            <span>สำเร็จแล้ว ({buyerActivityCounts.success})</span>
          </button>
          <button
            type="button"
            className={`activity-tab-btn ${activeActivityTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveActivityTab('cancelled')}
          >
            <span>ยกเลิก ({buyerActivityCounts.cancelled})</span>
          </button>
        </div>

        {activitiesError && (
          <p className="profile-activity-message error" role="alert">
            {activitiesError}
          </p>
        )}

        {activitiesLoading ? (
          <p className="profile-activity-message" role="status">
            กำลังโหลดรายการนัดรับ...
          </p>
        ) : !currentUser ? (
          <p className="profile-activity-message" role="status">
            เข้าสู่ระบบเพื่อดูรายการนัดรับสินค้าของคุณ
          </p>
        ) : visibleActivities.length ? (
          <div className="profile-activity-list">
            {visibleActivities.map((item) => {
              const scheduledLabel = new Intl.DateTimeFormat('th-TH', {
                timeZone: 'Asia/Bangkok',
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
              }).format(new Date(item.scheduledAt));

              const statusLabel =
                item.status === 'pending'
                  ? `นัดรับ ${scheduledLabel} น.`
                  : item.status === 'delivered'
                  ? `ผู้ขายส่งมอบแล้ว · รอยืนยัน`
                  : item.status === 'completed'
                  ? `รับสินค้าแล้ว · ${scheduledLabel}`
                  : `ยกเลิก · ${scheduledLabel}`;

              const badgeType =
                item.status === 'pending'
                  ? 'amber'
                  : item.status === 'delivered'
                  ? 'blue'
                  : item.status === 'completed'
                  ? 'green'
                  : 'red';

              return (
                <div
                  key={item.id}
                  className="profile-activity-card interactive"
                  onClick={() => setSelectedAppointment(item)}
                  title="แตะเพื่อดูรายละเอียดและดำเนินการ"
                >
                  <div className="activity-top-row">
                    <span className={`activity-role-tag ${item.isBuyer ? 'buyer' : 'seller'}`}>
                      {item.isBuyer ? <ShoppingBag size={12} /> : <Store size={12} />}
                      <span>{item.isBuyer ? 'คุณเป็นผู้ซื้อ' : 'คุณเป็นผู้ขาย'}</span>
                    </span>
                    <span className={`activity-time-pill pill-${badgeType}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="activity-card-main">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="activity-thumb" />
                    ) : (
                      <div className="activity-thumb activity-thumb-placeholder">
                        <ShoppingBag size={20} />
                      </div>
                    )}
                    <div className="activity-card-body">
                      <h4 className="activity-title">{item.title}</h4>
                      <span className="activity-price">฿{item.price.toLocaleString()}</span>
                      <div className="activity-location-row">
                        <MapPin size={12} className="activity-pin-icon" />
                        <span>จุดนัดรับ: {item.location}</span>
                      </div>
                      <span className="activity-partner-hint">
                        {item.isBuyer ? `ผู้ขาย: ${item.sellerName}` : `ผู้ซื้อ: ${item.buyerName}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="profile-activity-message" role="status">
            {activeActivityTab === 'all'
              ? 'ยังไม่มีรายการนัดรับสินค้า'
              : 'ไม่มีรายการในสถานะนี้'}
          </p>
        )}
      </section>

      {/* 4. Settings & Navigation Menu List */}
      <div className="profile-menu-list">
        <button
          type="button"
          className="profile-menu-item"
          onClick={handleOpenFavorites}
        >
          <div className="menu-item-left">
            <div className="menu-icon-box pink-box">
              <Heart size={17} fill="currentColor" />
            </div>
            <div className="menu-item-text">
              <h4>สินค้าที่ถูกใจ</h4>
            </div>
          </div>
          <div className="menu-item-right">
            {favoritesCount > 0 && <span className="menu-badge-count">{favoritesCount}</span>}
            <ChevronRight size={15} />
          </div>
        </button>

        <button
          type="button"
          className="profile-menu-item"
          onClick={() => setShowPickupHistory(true)}
        >
          <div className="menu-item-left">
            <div className="menu-icon-box teal-box">
              <Truck size={17} />
            </div>
            <div className="menu-item-text">
              <h4>ประวัติการนัดรับสินค้า</h4>
            </div>
          </div>
          <div className="menu-item-right">
            {hasPendingActivities && <span className="menu-unread-dot" />}
            <ChevronRight size={15} />
          </div>
        </button>

        <button
          type="button"
          className="profile-menu-item"
          onClick={() => setShowHelpModal(true)}
        >
          <div className="menu-item-left">
            <div className="menu-icon-box teal-box">
              <LifeBuoy size={17} />
            </div>
            <div className="menu-item-text">
              <h4>ศูนย์ช่วยเหลือ &amp; แจ้งปัญหาการซื้อขาย</h4>
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
              <h4>นโยบายความเป็นส่วนตัว &amp; PDPA</h4>
            </div>
          </div>
          <div className="menu-item-right">
            <ChevronRight size={15} />
          </div>
        </button>
      </div>

      {/* 5. Footer & Logout */}
      {currentUser && (
        <div className="profile-footer-section">
          <button
            type="button"
            className="profile-logout-btn"
            onClick={() => {
              setLogoutError('');
              setShowLogoutConfirm(true);
            }}
          >
            <LogOut size={16} />
            <span>ออกจากระบบ</span>
          </button>
          <p className="profile-version-text">
            SPU Student Peer-to-Peer Market v2.4.0 (Build 2026)
          </p>
        </div>
      )}

      {/* Appointment Detail Modal (Bottom Sheet on Mobile) */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          currentUser={currentUser}
          onClose={() => setSelectedAppointment(null)}
          onOpenChat={onOpenChat}
          onUpdateStatus={handleUpdateAppointmentStatus}
        />
      )}

      {/* Favorites Modal */}
      {showFavoritesModal && (
        <FavoritesModal
          currentUser={currentUser}
          onClose={handleCloseFavorites}
          onSelectProduct={onSelectProduct}
          onNavigateToProducts={onNavigateToProducts}
          onNavigateToSeller={onNavigateToSeller}
          onFavoritesCountChange={(count) => setFavoritesCount(count)}
        />
      )}

      {/* Real History Modal */}
      {showPickupHistory && (
        <PickupHistoryModal
          appointments={activities}
          currentUser={currentUser}
          onSelectAppointment={(app) => {
            setShowPickupHistory(false);
            setSelectedAppointment(app);
          }}
          onClose={() => setShowPickupHistory(false)}
        />
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <PrivacyPolicyModal onClose={() => setShowPrivacyPolicy(false)} />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="appointment-modal-backdrop"
          onClick={() => {
            if (!isLoggingOut) setShowLogoutConfirm(false);
          }}
          role="presentation"
        >
          <div
            className="profile-submodal-card logout-confirm-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
          >
            <div className="submodal-header">
              <div className="submodal-icon danger">
                <LogOut size={20} />
              </div>
              <h3 id="logout-confirm-title">ออกจากระบบ</h3>
              <button
                type="button"
                className="submodal-close"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                aria-label="ปิดหน้าต่าง"
              >
                <X size={18} />
              </button>
            </div>
            <div className="submodal-body">
              <p className="logout-confirm-message">คุณต้องการออกจากระบบใช่หรือไม่?</p>
              {logoutError && (
                <div className="settings-feedback error" role="alert">
                  <AlertCircle size={15} />
                  <span>{logoutError}</span>
                </div>
              )}
            </div>
            <div className="logout-confirm-actions">
              <button
                type="button"
                className="logout-cancel-btn"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="logout-confirm-btn"
                disabled={isLoggingOut}
                onClick={async () => {
                  setLogoutError('');
                  setIsLoggingOut(true);
                  try {
                    await onLogout?.({ skipConfirm: true });
                    setShowLogoutConfirm(false);
                  } catch (error) {
                    setLogoutError(error?.message || 'ไม่สามารถออกจากระบบได้ กรุณาลองอีกครั้ง');
                  } finally {
                    setIsLoggingOut(false);
                  }
                }}
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>กำลังออกจากระบบ...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    <span>ออกจากระบบ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help & Support Modal */}
      {showHelpModal && (
        <div className="appointment-modal-backdrop" onClick={() => setShowHelpModal(false)} role="presentation">
          <div className="profile-submodal-card" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="submodal-header">
              <div className="submodal-icon teal"><LifeBuoy size={20} /></div>
              <h3>ศูนย์ช่วยเหลือ &amp; แจ้งปัญหา</h3>
              <button type="button" className="submodal-close" onClick={() => setShowHelpModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="submodal-body">
              <p>หากพบปัญหาในการซื้อขาย ไม่มาตามนัด หรือสินค้าไม่ตรงปก สามารถติดต่อผู้ดูแลตลาดได้ที่:</p>
              <div className="help-contact-card">
                <Phone size={16} />
                <div>
                  <strong>โทรด่วนฝ่ายกิจการนักศึกษา</strong>
                  <span>02-579-1111 ต่อ 1234 (เวลาทำการ 08:30 - 16:30 น.)</span>
                </div>
              </div>
              <div className="help-contact-card">
                <MessageCircle size={16} />
                <div>
                  <strong>LINE Official SPU Market</strong>
                  <span>@spumarket (ตอบกลับภายใน 24 ชม.)</span>
                </div>
              </div>
            </div>
            <button type="button" className="submodal-done-btn" onClick={() => setShowHelpModal(false)}>
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="appointment-modal-backdrop" onClick={closeSettingsModal} role="presentation">
          <div
            className="profile-submodal-card profile-settings-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-settings-modal-title"
          >
            <div className="submodal-header">
              <div className="submodal-icon"><Settings size={20} /></div>
              <h3 id="profile-settings-modal-title">ตั้งค่าโปรไฟล์</h3>
              <button
                type="button"
                className="submodal-close"
                onClick={closeSettingsModal}
                disabled={settingsSaving}
                aria-label="ปิดหน้าต่าง"
              >
                <X size={18} />
              </button>
            </div>

            {!currentUser ? (
              <>
                <div className="submodal-body">
                  <div className="settings-info-item">
                    <span className="settings-label">สถานะบัญชี</span>
                    <strong>ยังไม่ได้เข้าสู่ระบบ</strong>
                  </div>
                </div>
                <div className="submodal-actions">
                  <button type="button" className="submodal-cancel-btn" onClick={closeSettingsModal}>
                    ปิด
                  </button>
                  <button
                    type="button"
                    className="submodal-save-btn"
                    onClick={() => {
                      closeSettingsModal();
                      onNavigateToLogin?.();
                    }}
                  >
                    <LogIn size={16} />
                    <span>เข้าสู่ระบบ</span>
                  </button>
                </div>
              </>
            ) : (
              <form className="profile-settings-form" onSubmit={handleSaveProfileSettings}>
                <div className="settings-avatar-editor">
                  <button
                    type="button"
                    className="settings-avatar-preview-wrap settings-avatar-trigger"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={settingsSaving}
                    title="คลิกที่รูปเพื่อเปลี่ยนรูปโปรไฟล์"
                    aria-label="คลิกที่รูปเพื่อเปลี่ยนรูปโปรไฟล์"
                  >
                    <img
                      src={settingsAvatarPreview || currentUser.avatar || DEFAULT_AVATAR_URL}
                      alt={settingsDisplayName || currentUser.displayName || 'รูปโปรไฟล์'}
                      className="settings-avatar-preview-img"
                    />
                    <span className="settings-avatar-camera-btn" aria-hidden="true">
                      <Camera size={15} />
                    </span>
                  </button>
                  <div className="settings-avatar-meta">
                    <div className="settings-avatar-identity">
                      <div className="settings-avatar-identity-row">
                        <span className="settings-label">อีเมล SPU</span>
                        <strong className="settings-identity-value">{currentUser.email || '—'}</strong>
                      </div>
                      <div className="settings-avatar-identity-row">
                        <span className="settings-label">รหัสนักศึกษา</span>
                        <strong className="settings-identity-value">{currentUser.studentId || '—'}</strong>
                      </div>
                    </div>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarFileChange}
                    hidden
                  />
                </div>

                <div className="settings-form-field">
                  <label htmlFor="profile-settings-display-name" className="settings-field-label">
                    Display Name <span className="settings-required">*</span>
                  </label>
                  <div className="settings-input-wrap">
                    <User size={16} className="settings-input-icon" aria-hidden="true" />
                    <input
                      id="profile-settings-display-name"
                      type="text"
                      className="settings-input"
                      value={settingsDisplayName}
                      onChange={(e) => setSettingsDisplayName(e.target.value)}
                      placeholder="ชื่อที่แสดงในตลาด SPU"
                      maxLength={60}
                      disabled={settingsSaving}
                      required
                    />
                  </div>
                </div>

                <div className="settings-form-field">
                  <label htmlFor="profile-settings-faculty" className="settings-field-label">
                    คณะ / วิทยาลัย
                  </label>
                  <div className="settings-input-wrap">
                    <Landmark size={16} className="settings-input-icon" aria-hidden="true" />
                    <select
                      id="profile-settings-faculty"
                      className="settings-input settings-select"
                      value={settingsFaculty}
                      onChange={handleSettingsFacultyChange}
                      disabled={settingsSaving}
                    >
                      <option value="">เลือกคณะ / วิทยาลัย</option>
                      {settingsFaculty && !FACULTIES.some((f) => f.name === settingsFaculty) && (
                        <option value={settingsFaculty}>{settingsFaculty}</option>
                      )}
                      {FACULTIES.map((faculty) => (
                        <option key={faculty.id} value={faculty.name}>
                          {faculty.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(() => {
                  const availableMajors = getMajorsByFaculty(settingsFaculty);
                  const isMajorDisabled = settingsSaving || !settingsFaculty || availableMajors.length === 0;
                  const hasLegacyMajor = Boolean(
                    settingsMajor && availableMajors.length > 0 && !availableMajors.includes(settingsMajor)
                  );
                  return (
                    <div className="settings-form-field">
                      <label htmlFor="profile-settings-major" className="settings-field-label">
                        สาขาวิชา
                      </label>
                      <div className="settings-input-wrap">
                        <GraduationCap size={16} className="settings-input-icon" aria-hidden="true" />
                        <select
                          id="profile-settings-major"
                          className="settings-input settings-select"
                          value={!settingsFaculty || availableMajors.length === 0 ? '' : settingsMajor}
                          onChange={(e) => setSettingsMajor(e.target.value)}
                          disabled={isMajorDisabled}
                        >
                          <option value="">
                            {!settingsFaculty
                              ? 'กรุณาเลือกคณะก่อน'
                              : availableMajors.length === 0
                                ? 'ไม่พบสาขาวิชาสำหรับคณะนี้'
                                : 'เลือกสาขาวิชา'}
                          </option>
                          {hasLegacyMajor && (
                            <option value={settingsMajor}>{settingsMajor}</option>
                          )}
                          {availableMajors.map((major) => (
                            <option key={major} value={major}>
                              {major}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })()}

                <div className="settings-form-field">
                  <label htmlFor="profile-settings-contact" className="settings-field-label">
                    ช่องทางติดต่อ (LINE ID / เบอร์โทร)
                  </label>
                  <div className="settings-input-wrap">
                    <Phone size={16} className="settings-input-icon" aria-hidden="true" />
                    <input
                      id="profile-settings-contact"
                      type="text"
                      className="settings-input"
                      value={settingsContact}
                      onChange={(e) => setSettingsContact(e.target.value)}
                      placeholder="เช่น @spu_line หรือ 08x-xxx-xxxx"
                      maxLength={120}
                      disabled={settingsSaving}
                    />
                  </div>
                </div>

                {settingsError && (
                  <div className="settings-error-banner" role="alert">
                    <AlertCircle size={15} />
                    <span>{settingsError}</span>
                  </div>
                )}

                <div className="submodal-actions">
                  <button
                    type="button"
                    className="submodal-cancel-btn"
                    onClick={closeSettingsModal}
                    disabled={settingsSaving}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="submodal-save-btn"
                    disabled={settingsSaving}
                  >
                    {settingsSaving ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>บันทึก</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

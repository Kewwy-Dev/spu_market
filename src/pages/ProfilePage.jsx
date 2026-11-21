import React, { useEffect, useRef, useState } from 'react';
import SpuSelect from '../components/common/SpuSelect';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import PickupHistoryModal from '../components/PickupHistoryModal';
import AppointmentDetailModal from '../components/AppointmentDetailModal';
import FavoritesModal from '../components/FavoritesModal';
import { FACULTIES, getMajorsByFaculty } from '../data/faculties';
import { supabase } from '../lib/supabase';
import { countUserFavorites } from '../lib/marketplace';
import {
  getLineOaUrl,
  getLiffFriendshipStatus,
  isLiffConfigured,
  openExternalUrl,
} from '../lib/liff';
import {
  ArrowLeft,
  Bell,
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
  Link2,
  Unlink,
  ExternalLink,
} from 'lucide-react';

const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';
const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export default function ProfilePage({
  currentUser,
  inLiff = false,
  onLogout,
  onBackToHome,
  onSwitchToSeller,
  onNavigateToLogin,
  onOpenChat,
  onSelectProduct,
  onNavigateToProducts,
  onNavigateToSeller,
  onUpdateProfile,
  onLinkLine,
  onUnlinkLine,
  onUpdateLineNotify,
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
  const [lineActionLoading, setLineActionLoading] = useState(false);
  const [lineActionError, setLineActionError] = useState('');
  const [lineFriendFlag, setLineFriendFlag] = useState(null);

  useEffect(() => {
    if (!inLiff || !currentUser?.id) return;
    void getLiffFriendshipStatus().then((status) => {
      if (status && typeof status.friendFlag === 'boolean') {
        setLineFriendFlag(status.friendFlag);
      }
    });
  }, [inLiff, currentUser?.id]);

  const handleLinkLine = async () => {
    if (!onLinkLine || lineActionLoading) return;
    setLineActionError('');
    setLineActionLoading(true);
    try {
      await onLinkLine();
    } catch (err) {
      setLineActionError(err?.message || 'ผูกบัญชี LINE ไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setLineActionLoading(false);
    }
  };

  const handleUnlinkLine = async () => {
    if (!onUnlinkLine || lineActionLoading) return;
    setLineActionError('');
    setLineActionLoading(true);
    try {
      await onUnlinkLine();
    } catch (err) {
      setLineActionError(err?.message || 'ยกเลิกการผูกบัญชี LINE ไม่สำเร็จ');
    } finally {
      setLineActionLoading(false);
    }
  };

  const handleToggleLineNotify = async (nextEnabled) => {
    if (!onUpdateLineNotify || lineActionLoading) return;
    setLineActionError('');
    setLineActionLoading(true);
    try {
      await onUpdateLineNotify({ enabled: nextEnabled });
    } catch (err) {
      setLineActionError(err?.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setLineActionLoading(false);
    }
  };

  const handleToggleLineCategory = async (categoryKey) => {
    if (!onUpdateLineNotify || lineActionLoading) return;
    const currentCategories = currentUser?.lineNotifyCategories || { chat: true, pickup: true, review: true };
    const nextCategories = {
      ...currentCategories,
      [categoryKey]: currentCategories[categoryKey] === false,
    };
    setLineActionError('');
    setLineActionLoading(true);
    try {
      await onUpdateLineNotify({ categories: nextCategories });
    } catch (err) {
      setLineActionError(err?.message || 'บันทึกหมวดหมู่แจ้งเตือนไม่สำเร็จ');
    } finally {
      setLineActionLoading(false);
    }
  };

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
    <div className="min-h-[calc(100dvh-64px)] w-full bg-slate-50 pb-24">
      {/* 1. Header */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              onClick={onBackToHome}
              aria-label="ย้อนกลับ"
              title="กลับหน้าแรก"
            >
              <ArrowLeft size={19} />
            </button>
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              โปรไฟล์ของฉัน
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
              title="ตั้งค่าโปรไฟล์"
              aria-label="ตั้งค่าโปรไฟล์"
              onClick={openSettingsModal}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-4 px-4 pt-4 sm:px-6 lg:grid-cols-12 lg:gap-5">
        <div className="flex min-w-0 flex-col gap-3.5 lg:col-span-5 lg:col-start-1 lg:row-start-1">
          {/* 2. Login Prompt if guest, else Profile Card */}
          {!currentUser ? (
            <div className="rounded-2xl border border-pink-200 bg-gradient-to-br from-white to-pink-50 px-5 py-6 text-center shadow-[0_4px_16px_rgba(219,39,119,0.06)]">
              <div className="mx-auto mb-3 grid h-13 w-13 place-items-center rounded-2xl bg-pink-100 text-pink-600">
                <LogIn size={26} />
              </div>
              <h3 className="m-0 mb-1.5 text-base font-extrabold text-slate-900 sm:text-lg">
                เข้าสู่ระบบ SPU Market
              </h3>
              <p className="m-0 mb-4 text-xs leading-relaxed text-slate-500 sm:text-sm">
                เข้าสู่ระบบด้วยอีเมล @spumail.net หรือ Google เพื่อดูรายการนัดรับและจัดการร้านค้า
              </p>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#a20857] to-[#ec008c] px-6 text-sm font-extrabold text-white shadow-[0_4px_14px_rgba(236,0,140,0.3)] transition-opacity hover:opacity-95"
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
                <div
                  className="flex cursor-pointer items-center gap-3 rounded-2xl bg-gradient-to-br from-[#e6007e] to-[#be185d] p-3.5 text-white shadow-[0_4px_14px_rgba(230,0,126,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(230,0,126,0.32)]"
                  onClick={onSwitchToSeller}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
                    <Store size={21} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="m-0 text-sm font-bold leading-snug">เปิดหน้าร้านบน SPU ฟรี</h3>
                  </div>
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#e6007e]"
                  >
                    <span>เปิดโหมดขาย</span>
                    <ChevronRight size={14} strokeWidth={2.5} />
                  </button>
                </div>
              )}

              {/* Main Profile Card */}
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-3.5">
                  <div className="relative h-14 w-14 shrink-0">
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      className="h-full w-full rounded-full border-2 border-white object-cover shadow-sm"
                    />
                    {user.verified && (
                      <span
                        className="absolute right-0 bottom-0 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white"
                        title="SPU Verified Student"
                      >
                        <CheckCircle2 size={12} />
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <h2 className="m-0 truncate text-base font-extrabold text-slate-900">
                        {user.displayName}
                      </h2>
                      {user.nickname && (
                        <span className="text-xs font-semibold text-slate-500">({user.nickname})</span>
                      )}
                    </div>

                    <div className="mt-0.5 flex flex-col gap-0.5 text-xs leading-snug text-slate-500">
                      <span className="font-medium text-slate-600">
                        รหัสนักศึกษา {user.studentId}
                      </span>
                      <span>{String(user.faculty || '').replace(/^คณะ(?!\s)/, 'คณะ ')}</span>
                      {user.major && <span>สาขา {user.major}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 3. Appointments Activities Section */}
        <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)] lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:row-span-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-[#e6007e]" />
              <h3 className="m-0 text-sm font-extrabold text-slate-900 sm:text-base">
                กิจกรรมการนัดรับของฉัน
              </h3>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 text-xs font-bold text-[#e6007e] hover:underline"
              onClick={() => setActiveActivityTab('all')}
            >
              <span>ทั้งหมด ({buyerActivities.length})</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2.5">
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                activeActivityTab === 'pending'
                  ? 'bg-[#e6007e] font-bold text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setActiveActivityTab('pending')}
            >
              <span>กำลังนัดรับ ({buyerActivityCounts.pending})</span>
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                activeActivityTab === 'success'
                  ? 'bg-[#e6007e] font-bold text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setActiveActivityTab('success')}
            >
              <span>สำเร็จแล้ว ({buyerActivityCounts.success})</span>
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                activeActivityTab === 'cancelled'
                  ? 'bg-[#e6007e] font-bold text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setActiveActivityTab('cancelled')}
            >
              <span>ยกเลิก ({buyerActivityCounts.cancelled})</span>
            </button>
          </div>

          {activitiesError && (
            <p className="my-2 text-center text-xs font-medium text-red-700" role="alert">
              {activitiesError}
            </p>
          )}

          {activitiesLoading ? (
            <p className="my-4 text-center text-xs text-slate-500" role="status">
              กำลังโหลดรายการนัดรับ...
            </p>
          ) : !currentUser ? (
            <p className="my-4 text-center text-xs text-slate-500" role="status">
              เข้าสู่ระบบเพื่อดูรายการนัดรับสินค้าของคุณ
            </p>
          ) : visibleActivities.length ? (
            <div className="scrollbar-none flex max-h-[430px] flex-col gap-2.5 overflow-y-auto">
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

                const pillClassMap = {
                  pending: 'bg-amber-100 text-amber-800',
                  delivered: 'border border-blue-200 bg-blue-50 text-blue-700',
                  completed: 'bg-green-100 text-green-700',
                  cancelled: 'bg-red-100 text-red-700',
                };
                const pillClass = pillClassMap[item.status] || pillClassMap.cancelled;

                return (
                  <div
                    key={item.id}
                    className="flex cursor-pointer flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-all hover:border-pink-200 hover:bg-white hover:shadow-xs active:scale-[0.99]"
                    onClick={() => setSelectedAppointment(item)}
                    title="แตะเพื่อดูรายละเอียดและดำเนินการ"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-extrabold ${
                          item.isBuyer
                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                            : 'border-pink-300 bg-pink-50 text-pink-700'
                        }`}
                      >
                        {item.isBuyer ? <ShoppingBag size={12} /> : <Store size={12} />}
                        <span>{item.isBuyer ? 'คุณเป็นผู้ซื้อ' : 'คุณเป็นผู้ขาย'}</span>
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${pillClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-14 w-14 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-slate-200 text-slate-400">
                          <ShoppingBag size={20} />
                        </div>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <h4 className="m-0 truncate text-xs font-bold text-slate-800 sm:text-sm">
                          {item.title}
                        </h4>
                        <span className="text-sm font-extrabold text-[#e6007e]">
                          ฿{item.price.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin size={12} className="shrink-0 text-[#e6007e]" />
                          <span className="truncate">จุดนัดรับ: {item.location}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {item.isBuyer ? `ผู้ขาย: ${item.sellerName}` : `ผู้ซื้อ: ${item.buyerName}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="my-4 text-center text-xs text-slate-500" role="status">
              {activeActivityTab === 'all'
                ? 'ยังไม่มีรายการนัดรับสินค้า'
                : 'ไม่มีรายการในสถานะนี้'}
            </p>
          )}
        </section>

        {/* 4. Settings & Navigation Menu List */}
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] sm:grid-cols-2 lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:grid-cols-1">
          <button
            type="button"
            className="flex w-full items-center justify-between border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:border-r lg:border-r-0"
            onClick={handleOpenFavorites}
          >
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                <Heart size={17} fill="currentColor" />
              </div>
              <div>
                <h4 className="m-0 text-sm font-bold text-slate-900">สินค้าที่ถูกใจ</h4>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-slate-400">
              {favoritesCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-pink-200 bg-pink-50 px-1.5 text-[11px] font-extrabold text-[#ec008c]">
                  {favoritesCount}
                </span>
              )}
              <ChevronRight size={16} />
            </div>
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-between border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50"
            onClick={() => setShowPickupHistory(true)}
          >
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Truck size={17} />
              </div>
              <div>
                <h4 className="m-0 text-sm font-bold text-slate-900">ประวัติการนัดรับสินค้า</h4>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-slate-400">
              {hasPendingActivities && <span className="h-2 w-2 rounded-full bg-[#e6007e]" />}
              <ChevronRight size={16} />
            </div>
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-between border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:border-b-0 sm:border-r lg:border-b lg:border-r-0"
            onClick={() => setShowHelpModal(true)}
          >
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <LifeBuoy size={17} />
              </div>
              <div>
                <h4 className="m-0 text-sm font-bold text-slate-900">ศูนย์ช่วยเหลือ &amp; แจ้งปัญหาการซื้อขาย</h4>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-slate-400">
              <ChevronRight size={16} />
            </div>
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
            onClick={() => setShowPrivacyPolicy(true)}
          >
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <ShieldCheck size={17} />
              </div>
              <div>
                <h4 className="m-0 text-sm font-bold text-slate-900">นโยบายความเป็นส่วนตัว &amp; PDPA</h4>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-slate-400">
              <ChevronRight size={16} />
            </div>
          </button>
        </div>

        {/* 4.5 LINE OA Connection & Notifications */}
        {currentUser && (
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)] lg:col-span-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Bell size={17} />
                </div>
                <div>
                  <h4 className="m-0 text-sm font-extrabold text-slate-900">
                    การเชื่อมต่อ LINE OA &amp; แจ้งเตือน
                  </h4>
                  <p className="m-0 text-[11px] text-slate-500">
                    รับแจ้งเตือนแชท นัดรับสินค้า และรีวิวผ่าน LINE
                  </p>
                </div>
              </div>
              {currentUser.lineUserId ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 size={12} />
                  ผูกแล้ว
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  ยังไม่ผูก
                </span>
              )}
            </div>

            {lineActionError && (
              <p className="m-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
                {lineActionError}
              </p>
            )}

            {currentUser.lineUserId ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="m-0 truncate text-xs font-bold text-slate-800">
                      บัญชี LINE: {currentUser.lineDisplayName || 'เชื่อมต่อแล้ว'}
                    </p>
                    <p className="m-0 text-[11px] text-slate-500">
                      เข้าใช้งานผ่าน LINE OA ได้อัตโนมัติ
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={lineActionLoading}
                    onClick={handleUnlinkLine}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                  >
                    <Unlink size={12} />
                    <span>ยกเลิก</span>
                  </button>
                </div>

                {lineFriendFlag === false && getLineOaUrl() && (
                  <button
                    type="button"
                    onClick={() => openExternalUrl(getLineOaUrl())}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <ExternalLink size={14} />
                    <span>เพิ่มเพื่อน LINE OA เพื่อรับแจ้งเตือน</span>
                  </button>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-bold text-slate-800">
                    เปิดรับแจ้งเตือนเข้า LINE
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={currentUser.lineNotifyEnabled !== false}
                    disabled={lineActionLoading}
                    onClick={() => handleToggleLineNotify(currentUser.lineNotifyEnabled === false)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-60 ${
                      currentUser.lineNotifyEnabled !== false ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        currentUser.lineNotifyEnabled !== false ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {currentUser.lineNotifyEnabled !== false && (
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'chat', label: 'แชทใหม่' },
                      { key: 'pickup', label: 'นัดรับสินค้า' },
                      { key: 'review', label: 'รีวิวผู้ขาย' },
                    ].map(({ key, label }) => {
                      const active = currentUser.lineNotifyCategories?.[key] !== false;
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={lineActionLoading}
                          onClick={() => handleToggleLineCategory(key)}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors disabled:opacity-60 ${
                            active
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                          }`}
                        >
                          {active && <CheckCircle2 size={11} />}
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {isLiffConfigured() ? (
                  <button
                    type="button"
                    disabled={lineActionLoading}
                    onClick={handleLinkLine}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#05b34c] disabled:opacity-60"
                  >
                    {lineActionLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Link2 size={15} />
                    )}
                    <span>ผูกบัญชีกับ LINE เพื่อรับแจ้งเตือน</span>
                  </button>
                ) : (
                  <p className="m-0 text-[11px] text-slate-500">
                    เปิดใช้งานผ่าน LINE OA หรือตั้งค่า <code className="rounded bg-slate-100 px-1 py-0.5">VITE_LIFF_ID</code> เพื่อผูกบัญชี LINE
                  </p>
                )}
                {getLineOaUrl() && (
                  <button
                    type="button"
                    onClick={() => openExternalUrl(getLineOaUrl())}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <ExternalLink size={13} />
                    <span>เปิด LINE OA ของ SPU Market</span>
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* 5. Footer & Logout */}
        {currentUser && (
          <div className="flex flex-col items-center gap-2.5 pt-2 pb-4 lg:col-span-12">
            <button
              type="button"
              className="flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              onClick={() => {
                setLogoutError('');
                setShowLogoutConfirm(true);
              }}
            >
              <LogOut size={16} />
              <span>ออกจากระบบ</span>
            </button>
            <p className="m-0 text-center text-[11px] text-slate-500">
              SPU Student Peer-to-Peer Market v2.4.0 (Build 2026)
            </p>
          </div>
        )}
      </div>

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
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-xs animate-[appointmentFadeIn_0.2s_ease] sm:items-center sm:p-4"
          onClick={() => {
            if (!isLoggingOut) setShowLogoutConfirm(false);
          }}
          role="presentation"
        >
          <div
            className="flex w-full max-w-sm flex-col gap-4 rounded-t-3xl bg-white p-5 shadow-2xl animate-[appointmentPopIn_0.2s_ease] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
          >
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
                <LogOut size={20} />
              </div>
              <h3 id="logout-confirm-title" className="m-0 flex-1 text-base font-extrabold text-slate-900">
                ออกจากระบบ
              </h3>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                aria-label="ปิดหน้าต่าง"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3 text-sm text-slate-600">
              <p className="m-0 text-sm leading-relaxed text-slate-700">
                คุณต้องการออกจากระบบใช่หรือไม่?
              </p>
              {logoutError && (
                <div
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                  role="alert"
                >
                  <AlertCircle size={15} />
                  <span>{logoutError}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-red-600 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                    <Loader2 size={16} className="animate-spin" />
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
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-xs animate-[appointmentFadeIn_0.2s_ease] sm:items-center sm:p-4"
          onClick={() => setShowHelpModal(false)}
          role="presentation"
        >
          <div
            className="flex w-full max-w-md flex-col gap-4 rounded-t-3xl bg-white p-5 shadow-2xl animate-[appointmentPopIn_0.2s_ease] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600">
                <LifeBuoy size={20} />
              </div>
              <h3 className="m-0 flex-1 text-base font-extrabold text-slate-900">
                ศูนย์ช่วยเหลือ &amp; แจ้งปัญหา
              </h3>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100"
                onClick={() => setShowHelpModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3 text-xs leading-relaxed text-slate-600">
              <p className="m-0">
                หากพบปัญหาในการซื้อขาย ไม่มาตามนัด หรือสินค้าไม่ตรงปก สามารถติดต่อผู้ดูแลตลาดได้ที่:
              </p>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Phone size={16} className="mt-0.5 shrink-0 text-teal-600" />
                <div>
                  <strong className="block text-xs font-bold text-slate-900">
                    โทรด่วนฝ่ายกิจการนักศึกษา
                  </strong>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    02-579-1111 ต่อ 1234 (เวลาทำการ 08:30 - 16:30 น.)
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <MessageCircle size={16} className="mt-0.5 shrink-0 text-teal-600" />
                <div>
                  <strong className="block text-xs font-bold text-slate-900">
                    LINE Official SPU Market
                  </strong>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    @spumarket (ตอบกลับภายใน 24 ชม.)
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="min-h-11 rounded-xl bg-slate-900 text-sm font-bold text-white transition-colors hover:bg-slate-800"
              onClick={() => setShowHelpModal(false)}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-xs animate-[appointmentFadeIn_0.2s_ease] sm:items-center sm:p-4"
          onClick={closeSettingsModal}
          role="presentation"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-[appointmentPopIn_0.2s_ease] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-settings-modal-title"
          >
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                <Settings size={20} />
              </div>
              <h3 id="profile-settings-modal-title" className="m-0 flex-1 text-base font-extrabold text-slate-900">
                ตั้งค่าโปรไฟล์
              </h3>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
                onClick={closeSettingsModal}
                disabled={settingsSaving}
                aria-label="ปิดหน้าต่าง"
              >
                <X size={18} />
              </button>
            </div>

            {!currentUser ? (
              <>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-slate-500">สถานะบัญชี</span>
                    <strong className="text-xs font-bold text-slate-900">ยังไม่ได้เข้าสู่ระบบ</strong>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2.5">
                  <button
                    type="button"
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
                    onClick={closeSettingsModal}
                  >
                    ปิด
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ec008c] to-pink-600 text-sm font-bold text-white shadow-[0_4px_14px_rgba(236,0,140,0.25)] transition-all hover:brightness-105"
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
              <form className="flex flex-col gap-3" onSubmit={handleSaveProfileSettings}>
                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <button
                    type="button"
                    className="group relative h-17 w-17 shrink-0 rounded-full border-0 bg-transparent p-0 transition-transform hover:not-disabled:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-65"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={settingsSaving}
                    title="คลิกที่รูปเพื่อเปลี่ยนรูปโปรไฟล์"
                    aria-label="คลิกที่รูปเพื่อเปลี่ยนรูปโปรไฟล์"
                  >
                    <img
                      src={settingsAvatarPreview || currentUser.avatar || DEFAULT_AVATAR_URL}
                      alt={settingsDisplayName || currentUser.displayName || 'รูปโปรไฟล์'}
                      className="block h-17 w-17 rounded-full border-2 border-white bg-slate-200 object-cover shadow-md transition-colors group-hover:border-[#ec008c]"
                    />
                    <span
                      className="pointer-events-none absolute -right-0.5 -bottom-0.5 grid h-6.5 w-6.5 place-items-center rounded-full border-2 border-white bg-[#ec008c] text-white shadow-[0_2px_8px_rgba(236,0,140,0.35)]"
                      aria-hidden="true"
                    >
                      <Camera size={15} />
                    </span>
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="shrink-0 font-semibold text-slate-500">อีเมล</span>
                        <strong className="truncate text-right font-bold text-slate-900">
                          {currentUser.email || '—'}
                        </strong>
                      </div>
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="shrink-0 font-semibold text-slate-500">รหัสนักศึกษา</span>
                        <strong className="truncate text-right font-bold text-slate-900">
                          {currentUser.studentId || '—'}
                        </strong>
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

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="profile-settings-display-name" className="text-xs font-bold text-slate-700">
                    ชื่อ-นามสกุล <span className="text-[#ec008c]">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <User size={16} className="pointer-events-none absolute left-3 text-slate-500" aria-hidden="true" />
                    <input
                      id="profile-settings-display-name"
                      type="text"
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-slate-900 transition-colors focus:border-[#ec008c] focus:outline-none focus:ring-3 focus:ring-[#ec008c]/15 disabled:bg-slate-50 disabled:text-slate-500"
                      value={settingsDisplayName}
                      onChange={(e) => setSettingsDisplayName(e.target.value)}
                      placeholder="ชื่อที่แสดงในตลาด SPU"
                      maxLength={60}
                      disabled={settingsSaving}
                      required
                    />
                  </div>
                </div>

                <SpuSelect
                  id="profile-settings-faculty"
                  label="คณะ"
                  icon={Landmark}
                  placeholder="เลือกคณะที่เรียน"
                  value={settingsFaculty}
                  onValueChange={(nextValue) => handleSettingsFacultyChange({ target: { value: nextValue } })}
                  options={[
                    ...(settingsFaculty && !FACULTIES.some((f) => f.name === settingsFaculty)
                      ? [{ value: settingsFaculty, label: settingsFaculty }]
                      : []),
                    ...FACULTIES.map((faculty) => ({ value: faculty.name, label: faculty.name })),
                  ]}
                  isDisabled={settingsSaving}
                  labelClassName="text-xs font-bold text-slate-700"
                  triggerClassName="bg-white border border-slate-300 text-xs"
                />

                {(() => {
                  const availableMajors = getMajorsByFaculty(settingsFaculty);
                  const isMajorDisabled = settingsSaving || !settingsFaculty || availableMajors.length === 0;
                  const hasLegacyMajor = Boolean(
                    settingsMajor && availableMajors.length > 0 && !availableMajors.includes(settingsMajor)
                  );
                  const majorPlaceholder = !settingsFaculty
                    ? 'กรุณาเลือกคณะก่อน'
                    : availableMajors.length === 0
                      ? 'ไม่พบสาขาวิชาสำหรับคณะนี้'
                      : 'เลือกสาขาวิชา';
                  return (
                    <SpuSelect
                      id="profile-settings-major"
                      label="สาขาวิชา"
                      icon={GraduationCap}
                      placeholder={majorPlaceholder}
                      value={!settingsFaculty || availableMajors.length === 0 ? '' : settingsMajor}
                      onValueChange={(nextValue) => setSettingsMajor(nextValue)}
                      options={[
                        ...(hasLegacyMajor ? [{ value: settingsMajor, label: settingsMajor }] : []),
                        ...availableMajors.map((major) => ({ value: major, label: major })),
                      ]}
                      isDisabled={isMajorDisabled}
                      labelClassName="text-xs font-bold text-slate-700"
                      triggerClassName="bg-white border border-slate-300 text-xs"
                    />
                  );
                })()}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="profile-settings-contact" className="text-xs font-bold text-slate-700">
                    ช่องทางติดต่อ (LINE ID / เบอร์โทร)
                  </label>
                  <div className="relative flex items-center">
                    <Phone size={16} className="pointer-events-none absolute left-3 text-slate-500" aria-hidden="true" />
                    <input
                      id="profile-settings-contact"
                      type="text"
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-slate-900 transition-colors focus:border-[#ec008c] focus:outline-none focus:ring-3 focus:ring-[#ec008c]/15 disabled:bg-slate-50 disabled:text-slate-500"
                      value={settingsContact}
                      onChange={(e) => setSettingsContact(e.target.value)}
                      placeholder="เช่น @spu_line หรือ 08x-xxx-xxxx"
                      maxLength={120}
                      disabled={settingsSaving}
                    />
                  </div>
                </div>

                {settingsError && (
                  <div
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                    role="alert"
                  >
                    <AlertCircle size={15} />
                    <span>{settingsError}</span>
                  </div>
                )}

                <div className="mt-1 flex items-center gap-2.5">
                  <button
                    type="button"
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-65"
                    onClick={closeSettingsModal}
                    disabled={settingsSaving}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ec008c] to-pink-600 text-sm font-bold text-white shadow-[0_4px_14px_rgba(236,0,140,0.25)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65"
                    disabled={settingsSaving}
                  >
                    {settingsSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
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

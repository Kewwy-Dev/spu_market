import React, { useEffect, useMemo, useRef, useState } from 'react';
import AppToast from '../components/common/AppToast';
import {
  ArrowLeft,
  BookOpenCheck,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Edit3,
  MapPin,
  MessageCircle,
  PackageCheck,
  Plus,
  RotateCcw,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  ChevronRight,
  Calendar,
  User,
} from 'lucide-react';
import {
  computeSellerPunctualityRate,
  computeSellerRatingSummary,
  computeSellerSalesSummary,
  listSellerReviewSummary,
  listSellerTransactions,
  markProductAsSold,
  updateProductStatus,
} from '../lib/marketplace';
import AppointmentDetailModal from '../components/AppointmentDetailModal';
import { StarRating } from '../components/spectrumui/star-rating';
import { supabase } from '../lib/supabase';

const statusLabels = {
  active: 'กำลังขาย',
  sold: 'ขายแล้ว',
  draft: 'ฉบับร่าง',
  archived: 'เก็บถาวร',
  trash: 'ถังขยะ',
};

// คลังสินค้าแสดงครบทั้ง 4 แถบเดิม: กำลังขาย, ขายแล้ว, ฉบับร่าง, ถังขยะ
const ownerFilters = [
  { id: 'active', label: 'กำลังขาย' },
  { id: 'sold', label: 'ขายแล้ว' },
  { id: 'draft', label: 'ฉบับร่าง' },
  { id: 'trash', label: 'ถังขยะ' },
];

const buyerFilters = [
  { id: 'active', label: 'กำลังขาย' },
  { id: 'sold', label: 'ขายแล้ว' },
];

function formatPrice(price) {
  return `฿${Number(price || 0).toLocaleString('th-TH')}`;
}

function trashExpiry(trashedAt) {
  if (!trashedAt) return { expired: false, text: 'กู้คืนได้ภายใน 3 วัน' };
  const remaining = new Date(trashedAt).getTime() + 3 * 24 * 60 * 60 * 1000 - Date.now();
  if (remaining <= 0) return { expired: true, text: 'หมดเวลากู้คืนแล้ว' };
  const hours = Math.ceil(remaining / (60 * 60 * 1000));
  return { expired: false, text: hours > 24 ? `ลบถาวรในอีก ${Math.ceil(hours / 24)} วัน` : `ลบถาวรในอีก ${hours} ชม.` };
}

export default function SellerDashboardPage({
  currentUser,
  isOwner = true,
  userProducts = [],
  transactions = [],
  publicSalesStats = null,
  publicSoldItems = [],
  pickupLocations = [],
  reviewSummary = { average: null, count: 0 },
  defaultPickupLocation = 'b11',
  initialPickupLocation = defaultPickupLocation,
  onBack,
  onSelectProduct,
  onAddNewProduct,
  onEditProduct,
  onDeleteProduct,
  onRestoreProduct,
  onChangePickupLocation,
  onMarkAsSold,
  onUpdateProductStatus,
  onOpenChat,
  isLoading = false,
  error = '',
}) {
  const [activeFilter, setActiveFilter] = useState('active');
  const [txSubFilter, setTxSubFilter] = useState('all');
  const [pickupIndex, setPickupIndex] = useState(0);
  const [pickupOrderOffset, setPickupOrderOffset] = useState(0);
  const [internalTransactions, setInternalTransactions] = useState(transactions);
  const [internalReviewSummary, setInternalReviewSummary] = useState(reviewSummary);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, product: null });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const transactionsSectionRef = useRef(null);
  const pickupTrack = useRef(null);
  const pickupPages = useRef([]);
  const initialPickup = useRef(null);

  // Sync internal transactions when props change or load for current user
  useEffect(() => {
    if (transactions && transactions.length) {
      setInternalTransactions(transactions);
    } else if (isOwner && currentUser?.id) {
      void listSellerTransactions(currentUser.id).then((data) => {
        setInternalTransactions(data);
      });
    }
  }, [transactions, currentUser?.id, isOwner]);

  const orderedPickupLocations = useMemo(() => {
    if (!pickupLocations.length) return [];
    const offset = ((pickupOrderOffset % pickupLocations.length) + pickupLocations.length) % pickupLocations.length;
    return [...pickupLocations.slice(offset), ...pickupLocations.slice(0, offset)];
  }, [pickupLocations, pickupOrderOffset]);

  const pickupPageCount = Math.ceil(orderedPickupLocations.length / 4);
  const displayName = currentUser?.displayName || currentUser?.display_name || 'ผู้ขาย SPU';
  const initial = Array.from(displayName)[0] || 'S';
  const avatarUrl = currentUser?.avatar || currentUser?.avatar_url || '';
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    setInternalReviewSummary(reviewSummary);
  }, [reviewSummary]);

  // สูตรคำนวณคะแนนร้านค้าเฉลี่ย: ผลรวมคะแนนทั้งหมด / จำนวนครั้งที่ให้คะแนน
  const ratingMetrics = useMemo(() => {
    if (Array.isArray(internalReviewSummary?.reviews)) {
      return computeSellerRatingSummary(internalReviewSummary.reviews);
    }
    const count = Number(internalReviewSummary?.count || 0);
    const raterCount = Number(internalReviewSummary?.raterCount ?? count);
    const totalScore =
      internalReviewSummary?.totalScore !== undefined
        ? Number(internalReviewSummary.totalScore)
        : internalReviewSummary?.average !== null && internalReviewSummary?.average !== undefined
        ? Number(internalReviewSummary.average) * count
        : 0;
    const average = count > 0 ? totalScore / count : null;
    return { average, count, raterCount, totalScore };
  }, [internalReviewSummary]);

  // คำนวณ % การนัดรับตรงเวลา (เริ่มต้น 100%, ยึดจากเวลาส่งมอบของผู้ขาย ช้าเกิน 30 นาทีหัก 1%)
  const punctuality = useMemo(() => {
    return computeSellerPunctualityRate(internalTransactions);
  }, [internalTransactions]);

  // Comprehensive Sales Summary correlated with transactions
  const salesSummary = useMemo(() => {
    return computeSellerSalesSummary(userProducts, internalTransactions);
  }, [userProducts, internalTransactions]);

  const activeCount = salesSummary.activeCount;
  const soldCount = isOwner
    ? salesSummary.soldCount
    : Math.max(salesSummary.soldCount, Number(publicSalesStats?.completedAppointmentsCount || 0));
  const trashCount = salesSummary.trashCount;
  const draftCount = salesSummary.draftCount;
  const soldValue = salesSummary.totalRealizedSales;

  const mergedBuyerSoldProducts = useMemo(() => {
    if (isOwner) return [];
    const completedProductIds = new Set(publicSoldItems.map((item) => item.productId).filter(Boolean));
    const directSold = userProducts.filter((p) => p.status === 'sold' && !completedProductIds.has(p.id));
    return [...publicSoldItems, ...directSold];
  }, [isOwner, publicSoldItems, userProducts]);

  const visibleProducts = useMemo(() => {
    if (!isOwner && activeFilter === 'sold') {
      return mergedBuyerSoldProducts;
    }
    return userProducts.filter((product) => (
      activeFilter === 'draft'
        ? product.status === 'draft' || product.status === 'archived'
        : product.status === activeFilter
    ));
  }, [isOwner, mergedBuyerSoldProducts, userProducts, activeFilter]);

  const visibleTransactions = useMemo(() => {
    if (txSubFilter === 'all') return internalTransactions;
    if (txSubFilter === 'completed') return internalTransactions.filter((t) => t.status === 'completed');
    if (txSubFilter === 'pending') return internalTransactions.filter((t) => t.status === 'pending' || t.status === 'delivered');
    if (txSubFilter === 'cancelled') return internalTransactions.filter((t) => t.status === 'cancelled');
    return internalTransactions;
  }, [internalTransactions, txSubFilter]);

  const currentFilters = isOwner ? ownerFilters : buyerFilters;

  useEffect(() => {
    if (!pickupLocations.length || initialPickup.current !== null) return;
    initialPickup.current = initialPickupLocation;
    const index = pickupLocations.findIndex((location) => location.id === initialPickupLocation);
    setPickupOrderOffset(Math.max(index, 0));
    setPickupIndex(0);
  }, [initialPickupLocation, pickupLocations]);

  const scrollPickupTo = (pageIndex) => {
    const track = pickupTrack.current;
    const page = pickupPages.current[pageIndex];
    if (track && page) track.scrollTo({ left: page.offsetLeft - track.offsetLeft, behavior: 'smooth' });
  };

  const handlePickupScroll = () => {
    const track = pickupTrack.current;
    if (!track || pickupPageCount < 2) return;
    setPickupIndex(Math.min(Math.round(track.scrollLeft / track.clientWidth), pickupPageCount - 1));
  };

  const selectPickup = (location) => {
    if (defaultPickupLocation === location.id) {
      const resetLocation = initialPickup.current || location.id;
      const resetIndex = Math.max(pickupLocations.findIndex((item) => item.id === resetLocation), 0);
      setPickupOrderOffset(resetIndex);
      setPickupIndex(0);
      scrollPickupTo(0);
      if (resetLocation !== location.id) onChangePickupLocation?.(resetLocation);
      return;
    }
    const selectedIndex = pickupLocations.findIndex((item) => item.id === location.id);
    setPickupOrderOffset(Math.max(selectedIndex, 0));
    setPickupIndex(0);
    onChangePickupLocation?.(location.id);
    scrollPickupTo(0);
  };

  // Status Change Execution from quick modal
  const handleExecuteStatusChange = async () => {
    if (!confirmModal.product) return;
    const { product, type } = confirmModal;
    setConfirmModal({ isOpen: false, type: null, product: null });
    setActionLoadingId(product.id);
    setActionFeedback(null);

    try {
      if (type === 'mark_sold') {
        if (onMarkAsSold) {
          await onMarkAsSold(product);
        } else if (onUpdateProductStatus) {
          await onUpdateProductStatus(product, 'sold');
        } else {
          await markProductAsSold(product.id, currentUser);
        }
        setActionFeedback({ type: 'success', message: `เปลี่ยนสถานะเป็น “ขายแล้ว” เรียบร้อยแล้ว (${product.title})` });
      } else {
        if (onUpdateProductStatus) {
          await onUpdateProductStatus(product, 'active');
        } else {
          await updateProductStatus(product.id, 'active', currentUser);
        }
        setActionFeedback({ type: 'success', message: `นำ “${product.title}” กลับมาเปิดขายแล้ว` });
      }

      // Re-fetch transactions to refresh summary
      if (currentUser?.id) {
        const updatedTx = await listSellerTransactions(currentUser.id);
        setInternalTransactions(updatedTx);
      }
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Update appointment status from AppointmentDetailModal
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

    if (supabase) {
      const { error: rpcError } = await supabase.rpc('update_pickup_appointment_status', {
        p_appointment_id: appointmentId,
        p_action: action,
      });
      if (rpcError) {
        const { error: directError } = await supabase
          .from('pickup_appointments')
          .update(updatePayload)
          .eq('id', appointmentId);
        if (directError) throw directError;
      }
    }

    // 3. การตัดสต็อกสินค้าและปรับสถานะเป็น 'sold' (เมื่อสินค้าหมด) ถูกจัดการแบบ atomic ใน RPC update_pickup_appointment_status แล้ว
    setInternalTransactions((prev) =>
      prev.map((item) => (item.id === appointmentId ? { ...item, status: nextStatus, rawStatus: nextStatus } : item))
    );
    if (selectedAppointment && selectedAppointment.id === appointmentId) {
      setSelectedAppointment((prev) => ({
        ...prev,
        status: nextStatus,
        rawStatus: nextStatus,
      }));
    }
    setActionFeedback({
      type: 'success',
      message: nextStatus === 'completed'
        ? 'ทำรายการสำเร็จ และระบบอัปเดตจำนวนสินค้าเรียบร้อยแล้ว'
        : 'อัปเดตสถานะนัดรับเรียบร้อยแล้ว',
    });
  };

  // Mark product as sold from AppointmentDetailModal
  const handleMarkSoldFromModal = async (appointment) => {
    const targetProduct = userProducts.find((p) => p.id === (appointment.productId || appointment.product_id));
    if (targetProduct) {
      if (onMarkAsSold) {
        await onMarkAsSold(targetProduct);
      } else {
        await markProductAsSold(targetProduct.id, currentUser);
      }
    } else {
      await markProductAsSold(appointment.productId || appointment.product_id, currentUser);
    }

    if (currentUser?.id) {
      const updatedTx = await listSellerTransactions(currentUser.id);
      setInternalTransactions(updatedTx);
    }
    if (selectedAppointment) {
      setSelectedAppointment((prev) => ({ ...prev, productStatus: 'sold' }));
    }
    setActionFeedback({ type: 'success', message: 'ปิดการขายสินค้าเรียบร้อยแล้ว' });
  };

  return (
    <div className="min-h-dvh w-full bg-[#f7f8fd] text-slate-800">
      <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              onClick={onBack}
              aria-label="ย้อนกลับ"
            >
              <ArrowLeft size={19} />
            </button>
            <h1 className="m-0 truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              {isOwner ? 'จัดการร้านค้า & โปรไฟล์ผู้ขาย' : `ร้านค้าของ ${displayName}`}
            </h1>
          </div>
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {isOwner ? 'บัญชีผู้ขาย' : 'ร้านค้า SPU'}
          </span>
        </div>
      </header>

      {/* Floating feedback alert */}
      <AppToast toast={actionFeedback} onClose={() => setActionFeedback(null)} />

      <div className="mx-auto grid w-full max-w-5xl min-w-0 gap-4 px-4 pt-4 pb-10 sm:px-6">
        {/* Profile Card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 border-t-4 border-t-[#d5117d] bg-white p-4 shadow-[0_3px_14px_rgba(37,49,77,0.03)] sm:p-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-14.5 w-14.5 shrink-0 items-center justify-center rounded-full border-[3px] border-[#f8d4e8] bg-[#fff0f7] text-lg font-extrabold text-[#a70b5d]">
              {avatarUrl && !avatarLoadFailed ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="absolute inset-0 block h-full w-full rounded-full object-cover object-center"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                initial
              )}
              {(currentUser?.verified ?? currentUser?.is_verified) && (
                <span
                  className="absolute -right-0.5 bottom-0 z-10 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-[#118963] text-white"
                  title="SPU Verified Student"
                >
                  <CheckCircle2 size={12} />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="m-0 flex max-w-full items-center gap-1.5 text-sm font-extrabold text-slate-800 sm:text-base">
                <span className="truncate">{displayName}</span>
              </h2>
              <div className="mt-0.5 flex flex-col gap-0.5 text-xs leading-snug text-slate-500">
                <span className="font-medium text-slate-600">
                  รหัสนักศึกษา {currentUser?.studentId || currentUser?.student_id || 'ไม่พบข้อมูล'}
                </span>
                <span>{String(currentUser?.faculty || 'มหาวิทยาลัยศรีปทุม').replace(/^คณะ(?!\s)/, 'คณะ ')}</span>
                {currentUser?.major && <span>สาขา {currentUser.major}</span>}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 items-center divide-x divide-slate-200/80 border-t border-slate-100 pt-3">
            <div className="grid grid-cols-[auto_auto] items-center justify-center gap-x-1 gap-y-0.5 px-2 text-center">
              <StarRating
                value={ratingMetrics.average ? 1 : 0}
                max={1}
                readOnly
                size="sm"
                className="flex items-center text-amber-500"
                label={ratingMetrics.average ? `คะแนน ${ratingMetrics.average.toFixed(1)} จาก 5` : 'ยังไม่มีคะแนน'}
              />
              <strong className="text-sm leading-tight font-extrabold text-amber-700 sm:text-base">
                {ratingMetrics.average ? ratingMetrics.average.toFixed(1) : '—'}
              </strong>
              <small className="col-span-full text-[11px] text-slate-500">
                {ratingMetrics.count} รีวิว
              </small>
            </div>
            <div className="grid justify-items-center gap-0.5 px-2 text-center">
              <strong className="text-sm leading-tight font-extrabold text-slate-800 sm:text-base">
                {isLoading ? '—' : `${punctuality.rate}%`}
              </strong>
              <small className="text-[11px] text-slate-500">นัดรับตรงเวลา</small>
            </div>
            <div className="grid justify-items-center gap-0.5 px-2 text-center">
              <strong className="text-sm leading-tight font-extrabold text-slate-800 sm:text-base">
                {isLoading ? '—' : soldCount}
              </strong>
              <small className="text-[11px] text-slate-500">รายการที่ขายแล้ว</small>
            </div>
          </div>
        </section>

        {/* ภาพรวมร้านค้า (แสดงเฉพาะเจ้าของร้านเท่านั้น - ซ่อนเมื่อผู้ซื้อดู) */}
        {isOwner && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#bf176e]">
                <CircleDollarSign size={18} />
                <h2 className="m-0 text-sm font-extrabold text-slate-800 sm:text-base">
                  ภาพรวมร้านค้า & สรุปยอดขาย
                </h2>
              </div>
            </div>
            <section className="flex min-h-28 items-center justify-between rounded-2xl bg-gradient-to-br from-[#df087c] to-[#a40059] p-4.5 text-white shadow-[0_8px_18px_rgba(173,7,85,0.17)] sm:p-5">
              <div className="grid gap-1">
                <span className="text-xs font-bold text-pink-100">ยอดขายรวมทั้งหมด</span>
                <strong className="text-2xl leading-tight font-extrabold sm:text-3xl">
                  {isLoading ? 'กำลังโหลด…' : formatPrice(soldValue)}
                </strong>
                <small className="inline-flex items-center gap-1.5 text-xs text-pink-100/90">
                  <PackageCheck size={14} className="shrink-0" />
                  {isLoading ? '—' : (
                    <span>
                      ส่งมอบสำเร็จ {salesSummary.completedCount} รายการ ({formatPrice(salesSummary.completedRevenue)})
                      {salesSummary.directSoldRevenue > 0 && ` · ปิดการขายโดยตรง ${salesSummary.directSoldProducts.length} ชิ้น (${formatPrice(salesSummary.directSoldRevenue)})`}
                    </span>
                  )}
                </small>
              </div>
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15">
                <CircleDollarSign size={28} />
              </div>
            </section>

            {salesSummary.pendingCount > 0 && (
              <div
                className="flex items-center justify-between gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 shadow-xs"
                role="status"
              >
                <Clock size={16} className="shrink-0 text-amber-600" />
                <span className="flex-1 leading-relaxed">
                  มี <strong>{salesSummary.pendingCount} รายการ</strong> อยู่ระหว่างรอนัดรับ/ส่งมอบ มูลค่ารวม{' '}
                  <strong>{formatPrice(salesSummary.pendingRevenue)}</strong>
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
                  onClick={() => {
                    setTxSubFilter('pending');
                    transactionsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  ดูรายการ
                </button>
              </div>
            )}

            <section className="grid grid-cols-3 gap-2.5 sm:gap-3.5" aria-label="สถิติร้านค้า">
              <article className="relative grid min-h-24 gap-1 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_3px_12px_rgba(37,49,77,0.03)] sm:p-4">
                <span className="pr-5 text-xs font-medium text-slate-500">สำเร็จ</span>
                <PackageCheck size={16} className="absolute top-3 right-3 text-emerald-600" />
                <strong className="text-xl leading-tight font-extrabold text-slate-800 sm:text-2xl">
                  {isLoading ? '—' : salesSummary.completedCount}
                </strong>
                <small className="text-[11px] text-slate-500">
                  {isLoading ? '—' : formatPrice(salesSummary.completedRevenue)}
                </small>
              </article>
              <article className="relative grid min-h-24 gap-1 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_3px_12px_rgba(37,49,77,0.03)] sm:p-4">
                <span className="pr-5 text-xs font-medium text-slate-500">รอนัดรับ</span>
                <Clock size={16} className="absolute top-3 right-3 text-[#bf176e]" />
                <strong className="text-xl leading-tight font-extrabold text-slate-800 sm:text-2xl">
                  {isLoading ? '—' : salesSummary.pendingCount}
                </strong>
                <small className="text-[11px] text-slate-500">
                  {isLoading ? '—' : formatPrice(salesSummary.pendingRevenue)}
                </small>
              </article>
              <article className="relative grid min-h-24 gap-1 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_3px_12px_rgba(37,49,77,0.03)] sm:p-4">
                <span className="pr-5 text-xs font-medium text-slate-500">กำลังขาย</span>
                <Store size={16} className="absolute top-3 right-3 text-amber-700" />
                <strong className="text-xl leading-tight font-extrabold text-slate-800 sm:text-2xl">
                  {isLoading ? '—' : activeCount}
                </strong>
                <small className="text-[11px] text-slate-500">รายการ</small>
              </article>
            </section>

            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ec0789] to-[#c00c71] text-sm font-extrabold text-white shadow-[0_6px_17px_rgba(214,16,125,0.21)] transition-all hover:brightness-105"
              onClick={onAddNewProduct}
            >
              <Plus size={19} /> เพิ่มสินค้าใหม่ลงขาย
            </button>
          </>
        )}

        {/* ส่วนธุรกรรมของฉัน (แยกเป็น Section ใหม่เฉพาะเจ้าของร้าน) */}
        {isOwner && (
          <section className="grid gap-3" ref={transactionsSectionRef}>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 text-[#bf176e]">
                <PackageCheck size={18} />
                <h2 className="m-0 text-sm font-extrabold text-slate-800 sm:text-base">
                  ธุรกรรมของฉัน
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                {isLoading ? 'กำลังโหลด…' : `${internalTransactions.length} รายการ`}
              </span>
            </div>

            {/* Subfilters for transactions */}
            <div className="scrollbar-none flex gap-1.5 overflow-x-auto py-1" aria-label="กรองประเภทธุรกรรม">
              <button
                type="button"
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  txSubFilter === 'all'
                    ? 'border-[#ec008c] bg-[#ec008c] text-white shadow-[0_2px_6px_rgba(236,0,140,0.25)]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setTxSubFilter('all')}
              >
                ทั้งหมด ({internalTransactions.length})
              </button>
              <button
                type="button"
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  txSubFilter === 'pending'
                    ? 'border-[#ec008c] bg-[#ec008c] text-white shadow-[0_2px_6px_rgba(236,0,140,0.25)]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setTxSubFilter('pending')}
              >
                รอนัดรับ ({salesSummary.pendingCount})
              </button>
              <button
                type="button"
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  txSubFilter === 'completed'
                    ? 'border-[#ec008c] bg-[#ec008c] text-white shadow-[0_2px_6px_rgba(236,0,140,0.25)]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setTxSubFilter('completed')}
              >
                สำเร็จแล้ว ({salesSummary.completedCount})
              </button>
              <button
                type="button"
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  txSubFilter === 'cancelled'
                    ? 'border-[#ec008c] bg-[#ec008c] text-white shadow-[0_2px_6px_rgba(236,0,140,0.25)]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setTxSubFilter('cancelled')}
              >
                ยกเลิก ({salesSummary.cancelledCount})
              </button>
            </div>

            {visibleTransactions.length ? (
              <div className="scrollbar-none max-h-[520px] overflow-y-auto py-0.5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {visibleTransactions.map((tx) => {
                  let badgeClasses = 'border-amber-300 bg-amber-50 text-amber-800';
                  let statusText = 'รอนัดรับ';
                  if (tx.status === 'completed') {
                    badgeClasses = 'border-emerald-300 bg-emerald-50 text-emerald-700';
                    statusText = 'สำเร็จแล้ว';
                  } else if (tx.status === 'delivered') {
                    badgeClasses = 'border-blue-200 bg-blue-50 text-blue-700';
                    statusText = 'ส่งมอบแล้ว (รอผู้ซื้อยืนยัน)';
                  } else if (tx.status === 'cancelled') {
                    badgeClasses = 'border-red-200 bg-red-50 text-red-600';
                    statusText = 'ยกเลิกแล้ว';
                  }

                  return (
                    <article
                      className="grid gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_3px_12px_rgba(37,49,77,0.04)]"
                      key={tx.id}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <Calendar size={13} />
                          <span>
                            {tx.scheduledAt
                              ? new Date(tx.scheduledAt).toLocaleString('th-TH', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                              : 'ไม่ระบุเวลา'}
                          </span>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badgeClasses}`}>
                          {statusText}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
                          {tx.image ? (
                            <img src={tx.image} alt={tx.productTitle} className="h-full w-full object-cover" />
                          ) : (
                            <Store size={20} />
                          )}
                        </div>
                        <div className="grid min-w-0 flex-1 gap-0.5">
                          <h4 className="m-0 truncate text-sm font-bold text-slate-800">{tx.productTitle}</h4>
                          <p className="m-0 flex items-baseline gap-1.5">
                            <strong className="text-sm font-extrabold text-[#c00c71]">
                              {formatPrice(tx.totalPrice)}
                            </strong>
                            {tx.quantity > 1 && (
                              <small className="text-xs text-slate-500">
                                ({formatPrice(tx.productPrice)} × {tx.quantity})
                              </small>
                            )}
                          </p>
                          <span className="flex items-center gap-1 truncate text-xs text-[#832766]">
                            <MapPin size={12} className="shrink-0" /> {tx.location}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <User size={13} />
                          <span>ผู้ซื้อ: <strong>{tx.buyerName}</strong></span>
                          {tx.buyerVerified && <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />}
                          {tx.buyerContact && <small className="text-xs text-slate-500">· {tx.buyerContact}</small>}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-[0_3px_10px_rgba(29,78,216,0.14)] transition-colors hover:bg-blue-100"
                            onClick={() => {
                              setSelectedAppointment({
                                ...tx,
                                title: tx.title || tx.productTitle,
                                price: tx.price || tx.totalPrice,
                                unitPrice: tx.unitPrice || tx.productPrice,
                                partnerName: tx.buyerName,
                                partnerContact: tx.buyerContact,
                                partnerVerified: tx.buyerVerified,
                              });
                            }}
                          >
                            <PackageCheck size={14} />
                            <span>จัดการสินค้า</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
                </div>
              </div>
            ) : (
              <div className="grid justify-items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-8 text-center text-xs text-slate-500">
                <ShoppingBag size={24} />
                <strong className="text-sm text-slate-700">ยังไม่มีรายการธุรกรรมในหมวดนี้</strong>
                <span>เมื่อมีผู้ซื้อทำการนัดรับสินค้า รายการจะปรากฏและอัปเดตสถานะที่นี่</span>
              </div>
            )}
          </section>
        )}

        {/* คลังสินค้าของร้าน */}
        <section className="grid min-w-0 gap-3">
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 text-[#bf176e]">
              <Store size={18} />
              <h2 className="m-0 text-sm font-extrabold text-slate-800 sm:text-base">
                {isOwner ? 'คลังสินค้าของฉัน' : 'สินค้าทั้งหมดของร้าน'}
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              {isLoading ? 'กำลังโหลด…' : `${userProducts.length} รายการ`}
            </span>
          </div>

          {/* แท็บคลังสินค้า */}
          <div
            className="scrollbar-none flex justify-start gap-3.5 overflow-x-auto border-b border-slate-200/80"
            role="tablist"
            aria-label="กรองสถานะสินค้า"
          >
            {currentFilters.map((filter) => {
              const count = isLoading
                ? '—'
                : !isOwner && filter.id === 'sold'
                ? mergedBuyerSoldProducts.length
                : userProducts.filter((product) => product.status === filter.id).length;
              const isActive = activeFilter === filter.id;
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2 py-2.5 text-xs transition-colors ${
                    isActive
                      ? 'border-[#db1280] font-extrabold text-[#c00b70]'
                      : 'border-transparent font-medium text-slate-500 hover:text-slate-800'
                  }`}
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                  <span
                    className={`min-w-4.5 rounded-full px-1.5 py-0.5 text-[11px] ${
                      isActive ? 'bg-pink-100 text-[#d20d78]' : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
              {error}
            </p>
          )}

          {isLoading ? (
            <div className="grid justify-items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-8 text-center text-xs text-slate-500">
              กำลังโหลดข้อมูล...
            </div>
          ) : visibleProducts.length ? (
            /* Products List View */
            <div
              className={
                isOwner ? 'scrollbar-none -mx-1 max-h-[500px] overflow-y-auto px-1 py-1' : 'py-0.5'
              }
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {visibleProducts.map((product) => {
                const expiry = product.status === 'trash' ? trashExpiry(product.trashedAt) : null;
                const statusBadgeMap = {
                  sold: 'bg-purple-600',
                  draft: 'bg-slate-500',
                  archived: 'bg-slate-600',
                  trash: 'bg-slate-500',
                };
                const statusBadgeBg = statusBadgeMap[product.status] || 'bg-[#13865f]';
                return (
                  <article
                    className={`flex min-w-0 items-start gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_3px_12px_rgba(37,49,77,0.03)] ${
                      !isOwner
                        ? 'cursor-pointer transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
                        : ''
                    }`}
                    key={product.id}
                    onClick={() => {
                      if (!isOwner) {
                        onSelectProduct?.(
                          product.productId ? { ...product, id: product.productId } : product
                        );
                      }
                    }}
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-24">
                      {product.image ? (
                        <img src={product.image} alt={product.title} className="block h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center gap-1 bg-slate-100 text-center text-slate-400">
                          <Store size={20} />
                          <span className="text-[10px]">ไม่มีรูปสินค้า</span>
                        </div>
                      )}
                      <span
                        className={`absolute top-1 left-1 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold text-white ${statusBadgeBg}`}
                      >
                        {statusLabels[product.status] || product.status}
                      </span>
                    </div>

                    <div className="grid min-w-0 flex-1 gap-1 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="m-0 line-clamp-2 text-xs leading-snug font-bold text-slate-800 sm:text-sm">
                          {product.title}
                        </h3>
                        <span className="inline-flex max-w-[46%] shrink-0 items-center gap-1 truncate text-right text-[11px] font-semibold text-[#a20f63]">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{product.location || 'ไม่ระบุจุดนัดรับ'}</span>
                        </span>
                      </div>

                      <div className="flex items-center">
                        <strong className="text-sm font-extrabold text-[#c00c71] sm:text-base">
                          {formatPrice(product.price)}
                        </strong>
                      </div>

                      <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                          {product.categoryName || product.category || 'ไม่ระบุหมวดหมู่'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                          จำนวน {product.quantity ?? 1} ชิ้น
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                          ลงขาย {product.createdAt ? new Date(product.createdAt).toLocaleDateString('th-TH') : '—'}
                        </span>
                      </div>
                      {expiry && (
                        <p className={`m-0 text-[11px] font-bold ${expiry.expired ? 'text-red-700' : 'text-amber-700'}`}>
                          {expiry.text}
                        </p>
                      )}

                      {/* แสดงปุ่มจัดการเฉพาะเจ้าของร้าน */}
                      {isOwner ? (
                        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-1.5">
                          {product.status === 'trash' ? (
                            <button
                              type="button"
                              className="inline-flex min-h-7 items-center justify-center gap-1 rounded-lg border border-pink-200 bg-pink-50/70 px-2.5 text-[11px] font-bold text-[#b70e69] disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={expiry.expired}
                              onClick={(e) => {
                                e.stopPropagation();
                                onRestoreProduct?.(product);
                              }}
                            >
                              <RotateCcw size={13} /> กู้คืนสินค้า
                            </button>
                          ) : (
                            <>
                              {product.status === 'sold' && (
                                <button
                                  type="button"
                                  className="inline-flex min-h-7 items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                                  disabled={actionLoadingId === product.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmModal({ isOpen: true, type: 'relist', product });
                                  }}
                                  title="นำกลับมาขายใหม่ (เปลี่ยนสถานะเป็นกำลังขาย)"
                                >
                                  <RotateCcw size={13} /> ขายใหม่
                                </button>
                              )}

                              <button
                                type="button"
                                className="inline-flex min-h-7 items-center justify-center gap-1 rounded-lg border border-pink-200 bg-pink-50/70 px-2.5 text-[11px] font-bold text-[#b70e69] transition-colors hover:bg-pink-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditProduct?.(product);
                                }}
                              >
                                <Edit3 size={13} /> แก้ไข
                              </button>
                              <button
                                type="button"
                                className="inline-flex min-h-7 items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50/60 px-2.5 text-[11px] font-bold text-red-700 transition-colors hover:bg-red-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteProduct?.(product);
                                }}
                              >
                                <Trash2 size={13} /> ย้ายไปถังขยะ
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 flex justify-end">
                          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-[#ec008c]">
                            ดูรายละเอียด <ChevronRight size={13} />
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
              </div>
            </div>
          ) : (
            <div className="grid justify-items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-8 text-center text-xs text-slate-500">
              <Store size={24} />
              <strong className="text-sm text-slate-700">
                {userProducts.length
                  ? `ยังไม่มีสินค้า${statusLabels[activeFilter] || ''}`
                  : 'ยังไม่มีสินค้าในร้าน'}
              </strong>
              <span>
                {isOwner
                  ? 'เริ่มลงขายและจัดการสินค้าของคุณได้ที่นี่'
                  : 'ผู้ขายรายนี้ยังไม่มีสินค้าในหมวดหมู่นี้'}
              </span>
              {isOwner && (
                <button
                  type="button"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-extrabold text-[#bf176e] hover:underline"
                  onClick={onAddNewProduct}
                >
                  <Plus size={16} /> เพิ่มสินค้าใหม่
                </button>
              )}
            </div>
          )}
        </section>

        {/* จุดนัดรับประจำร้าน (เฉพาะเจ้าของร้านที่สามารถตั้งค่าได้) */}
        {isOwner && (
          <section className="grid gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_3px_14px_rgba(37,49,77,0.03)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#bf176e]">
                <MapPin size={18} />
                <h2 className="m-0 text-sm font-extrabold text-slate-800 sm:text-base">
                  จุดนัดรับประจำร้าน
                </h2>
              </div>
              <span className="text-xs text-slate-500">เปลี่ยนได้</span>
            </div>
            {pickupLocations.length ? (
              <>
                <div
                  className="scrollbar-none snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
                  ref={pickupTrack}
                  onScroll={handlePickupScroll}
                >
                  <div className="flex w-full">
                    {Array.from({ length: pickupPageCount }, (_, pageIndex) => (
                      <div
                        className="grid w-full flex-[0_0_100%] snap-start grid-cols-2 grid-rows-[repeat(2,minmax(62px,auto))] gap-2 p-0.5"
                        key={`pickup-page-${pageIndex}`}
                        ref={(node) => { pickupPages.current[pageIndex] = node; }}
                      >
                        {orderedPickupLocations.slice(pageIndex * 4, pageIndex * 4 + 4).map((location) => {
                          const isSelected = defaultPickupLocation === location.id;
                          return (
                            <button
                              key={location.id}
                              type="button"
                              className={`flex min-h-15.5 min-w-0 items-center gap-2 rounded-xl border p-2.5 text-left transition-colors ${
                                isSelected
                                  ? 'border-emerald-300 bg-emerald-50/70 text-emerald-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100/70'
                              }`}
                              aria-pressed={isSelected}
                              onClick={() => selectPickup(location)}
                            >
                              <Building2 size={17} className="shrink-0" />
                              <span
                                className={`min-w-0 flex-1 text-xs leading-snug ${
                                  isSelected ? 'font-semibold text-emerald-900' : 'text-slate-700'
                                }`}
                              >
                                {location.name}
                                {location.isPopular && (
                                  <small className="mt-0.5 block text-[10px] text-slate-500">
                                    จุดนัดรับยอดนิยม
                                  </small>
                                )}
                              </span>
                              {isSelected && <Check size={16} className="shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                {pickupPageCount > 1 && (
                  <div
                    className="flex items-center justify-center pt-1"
                    aria-label="ตัวบอกตำแหน่งชุดจุดนัดรับ"
                  >
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: pickupPageCount }, (_, index) => (
                        <button
                          key={index}
                          type="button"
                          aria-label={`ไปชุดจุดนัดรับ ${index + 1}`}
                          className={`h-1.5 rounded-full transition-all ${
                            pickupIndex === index ? 'w-4.5 bg-[#d10e78]' : 'w-1.5 bg-slate-300'
                          }`}
                          onClick={() => {
                            setPickupIndex(index);
                            scrollPickupTo(index);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
                {isLoading ? 'กำลังโหลดจุดนัดรับ...' : 'ไม่พบจุดนัดรับในฐานข้อมูล'}
              </p>
            )}
          </section>
        )}
      </div>

      {/* 3. Modal ยืนยันปิดการขาย / เปิดขายใหม่ */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-[modalFadeIn_0.18s_cubic-bezier(0.16,1,0.3,1)]"
          onClick={() => setConfirmModal({ isOpen: false, type: null, product: null })}
        >
          <div
            className="grid w-full max-w-sm gap-3.5 rounded-2xl bg-white p-5 shadow-2xl animate-[modalScaleUp_0.2s_cubic-bezier(0.16,1,0.3,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  confirmModal.type === 'mark_sold'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {confirmModal.type === 'mark_sold' ? <CheckCircle2 size={24} /> : <RotateCcw size={24} />}
              </div>
              <h3 className="m-0 text-base font-extrabold text-slate-800">
                {confirmModal.type === 'mark_sold' ? 'ปิดการขายสินค้า' : 'นำกลับมาขายใหม่'}
              </h3>
            </div>
            <div className="grid gap-1.5 text-center">
              <p className="m-0 text-xs leading-relaxed text-slate-700 sm:text-sm">
                {confirmModal.type === 'mark_sold'
                  ? `ต้องการเปลี่ยนสถานะ “${confirmModal.product?.title}” เป็นขายแล้วหรือไม่?`
                  : `ต้องการเปิดขาย “${confirmModal.product?.title}” อีกครั้งหรือไม่?`}
              </p>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 sm:text-sm"
                onClick={() => setConfirmModal({ isOpen: false, type: null, product: null })}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className={`rounded-xl py-2.5 text-xs font-bold text-white transition-all hover:-translate-y-0.5 hover:opacity-95 sm:text-sm ${
                  confirmModal.type === 'mark_sold'
                    ? 'bg-gradient-to-br from-[#7b2cbf] to-[#9d4edd] shadow-[0_4px_12px_rgba(123,44,191,0.3)]'
                    : 'bg-gradient-to-br from-[#0e875a] to-[#16a34a] shadow-[0_4px_12px_rgba(14,135,90,0.3)]'
                }`}
                onClick={handleExecuteStatusChange}
              >
                {confirmModal.type === 'mark_sold' ? 'ยืนยัน' : 'ยืนยันเปิดขาย'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal จัดการสินค้าและนัดรับ */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          currentUser={currentUser}
          onClose={() => setSelectedAppointment(null)}
          onOpenChat={onOpenChat}
          onUpdateStatus={handleUpdateAppointmentStatus}
          onMarkProductSold={handleMarkSoldFromModal}
          onReviewSubmitted={() => {
            if (currentUser?.id) {
              void listSellerReviewSummary(currentUser.id).then((summary) => {
                setInternalReviewSummary(summary);
              });
            }
          }}
        />
      )}
    </div>
  );
}

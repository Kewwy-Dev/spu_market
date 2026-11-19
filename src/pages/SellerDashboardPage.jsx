import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  AlertCircle,
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
  const soldCount = salesSummary.soldCount;
  const trashCount = salesSummary.trashCount;
  const draftCount = salesSummary.draftCount;
  const soldValue = salesSummary.totalRealizedSales;

  const visibleProducts = useMemo(() => {
    return userProducts.filter((product) => (
      activeFilter === 'draft'
        ? product.status === 'draft' || product.status === 'archived'
        : product.status === activeFilter
    ));
  }, [userProducts, activeFilter]);

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
    <div className="seller-store-page stitch-seller-page">
      <header className="stitch-market-header">
        <div className="stitch-seller-header-main">
          <button
            type="button"
            className="chat-list-back-btn"
            onClick={onBack}
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="stitch-seller-header-title">
            {isOwner ? 'จัดการร้านค้า & โปรไฟล์ผู้ขาย' : `ร้านค้าของ ${displayName}`}
          </span>
        </div>
        <span className="stitch-account-label">
          {isOwner ? 'บัญชีผู้ขาย' : 'ร้านค้า SPU'}
        </span>
      </header>

      {/* Floating feedback alert */}
      {actionFeedback && (
        <div className={`stitch-feedback-toast ${actionFeedback.type}`} role="alert">
          {actionFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{actionFeedback.message}</span>
          <button type="button" onClick={() => setActionFeedback(null)} aria-label="ปิด">✕</button>
        </div>
      )}

      <main className="stitch-seller-content">
        {/* Profile Card */}
        <section className="stitch-seller-profile-card">
          <div className="stitch-seller-identity">
            <div className="stitch-seller-avatar">
              {avatarUrl && !avatarLoadFailed ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="stitch-seller-avatar-img"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                initial
              )}
              {(currentUser?.verified ?? currentUser?.is_verified) && (
                <span title="SPU Verified Student">
                  <CheckCircle2 size={14} className="profile-verified-icon" />
                </span>
              )}
            </div>
            <div className="stitch-seller-copy">
              <h2><span>{displayName}</span></h2>
              <p>
                <span className="stitch-private-id">
                  ▣ รหัสนักศึกษา {currentUser?.studentId || currentUser?.student_id || 'ไม่พบข้อมูล'}
                </span>
                {currentUser?.faculty ? ` · ${currentUser.faculty}` : ''}
                {currentUser?.major ? ` (${currentUser.major})` : ''}
              </p>
            </div>
          </div>
          <div className="stitch-seller-summary">
            <div className="stitch-seller-metric stitch-rating-metric">
              <StarRating
                value={ratingMetrics.average ? 1 : 0}
                max={1}
                readOnly
                size="sm"
                className="stitch-stars"
                label={ratingMetrics.average ? `คะแนน ${ratingMetrics.average.toFixed(1)} จาก 5` : 'ยังไม่มีคะแนน'}
              />
              <strong>{ratingMetrics.average ? ratingMetrics.average.toFixed(1) : '—'}</strong>
              <small>{ratingMetrics.count} รีวิว</small>
            </div>
            <div className="stitch-seller-metric">
              <strong>{isLoading ? '—' : `${punctuality.rate}%`}</strong>
              <small>นัดรับตรงเวลา</small>
            </div>
            <div className="stitch-seller-metric">
              <strong>{isLoading ? '—' : soldCount}</strong>
              <small>ชิ้นที่ขายแล้ว</small>
            </div>
          </div>
        </section>

        {/* ภาพรวมร้านค้า (แสดงเฉพาะเจ้าของร้านเท่านั้น - ซ่อนเมื่อผู้ซื้อดู) */}
        {isOwner && (
          <>
            <div className="stitch-section-title">
              <div><CircleDollarSign size={18} /><h2>ภาพรวมร้านค้า & สรุปยอดขาย</h2></div>
              <span>สัมพันธ์กับธุรกรรมจริง</span>
            </div>
            <section className="stitch-sales-card">
              <div className="stitch-sales-copy">
                <span>ยอดขายรวมทั้งหมด</span>
                <strong>{isLoading ? 'กำลังโหลด…' : formatPrice(soldValue)}</strong>
                <small>
                  <PackageCheck size={13} />
                  {isLoading ? '—' : (
                    <>
                      ธุรกรรมสำเร็จ {salesSummary.completedCount} รายการ ({formatPrice(salesSummary.completedRevenue)})
                      {salesSummary.directSoldRevenue > 0 && ` · ปิดการขายโดยตรง ${salesSummary.directSoldProducts.length} ชิ้น (${formatPrice(salesSummary.directSoldRevenue)})`}
                    </>
                  )}
                </small>
              </div>
              <div className="stitch-sales-icon"><CircleDollarSign size={29} /></div>
            </section>

            {salesSummary.pendingCount > 0 && (
              <div className="stitch-pending-alert-banner" role="status">
                <Clock size={16} />
                <span>
                  มี <strong>{salesSummary.pendingCount} รายการ</strong> อยู่ระหว่างรอนัดรับ/ส่งมอบ มูลค่ารวม <strong>{formatPrice(salesSummary.pendingRevenue)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTxSubFilter('pending');
                    transactionsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  ดูรายการ
                </button>
              </div>
            )}

            <section className="stitch-stat-grid" aria-label="สถิติร้านค้า">
              <article>
                <span>ธุรกรรมสำเร็จ</span>
                <PackageCheck size={16} />
                <strong>{isLoading ? '—' : salesSummary.completedCount}</strong>
                <small>{isLoading ? '—' : formatPrice(salesSummary.completedRevenue)}</small>
              </article>
              <article>
                <span>รอนัดรับ/ส่งมอบ</span>
                <Clock size={16} />
                <strong>{isLoading ? '—' : salesSummary.pendingCount}</strong>
                <small>{isLoading ? '—' : formatPrice(salesSummary.pendingRevenue)}</small>
              </article>
              <article>
                <span>กำลังเปิดขาย</span>
                <Store size={16} />
                <strong>{isLoading ? '—' : activeCount}</strong>
                <small>รายการ</small>
              </article>
            </section>

            <button type="button" className="stitch-primary-cta" onClick={onAddNewProduct}>
              <Plus size={19} /> เพิ่มสินค้าใหม่ลงขาย
            </button>
          </>
        )}

        {/* ส่วนธุรกรรมของฉัน (แยกเป็น Section ใหม่เฉพาะเจ้าของร้าน) */}
        {isOwner && (
          <section className="stitch-transactions-section" ref={transactionsSectionRef}>
            <div className="stitch-section-title stitch-transactions-title">
              <div>
                <PackageCheck size={18} />
                <h2>ธุรกรรมของฉัน</h2>
              </div>
              <span>
                {isLoading ? 'กำลังโหลด…' : `${internalTransactions.length} รายการ`}
              </span>
            </div>

            {/* Subfilters for transactions */}
            <div className="stitch-tx-subfilters" aria-label="กรองประเภทธุรกรรม">
              <button
                type="button"
                className={txSubFilter === 'all' ? 'active' : ''}
                onClick={() => setTxSubFilter('all')}
              >
                ทั้งหมด ({internalTransactions.length})
              </button>
              <button
                type="button"
                className={txSubFilter === 'pending' ? 'active' : ''}
                onClick={() => setTxSubFilter('pending')}
              >
                รอนัดรับ/ส่งมอบ ({salesSummary.pendingCount})
              </button>
              <button
                type="button"
                className={txSubFilter === 'completed' ? 'active' : ''}
                onClick={() => setTxSubFilter('completed')}
              >
                สำเร็จแล้ว ({salesSummary.completedCount})
              </button>
              <button
                type="button"
                className={txSubFilter === 'cancelled' ? 'active' : ''}
                onClick={() => setTxSubFilter('cancelled')}
              >
                ยกเลิก ({salesSummary.cancelledCount})
              </button>
            </div>

            {visibleTransactions.length ? (
              <div className="stitch-transaction-list">
                {visibleTransactions.map((tx) => {
                  let statusBadgeClass = 'pending';
                  let statusText = 'รอนัดรับ';
                  if (tx.status === 'completed') {
                    statusBadgeClass = 'completed';
                    statusText = 'สำเร็จแล้ว';
                  } else if (tx.status === 'delivered') {
                    statusBadgeClass = 'delivered';
                    statusText = 'ส่งมอบแล้ว (รอผู้ซื้อยืนยัน)';
                  } else if (tx.status === 'cancelled') {
                    statusBadgeClass = 'cancelled';
                    statusText = 'ยกเลิกแล้ว';
                  }

                  return (
                    <article className="stitch-transaction-card" key={tx.id}>
                      <div className="stitch-tx-header">
                        <div className="stitch-tx-time">
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
                        <span className={`stitch-tx-badge ${statusBadgeClass}`}>
                          {statusText}
                        </span>
                      </div>

                      <div className="stitch-tx-product-row">
                        <div className="stitch-tx-thumb">
                          {tx.image ? (
                            <img src={tx.image} alt={tx.productTitle} />
                          ) : (
                            <Store size={20} />
                          )}
                        </div>
                        <div className="stitch-tx-info">
                          <h4>{tx.productTitle}</h4>
                          <p className="stitch-tx-pricing">
                            <strong>{formatPrice(tx.totalPrice)}</strong>
                            {tx.quantity > 1 && (
                              <small>({formatPrice(tx.productPrice)} × {tx.quantity})</small>
                            )}
                          </p>
                          <span className="stitch-tx-location">
                            <MapPin size={12} /> {tx.location}
                          </span>
                        </div>
                      </div>

                      <div className="stitch-tx-buyer-row">
                        <div className="stitch-tx-buyer-info">
                          <User size={13} />
                          <span>ผู้ซื้อ: <strong>{tx.buyerName}</strong></span>
                          {tx.buyerVerified && <CheckCircle2 size={14} className="profile-verified-icon" />}
                          {tx.buyerContact && <small>· {tx.buyerContact}</small>}
                        </div>

                        <div className="stitch-tx-actions">
                          {/* 2. ลบปุ่ม stitch-tx-chat-btn ออกตามคำขอ */}
                          {/* 4. ปุ่มสไตล์ appointment-btn-delivered เปลี่ยนชื่อเป็น "จัดการสินค้า" เมื่อกดแล้วเรียก Modal */}
                          <button
                            type="button"
                            className="appointment-btn-delivered stitch-tx-manage-btn"
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
            ) : (
              <div className="stitch-empty-state">
                <ShoppingBag size={24} />
                <strong>ยังไม่มีรายการธุรกรรมในหมวดนี้</strong>
                <span>เมื่อมีผู้ซื้อทำการนัดรับสินค้า รายการจะปรากฏและอัปเดตสถานะที่นี่</span>
              </div>
            )}
          </section>
        )}

        {/* คลังสินค้าของร้าน */}
        <section className="stitch-inventory-section">
          <div className="stitch-section-title stitch-inventory-title">
            <div>
              <Store size={18} />
              <h2>{isOwner ? 'คลังสินค้าของฉัน' : 'สินค้าทั้งหมดของร้าน'}</h2>
            </div>
            <span>
              {isLoading ? 'กำลังโหลด…' : `${userProducts.length} รายการ`}
            </span>
          </div>

          {/* แท็บคลังสินค้า: ซ่อน Scroll bar (เลื่อนแนวนอนได้ปกติ) ครบทั้ง 4 แถบ: กำลังขาย, ขายแล้ว, ฉบับร่าง, ถังขยะ */}
          <div className="stitch-product-tabs" role="tablist" aria-label="กรองสถานะสินค้า">
            {currentFilters.map((filter) => {
              const count = isLoading
                ? '—'
                : userProducts.filter((product) => product.status === filter.id).length;
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === filter.id}
                  className={activeFilter === filter.id ? 'active' : ''}
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                  <span>{count}</span>
                </button>
              );
            })}
          </div>

          {error && <p className="seller-store-error" role="alert">{error}</p>}

          {isLoading ? (
            <div className="stitch-empty-state">กำลังโหลดข้อมูล...</div>
          ) : visibleProducts.length ? (
            /* Products List View */
            <div className="stitch-inventory-list">
              {visibleProducts.map((product) => {
                const expiry = product.status === 'trash' ? trashExpiry(product.trashedAt) : null;
                return (
                  <article
                    className={`stitch-inventory-card ${!isOwner ? 'stitch-buyer-card' : ''}`}
                    key={product.id}
                    onClick={() => {
                      if (!isOwner) onSelectProduct?.(product);
                    }}
                    style={!isOwner ? { cursor: 'pointer' } : undefined}
                  >
                    <div className="stitch-inventory-image-wrap">
                      {product.image ? (
                        <img src={product.image} alt={product.title} />
                      ) : (
                        <div className="stitch-no-product-image">
                          <Store size={21} />
                          <span>ไม่มีรูปสินค้า</span>
                        </div>
                      )}
                      <span className={`stitch-product-status ${product.status}`}>
                        {statusLabels[product.status] || product.status}
                      </span>
                    </div>

                    <div className="stitch-inventory-main">
                      {/* 2. สลับตำแหน่งของ ราคา กับ Pickup location: location ขึ้นไปอยู่บนแถวเดียวกับ title และราคาลงมาอยู่ด้านล่าง */}
                      <div className="stitch-inventory-heading">
                        <h3>{product.title}</h3>
                        <span className="stitch-inventory-location">
                          <MapPin size={12} /> {product.location || 'ไม่ระบุจุดนัดรับ'}
                        </span>
                      </div>

                      <div className="stitch-inventory-price-row">
                        <strong>{formatPrice(product.price)}</strong>
                      </div>

                      <div className="stitch-inventory-meta">
                        <span>{product.categoryName || product.category || 'ไม่ระบุหมวดหมู่'}</span>
                        <span>จำนวน {product.quantity ?? 1} ชิ้น</span>
                        <span>
                          ลงขาย {product.createdAt ? new Date(product.createdAt).toLocaleDateString('th-TH') : '—'}
                        </span>
                      </div>
                      {expiry && (
                        <p className={`stitch-trash-expiry ${expiry.expired ? 'expired' : ''}`}>
                          {expiry.text}
                        </p>
                      )}

                      {/* แสดงปุ่มจัดการเฉพาะเจ้าของร้าน */}
                      {isOwner ? (
                        <div className="stitch-inventory-actions">
                          {product.status === 'trash' ? (
                            <button
                              type="button"
                              disabled={expiry.expired}
                              onClick={(e) => {
                                e.stopPropagation();
                                onRestoreProduct?.(product);
                              }}
                            >
                              <RotateCcw size={14} /> กู้คืนสินค้า
                            </button>
                          ) : (
                            <>
                              {/* 4. ลบปุ่ม stitch-action-sold ออกตามคำขอ เพราะจะจัดการการปิดการขายผ่านธุรกรรมนัดรับ */}

                              {/* Action นำกลับมาขายใหม่เมื่อสินค้าอยู่ในสถานะขายแล้ว */}
                              {product.status === 'sold' && (
                                <button
                                  type="button"
                                  className="stitch-action-relist"
                                  disabled={actionLoadingId === product.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmModal({ isOpen: true, type: 'relist', product });
                                  }}
                                  title="นำกลับมาขายใหม่ (เปลี่ยนสถานะเป็นกำลังขาย)"
                                >
                                  <RotateCcw size={14} /> ขายใหม่
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditProduct?.(product);
                                }}
                              >
                                <Edit3 size={14} /> แก้ไข
                              </button>
                              <button
                                type="button"
                                className="delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteProduct?.(product);
                                }}
                              >
                                <Trash2 size={14} /> ย้ายไปถังขยะ
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="stitch-buyer-action-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--spu-pink, #ec008c)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            ดูรายละเอียด <ChevronRight size={13} />
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="stitch-empty-state">
              <Store size={24} />
              <strong>
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
                <button type="button" onClick={onAddNewProduct}>
                  <Plus size={16} /> เพิ่มสินค้าใหม่
                </button>
              )}
            </div>
          )}
        </section>

        {/* จุดนัดรับประจำร้าน (เฉพาะเจ้าของร้านที่สามารถตั้งค่าได้) */}
        {isOwner && (
          <section className="stitch-pickup-card">
            <div className="stitch-section-title">
              <div><MapPin size={18} /><h2>จุดนัดรับประจำร้าน</h2></div>
              <span>เปลี่ยนได้</span>
            </div>
            <p>เลือกจุดหลักสำหรับสินค้าที่กำลังขายอยู่ ระบบจะอัปเดตตำแหน่งให้สินค้าที่ยังเปิดขายทั้งหมด</p>
            {pickupLocations.length ? (
              <>
                <div className="stitch-pickup-carousel" ref={pickupTrack} onScroll={handlePickupScroll}>
                  <div className="stitch-pickup-pages">
                    {Array.from({ length: pickupPageCount }, (_, pageIndex) => (
                      <div
                        className="stitch-pickup-page"
                        key={`pickup-page-${pageIndex}`}
                        ref={(node) => { pickupPages.current[pageIndex] = node; }}
                      >
                        {orderedPickupLocations.slice(pageIndex * 4, pageIndex * 4 + 4).map((location) => (
                          <button
                            key={location.id}
                            type="button"
                            className={defaultPickupLocation === location.id ? 'selected' : ''}
                            aria-pressed={defaultPickupLocation === location.id}
                            onClick={() => selectPickup(location)}
                          >
                            <Building2 size={17} />
                            <span>
                              {location.name}
                              {location.isPopular && <small>จุดนัดรับยอดนิยม</small>}
                            </span>
                            {defaultPickupLocation === location.id && <Check size={16} />}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                {pickupPageCount > 1 && (
                  <div className="stitch-pickup-index" aria-label={`Index ${pickupIndex} จาก ${pickupPageCount - 1}`}>
                    <span>Index {pickupIndex}</span>
                    <div>
                      {Array.from({ length: pickupPageCount }, (_, index) => (
                        <button
                          key={index}
                          type="button"
                          aria-label={`ไปชุดจุดนัดรับ ${index + 1}`}
                          className={pickupIndex === index ? 'active' : ''}
                          onClick={() => {
                            setPickupIndex(index);
                            scrollPickupTo(index);
                          }}
                        />
                      ))}
                    </div>
                    <span>{pickupPageCount - 1}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="stitch-location-empty">
                {isLoading ? 'กำลังโหลดจุดนัดรับ...' : 'ไม่พบจุดนัดรับในฐานข้อมูล'}
              </p>
            )}
          </section>
        )}

        <p className="stitch-security-note">
          <CheckCircle2 size={14} className="profile-verified-icon" /> ข้อมูลร้านค้าเชื่อมกับบัญชีนักศึกษา SPU
        </p>
      </main>

      {/* 3. ในส่วน stitch-modal-content: ข้อความกระชับ เข้าใจง่าย */}
      {confirmModal.isOpen && (
        <div
          className="stitch-modal-backdrop"
          onClick={() => setConfirmModal({ isOpen: false, type: null, product: null })}
        >
          <div className="stitch-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="stitch-modal-header">
              <div className={`stitch-modal-icon ${confirmModal.type === 'mark_sold' ? 'sold-icon' : 'relist-icon'}`}>
                {confirmModal.type === 'mark_sold' ? <CheckCircle2 size={24} /> : <RotateCcw size={24} />}
              </div>
              <h3>{confirmModal.type === 'mark_sold' ? 'ปิดการขายสินค้า' : 'นำกลับมาขายใหม่'}</h3>
            </div>
            <div className="stitch-modal-body">
              <p>
                {confirmModal.type === 'mark_sold'
                  ? `ต้องการเปลี่ยนสถานะ “${confirmModal.product?.title}” เป็นขายแล้วหรือไม่?`
                  : `ต้องการเปิดขาย “${confirmModal.product?.title}” อีกครั้งหรือไม่?`}
              </p>
            </div>
            <div className="stitch-modal-actions">
              <button
                type="button"
                className="stitch-btn-cancel"
                onClick={() => setConfirmModal({ isOpen: false, type: null, product: null })}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className={`stitch-btn-confirm ${confirmModal.type === 'mark_sold' ? 'sold-btn' : 'relist-btn'}`}
                onClick={handleExecuteStatusChange}
              >
                {confirmModal.type === 'mark_sold' ? 'ยืนยัน' : 'ยืนยันเปิดขาย'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal จัดการสินค้าและนัดรับ เชื่อมต่อข้อมูลร่วมกับ AppointmentDetailModal */}
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

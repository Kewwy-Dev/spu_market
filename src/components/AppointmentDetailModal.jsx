import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Star,
  Store,
  User,
  X,
  XCircle,
  AlertTriangle,
  Send,
  Lock,
} from 'lucide-react';
import { StarRating } from './spectrumui/star-rating';
import { getBuyerProductReview, submitSellerReview } from '../lib/marketplace';

const formatThaiDate = (dateString) => {
  if (!dateString) return 'ไม่ระบุเวลา';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'ไม่ระบุเวลา';
    return new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  } catch {
    return dateString;
  }
};

const formatPrice = (price) => `฿${Number(price || 0).toLocaleString('th-TH')}`;

const RATING_LABELS = {
  1: 'ควรปรับปรุง',
  2: 'พอใช้',
  3: 'ปานกลาง',
  4: 'ดี',
  5: 'ดีมาก',
};

export default function AppointmentDetailModal({
  appointment,
  currentUser,
  onClose,
  onOpenChat,
  onUpdateStatus,
  onMarkProductSold,
  onReviewSubmitted,
}) {
  const [confirmingAction, setConfirmingAction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [existingReview, setExistingReview] = useState(null);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [ratingSuccess, setRatingSuccess] = useState(false);

  const isBuyer = appointment
    ? currentUser?.id
      ? appointment.buyerId === currentUser.id
      : true
    : true;

  useEffect(() => {
    let active = true;
    setExistingReview(null);
    setShowRatingPopup(false);
    setRatingValue(5);
    setReviewText('');
    setRatingError('');
    setRatingSuccess(false);

    if (
      !appointment?.productId ||
      !currentUser?.id ||
      !isBuyer ||
      appointment.sellerId === currentUser.id
    ) {
      return undefined;
    }

    getBuyerProductReview({
      productId: appointment.productId,
      reviewerId: currentUser.id,
    })
      .then((review) => {
        if (active) setExistingReview(review);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [appointment?.id, appointment?.productId, appointment?.sellerId, currentUser?.id, isBuyer]);

  if (!appointment) return null;

  const scheduledTime = appointment.scheduledAt ? new Date(appointment.scheduledAt).getTime() : 0;
  const now = Date.now();
  const minutesUntilScheduled = scheduledTime ? (scheduledTime - now) / (60 * 1000) : 0;
  const minutesPastScheduled = scheduledTime ? (now - scheduledTime) / (60 * 1000) : 0;

  const isAutoCompleted = appointment.status === 'delivered' && minutesPastScheduled >= 60;
  const isAutoCancelled = appointment.status === 'pending' && minutesPastScheduled > 0;

  const effectiveStatus = isAutoCompleted
    ? 'completed'
    : isAutoCancelled
      ? 'cancelled'
      : appointment.status;

  const isPending = effectiveStatus === 'pending';
  const isDelivered = effectiveStatus === 'delivered';
  const isCompleted = effectiveStatus === 'completed';
  const isCancelled = effectiveStatus === 'cancelled';

  const cannotCancelDueToTime = minutesUntilScheduled > 0 && minutesUntilScheduled <= 30;

  const partnerName = isBuyer
    ? appointment.sellerName || appointment.seller || 'ผู้ขาย SPU'
    : appointment.buyerName || appointment.buyer || 'ผู้ซื้อ SPU';

  const partnerContact = isBuyer ? appointment.sellerContact : appointment.buyerContact;

  const stepperSteps = isCancelled
    ? [
        { key: 'pending', label: 'นัดรับสินค้า', sublabel: 'สร้างนัดหมาย', state: 'done' },
        {
          key: 'cancelled',
          label: isAutoCancelled ? 'ยกเลิกอัตโนมัติ' : 'ยกเลิกนัดแล้ว',
          sublabel: isAutoCancelled ? 'เลยเวลานัดรับ' : 'ไม่มีการส่งมอบ',
          state: 'cancelled',
        },
      ]
    : [
        {
          key: 'pending',
          label: 'รอนัดรับ',
          sublabel: 'ตามเวลานัดหมาย',
          state: isPending ? 'active' : 'done',
        },
        {
          key: 'delivered',
          label: 'ส่งมอบแล้ว',
          sublabel: isBuyer ? 'รอยืนยันจากคุณ' : 'รอผู้ซื้อยืนยัน',
          state: isDelivered ? 'active' : isCompleted ? 'done' : 'upcoming',
        },
        {
          key: 'completed',
          label: 'รับของสำเร็จ',
          sublabel: isAutoCompleted ? 'ยืนยันอัตโนมัติ' : 'เสร็จสิ้นรายการ',
          state: isCompleted ? 'done' : 'upcoming',
        },
      ];

  const handleConfirmAction = async (action) => {
    setIsSubmitting(true);
    setActionError('');
    try {
      if (action === 'mark_sold') {
        if (onMarkProductSold) {
          await onMarkProductSold(appointment);
        }
      } else if (onUpdateStatus) {
        await onUpdateStatus(appointment.id, action);
      }
      setConfirmingAction(null);
      if (
        action === 'buyer_received' &&
        isBuyer &&
        !existingReview &&
        appointment.sellerId &&
        currentUser?.id &&
        appointment.sellerId !== currentUser.id
      ) {
        setRatingValue(5);
        setReviewText('');
        setRatingError('');
        setShowRatingPopup(true);
      }
    } catch (err) {
      setActionError(err.message || 'เกิดข้อผิดพลาดในการปรับสถานะ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (ratingValue < 1 || ratingValue > 5) {
      setRatingError('กรุณาเลือกคะแนน 1-5 ดาว');
      return;
    }
    setIsRatingSubmitting(true);
    setRatingError('');
    try {
      const saved = await submitSellerReview({
        sellerId: appointment.sellerId,
        reviewerId: currentUser.id,
        productId: appointment.productId,
        rating: ratingValue,
        reviewText,
      });
      setExistingReview(saved);
      setShowRatingPopup(false);
      setRatingSuccess(true);
      onReviewSubmitted?.(saved);
    } catch (err) {
      setRatingError(err.message || 'ไม่สามารถบันทึกคะแนนได้');
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  const handleChatClick = () => {
    if (onOpenChat) {
      onOpenChat({
        id: appointment.conversationId,
        productId: appointment.productId,
        sellerId: appointment.sellerId,
        name: partnerName,
        productTitle: appointment.title,
        image: appointment.image,
        price: appointment.unitPrice || appointment.price,
        location: appointment.location,
      });
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[210] flex items-end justify-center bg-slate-900/58 backdrop-blur-xs animate-[appointmentFadeIn_0.2s_cubic-bezier(0.16,1,0.3,1)] sm:items-center sm:p-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-[480px] sm:max-w-[520px] flex-col overflow-hidden rounded-t-3xl bg-white pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(15,23,42,0.25)] animate-[appointmentSlideUp_0.28s_cubic-bezier(0.16,1,0.3,1)] sm:rounded-3xl sm:pb-5 sm:animate-[appointmentPopIn_0.22s_cubic-bezier(0.16,1,0.3,1)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 mb-1 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />

        <header className="flex items-center justify-between border-b border-slate-100 px-5 pt-3 pb-3.5">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border-[1.5px] ${
                isBuyer
                  ? 'border-blue-200 bg-blue-50 text-blue-600'
                  : 'border-spu-pink-border bg-pink-50 text-pink-600'
              }`}
            >
              {isBuyer ? <ShoppingBag size={20} /> : <Store size={20} />}
            </div>
            <div>
              <h2 id="appointment-sheet-title" className="m-0 text-[0.98rem] font-extrabold leading-[1.3] text-slate-900">
                รายละเอียดการนัดรับสินค้า
              </h2>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-[5px] rounded-full border-[1.5px] px-2.5 py-[3px] text-[0.72rem] font-extrabold tracking-[0.01em] ${
                    isBuyer
                      ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-[0_1px_4px_rgba(37,99,235,0.12)]'
                      : 'border-pink-400 bg-pink-50 text-pink-700 shadow-[0_1px_4px_rgba(219,39,119,0.12)]'
                  }`}
                >
                  {isBuyer ? (
                    <><ShoppingBag size={12} /> <span>คุณเป็นผู้ซื้อ</span></>
                  ) : (
                    <><Store size={12} /> <span>คุณเป็นผู้ขาย</span></>
                  )}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex flex-col gap-3.5 overflow-y-auto px-5 py-4">
          {actionError && (
            <div className="flex items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.78rem] font-semibold text-red-700" role="alert">
              <AlertTriangle size={16} />
              <span>{actionError}</span>
            </div>
          )}

          {/* Floating Stepper */}
          <ol className="m-0 flex list-none items-start justify-between pt-1 pb-1.5" aria-label="ขั้นตอนสถานะการนัดรับสินค้า">
            {stepperSteps.map((step, index) => {
              const isLast = index === stepperSteps.length - 1;
              const nextStep = stepperSteps[index + 1];
              const lineState =
                nextStep?.state === 'cancelled'
                  ? 'cancelled'
                  : step.state === 'done' && nextStep && nextStep.state !== 'upcoming'
                    ? 'done'
                    : 'upcoming';

              const nodeClass =
                step.state === 'active'
                  ? effectiveStatus === 'delivered'
                    ? 'bg-blue-600 text-white shadow-[0_0_0_4px_rgba(37,99,235,0.2)]'
                    : 'bg-amber-500 text-white shadow-[0_0_0_4px_rgba(245,158,11,0.22)]'
                  : step.state === 'done'
                    ? effectiveStatus === 'cancelled'
                      ? 'bg-slate-400 text-white shadow-[0_0_0_1px_#94a3b8]'
                      : 'bg-emerald-500 text-white shadow-[0_0_0_1px_#10b981]'
                    : step.state === 'cancelled'
                      ? 'bg-red-500 text-white shadow-[0_0_0_4px_rgba(239,68,68,0.2)]'
                      : 'bg-slate-200 text-slate-500 shadow-[0_0_0_1px_#cbd5e1]';

              const labelClass =
                step.state === 'active'
                  ? 'font-extrabold text-slate-900'
                  : step.state === 'done'
                    ? effectiveStatus === 'cancelled'
                      ? 'font-bold text-slate-500'
                      : 'font-bold text-emerald-800'
                    : step.state === 'cancelled'
                      ? 'font-extrabold text-red-700'
                      : 'font-bold text-slate-500';

              const sublabelClass =
                step.state === 'active'
                  ? effectiveStatus === 'delivered'
                    ? 'font-semibold text-blue-700'
                    : 'font-semibold text-amber-700'
                  : step.state === 'cancelled'
                    ? 'text-red-600'
                    : 'text-slate-400';

              return (
                <li key={step.key} className="flex min-w-0 flex-1 flex-col items-center text-center">
                  <div className="relative mb-[7px] flex w-full items-center justify-center">
                    <span
                      className={`relative z-[1] inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white text-[0.72rem] font-extrabold transition-all ${nodeClass}`}
                      aria-hidden="true"
                    >
                      {step.state === 'done' ? (
                        <Check size={13} strokeWidth={3} />
                      ) : step.state === 'cancelled' ? (
                        <X size={13} strokeWidth={3} />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </span>
                    {!isLast && (
                      <span
                        className={`absolute top-1/2 left-[calc(50%+16px)] h-[2.5px] w-[calc(100%-32px)] -translate-y-1/2 rounded-full ${
                          lineState === 'done'
                            ? 'bg-emerald-500'
                            : lineState === 'cancelled'
                              ? 'bg-red-400'
                              : 'bg-slate-200'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-0.5 px-1">
                    <span className={`text-[0.74rem] leading-[1.25] ${labelClass}`}>{step.label}</span>
                    <span className={`text-[0.65rem] leading-[1.2] ${sublabelClass}`}>{step.sublabel}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Product Preview Card */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3">
            {appointment.image ? (
              <img
                src={appointment.image}
                alt={appointment.title || appointment.productTitle}
                className="h-[58px] w-[58px] shrink-0 rounded-xl bg-slate-200 object-cover"
              />
            ) : (
              <div className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-xl bg-slate-200 text-slate-400">
                <ShoppingBag size={24} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="m-0 mb-1 truncate text-[0.86rem] font-bold text-slate-900">
                {appointment.title || appointment.productTitle}
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-extrabold text-pink-600 tabular-nums">
                  {formatPrice(appointment.price || appointment.totalPrice)}
                </span>
                {appointment.quantity > 1 && (
                  <span className="text-[0.72rem] font-semibold text-slate-500">
                    ({formatPrice(appointment.unitPrice)} x {appointment.quantity} ชิ้น)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Appointment Meta Details */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-blue-50 text-blue-600">
                <CalendarDays size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="mb-0.5 block text-[0.66rem] font-semibold text-slate-500">เวลานัดหมายในมหาวิทยาลัย</span>
                <strong className="block text-[0.84rem] font-bold text-blue-800">
                  {formatThaiDate(appointment.scheduledAt)}
                </strong>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-amber-50 text-amber-600">
                <MapPin size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="mb-0.5 block text-[0.66rem] font-semibold text-slate-500">จุดนัดรับสินค้า</span>
                <strong className="block text-[0.84rem] font-bold text-slate-900">
                  {appointment.location || 'ไม่ระบุจุดนัดรับ'}
                </strong>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <div
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${
                  isBuyer ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'
                }`}
              >
                <User size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="mb-0.5 block text-[0.66rem] font-semibold text-slate-500">
                  {isBuyer ? 'ผู้ขายสินค้า (เจ้าของร้าน)' : 'ผู้ซื้อสินค้า (ลูกค้านัดรับ)'}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <strong className="text-[0.9rem] font-bold text-slate-900">{partnerName}</strong>
                  {appointment.partnerVerified && <CheckCircle2 size={14} className="shrink-0 text-spu-teal" />}
                  <span
                    className={`inline-flex items-center rounded-md border px-[7px] py-px text-[0.64rem] font-extrabold ${
                      isBuyer
                        ? 'border-spu-pink-border bg-pink-50 text-pink-700'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}
                  >
                    {isBuyer ? 'ผู้ขาย' : 'ผู้ซื้อ'}
                  </span>
                </div>
              </div>
            </div>

            {partnerContact && (
              <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-purple-50 text-purple-600">
                  <MessageCircle size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="mb-0.5 block text-[0.66rem] font-semibold text-slate-500">LINE / ช่องทางติดต่อ</span>
                  <strong className="block text-[0.84rem] font-bold text-slate-900">{partnerContact}</strong>
                </div>
              </div>
            )}
          </div>

          {isPending && cannotCancelDueToTime && (
            <div className="flex items-center gap-2 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[0.68rem] font-semibold leading-[1.35] text-amber-700">
              <Lock size={15} className="shrink-0 text-amber-600" />
              <span>
                ใกล้ถึงเวลานัดหมายน้อยกว่า 30 นาที ระบบปิดการกดยกเลิกอัตโนมัติ หากติดธุระกรุณาแจ้งคู่ค้าผ่านแชท
              </span>
            </div>
          )}

          {isBuyer && isCompleted && existingReview && (
            <div className="mt-3 flex flex-col gap-1.5 rounded-[14px] border border-amber-200 bg-amber-50 px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[0.82rem] font-bold text-amber-800">
                  {ratingSuccess ? 'ขอบคุณสำหรับการให้คะแนนร้านค้า!' : 'คุณให้คะแนนร้านค้านี้แล้ว'}
                </span>
                <StarRating
                  value={existingReview.rating}
                  readOnly
                  size="sm"
                  showValue
                  label="คะแนนที่คุณให้"
                />
              </div>
              {existingReview.review_text && (
                <p className="m-0 text-[0.8rem] leading-[1.45] text-amber-900">“{existingReview.review_text}”</p>
              )}
            </div>
          )}
        </div>

        {confirmingAction && (
          <div className="border-t border-red-100 bg-[#fffbfb] px-5 pt-4 pb-2.5" role="alertdialog">
            <p className="mb-3 text-center text-[0.82rem] font-bold text-slate-900">
              {confirmingAction === 'buyer_received'
                ? 'คุณได้รับสินค้านี้เรียบร้อยแล้วใช่หรือไม่? (ระบบจะเสร็จสิ้นรายการทันที)'
                : confirmingAction === 'seller_delivered'
                  ? 'คุณได้ส่งมอบสินค้านี้ให้ผู้ซื้อแล้วใช่หรือไม่?'
                  : 'คุณต้องการยกเลิกการนัดรับสินค้านี้ใช่หรือไม่?'}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                className="min-h-[42px] rounded-[10px] bg-slate-100 text-[0.82rem] font-bold text-slate-600 hover:bg-slate-200"
                onClick={() => setConfirmingAction(null)}
                disabled={isSubmitting}
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                className={`min-h-[42px] rounded-[10px] text-[0.82rem] font-extrabold text-white ${
                  confirmingAction === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                onClick={() => handleConfirmAction(confirmingAction)}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'กำลังบันทึก...'
                  : confirmingAction === 'buyer_received'
                    ? 'ยืนยันได้รับของ'
                    : confirmingAction === 'seller_delivered'
                      ? 'ยืนยันส่งมอบ'
                      : 'ยืนยันยกเลิก'}
              </button>
            </div>
          </div>
        )}

        {!confirmingAction && (
          <footer className="flex flex-col gap-2.5 border-t border-slate-100 px-5 pt-3.5 pb-2">
            <button
              type="button"
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[14px] bg-slate-900 text-[0.88rem] font-bold text-white transition-colors hover:bg-slate-800"
              onClick={handleChatClick}
              aria-label="แชทกับคู่ค้า"
            >
              <MessageCircle size={18} />
              <span>แชทกับ{isBuyer ? 'ผู้ขาย' : 'ผู้ซื้อ'} ({partnerName})</span>
            </button>

            {isBuyer && isPending && (
              <div className="grid grid-cols-[1fr_1.6fr] gap-2.5">
                <button
                  type="button"
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-red-300 bg-white text-[0.82rem] font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-55"
                  onClick={() => setConfirmingAction('cancel')}
                  disabled={cannotCancelDueToTime}
                  title={cannotCancelDueToTime ? 'ไม่สามารถยกเลิกได้ภายใน 30 นาทีก่อนเวลานัด' : 'ยกเลิกการนัดรับ'}
                >
                  <XCircle size={16} />
                  <span>{cannotCancelDueToTime ? 'ยกเลิกไม่ได้ (<30น.)' : 'ยกเลิกนัด'}</span>
                </button>
                <button
                  type="button"
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 text-[0.84rem] font-extrabold text-white shadow-[0_4px_14px_rgba(16,185,129,0.25)] transition-transform hover:-translate-y-px"
                  onClick={() => setConfirmingAction('buyer_received')}
                >
                  <CheckCircle2 size={16} />
                  <span>ได้รับของแล้ว</span>
                </button>
              </div>
            )}

            {isBuyer && isDelivered && (
              <div className="w-full">
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 text-[0.84rem] font-extrabold text-white shadow-[0_4px_14px_rgba(16,185,129,0.25)] transition-transform hover:-translate-y-px"
                  onClick={() => setConfirmingAction('buyer_received')}
                >
                  <CheckCircle2 size={18} />
                  <span>ยืนยันว่าได้รับสินค้าแล้ว</span>
                </button>
              </div>
            )}

            {!isBuyer && isPending && (
              <div className="grid grid-cols-[1fr_1.6fr] gap-2.5">
                <button
                  type="button"
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-red-300 bg-white text-[0.82rem] font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-55"
                  onClick={() => setConfirmingAction('cancel')}
                  disabled={cannotCancelDueToTime}
                  title={cannotCancelDueToTime ? 'ไม่สามารถยกเลิกได้ภายใน 30 นาทีก่อนเวลานัด' : 'ยกเลิกการนัดรับ'}
                >
                  <XCircle size={16} />
                  <span>{cannotCancelDueToTime ? 'ยกเลิกไม่ได้ (<30น.)' : 'ยกเลิกนัด'}</span>
                </button>
                <button
                  type="button"
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-700 to-blue-500 text-[0.84rem] font-extrabold text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition-transform hover:-translate-y-px"
                  onClick={() => setConfirmingAction('seller_delivered')}
                >
                  <Send size={16} />
                  <span>ส่งมอบสินค้าแล้ว</span>
                </button>
              </div>
            )}

            {isBuyer &&
              isCompleted &&
              !existingReview &&
              appointment.sellerId &&
              currentUser?.id &&
              appointment.sellerId !== currentUser.id && (
                <div className="w-full">
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100 px-4 py-[11px] text-[0.88rem] font-bold text-amber-700 transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(245,158,11,0.2)]"
                    onClick={() => {
                      setRatingError('');
                      setShowRatingPopup(true);
                    }}
                  >
                    <Star size={17} fill="currentColor" />
                    <span>ให้คะแนนร้านค้า</span>
                  </button>
                </div>
              )}
          </footer>
        )}

        {showRatingPopup && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs"
            onClick={() => !isRatingSubmitting && setShowRatingPopup(false)}
            role="presentation"
          >
            <form
              className="flex w-full max-w-[360px] flex-col gap-3.5 rounded-[20px] border border-slate-100 bg-white p-[18px] shadow-[0_20px_45px_rgba(15,23,42,0.22)] animate-[ratingPopupIn_0.22s_cubic-bezier(0.16,1,0.3,1)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rating-popup-title"
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmitRating}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Store size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="rating-popup-title" className="m-0 text-[0.96rem] font-bold leading-tight text-slate-900">
                    นัดรับสำเร็จ! ให้คะแนนร้านค้า
                  </h3>
                  <p className="mt-0.5 truncate text-[0.78rem] text-slate-500">{partnerName}</p>
                </div>
                <button
                  type="button"
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setShowRatingPopup(false)}
                  disabled={isRatingSubmitting}
                  aria-label="ปิดหน้าต่างให้คะแนน"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <span className="block truncate rounded-[10px] border border-slate-200 bg-slate-50 px-2.5 py-2 text-center text-[0.8rem] font-semibold text-slate-700">
                  {appointment.title || appointment.productTitle}
                </span>
                <div className="flex flex-col items-center gap-1.5 py-1.5">
                  <StarRating
                    value={ratingValue}
                    onValueChange={setRatingValue}
                    size="lg"
                    showValue
                    allowClear={false}
                    label="ให้คะแนนร้านค้า"
                  />
                  <span className="text-[0.82rem] font-semibold text-amber-600">
                    {RATING_LABELS[ratingValue] || 'เลือกดาวเพื่อประเมินร้านค้า'}
                  </span>
                </div>
                <textarea
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[0.84rem] text-slate-900 outline-none transition-colors focus:border-amber-500 focus:bg-white"
                  rows={2}
                  maxLength={1000}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="เขียนความประทับใจเพิ่มเติม (ไม่บังคับ)..."
                  disabled={isRatingSubmitting}
                />
                {ratingError && (
                  <div className="flex items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-[0.78rem] font-semibold text-red-700" role="alert">
                    <AlertTriangle size={14} />
                    <span>{ratingError}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-[1fr_1.4fr] gap-2">
                <button
                  type="button"
                  className="min-h-[42px] rounded-[10px] bg-slate-100 text-[0.82rem] font-bold text-slate-600 hover:bg-slate-200"
                  onClick={() => setShowRatingPopup(false)}
                  disabled={isRatingSubmitting}
                >
                  ไว้ทีหลัง
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 px-3.5 py-2.5 text-[0.88rem] font-bold text-white transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={isRatingSubmitting || ratingValue < 1}
                >
                  {isRatingSubmitting ? 'กำลังบันทึก...' : 'ส่งคะแนน'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

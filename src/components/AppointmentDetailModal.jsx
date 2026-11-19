import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  MapPin,
  MessageCircle,
  PackageCheck,
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
  const [confirmingAction, setConfirmingAction] = useState(null); // 'buyer_received' | 'seller_delivered' | 'cancel'
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
      .catch(() => {
        // Ignore non-critical review lookup errors
      });

    return () => {
      active = false;
    };
  }, [appointment?.id, appointment?.productId, appointment?.sellerId, currentUser?.id, isBuyer]);

  if (!appointment) return null;

  // Time calculations
  const scheduledTime = appointment.scheduledAt ? new Date(appointment.scheduledAt).getTime() : 0;
  const now = Date.now();
  const minutesUntilScheduled = scheduledTime ? (scheduledTime - now) / (60 * 1000) : 0;
  const minutesPastScheduled = scheduledTime ? (now - scheduledTime) / (60 * 1000) : 0;

  // Rule 3: Seller delivered and > 1 hour past scheduled_at -> auto-completed
  const isAutoCompleted = appointment.status === 'delivered' && minutesPastScheduled >= 60;

  // Rule 5: Pending and past scheduled_at -> auto-cancelled
  const isAutoCancelled = appointment.status === 'pending' && minutesPastScheduled > 0;

  // Effective status
  const effectiveStatus = isAutoCompleted
    ? 'completed'
    : isAutoCancelled
    ? 'cancelled'
    : appointment.status;

  const isPending = effectiveStatus === 'pending';
  const isDelivered = effectiveStatus === 'delivered';
  const isCompleted = effectiveStatus === 'completed';
  const isCancelled = effectiveStatus === 'cancelled';

  // Rule 4: Cannot cancel within 30 minutes of scheduled pickup
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
    <div className="appointment-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="appointment-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="appointment-sheet-handle" aria-hidden="true" />

        {/* Modal Header with Clear Role Badge */}
        <header className="appointment-sheet-header">
          <div className="appointment-sheet-title-group">
            <div className={`appointment-header-icon-wrap ${isBuyer ? 'buyer-icon' : 'seller-icon'}`}>
              {isBuyer ? <ShoppingBag size={20} /> : <Store size={20} />}
            </div>
            <div>
              <h2 id="appointment-sheet-title">รายละเอียดการนัดรับสินค้า</h2>
              <div className="appointment-role-badge-row">
                <span className={`appointment-role-pill ${isBuyer ? 'role-buyer' : 'role-seller'}`}>
                  {isBuyer ? (
                    <>
                      <ShoppingBag size={12} /> <span>คุณเป็นผู้ซื้อ</span>
                    </>
                  ) : (
                    <>
                      <Store size={12} /> <span>คุณเป็นผู้ขาย</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="appointment-sheet-close-btn"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </header>

        {/* Modal Body */}
        <div className="appointment-sheet-body">
          {actionError && (
            <div className="appointment-alert-error" role="alert">
              <AlertTriangle size={16} />
              <span>{actionError}</span>
            </div>
          )}

          {/* Floating Stepper */}
          <ol className={`appointment-stepper status-${effectiveStatus}`} aria-label="ขั้นตอนสถานะการนัดรับสินค้า">
            {stepperSteps.map((step, index) => {
              const isLast = index === stepperSteps.length - 1;
              const nextStep = stepperSteps[index + 1];
              const lineState =
                nextStep?.state === 'cancelled'
                  ? 'cancelled'
                  : step.state === 'done' && nextStep && nextStep.state !== 'upcoming'
                  ? 'done'
                  : 'upcoming';

              return (
                <li key={step.key} className={`appointment-step step-${step.state}`}>
                  <div className="appointment-step-track">
                    <span className="appointment-step-node" aria-hidden="true">
                      {step.state === 'done' ? (
                        <Check size={13} strokeWidth={3} />
                      ) : step.state === 'cancelled' ? (
                        <X size={13} strokeWidth={3} />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </span>
                    {!isLast && <span className={`appointment-step-line line-${lineState}`} aria-hidden="true" />}
                  </div>
                  <div className="appointment-step-text">
                    <span className="appointment-step-label">{step.label}</span>
                    <span className="appointment-step-sublabel">{step.sublabel}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Product Preview Card */}
          <div className="appointment-product-card">
            {appointment.image ? (
              <img
                src={appointment.image}
                alt={appointment.title || appointment.productTitle}
                className="appointment-product-thumb"
              />
            ) : (
              <div className="appointment-product-thumb-placeholder">
                <ShoppingBag size={24} />
              </div>
            )}
            <div className="appointment-product-info">
              <h3 className="appointment-product-title">{appointment.title || appointment.productTitle}</h3>
              <div className="appointment-product-pricing">
                <span className="appointment-product-price">
                  {formatPrice(appointment.price || appointment.totalPrice)}
                </span>
                {appointment.quantity > 1 && (
                  <span className="appointment-product-qty">
                    ({formatPrice(appointment.unitPrice)} x {appointment.quantity} ชิ้น)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Appointment Meta Details */}
          <div className="appointment-details-list">
            {/* Scheduled Time */}
            <div className="appointment-detail-item">
              <div className="detail-item-icon blue">
                <CalendarDays size={18} />
              </div>
              <div className="detail-item-content">
                <span className="detail-item-label">เวลานัดหมายในมหาวิทยาลัย</span>
                <strong className="detail-item-value highlight">
                  {formatThaiDate(appointment.scheduledAt)}
                </strong>
              </div>
            </div>

            {/* Pickup Location */}
            <div className="appointment-detail-item">
              <div className="detail-item-icon amber">
                <MapPin size={18} />
              </div>
              <div className="detail-item-content">
                <span className="detail-item-label">จุดนัดรับสินค้า</span>
                <strong className="detail-item-value">
                  {appointment.location || 'ไม่ระบุจุดนัดรับ'}
                </strong>
              </div>
            </div>

            {/* Counterparty with Display Name from Database */}
            <div className="appointment-detail-item">
              <div className={`detail-item-icon ${isBuyer ? 'seller-tint' : 'buyer-tint'}`}>
                <User size={18} />
              </div>
              <div className="detail-item-content">
                <span className="detail-item-label">
                  {isBuyer ? 'ผู้ขายสินค้า (เจ้าของร้าน)' : 'ผู้ซื้อสินค้า (ลูกค้านัดรับ)'}
                </span>
                <div className="partner-name-row">
                  <strong className="detail-item-value partner-highlight">{partnerName}</strong>
                  {appointment.partnerVerified && (
                    <CheckCircle2 size={14} className="profile-verified-icon" />
                  )}
                  <span className={`partner-role-badge ${isBuyer ? 'badge-seller' : 'badge-buyer'}`}>
                    {isBuyer ? 'ผู้ขาย' : 'ผู้ซื้อ'}
                  </span>
                </div>
              </div>
            </div>

            {/* Partner Contact */}
            {partnerContact && (
              <div className="appointment-detail-item">
                <div className="detail-item-icon purple">
                  <MessageCircle size={18} />
                </div>
                <div className="detail-item-content">
                  <span className="detail-item-label">LINE / ช่องทางติดต่อ</span>
                  <strong className="detail-item-value">{partnerContact}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Cancellation Notice if within 30 mins */}
          {isPending && cannotCancelDueToTime && (
            <div className="appointment-rule-warning">
              <Lock size={15} />
              <span>
                ใกล้ถึงเวลานัดหมายน้อยกว่า 30 นาที ระบบปิดการกดยกเลิกอัตโนมัติ หากติดธุระกรุณาแจ้งคู่ค้าผ่านแชท
              </span>
            </div>
          )}

          {/* Buyer Rating Summary (when already rated) */}
          {isBuyer && isCompleted && existingReview && (
            <div className="appointment-rated-banner">
              <div className="appointment-rated-header">
                <span className="appointment-rated-title">
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
                <p className="appointment-rated-comment">“{existingReview.review_text}”</p>
              )}
            </div>
          )}

        </div>

        {/* Action Confirmation Banner */}
        {confirmingAction && (
          <div className="appointment-confirm-box" role="alertdialog">
            <p>
              {confirmingAction === 'buyer_received'
                ? 'ยืนยันว่าคุณได้รับสินค้านี้เรียบร้อยแล้วใช่หรือไม่? (ระบบจะเสร็จสิ้นรายการทันที)'
                : confirmingAction === 'seller_delivered'
                ? 'ยืนยันว่าคุณได้ส่งมอบสินค้านี้ให้ผู้ซื้อแล้วใช่หรือไม่? (ผู้ซื้อจะได้รับแจ้งเตือนให้กดยืนยัน)'
                : 'คุณต้องการยกเลิกการนัดรับสินค้านี้ใช่หรือไม่? (การยกเลิกจะมีผลทันที)'}
            </p>
            <div className="appointment-confirm-actions">
              <button
                type="button"
                className="confirm-btn-secondary"
                onClick={() => setConfirmingAction(null)}
                disabled={isSubmitting}
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                className={`confirm-btn-primary ${
                  confirmingAction === 'cancel'
                    ? 'danger'
                    : 'success'
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

        {/* Footer Actions */}
        {!confirmingAction && (
          <footer className="appointment-sheet-footer">
            {/* Chat Action Always Available */}
            <button
              type="button"
              className="appointment-btn-chat"
              onClick={handleChatClick}
              aria-label="แชทกับคู่ค้า"
            >
              <MessageCircle size={18} />
              <span>แชทกับ{isBuyer ? 'ผู้ขาย' : 'ผู้ซื้อ'} ({partnerName})</span>
            </button>

            {/* Buyer Pending: Can click Received (instantly completes) OR Cancel */}
            {isBuyer && isPending && (
              <div className="appointment-pending-actions">
                <button
                  type="button"
                  className="appointment-btn-cancel"
                  onClick={() => setConfirmingAction('cancel')}
                  disabled={cannotCancelDueToTime}
                  title={cannotCancelDueToTime ? 'ไม่สามารถยกเลิกได้ภายใน 30 นาทีก่อนเวลานัด' : 'ยกเลิกการนัดรับ'}
                >
                  <XCircle size={16} />
                  <span>{cannotCancelDueToTime ? 'ยกเลิกไม่ได้ (<30น.)' : 'ยกเลิกนัด'}</span>
                </button>
                <button
                  type="button"
                  className="appointment-btn-complete"
                  onClick={() => setConfirmingAction('buyer_received')}
                >
                  <CheckCircle2 size={16} />
                  <span>ได้รับของแล้ว</span>
                </button>
              </div>
            )}

            {/* Buyer Delivered: Seller already delivered -> Buyer confirms */}
            {isBuyer && isDelivered && (
              <div className="appointment-single-action">
                <button
                  type="button"
                  className="appointment-btn-complete full-width"
                  onClick={() => setConfirmingAction('buyer_received')}
                >
                  <CheckCircle2 size={18} />
                  <span>ยืนยันว่าได้รับสินค้าแล้ว</span>
                </button>
              </div>
            )}

            {/* Seller Pending: Can click Delivered (awaits buyer confirm) OR Cancel */}
            {!isBuyer && isPending && (
              <div className="appointment-pending-actions">
                <button
                  type="button"
                  className="appointment-btn-cancel"
                  onClick={() => setConfirmingAction('cancel')}
                  disabled={cannotCancelDueToTime}
                  title={cannotCancelDueToTime ? 'ไม่สามารถยกเลิกได้ภายใน 30 นาทีก่อนเวลานัด' : 'ยกเลิกการนัดรับ'}
                >
                  <XCircle size={16} />
                  <span>{cannotCancelDueToTime ? 'ยกเลิกไม่ได้ (<30น.)' : 'ยกเลิกนัด'}</span>
                </button>
                <button
                  type="button"
                  className="appointment-btn-delivered"
                  onClick={() => setConfirmingAction('seller_delivered')}
                >
                  <Send size={16} />
                  <span>ส่งมอบสินค้าแล้ว</span>
                </button>
              </div>
            )}
            {/* Buyer Completed & Not Yet Rated: Show Rate Store button */}
            {isBuyer &&
              isCompleted &&
              !existingReview &&
              appointment.sellerId &&
              currentUser?.id &&
              appointment.sellerId !== currentUser.id && (
                <div className="appointment-single-action">
                  <button
                    type="button"
                    className="appointment-btn-rate full-width"
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

        {/* Small Rating Pop-up on Completed Pickup */}
        {showRatingPopup && (
          <div
            className="appointment-rating-popup-backdrop"
            onClick={() => !isRatingSubmitting && setShowRatingPopup(false)}
            role="presentation"
          >
            <form
              className="appointment-rating-popup"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rating-popup-title"
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmitRating}
            >
              <div className="appointment-rating-popup-head">
                <div className="appointment-rating-popup-icon">
                  <Store size={18} />
                </div>
                <div className="appointment-rating-popup-titles">
                  <h3 id="rating-popup-title">นัดรับสำเร็จ! ให้คะแนนร้านค้า</h3>
                  <p>{partnerName}</p>
                </div>
                <button
                  type="button"
                  className="appointment-rating-popup-close"
                  onClick={() => setShowRatingPopup(false)}
                  disabled={isRatingSubmitting}
                  aria-label="ปิดหน้าต่างให้คะแนน"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="appointment-rating-popup-body">
                <span className="appointment-rating-product-name">
                  {appointment.title || appointment.productTitle}
                </span>
                <div className="appointment-rating-stars-wrap">
                  <StarRating
                    value={ratingValue}
                    onValueChange={setRatingValue}
                    size="lg"
                    showValue
                    allowClear={false}
                    label="ให้คะแนนร้านค้า"
                  />
                  <span className="appointment-rating-hint">
                    {RATING_LABELS[ratingValue] || 'เลือกดาวเพื่อประเมินร้านค้า'}
                  </span>
                </div>
                <textarea
                  className="appointment-rating-textarea"
                  rows={2}
                  maxLength={1000}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="เขียนความประทับใจเพิ่มเติม (ไม่บังคับ)..."
                  disabled={isRatingSubmitting}
                />
                {ratingError && (
                  <div className="appointment-alert-error" role="alert">
                    <AlertTriangle size={14} />
                    <span>{ratingError}</span>
                  </div>
                )}
              </div>

              <div className="appointment-rating-popup-actions">
                <button
                  type="button"
                  className="confirm-btn-secondary"
                  onClick={() => setShowRatingPopup(false)}
                  disabled={isRatingSubmitting}
                >
                  ไว้ทีหลัง
                </button>
                <button
                  type="submit"
                  className="appointment-btn-rate-submit"
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

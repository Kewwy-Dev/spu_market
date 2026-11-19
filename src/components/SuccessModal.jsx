import React from 'react';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';

export default function SuccessModal({ data, onClose, onGoToSeller }) {
  if (!data) return null;
  const proceed = () => (onGoToSeller ? onGoToSeller() : onClose());
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="seller-success-title" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="modal-close-btn" onClick={onClose} aria-label="ปิด"><X size={20} /></button>
      <div className="modal-icon-circle"><CheckCircle2 size={44} className="modal-check-icon" strokeWidth={2.5} /></div>
      <h2 id="seller-success-title" className="modal-title">ยืนยันตัวตนผู้ขายสำเร็จ</h2>
      <p className="modal-desc">ข้อมูลของคุณได้รับการบันทึกแล้ว และเปิดสิทธิ์ Seller เรียบร้อย</p>
      <div className="modal-info-summary">
        <div className="summary-row"><span className="summary-label">ชื่อ-สกุล</span><span className="summary-value">{data.fullName}</span></div>
        <div className="summary-row"><span className="summary-label">รหัส</span><span className="summary-value">{data.studentId}</span></div>
        <div className="summary-row"><span className="summary-label">คณะ / วิทยาลัย</span><span className="summary-value">{data.faculty}</span></div>
        {data.major && <div className="summary-row"><span className="summary-label">สาขาวิชา</span><span className="summary-value">{data.major}</span></div>}
        <div className="summary-row"><span className="summary-label">อีเมล SPU</span><span className="summary-value">{data.email}</span></div>
        <div className="summary-row"><span className="summary-label">ช่องทางติดต่อ</span><span className="summary-value">{data.contact}</span></div>
      </div>
      <div className="modal-status-badge"><ShieldCheck size={16} /><span>SPU Verified Seller</span></div>
      <button type="button" className="modal-submit-btn" onClick={proceed}>ไปที่จัดการร้านค้า</button>
    </div>
  </div>;
}

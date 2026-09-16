import React from 'react';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';

export default function SuccessModal({ data, onClose }) {
  if (!data) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="ปิด"
        >
          <X size={20} />
        </button>

        <div className="modal-icon-circle">
          <CheckCircle2 size={44} className="modal-check-icon" strokeWidth={2.5} />
        </div>

        <h3 className="modal-title">ส่งข้อมูลยืนยันตัวตนสำเร็จ!</h3>
        <p className="modal-desc">
          ระบบได้รับข้อมูลของท่านเรียบร้อยแล้ว เจ้าหน้าที่หรือระบบอัตโนมัติจะส่งการยืนยันไปยังอีเมลมหาวิทยาลัย
        </p>

        <div className="modal-info-summary">
          <div className="summary-row">
            <span className="summary-label">ชื่อ-นามสกุล:</span>
            <span className="summary-value">{data.fullName}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">
              {data.memberType === 'student' ? 'รหัสนักศึกษา:' : 'รหัสบุคลากร:'}
            </span>
            <span className="summary-value">{data.studentId}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">คณะ / ภาควิชา:</span>
            <span className="summary-value">{data.faculty}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">อีเมล SPU:</span>
            <span className="summary-value">{data.email}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">ติดต่อ:</span>
            <span className="summary-value">{data.contact}</span>
          </div>
        </div>

        <div className="modal-status-badge">
          <ShieldCheck size={16} />
          <span>สถานะ: รอการตรวจสอบเอกสารและเปิดสิทธิ์ซื้อขาย</span>
        </div>

        <button
          type="button"
          className="modal-submit-btn"
          onClick={onClose}
        >
          ตกลง
        </button>
      </div>
    </div>
  );
}

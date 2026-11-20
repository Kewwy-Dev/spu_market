import React from 'react';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';

export default function SuccessModal({ data, onClose, onGoToSeller }) {
  if (!data) return null;
  const proceed = () => (onGoToSeller ? onGoToSeller() : onClose());
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-[380px] flex-col items-center rounded-[20px] bg-white px-5 py-6 text-center shadow-[0_20px_40px_rgba(0,0,0,0.2)] animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-success-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-3.5 right-3.5 flex items-center justify-center rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
          onClick={onClose}
          aria-label="ปิด"
        >
          <X size={20} />
        </button>
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-spu-teal-light text-emerald-500">
          <CheckCircle2 size={44} strokeWidth={2.5} />
        </div>
        <h2 id="seller-success-title" className="mb-1.5 text-[1.1rem] font-bold text-slate-900">
          ยืนยันตัวตนผู้ขายสำเร็จ
        </h2>
        <p className="mb-4 text-[0.78rem] leading-[1.4] text-slate-500">
          ข้อมูลของคุณได้รับการบันทึกแล้ว และเปิดสิทธิ์ Seller เรียบร้อย
        </p>
        <div className="mb-3.5 flex w-full flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
          <div className="flex justify-between gap-2 text-[0.76rem]">
            <span className="text-slate-500">ชื่อ-สกุล</span>
            <span className="font-semibold text-slate-900">{data.fullName}</span>
          </div>
          <div className="flex justify-between gap-2 text-[0.76rem]">
            <span className="text-slate-500">รหัส</span>
            <span className="font-semibold text-slate-900">{data.studentId}</span>
          </div>
          <div className="flex justify-between gap-2 text-[0.76rem]">
            <span className="text-slate-500">คณะ / วิทยาลัย</span>
            <span className="font-semibold text-slate-900">{data.faculty}</span>
          </div>
          {data.major && (
            <div className="flex justify-between gap-2 text-[0.76rem]">
              <span className="text-slate-500">สาขาวิชา</span>
              <span className="font-semibold text-slate-900">{data.major}</span>
            </div>
          )}
          <div className="flex justify-between gap-2 text-[0.76rem]">
            <span className="text-slate-500">อีเมล SPU</span>
            <span className="font-semibold text-slate-900">{data.email}</span>
          </div>
          <div className="flex justify-between gap-2 text-[0.76rem]">
            <span className="text-slate-500">ช่องทางติดต่อ</span>
            <span className="font-semibold text-slate-900">{data.contact}</span>
          </div>
        </div>
        <div className="mb-4 flex items-center gap-1.5 rounded-lg border border-spu-pink-border bg-pink-50 px-3 py-1.5 text-[0.72rem] font-semibold text-spu-pink">
          <ShieldCheck size={16} />
          <span>SPU Verified Seller</span>
        </div>
        <button
          type="button"
          className="h-11 w-full rounded-full bg-spu-pink text-[0.9rem] font-bold text-white transition-colors hover:bg-spu-pink-hover"
          onClick={proceed}
        >
          ไปที่จัดการร้านค้า
        </button>
      </div>
    </div>
  );
}

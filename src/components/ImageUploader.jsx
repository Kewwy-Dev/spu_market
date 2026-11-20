import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, Lock, Trash2, RefreshCw } from 'lucide-react';

export default function ImageUploader({
  imageFile,
  imagePreview,
  onImageChange,
  onImageRemove,
  memberType = 'student',
  error,
}) {
  const fileInputRef = useRef(null);

  const handleBoxClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageChange(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageChange(file);
    }
  };

  const labelText = memberType === 'student'
    ? 'อัปโหลดรูปภาพบัตรนักศึกษา หรือ หน้าแอป SPU Student'
    : 'อัปโหลดรูปภาพบัตรประจำตัวอาจารย์ / บุคลากร SPU';

  const subtitleText = memberType === 'student'
    ? 'ถ่ายรูปบัตรนักศึกษาเพื่อตรวจยืนยันความปลอดภัย (JPG, PNG ไม่เกิน 5MB)'
    : 'ถ่ายรูปบัตรประจำตัวบุคลากรเพื่อตรวจยืนยันความปลอดภัย (JPG, PNG ไม่เกิน 5MB)';

  return (
    <div className={`flex flex-col gap-[5px] ${error ? 'has-error' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[0.82rem] font-semibold text-slate-800">
          {labelText} <span className="font-bold text-spu-pink">*</span>
        </label>
        <span className="text-[0.72rem] font-bold text-spu-pink">จำเป็น</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {!imagePreview ? (
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-pink-400 bg-[#fff5f9] px-3.5 py-5 text-center transition-all duration-200 hover:-translate-y-px hover:border-spu-pink hover:bg-pink-50"
          onClick={handleBoxClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleBoxClick()}
          aria-label="คลิกเพื่ออัปโหลดหรือถ่ายรูปภาพบัตร"
        >
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-white text-spu-pink shadow-[0_4px_10px_rgba(230,0,126,0.15)]">
            <Camera size={26} strokeWidth={2.2} />
          </div>
          <div className="mb-0.5 text-[0.88rem] font-bold text-slate-800">ถ่ายรูปหรือเลือกรูปภาพ</div>
          <div className="max-w-[280px] text-[0.72rem] leading-[1.35] text-slate-500">{subtitleText}</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border-[1.5px] border-spu-pink-border bg-white">
          <div className="flex h-[140px] w-full items-center justify-center overflow-hidden bg-slate-900">
            <img src={imagePreview} alt="รูปภาพบัตรที่อัปโหลด" className="h-full w-full object-cover" />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-pink-100 bg-[#fff7fb] px-3 py-2">
            <div className="flex min-w-0 items-center gap-1.5 text-[0.74rem] text-slate-600">
              <ImageIcon size={16} className="shrink-0" />
              <span className="max-w-[160px] truncate">{imageFile?.name || 'card-image.jpg'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[0.72rem] font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                onClick={handleBoxClick}
                title="เปลี่ยนรูปภาพ"
              >
                <RefreshCw size={14} />
                <span>เปลี่ยนรูป</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-1 text-[0.72rem] font-semibold text-rose-600 transition-colors hover:bg-rose-200"
                onClick={onImageRemove}
                title="ลบรูปภาพ"
              >
                <Trash2 size={14} />
                <span>ลบรูป</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-[0.7rem] text-green-800">
        <Lock size={14} className="min-w-3.5 text-green-600" />
        <span>รูปภาพจะถูกจัดเก็บแบบเข้ารหัสและใช้เพื่อตรวจสอบตัวตนเท่านั้น</span>
      </div>

      {error && (
        <p className="mt-0.5 text-[0.72rem] font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

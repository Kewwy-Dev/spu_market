import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Headset,
  ImagePlus,
  Loader2,
  MessageCircle,
  Phone,
  Send,
  X,
} from 'lucide-react';
import { submitSupportReport } from '../lib/marketplace';

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_SUPPORT_IMAGES = 5;
const SUPPORT_CATEGORIES = ['การใช้งาน', 'ข้อผิดพลาดระบบ', 'การซื้อขาย'];

export default function SupportReportModal({
  isOpen,
  onClose,
  currentUser,
  onNavigateToLogin,
}) {
  const [category, setCategory] = useState('การใช้งาน');
  const [description, setDescription] = useState('');
  const [imageItems, setImageItems] = useState([]); // [{ id, file, preview }]
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);
  const imageItemsRef = useRef([]);

  useEffect(() => {
    imageItemsRef.current = imageItems;
  }, [imageItems]);

  useEffect(() => () => {
    for (const item of imageItemsRef.current) {
      if (item.preview) URL.revokeObjectURL(item.preview);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSubmitted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const clearImages = () => {
    for (const item of imageItems) {
      if (item.preview) URL.revokeObjectURL(item.preview);
    }
    setImageItems([]);
  };

  const resetForm = () => {
    setCategory('การใช้งาน');
    setDescription('');
    clearImages();
    setError('');
    setSubmitted(false);
  };

  const handleSelectFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const remainingSlots = MAX_SUPPORT_IMAGES - imageItems.length;
    if (remainingSlots <= 0) {
      setError(`แนบรูปภาพได้สูงสุด ${MAX_SUPPORT_IMAGES} รูปเท่านั้น`);
      return;
    }

    const nextItems = [];
    for (const file of incoming) {
      if (nextItems.length >= remainingSlots) {
        setError(`แนบรูปภาพได้สูงสุด ${MAX_SUPPORT_IMAGES} รูป (เลือกเพิ่มได้อีก ${remainingSlots} รูป)`);
        break;
      }
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
        setError('รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WebP เท่านั้น');
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setError('ขนาดรูปภาพแต่ละรูปต้องไม่เกิน 5 MB');
        continue;
      }
      nextItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }

    if (nextItems.length > 0) {
      if (incoming.length <= remainingSlots && nextItems.length === incoming.length) {
        setError('');
      }
      setImageItems((prev) => [...prev, ...nextItems].slice(0, MAX_SUPPORT_IMAGES));
    }
  };

  const handleRemoveImage = (id) => {
    setImageItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((item) => item.id !== id);
    });
    if (error) setError('');
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-xs animate-[appointmentFadeIn_0.2s_ease] sm:items-center sm:p-4"
      onClick={() => { if (!submitting) onClose?.(); }}
      role="presentation"
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-[appointmentPopIn_0.2s_ease] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-report-modal-title"
      >
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-purple-100 text-violet-600">
            <Headset size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="support-report-modal-title" className="m-0 text-base font-extrabold text-slate-900">
              ศูนย์ช่วยเหลือ &amp; แจ้งปัญหา
            </h3>
            <p className="m-0 text-[11px] text-slate-500">
              ส่งเรื่องถึงแอดมินและแจ้งเตือนเข้า LINE OA
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
            onClick={() => onClose?.()}
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>
        </div>

        {!currentUser ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="m-0 text-xs text-slate-600">
              กรุณาเข้าสู่ระบบด้วยอีเมล SPU ก่อนส่งเรื่องแจ้งปัญหาเพื่อให้ทีมงานติดต่อกลับได้
            </p>
            <button
              type="button"
              className="min-h-10 rounded-xl bg-[#e6007e] px-4 text-xs font-bold text-white transition-colors hover:bg-[#cf0071]"
              onClick={() => {
                onClose?.();
                onNavigateToLogin?.();
              }}
            >
              เข้าสู่ระบบ
            </button>
          </div>
        ) : submitted ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <h4 className="m-0 text-sm font-extrabold text-slate-900">ส่งเรื่องแจ้งปัญหาเรียบร้อยแล้ว</h4>
              <p className="m-0 mt-1 text-xs leading-relaxed text-slate-600">
                ระบบได้บันทึกรายการและส่งแจ้งเตือนเข้า LINE OA เพื่อให้แอดมินตรวจสอบแล้วครับ
              </p>
            </div>
            <div className="mt-1 flex w-full gap-2">
              <button
                type="button"
                className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
                onClick={resetForm}
              >
                แจ้งเรื่องเพิ่ม
              </button>
              <button
                type="button"
                className="min-h-10 flex-1 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800"
                onClick={() => onClose?.()}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3.5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (submitting) return;
              if (!description.trim()) {
                setError('กรุณาอธิบายปัญหาที่เกิดขึ้น');
                return;
              }
              setError('');
              setSubmitting(true);
              try {
                await submitSupportReport(currentUser, {
                  category,
                  description,
                  imageFiles: imageItems.map((item) => item.file),
                });
                clearImages();
                setDescription('');
                setSubmitted(true);
              } catch (err) {
                setError(err?.message || 'ส่งเรื่องแจ้งปัญหาไม่สำเร็จ กรุณาลองอีกครั้ง');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-slate-800">
                1. เลือกหัวข้อปัญหา <span className="text-[#e6007e]">*</span>
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {SUPPORT_CATEGORIES.map((option) => {
                  const active = category === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={submitting}
                      onClick={() => setCategory(option)}
                      className={`rounded-xl border px-2 py-2 text-[11px] font-bold transition-all ${
                        active
                          ? 'border-[#e6007e] bg-pink-50 text-[#e6007e] shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="support-description-input" className="text-xs font-bold text-slate-800">
                2. อธิบายปัญหาที่เกิดขึ้น <span className="text-[#e6007e]">*</span>
              </label>
              <textarea
                id="support-description-input"
                rows={4}
                value={description}
                disabled={submitting}
                onChange={(event) => {
                  setDescription(event.target.value);
                  if (error) setError('');
                }}
                placeholder="ระบุรายละเอียดปัญหา ขั้นตอนที่พบ หรือชื่อสินค้า/ผู้ขายที่เกี่ยวข้อง..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 outline-none transition-colors focus:border-[#e6007e] focus:bg-white"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  3. แนบรูปภาพ <span className="font-normal text-slate-400">(ถ้ามี)</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {imageItems.length}/{MAX_SUPPORT_IMAGES} รูป
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                hidden
                onChange={(event) => {
                  handleSelectFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              {imageItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {imageItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <img
                        src={item.preview}
                        alt={`รูปภาพประกอบ ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleRemoveImage(item.id)}
                        aria-label={`ลบรูปภาพ ${idx + 1}`}
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/75 text-white transition-colors hover:bg-slate-900"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {imageItems.length < MAX_SUPPORT_IMAGES && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-2 text-[11px] font-semibold text-slate-600 transition-colors hover:border-[#e6007e] hover:bg-pink-50/30 hover:text-[#e6007e]"
                    >
                      <ImagePlus size={18} />
                      <span>เพิ่มรูป</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-3 py-3 text-xs font-semibold text-slate-600 transition-colors hover:border-[#e6007e] hover:bg-pink-50/30 hover:text-[#e6007e]"
                >
                  <ImagePlus size={16} />
                  <span>เลือกรูปภาพหน้าจอ (สูงสุด {MAX_SUPPORT_IMAGES} รูป)</span>
                </button>
              )}
            </div>

            {error && (
              <p className="m-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#e6007e] to-[#d81b60] text-sm font-bold text-white shadow-sm transition-all hover:from-[#ee1188] hover:to-[#e0236a] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>กำลังส่งเรื่อง...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>ส่งเรื่องแจ้งปัญหา</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Phone size={12} className="text-teal-600" />
            02-579-1111 ต่อ 1234
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle size={12} className="text-teal-600" />
            LINE OA @547hiedb
          </span>
        </div>
      </div>
    </div>
  );
}

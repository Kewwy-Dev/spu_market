import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, Camera, Check, CircleHelp,
  Home, Laptop, Package, Palette, Shirt, Trash2, UploadCloud,
} from 'lucide-react';
import { listCategories } from '../lib/marketplace';
import { SkeletonBlock, SkeletonReveal } from '../components/spectrumui/skeleton-reveal';
import { QuantityStepper } from '../components/spectrumui/quantity-stepper';

const categoryIcons = {
  books: BookOpen,
  uniform: Shirt,
  it: Laptop,
  stationery: Palette,
  dorm: Home,
};

function getInitialImages(product) {
  if (product?.images?.length) return product.images;
  return product?.image ? [product.image] : [];
}

export default function AddProductPage({ onBack, onSubmit, product, defaultLocation = 'b11' }) {
  const [title, setTitle] = useState(product?.title || '');
  const [price, setPrice] = useState(product?.price ? String(product.price) : '');
  const [description, setDescription] = useState(product?.description || '');
  const [quantity, setQuantity] = useState(product?.quantity ? Math.min(10, Math.max(1, Number(product.quantity))) : 1);
  const location = defaultLocation;
  const [category, setCategory] = useState(product?.category || '');
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState('');
  const [savedImages, setSavedImages] = useState(getInitialImages(product));
  const [newImages, setNewImages] = useState([]);
  const [imageError, setImageError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState('');
  const fileInput = useRef(null);
  const previews = useMemo(() => newImages.map((file) => ({ file, src: URL.createObjectURL(file) })), [newImages]);
  const imageItems = [...savedImages.map((src) => ({ src, saved: true })), ...previews.map((item) => ({ ...item, saved: false }))];
  const remainingSlots = Math.max(0, 5 - imageItems.length);

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.src)), [previews]);

  useEffect(() => {
    let isCurrent = true;
    listCategories()
      .then((rows) => {
        if (!isCurrent) return;
        setCategories(rows);
        setCategory((current) => current || product?.category || rows[0]?.slug || '');
      })
      .catch((error) => { if (isCurrent) setCategoryError(error.message || 'โหลดหมวดหมู่สินค้าไม่สำเร็จ'); })
      .finally(() => { if (isCurrent) setIsLoadingCategories(false); });
    return () => { isCurrent = false; };
  }, [product?.category]);

  const handleImageSelection = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    setImageError('');
    const validFiles = selected.filter((file) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setImageError('เลือกได้เฉพาะไฟล์ JPG, PNG หรือ WEBP');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setImageError('รูปภาพแต่ละไฟล์ต้องมีขนาดไม่เกิน 5 MB');
        return false;
      }
      return true;
    });
    if (selected.length > remainingSlots) setImageError('เพิ่มรูปภาพได้สูงสุด 5 รูป');
    setNewImages((previous) => [...previous, ...validFiles.slice(0, remainingSlots)]);
  };

  const removeImage = (index) => {
    if (index < savedImages.length) {
      setSavedImages((previous) => previous.filter((_, imageIndex) => imageIndex !== index));
    } else {
      const newImageIndex = index - savedImages.length;
      setNewImages((previous) => previous.filter((_, imageIndex) => imageIndex !== newImageIndex));
    }
    setImageError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const status = event.nativeEvent.submitter?.value || product?.status || 'active';
    setSubmitError('');
    setImageError('');
    if (!category) {
      setSubmitError('เลือกหมวดหมู่สินค้าก่อนบันทึก');
      return;
    }
    if (!imageItems.length) {
      setImageError('เพิ่มรูปสินค้าอย่างน้อย 1 รูป');
      return;
    }

    setIsSubmitting(true);
    setSubmittingStatus(status);
    try {
      await onSubmit({
        title: title.trim(),
        price: Number(price),
        quantity: Math.min(10, Math.max(1, Number(quantity) || 1)),
        status,
        createdAt: product?.createdAt || new Date().toISOString(),
        imageUrls: savedImages,
        imageFiles: newImages,
        imageUrl: savedImages[0] || '',
        description: description.trim(),
        location,
        category,
        deliveryType: 'pickup',
      });
    } catch (error) {
      setSubmitError(error.message || 'บันทึกสินค้าไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
      setSubmittingStatus('');
    }
  };

  return (
    <div className="stitch-add-page min-h-dvh w-full bg-[#f7f8fd] text-[#242537]">
      <header className="sticky top-0 z-30 w-full border-b border-[#eceef5] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto grid min-h-14 w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
          <button
            type="button"
            className="justify-self-start text-[0.78rem] sm:text-sm font-semibold text-slate-600 transition-colors hover:text-spu-pink"
            onClick={onBack}
          >
            ยกเลิก
          </button>
          <h1 className="text-center text-base sm:text-lg font-bold text-[#28293a]">
            {product ? 'แก้ไขสินค้า' : 'ลงขายสินค้าใหม่'}
          </h1>
          <button
            type="button"
            className="grid h-9 w-9 justify-self-end place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-spu-pink"
            aria-label="คำแนะนำ"
          >
            <CircleHelp size={19} />
          </button>
        </div>
      </header>

      <form className="mx-auto grid w-full max-w-2xl gap-3.5 px-4 pt-3.5 pb-32 sm:px-6" onSubmit={handleSubmit}>
        <section className="grid gap-3 overflow-hidden rounded-[18px] border border-[#eceef5] bg-white p-3.5 sm:p-4 shadow-[0_3px_14px_#25314d08]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-[7px] text-[#bf176e]">
              <Camera size={18} />
              <h2 className="text-[0.8rem] sm:text-sm font-bold text-[#292a3b]">
                รูปภาพสินค้า <small className="text-[0.65rem] font-medium text-[#818ba0]">(สูงสุด 5 รูป)</small>
              </h2>
            </div>
            <span className="text-[0.68rem] font-semibold text-[#758097] tabular-nums">{imageItems.length}/5</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {imageItems.map((image, index) => (
              <div
                className="relative grid min-h-[86px] min-w-0 place-items-center overflow-hidden rounded-xl border border-[#eceef5] bg-[#fafaff]"
                key={`${image.src}-${index}`}
              >
                <img src={image.src} alt={`รูปสินค้า ${index + 1}`} className="h-[86px] w-full object-cover" />
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 rounded-full bg-[#c10e72] px-1.5 py-0.5 text-[0.52rem] font-bold text-white">
                    หน้าปก
                  </span>
                )}
                <button
                  type="button"
                  className="absolute top-1 right-1 grid h-[22px] w-[22px] place-items-center rounded-full bg-[#1f2130b8] text-white transition-colors hover:bg-red-600"
                  aria-label={`ลบรูปที่ ${index + 1}`}
                  onClick={() => removeImage(index)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {remainingSlots > 0 && (
              <button
                type="button"
                className="grid min-h-[86px] min-w-0 content-center justify-items-center gap-1 rounded-xl border border-dashed border-[#d4d8e5] bg-[#fafaff] p-[7px] text-[#bd126f] transition-colors hover:border-spu-pink hover:bg-pink-50/40"
                onClick={() => fileInput.current?.click()}
              >
                <UploadCloud size={20} />
                <span className="text-center text-[0.59rem] leading-[1.35] text-[#768098]">
                  เพิ่มรูป<br />{imageItems.length + 1}/5
                </span>
              </button>
            )}
          </div>
          <input ref={fileInput} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageSelection} />
          <p className="text-[0.65rem] text-[#8791a4]">ไฟล์ JPG, PNG หรือ WEBP ขนาดไม่เกิน 5 MB ต่อรูป</p>
          {imageError && <small className="text-xs font-semibold text-rose-600" role="alert">{imageError}</small>}
        </section>

        <section className="grid gap-3.5 overflow-hidden rounded-[18px] border border-[#eceef5] bg-white p-3.5 sm:p-4 shadow-[0_3px_14px_#25314d08]">
          <label className="grid gap-[7px] text-[0.76rem] sm:text-xs font-extrabold text-[#303144]">
            <span>ชื่อสินค้า <b className="text-[#d5127b]">*</b></span>
            <input
              className="min-h-[42px] w-full rounded-[11px] border border-[#e4e7f0] bg-[#f5f7fd] px-3 py-2.5 text-[0.8rem] font-medium text-[#34364b] outline-none transition-all focus:border-[#d81783] focus:bg-white focus:ring-[3px] focus:ring-[#d81783]/10"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="เช่น หนังสือเรียนหรืออุปกรณ์ไอที"
              maxLength={120}
              required
            />
          </label>

          <fieldset className="grid min-w-0 gap-2 border-0 p-0">
            <legend className="mb-2 flex w-full items-center justify-between text-[0.76rem] sm:text-xs font-extrabold text-[#303144]">
              <span>หมวดหมู่สินค้า <b className="text-[#d5127b]">*</b></span>
              <span className="text-[0.65rem] font-medium text-[#818ba0]">เลือก 1 หมวดหมู่</span>
            </legend>
            <SkeletonReveal
              loading={isLoadingCategories}
              skeleton={
                <div className="stitch-category-skeleton grid grid-cols-2 gap-[7px]" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, index) => <SkeletonBlock key={index} />)}
                </div>
              }
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-[7px]">
                {categories.map((item) => {
                  const Icon = categoryIcons[item.slug] || Package;
                  const isSelected = category === item.slug;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 py-[7px] text-left transition-all ${
                        isSelected
                          ? 'border-[#d81783] bg-[#fff5fa] text-[#c61073]'
                          : 'border-[#e8eaf2] bg-[#f4f6fc] text-[#68748d] hover:bg-slate-100'
                      }`}
                      aria-pressed={isSelected}
                      onClick={() => setCategory(item.slug)}
                    >
                      <Icon size={16} className="shrink-0" />
                      <span className={`flex-1 truncate text-[0.66rem] leading-[1.25] ${isSelected ? 'font-extrabold text-[#c61073]' : 'text-[#4d5870]'}`}>
                        {item.name || item.category_name}
                      </span>
                      {isSelected && <Check size={14} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {categoryError && <small className="mt-1 block text-xs font-semibold text-rose-600" role="alert">{categoryError}</small>}
              {!isLoadingCategories && !categoryError && !categories.length && (
                <small className="mt-1 block text-xs font-semibold text-rose-600" role="alert">ไม่พบหมวดหมู่ในฐานข้อมูล</small>
              )}
            </SkeletonReveal>
          </fieldset>

          <label className="grid gap-[7px] text-[0.76rem] sm:text-xs font-extrabold text-[#303144]">
            <span>รายละเอียดสินค้าเพิ่มเติม</span>
            <textarea
              className="min-h-[95px] w-full resize-y rounded-[11px] border border-[#e4e7f0] bg-[#f5f7fd] px-3 py-2.5 text-[0.8rem] font-medium leading-[1.55] text-[#34364b] outline-none transition-all focus:border-[#d81783] focus:bg-white focus:ring-[3px] focus:ring-[#d81783]/10"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="บอกสภาพสินค้า ตำหนิ หรือข้อมูลที่ผู้ซื้อควรรู้"
              rows={4}
              maxLength={1000}
            />
          </label>

          <label className="grid gap-[7px] text-[0.76rem] sm:text-xs font-extrabold text-[#303144]">
            <span>ราคาขาย (บาท) <b className="text-[#d5127b]">*</b></span>
            <div className="flex min-h-12 items-center gap-2.5 rounded-xl border border-[#e4e7f0] bg-[#f1f4fc] px-3.5 transition-all focus-within:border-[#d81783] focus-within:bg-white focus-within:ring-[3px] focus-within:ring-[#d81783]/10">
              <b className="text-[1.1rem] text-[#c10d72]">฿</b>
              <input
                type="number"
                min="1"
                step="1"
                className="min-h-11 w-full border-0 bg-transparent text-[1.2rem] font-extrabold text-[#2c2e40] outline-none focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="0"
                required
              />
            </div>
          </label>

          <div className="flex items-center justify-center pt-1 pb-2">
            <div className="flex items-center justify-center [&_.quantity-stepper]:min-h-10 [&_.quantity-stepper]:rounded-full [&_.quantity-stepper]:border [&_.quantity-stepper]:border-slate-200 [&_.quantity-stepper]:bg-white [&_.quantity-stepper]:px-2.5 [&_.quantity-stepper]:py-1 [&_.quantity-stepper]:shadow-[0_4px_14px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] [&_.quantity-stepper-button]:flex [&_.quantity-stepper-button]:h-8 [&_.quantity-stepper-button]:w-8 [&_.quantity-stepper-button]:items-center [&_.quantity-stepper-button]:justify-center [&_.quantity-stepper-button]:rounded-full [&_.quantity-stepper-button]:text-[#c10d72] [&_.quantity-stepper-button:hover:not(:disabled)]:bg-pink-50 [&_.cart-qty-num]:min-w-[38px] [&_.cart-qty-num]:text-center [&_.cart-qty-num]:text-[1.05rem] [&_.cart-qty-num]:font-extrabold [&_.cart-qty-num]:text-slate-800">
              <QuantityStepper
                value={quantity}
                onValueChange={(val) => setQuantity(Math.min(10, Math.max(1, Number(val) || 1)))}
                min={1}
                max={10}
                size="md"
              />
            </div>
          </div>
        </section>
        {submitError && <p className="text-xs font-semibold text-rose-600" role="alert">{submitError}</p>}

        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#eceef5] bg-white/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(15,23,42,0.05)]">
          <div className="mx-auto grid w-full max-w-2xl gap-[7px] px-4 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] sm:px-6">
            <div className="grid grid-cols-[minmax(105px,0.78fr)_minmax(0,1.4fr)] gap-[9px]">
              <button
                type="submit"
                value="draft"
                className="flex min-h-[47px] items-center justify-center gap-[7px] rounded-full border border-[#ecd3e0] bg-white px-3 text-[0.8rem] font-extrabold text-[#9e2464] transition-colors hover:bg-pink-50/40 disabled:cursor-wait disabled:opacity-65"
                disabled={isSubmitting || isLoadingCategories || !categories.length}
              >
                {isSubmitting && submittingStatus === 'draft' ? 'กำลังบันทึก...' : 'ฉบับร่าง'}
              </button>
              <button
                type="submit"
                value={product?.status === 'sold' ? 'sold' : 'active'}
                className="flex min-h-[47px] items-center justify-center gap-[7px] rounded-full bg-gradient-to-r from-[#e70684] to-[#bd0d70] px-3 text-[0.8rem] font-extrabold text-white shadow-[0_5px_15px_#d20e7938] transition-all hover:opacity-95 disabled:cursor-wait disabled:opacity-65"
                disabled={isSubmitting || isLoadingCategories || !categories.length}
              >
                <Package size={17} /> {isSubmitting && submittingStatus !== 'draft' ? 'กำลังบันทึก...' : product ? 'บันทึกการแก้ไข' : 'ลงขายสินค้าเลย'}
              </button>
            </div>
            <p className="text-center text-[0.6rem] text-[#818ba0]">
              การลงขายถือว่าคุณยอมรับ <a href="#seller-terms" className="font-bold text-[#a71467] underline" onClick={(event) => event.preventDefault()}>กฎของ SPU Market</a>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

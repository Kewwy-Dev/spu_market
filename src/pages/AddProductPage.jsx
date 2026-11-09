import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, Camera, Check, ChevronDown, CircleHelp,
  Home, Laptop, MapPin, Package, Palette, Shirt, Trash2, UploadCloud,
} from 'lucide-react';
import { listCategories } from '../lib/marketplace';
import { SkeletonBlock, SkeletonReveal } from '../components/spectrumui/skeleton-reveal';

const categoryIcons = {
  books: BookOpen,
  uniform: Shirt,
  it: Laptop,
  stationery: Palette,
  dorm: Home,
};
const categoryLabels = {
  books: 'หนังสือและชีทเรียน',
  uniform: 'เครื่องแบบและเสื้อผ้า',
  it: 'ไอทีและอิเล็กทรอนิกส์',
  stationery: 'เครื่องเขียนและอุปกรณ์ศิลปะ',
  dorm: 'ของใช้หอพักและของใช้ทั่วไป',
};

const conditions = [
  { id: 'new', title: 'ใหม่ 100%', detail: 'ยังไม่เคยใช้งาน' },
  { id: 'excellent', title: 'สภาพดีมาก 90%+', detail: 'ใช้งานน้อย' },
  { id: 'used', title: 'ใช้งานได้ปกติ', detail: 'มีร่องรอยการใช้งาน' },
];

function getInitialImages(product) {
  if (product?.images?.length) return product.images;
  return product?.image ? [product.image] : [];
}

export default function AddProductPage({ onBack, onSubmit, product, defaultLocation = 'b11', defaultLocationName = '' }) {
  const [title, setTitle] = useState(product?.title || '');
  const [price, setPrice] = useState(product?.price ? String(product.price) : '');
  const [description, setDescription] = useState(product?.description || '');
  const location = defaultLocation;
  const [category, setCategory] = useState(product?.category || '');
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState('');
  const [savedImages, setSavedImages] = useState(getInitialImages(product));
  const [newImages, setNewImages] = useState([]);
  const [conditionTag, setConditionTag] = useState(product?.conditionTag || 'used');
  const [deliveryType, setDeliveryType] = useState(product?.deliveryType === 'shipping' ? 'shipping' : 'pickup');
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
        status,
        createdAt: product?.createdAt || new Date().toISOString(),
        imageUrls: savedImages,
        imageFiles: newImages,
        imageUrl: savedImages[0] || '',
        description: description.trim(),
        location,
        category,
        conditionTag,
        deliveryType,
      });
    } catch (error) {
      setSubmitError(error.message || 'บันทึกสินค้าไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
      setSubmittingStatus('');
    }
  };

  const conditionOptions = conditions.some((item) => item.id === conditionTag)
    ? conditions
    : [...conditions, { id: conditionTag, title: conditionTag, detail: 'สภาพสินค้าปัจจุบัน' }];

  return (
    <div className="add-product-page stitch-add-page">
      <header className="stitch-add-header">
        <button type="button" className="stitch-add-cancel" onClick={onBack}>ยกเลิก</button>
        <h1>{product ? 'แก้ไขสินค้า' : 'ลงขายสินค้าใหม่'}</h1>
        <button type="button" className="stitch-add-help" aria-label="คำแนะนำ"><CircleHelp size={19} /></button>
      </header>

      <form className="stitch-add-form" onSubmit={handleSubmit}>
        <section className="stitch-form-card stitch-image-section">
          <div className="stitch-form-section-heading"><div><Camera size={18} /><h2>รูปภาพสินค้า <small>(สูงสุด 5 รูป)</small></h2></div><span>{imageItems.length}/5</span></div>
          <div className="stitch-image-grid">
            {imageItems.map((image, index) => (
              <div className={`stitch-image-tile ${image.saved ? 'saved' : ''}`} key={`${image.src}-${index}`}>
                <img src={image.src} alt={`รูปสินค้า ${index + 1}`} />
                {index === 0 && <span className="stitch-main-image-label">หน้าปก</span>}
                <button type="button" aria-label={`ลบรูปที่ ${index + 1}`} onClick={() => removeImage(index)}><Trash2 size={13} /></button>
              </div>
            ))}
            {remainingSlots > 0 && (
              <button type="button" className="stitch-image-add" onClick={() => fileInput.current?.click()}>
                <UploadCloud size={20} /><span>เพิ่มรูป<br />{imageItems.length + 1}/5</span>
              </button>
            )}
          </div>
          <input ref={fileInput} className="stitch-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageSelection} />
          <p className="stitch-image-hint">ไฟล์ JPG, PNG หรือ WEBP ขนาดไม่เกิน 5 MB ต่อรูป</p>
          {imageError && <small className="add-product-error" role="alert">{imageError}</small>}
        </section>

        <section className="stitch-form-card stitch-product-fields">
          <div className="stitch-store-pickup-note"><MapPin size={16} /><span><strong>จุดนัดรับประจำร้าน</strong><small>{defaultLocationName || 'ใช้จุดนัดรับหลักที่ตั้งค่าไว้ในร้านค้า'}</small></span><span>อ้างอิงจากร้าน</span></div>
          <label className="stitch-field">
            <span>ชื่อสินค้า <b>*</b></span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น หนังสือเรียนหรืออุปกรณ์ไอที" maxLength={120} required />
          </label>

          <fieldset className="stitch-category-field">
            <legend>หมวดหมู่สินค้า <b>*</b><span>เลือก 1 หมวดหมู่</span></legend>
            <SkeletonReveal loading={isLoadingCategories} skeleton={<div className="stitch-category-grid stitch-category-skeleton" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <SkeletonBlock key={index} />)}</div>}>
            <div className="stitch-category-grid">
              {categories.map((item) => {
                const Icon = categoryIcons[item.slug] || Package;
                return (
                  <button key={item.id} type="button" className={category === item.slug ? 'selected' : ''} aria-pressed={category === item.slug} onClick={() => setCategory(item.slug)}>
                    <Icon size={16} /><span>{categoryLabels[item.slug] || item.name}</span>{category === item.slug && <Check size={14} />}
                  </button>
                );
              })}
            </div>
            {categoryError && <small className="add-product-error" role="alert">{categoryError}</small>}
            {!isLoadingCategories && !categoryError && !categories.length && <small className="add-product-error" role="alert">ไม่พบหมวดหมู่ในฐานข้อมูล</small>}
            </SkeletonReveal>
          </fieldset>

          <fieldset className="stitch-condition-field">
            <legend>สภาพสินค้า <b>*</b></legend>
            <div className="stitch-condition-grid">
              {conditionOptions.map((condition) => (
                <button key={condition.id} type="button" className={conditionTag === condition.id ? 'selected' : ''} aria-pressed={conditionTag === condition.id} onClick={() => setConditionTag(condition.id)}>
                  <strong>{condition.title}</strong><span>{condition.detail}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="stitch-field stitch-price-field">
            <span>ราคาขาย (บาท) <b>*</b></span>
            <div><b>฿</b><input type="number" min="1" step="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0" required /></div>
          </label>

          <label className="stitch-field">
            <span>รายละเอียดสินค้าเพิ่มเติม</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="บอกสภาพสินค้า ตำหนิ หรือข้อมูลที่ผู้ซื้อควรรู้" rows={4} maxLength={1000} />
          </label>

          <label className="stitch-field stitch-delivery-field">
            <span>วิธีรับสินค้า <b>*</b></span>
            <div className="stitch-select-wrap"><Package size={16} /><select value={deliveryType} onChange={(event) => setDeliveryType(event.target.value)}><option value="pickup">นัดรับที่มหาวิทยาลัย</option><option value="shipping">จัดส่งพัสดุ</option></select><ChevronDown size={16} /></div>
          </label>
        </section>
        {submitError && <p className="add-product-error" role="alert">{submitError}</p>}

        <div className="stitch-listing-footer">
          <div className="stitch-listing-actions">
            <button type="submit" value="draft" className="stitch-draft-button" disabled={isSubmitting || isLoadingCategories || !categories.length}>
              {isSubmitting && submittingStatus === 'draft' ? 'กำลังบันทึก...' : 'ฉบับร่าง'}
            </button>
            <button type="submit" value={product?.status === 'sold' ? 'sold' : 'active'} disabled={isSubmitting || isLoadingCategories || !categories.length}>
              <Package size={17} /> {isSubmitting && submittingStatus !== 'draft' ? 'กำลังบันทึก...' : product ? 'บันทึกการแก้ไข' : 'ลงขายสินค้าเลย'}
            </button>
          </div>
          <p>การลงขายถือว่าคุณยอมรับ <a href="#seller-terms" onClick={(event) => event.preventDefault()}>กฎของ SPU Market</a></p>
        </div>
      </form>
    </div>
  );
}

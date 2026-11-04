import React, { useEffect, useState } from 'react';
import { ArrowLeft, Camera, MapPin, Plus, X } from 'lucide-react';

const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024;

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('อ่านรูปภาพไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });
}

export default function AddProductPage({ currentUser, onBack, onSubmit }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('it');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('ขนาดรูปภาพต้องไม่เกิน 1.5 MB');
      return;
    }
    setImageError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImageError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    if (!imageFile) {
      setImageError('กรุณาเพิ่มรูปสินค้า');
      return;
    }

    try {
      const image = await readImage(imageFile);
      onSubmit({
        id: `user-${Date.now()}`,
        title: title.trim(),
        price: Number(price),
        image,
        description: description.trim(),
        location: location.trim(),
        building: location.trim(),
        category,
        seller: currentUser?.displayName || 'สมาชิก SPU',
        verified: Boolean(currentUser?.verified),
        tag: 'ลงขายใหม่',
        tagColor: 'pink',
        timeAgo: 'ลงขายเมื่อสักครู่',
      });
    } catch {
      setSubmitError('บันทึกรูปสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="add-product-page">
      <header className="add-product-header">
        <button type="button" className="add-product-back" onClick={onBack} aria-label="ย้อนกลับ">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>ลงขายสินค้า</h1>
          <p>กรอกรายละเอียดสินค้าให้ครบถ้วน</p>
        </div>
      </header>

      <form className="add-product-form" onSubmit={handleSubmit}>
        <label className="add-product-field">
          <span>ชื่อสินค้า <b>*</b></span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="เช่น หนังสือเรียน หรืออุปกรณ์ไอที"
            maxLength={100}
            required
          />
        </label>

        <label className="add-product-field">
          <span>ราคา (บาท) <b>*</b></span>
          <input
            type="number"
            min="1"
            step="1"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="ระบุราคาที่ต้องการขาย"
            required
          />
        </label>

        <label className="add-product-field">
          <span>หมวดหมู่ <b>*</b></span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="books">หนังสือและชีทเรียน</option>
            <option value="uniform">เสื้อผ้าและเครื่องแบบ</option>
            <option value="it">ไอทีและอุปกรณ์อิเล็กทรอนิกส์</option>
            <option value="stationery">เครื่องเขียนและอุปกรณ์</option>
            <option value="dorm">ของใช้ทั่วไป</option>
          </select>
        </label>

        <div className="add-product-field">
          <span>รูปสินค้า <b>*</b></span>
          <label className={`add-product-image-picker ${imagePreview ? 'has-image' : ''}`}>
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="ตัวอย่างรูปสินค้า" />
                <span>แตะเพื่อเปลี่ยนรูป</span>
              </>
            ) : (
              <>
                <Camera size={28} />
                <strong>เลือกรูปสินค้า</strong>
                <span>ไฟล์ภาพ ขนาดไม่เกิน 1.5 MB</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </label>
          {imagePreview && (
            <button type="button" className="add-product-remove-image" onClick={removeImage}>
              <X size={14} /> ลบรูป
            </button>
          )}
          {imageError && <small className="add-product-error" role="alert">{imageError}</small>}
        </div>

        <label className="add-product-field">
          <span>รายละเอียดสินค้า</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="บอกสภาพสินค้า ตำหนิ หรือข้อมูลที่ผู้ซื้อควรรู้"
            rows={4}
            maxLength={1000}
          />
        </label>

        <label className="add-product-field">
          <span><MapPin size={15} /> จุดนัดรับ <b>*</b></span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="เช่น อาคาร 11 ชั้น 1 หรือโรงอาหารกลาง"
            maxLength={120}
            required
          />
        </label>

        {submitError && <p className="add-product-error" role="alert">{submitError}</p>}

        <div className="add-product-actions">
          <button type="button" className="add-product-cancel" onClick={onBack}>ยกเลิก</button>
          <button type="submit" className="add-product-submit">
            <Plus size={18} /> ลงขายสินค้า
          </button>
        </div>
      </form>
    </div>
  );
}

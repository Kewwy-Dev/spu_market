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
    <div className={`form-field-group ${error ? 'has-error' : ''}`}>
      <div className="field-header">
        <label className="field-label">
          {labelText} <span className="required-star">*</span>
        </label>
        <span className="required-badge">จำเป็น</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {!imagePreview ? (
        <div
          className="upload-dropzone"
          onClick={handleBoxClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleBoxClick()}
          aria-label="คลิกเพื่ออัปโหลดหรือถ่ายรูปภาพบัตร"
        >
          <div className="upload-camera-icon-wrapper">
            <Camera size={26} className="upload-camera-icon" strokeWidth={2.2} />
          </div>
          <div className="upload-main-text">ถ่ายรูปหรือเลือกรูปภาพ</div>
          <div className="upload-sub-text">{subtitleText}</div>
        </div>
      ) : (
        <div className="upload-preview-container">
          <div className="preview-image-wrapper">
            <img src={imagePreview} alt="รูปภาพบัตรที่อัปโหลด" className="preview-image" />
          </div>
          <div className="preview-info-bar">
            <div className="preview-file-meta">
              <ImageIcon size={16} className="meta-icon" />
              <span className="meta-name">{imageFile?.name || 'card-image.jpg'}</span>
            </div>
            <div className="preview-actions">
              <button
                type="button"
                className="btn-action btn-change"
                onClick={handleBoxClick}
                title="เปลี่ยนรูปภาพ"
              >
                <RefreshCw size={14} />
                <span>เปลี่ยนรูป</span>
              </button>
              <button
                type="button"
                className="btn-action btn-delete"
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

      <div className="security-notice">
        <Lock size={14} className="security-icon" />
        <span>รูปภาพจะถูกจัดเก็บแบบเข้ารหัสและใช้เพื่อตรวจสอบตัวตนเท่านั้น</span>
      </div>

      {error && (
        <p className="field-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

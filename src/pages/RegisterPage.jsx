import React, { useState } from 'react';
import { User, CreditCard, Mail, MessageSquare } from 'lucide-react';
import Header from '../components/Header';
import HeroBanner from '../components/HeroBanner';
import MemberTypeSelector from '../components/MemberTypeSelector';
import FormField from '../components/FormField';
import FacultySelect from '../components/FacultySelect';
import ImageUploader from '../components/ImageUploader';
import PdpaConsent from '../components/PdpaConsent';
import SubmitSection from '../components/SubmitSection';
import SuccessModal from '../components/SuccessModal';
import { validateRegistrationForm } from '../utils/validation';

export default function RegisterPage({ onBack }) {
  const [memberType, setMemberType] = useState('student');

  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    faculty: '',
    email: '',
    contact: '',
    idCardImage: null,
    idCardPreview: null,
    consent1: true,
    consent2: true,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const handleMemberTypeChange = (type) => {
    setMemberType(type);
    setErrors((prev) => ({ ...prev, studentId: undefined }));
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleImageChange = (file) => {
    const previewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      idCardImage: file,
      idCardPreview: previewUrl,
    }));
    if (errors.idCardImage) {
      setErrors((prev) => ({ ...prev, idCardImage: undefined }));
    }
  };

  const handleImageRemove = () => {
    if (formData.idCardPreview) {
      URL.revokeObjectURL(formData.idCardPreview);
    }
    setFormData((prev) => ({
      ...prev,
      idCardImage: null,
      idCardPreview: null,
    }));
  };

  const handleToggleConsent1 = (checked) => {
    setFormData((prev) => ({ ...prev, consent1: checked }));
    if (checked && errors.consent1) {
      setErrors((prev) => ({ ...prev, consent1: undefined }));
    }
  };

  const handleToggleConsent2 = (checked) => {
    setFormData((prev) => ({ ...prev, consent2: checked }));
    if (checked && errors.consent2) {
      setErrors((prev) => ({ ...prev, consent2: undefined }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validation = validateRegistrationForm(formData, memberType);
    if (!validation.isValid) {
      setErrors(validation.errors);
      const errorEl = document.querySelector('.has-error, .consent-error');
      if (errorEl) {
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedData({ ...formData, memberType });
    }, 1200);
  };

  const handleCloseModal = () => {
    setSubmittedData(null);
    onBack();
  };

  return (
    <div className="register-page-container">
      {/* Header with Back Button */}
      <Header onBack={onBack} />

      {/* Hero Trust Banner */}
      <HeroBanner />

      {/* Form Container */}
      <form onSubmit={handleSubmit} noValidate className="registration-form">
        {/* Member Type Switcher */}
        <MemberTypeSelector
          memberType={memberType}
          onSelectType={handleMemberTypeChange}
        />

        {/* Form Fields */}
        <div className="fields-stack">
          {/* ชื่อ-นามสกุล (ภาษาไทย) */}
          <FormField
            id="fullName"
            label="ชื่อ-นามสกุล (ภาษาไทย)"
            required
            icon={User}
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            placeholder="ตัวอย่าง นายสมมุติ สุขสม"
            error={errors.fullName}
          />

          {/* รหัสนักศึกษา 8 หลัก หรือ รหัสบุคลากร */}
          <FormField
            id="studentId"
            label={memberType === 'student' ? 'รหัสนักศึกษา 8 หลัก' : 'รหัสประจำตัวอาจารย์ / บุคลากร'}
            required
            exampleHint={memberType === 'student' ? 'เช่น 65012345' : 'เช่น SPU-10294'}
            icon={CreditCard}
            value={formData.studentId}
            onChange={(e) => {
              const val = memberType === 'student' 
                ? e.target.value.replace(/\D/g, '').slice(0, 8)
                : e.target.value;
              handleInputChange('studentId', val);
            }}
            placeholder={memberType === 'student' ? 'กรอกรหัส 8 หลัก' : 'กรอกรหัสประจำตัวบุคลากร'}
            maxLength={memberType === 'student' ? 8 : 20}
            inputMode={memberType === 'student' ? 'numeric' : 'text'}
            error={errors.studentId}
          />

          {/* คณะ / ภาควิชา */}
          <FacultySelect
            id="faculty"
            value={formData.faculty}
            onChange={(e) => handleInputChange('faculty', e.target.value)}
            error={errors.faculty}
            required
          />

          {/* อีเมลมหาวิทยาลัย (@spu.ac.th) */}
          <FormField
            id="email"
            label="อีเมลมหาวิทยาลัย (@spu.ac.th)"
            required
            icon={Mail}
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="sommut.suk@spu.ac.th"
            helperText="ⓘ สำหรับรับรหัส OTP ยืนยันสถานะปัจจุบัน"
            error={errors.email}
          />

          {/* ช่องทางติดต่อ LINE ID หรือ เบอร์โทรศัพท์ */}
          <FormField
            id="contact"
            label="ช่องทางติดต่อ LINE ID หรือ เบอร์โทรศัพท์"
            required
            icon={MessageSquare}
            value={formData.contact}
            onChange={(e) => handleInputChange('contact', e.target.value)}
            placeholder="LINE ID หรือ 08X-XXX-XXXX"
            helperText="ใช้สำหรับการส่งข้อความติดต่อซื้อขายและนัดรับของในแคมปัส"
            error={errors.contact}
          />

          {/* อัปโหลดรูปภาพบัตร */}
          <ImageUploader
            imageFile={formData.idCardImage}
            imagePreview={formData.idCardPreview}
            onImageChange={handleImageChange}
            onImageRemove={handleImageRemove}
            memberType={memberType}
            error={errors.idCardImage}
          />

          {/* PDPA Consent Accordion */}
          <PdpaConsent
            consent1={formData.consent1}
            consent2={formData.consent2}
            onToggleConsent1={handleToggleConsent1}
            onToggleConsent2={handleToggleConsent2}
            errors={errors}
          />

          {/* Submit Button & Badge */}
          <SubmitSection isSubmitting={isSubmitting} />
        </div>
      </form>

      {/* Success Modal */}
      {submittedData && (
        <SuccessModal data={submittedData} onClose={handleCloseModal} />
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { User, CreditCard, Mail, MessageSquare, X, ShieldCheck, Loader2 } from 'lucide-react';
import { getSupabaseConfigError, supabase } from '../lib/supabase';
import Header from '../components/Header';
import HeroBanner from '../components/HeroBanner';
import MemberTypeSelector from '../components/MemberTypeSelector';
import FormField from '../components/FormField';
import FacultySelect from '../components/FacultySelect';
import PdpaConsent from '../components/PdpaConsent';
import SubmitSection from '../components/SubmitSection';
import { validateRegistrationForm } from '../utils/validation';

const PENDING_SELLER_REGISTRATION_KEY = 'spu-market-pending-seller-registration';

function readPendingSellerRegistration(email) {
  try {
    const pending = JSON.parse(window.localStorage.getItem(PENDING_SELLER_REGISTRATION_KEY) || 'null');
    if (!pending || Date.now() - pending.saved_at > 24 * 60 * 60 * 1000) return null;
    if (email && pending.email?.toLowerCase() !== email.toLowerCase()) return null;
    return pending;
  } catch {
    return null;
  }
}

export default function RegisterPage({ currentUser, onBack }) {
  const [pendingRegistration] = useState(() => readPendingSellerRegistration(currentUser?.email));
  const linkExpired = new URLSearchParams(window.location.hash.slice(1)).get('error_code') === 'otp_expired';
  const [isExpiredLink, setIsExpiredLink] = useState(linkExpired);
  const [memberType, setMemberType] = useState(pendingRegistration?.member_type || currentUser?.memberType || 'student');
  const [formData, setFormData] = useState({
    fullName: pendingRegistration?.display_name || currentUser?.displayName || '',
    studentId: pendingRegistration?.student_id || currentUser?.studentId || '',
    faculty: pendingRegistration?.faculty || currentUser?.faculty || '',
    email: pendingRegistration?.email || currentUser?.email || '',
    contact: pendingRegistration?.contact || currentUser?.contact || '',
    consent1: pendingRegistration?.identity_check_consent === true,
    consent2: pendingRegistration?.terms_accepted === true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMagicLinkOpen, setIsMagicLinkOpen] = useState(linkExpired);
  const [registrationMessage, setRegistrationMessage] = useState(linkExpired ? 'ลิงก์นี้ถูกใช้ไปแล้วหรือหมดอายุ กรุณาส่งลิงก์ใหม่' : '');

  useEffect(() => {
    if (!currentUser) return;
    setFormData((previous) => ({
      ...previous,
      fullName: previous.fullName || currentUser.displayName || '',
      studentId: previous.studentId || currentUser.studentId || '',
      faculty: previous.faculty || currentUser.faculty || '',
      email: previous.email || currentUser.email || '',
      contact: previous.contact || currentUser.contact || '',
    }));
    if (!pendingRegistration && !formData.studentId) setMemberType(currentUser.memberType || 'student');
  }, [currentUser, pendingRegistration, formData.studentId]);

  const updateField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleMemberTypeChange = (type) => {
    setMemberType(type);
    if (errors.studentId) setErrors((previous) => ({ ...previous, studentId: undefined }));
  };

  const requestMagicLink = async () => {
    const metadata = {
      display_name: formData.fullName.trim(),
      student_id: formData.studentId.trim(),
      faculty: formData.faculty,
      contact: formData.contact.trim(),
      member_type: memberType,
      seller_registration_pending: true,
      identity_check_consent: formData.consent1,
      terms_accepted: formData.consent2,
    };
    const pendingRegistration = {
      ...metadata,
      email: formData.email.trim().toLowerCase(),
      saved_at: Date.now(),
    };
    window.localStorage.setItem(PENDING_SELLER_REGISTRATION_KEY, JSON.stringify(pendingRegistration));
    const { error } = await supabase.auth.signInWithOtp({
      email: formData.email.trim().toLowerCase(),
      options: {
        shouldCreateUser: !currentUser,
        ...(currentUser ? {} : { data: metadata }),
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      throw error;
    }
    setIsExpiredLink(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setRegistrationMessage('');
    const validation = validateRegistrationForm(formData, memberType);
    if (!validation.isValid) {
      setErrors(validation.errors);
      document.querySelector('.has-error, .consent-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!supabase) {
      setRegistrationMessage(getSupabaseConfigError());
      return;
    }

    setIsSubmitting(true);
    try {
      await requestMagicLink();
      setIsMagicLinkOpen(true);
    } catch (error) {
      setRegistrationMessage(error.message || 'ส่งลิงก์ยืนยันไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendMagicLink = async () => {
    setRegistrationMessage('');
    setIsSubmitting(true);
    try {
      await requestMagicLink();
      setRegistrationMessage('ส่งลิงก์ยืนยันใหม่แล้ว');
    } catch (error) {
      setRegistrationMessage(error.message || 'ส่งลิงก์ยืนยันไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-page-container">
      <Header onBack={onBack} />
      <HeroBanner />
      <form onSubmit={handleSubmit} noValidate className="registration-form">
        <MemberTypeSelector memberType={memberType} onSelectType={handleMemberTypeChange} />
        <div className="fields-stack">
          <FormField
            id="studentId"
            label={memberType === 'student' ? 'รหัสนักศึกษา' : 'รหัสอาจารย์ / บุคลากร'}
            required icon={CreditCard}
            value={formData.studentId}
            onChange={(event) => updateField('studentId', memberType === 'student' ? event.target.value.replace(/\D/g, '').slice(0, 8) : event.target.value)}
            placeholder={memberType === 'student' ? 'กรอกรหัสนักศึกษา 8 หลัก' : 'กรอกรหัสบุคลากร'}
            maxLength={memberType === 'student' ? 8 : 20}
            inputMode={memberType === 'student' ? 'numeric' : 'text'}
            error={errors.studentId}
          />
          <FormField
            id="fullName" label="ชื่อ-สกุล" required icon={User}
            value={formData.fullName} onChange={(event) => updateField('fullName', event.target.value)}
            placeholder="กรอกชื่อและนามสกุล" error={errors.fullName}
          />
          <FacultySelect id="faculty" value={formData.faculty} onChange={(event) => updateField('faculty', event.target.value)} error={errors.faculty} required />
          <FormField
            id="email" label="Email มหาวิทยาลัย (@spumail.net)" required icon={Mail} type="email"
            value={formData.email} onChange={(event) => updateField('email', event.target.value)}
            placeholder="ชื่อผู้ใช้@spumail.net" helperText={currentUser ? 'ส่งลิงก์ยืนยันไปยังอีเมลของบัญชีนี้' : 'กรอกอีเมลมหาวิทยาลัยเพื่อรับลิงก์ยืนยัน'}
            autoComplete="email" readOnly={Boolean(currentUser)} error={errors.email}
          />
          <FormField
            id="contact" label="ช่องทางติดต่อ" required icon={MessageSquare}
            value={formData.contact} onChange={(event) => updateField('contact', event.target.value)}
            placeholder="LINE ID หรือเบอร์โทรศัพท์" helperText="ใช้ติดต่อเรื่องการซื้อขายและนัดรับสินค้า" error={errors.contact}
          />
          <PdpaConsent
            consent1={formData.consent1} consent2={formData.consent2}
            onToggleConsent1={(checked) => updateField('consent1', checked)}
            onToggleConsent2={(checked) => updateField('consent2', checked)} errors={errors}
          />
          {registrationMessage && !isMagicLinkOpen && <p className="field-error-text" role="alert">{registrationMessage}</p>}
          <SubmitSection isSubmitting={isSubmitting} />
        </div>
      </form>

      {isMagicLinkOpen && <div className="seller-otp-backdrop">
        <section className="seller-otp-modal" role="dialog" aria-modal="true" aria-labelledby="seller-otp-title">
          <button type="button" className="seller-otp-close" aria-label="ปิด" onClick={() => setIsMagicLinkOpen(false)}><X size={19} /></button>
          <div className="seller-otp-icon"><ShieldCheck size={23} /></div>
          <h2 id="seller-otp-title">ตรวจสอบอีเมลของคุณ</h2>
          <p>{isExpiredLink ? 'ลิงก์ก่อนหน้าใช้แล้วหรือหมดอายุแล้ว' : 'เราส่งลิงก์เข้าสู่ระบบไปที่'} <strong>{formData.email}</strong> {isExpiredLink ? 'ส่งลิงก์ใหม่ แล้วเปิดอีเมลฉบับล่าสุดเพียงครั้งเดียว' : 'เปิดลิงก์เพื่อยืนยันอีเมลและสมัครเป็นผู้ขายให้เสร็จสมบูรณ์'}</p>
          {registrationMessage && <p className={`seller-otp-feedback ${registrationMessage.startsWith('ส่งลิงก์ยืนยันใหม่') ? 'success' : ''}`} role={registrationMessage.startsWith('ส่งลิงก์ยืนยันใหม่') ? 'status' : 'alert'}>{registrationMessage}</p>}
          <button type="button" className="seller-otp-resend" disabled={isSubmitting} onClick={handleResendMagicLink}>{isSubmitting ? <><Loader2 size={15} className="spin-icon" /> กำลังส่ง...</> : 'ส่งลิงก์อีกครั้ง'}</button>
        </section>
      </div>}

    </div>
  );
}

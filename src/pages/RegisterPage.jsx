import React, { useEffect, useState } from 'react';
import { User, CreditCard, Mail, MessageSquare, X, ShieldCheck, Loader2 } from 'lucide-react';
import OtpVerificationInput, { OTP_RESEND_COOLDOWN_SECONDS } from '../components/common/OtpVerificationInput';
import { getSupabaseConfigError, supabase } from '../lib/supabase';
import Header from '../components/Header';
import HeroBanner from '../components/HeroBanner';
import MemberTypeSelector from '../components/MemberTypeSelector';
import FormField from '../components/FormField';
import FacultySelect from '../components/FacultySelect';
import MajorSelect from '../components/MajorSelect';
import PdpaConsent from '../components/PdpaConsent';
import SubmitSection from '../components/SubmitSection';
import { getMajorsByFaculty } from '../data/faculties';
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
    fullName: pendingRegistration?.display_name || '',
    studentId: pendingRegistration?.student_id || currentUser?.studentId || '',
    faculty: pendingRegistration?.faculty || currentUser?.faculty || '',
    major: pendingRegistration?.major || currentUser?.major || '',
    email: pendingRegistration?.email || currentUser?.email || '',
    contact: (pendingRegistration?.contact || currentUser?.contact || '').replace(/[\u0E00-\u0E7F]/g, ''),
    consent1: pendingRegistration?.identity_check_consent === true,
    consent2: pendingRegistration?.terms_accepted === true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(linkExpired);
  const [otpCode, setOtpCode] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState(linkExpired ? 'รหัสหรือลิงก์ก่อนหน้าหมดอายุ กรุณาส่งรหัส OTP ใหม่' : '');

  useEffect(() => {
    if (resendCountdown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (!currentUser) return;
    setFormData((previous) => {
      const nextFaculty = previous.faculty || currentUser.faculty || '';
      const nextMajors = getMajorsByFaculty(nextFaculty);
      const candidateMajor = previous.major || currentUser.major || '';
      const nextMajor = nextMajors.length === 0 || nextMajors.includes(candidateMajor) ? candidateMajor : '';
      return {
        ...previous,
        studentId: previous.studentId || currentUser.studentId || '',
        faculty: nextFaculty,
        major: nextMajor,
        email: previous.email || currentUser.email || '',
        contact: previous.contact || (currentUser.contact || '').replace(/[\u0E00-\u0E7F]/g, ''),
      };
    });
    if (!pendingRegistration && !formData.studentId) setMemberType(currentUser.memberType || 'student');
  }, [currentUser, pendingRegistration, formData.studentId]);

  const updateField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleFacultyChange = (event) => {
    const nextFaculty = event.target.value;
    const nextMajors = getMajorsByFaculty(nextFaculty);
    setFormData((previous) => ({
      ...previous,
      faculty: nextFaculty,
      major: nextMajors.includes(previous.major) ? previous.major : '',
    }));
    setErrors((previous) => ({
      ...previous,
      faculty: undefined,
      major: undefined,
    }));
  };

  const handleMemberTypeChange = (type) => {
    setMemberType(type);
    if (errors.studentId) setErrors((previous) => ({ ...previous, studentId: undefined }));
  };

  const requestOtpEmail = async () => {
    const metadata = {
      display_name: formData.fullName.trim(),
      student_id: formData.studentId.trim(),
      faculty: formData.faculty,
      major: formData.major,
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
      await requestOtpEmail();
      setOtpCode('');
      setResendCountdown(OTP_RESEND_COOLDOWN_SECONDS);
      setIsOtpModalOpen(true);
    } catch (error) {
      setRegistrationMessage(error.message || 'ส่งรหัส OTP ไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isSubmitting || isVerifyingOtp) return;
    setRegistrationMessage('');
    setIsSubmitting(true);
    try {
      await requestOtpEmail();
      setOtpCode('');
      setResendCountdown(OTP_RESEND_COOLDOWN_SECONDS);
      setRegistrationMessage('ส่งรหัส OTP ใหม่แล้ว');
    } catch (error) {
      setRegistrationMessage(error.message || 'ส่งรหัส OTP ไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtpCode = async (codeToVerify) => {
    setRegistrationMessage('');
    const trimmedOtp = String(codeToVerify || '').trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      setRegistrationMessage('กรุณากรอกรหัส OTP ตัวเลข 6 หลักให้ครบถ้วน');
      return;
    }
    if (!supabase) {
      setRegistrationMessage(getSupabaseConfigError());
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: formData.email.trim().toLowerCase(),
        token: trimmedOtp,
        type: 'email',
      });
      if (error) throw error;
      setIsOtpModalOpen(false);
    } catch (error) {
      setRegistrationMessage(error.message || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ กรุณาลองอีกครั้ง');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    await verifyOtpCode(otpCode);
  };

  return (
    <div className="flex min-h-[calc(100dvh-64px)] w-full flex-col bg-white sm:bg-slate-50/70">
      <Header onBack={onBack} />
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-4 pb-24 sm:my-6 sm:rounded-2xl sm:border sm:border-slate-200/80 sm:bg-white sm:p-6 sm:shadow-card">
        <HeroBanner />
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <MemberTypeSelector memberType={memberType} onSelectType={handleMemberTypeChange} />
          <div className="flex flex-col gap-3.5">
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
            value={formData.fullName}
            onChange={(event) => updateField('fullName', event.target.value.replace(/[^A-Za-z\u0E00-\u0E7F\s]/g, ''))}
            placeholder="กรอกชื่อและนามสกุล (ภาษาไทยหรืออังกฤษ)" error={errors.fullName}
          />
          <FacultySelect id="faculty" value={formData.faculty} onChange={handleFacultyChange} error={errors.faculty} required />
          <MajorSelect id="major" faculty={formData.faculty} value={formData.major} onChange={(event) => updateField('major', event.target.value)} error={errors.major} required />
          <FormField
            id="email" label="อีเมล มหาวิทยาลัย" required icon={Mail} type="email"
            value={formData.email} onChange={(event) => updateField('email', event.target.value)}
            placeholder="ชื่อผู้ใช้@spumail.net" helperText={currentUser ? 'ส่งรหัส OTP 6 หลักไปยังอีเมลของบัญชีนี้' : 'กรอกอีเมลมหาวิทยาลัยเพื่อรับรหัส OTP 6 หลัก'}
            autoComplete="email" readOnly={Boolean(currentUser)} error={errors.email}
          />
          <FormField
            id="contact" label="ช่องทางติดต่อ" required icon={MessageSquare}
            value={formData.contact}
            onChange={(event) => updateField('contact', event.target.value.replace(/[\u0E00-\u0E7F]/g, ''))}
            placeholder="LINE ID หรือเบอร์โทรศัพท์ (ห้ามภาษาไทย)" helperText="ใช้ติดต่อเรื่องการซื้อขายและนัดรับสินค้า (ห้ามพิมพ์ภาษาไทย)" error={errors.contact}
          />
          <PdpaConsent
            consent1={formData.consent1} consent2={formData.consent2}
            onToggleConsent1={(checked) => updateField('consent1', checked)}
            onToggleConsent2={(checked) => updateField('consent2', checked)} errors={errors}
          />
          {registrationMessage && !isOtpModalOpen && <p className="mt-0.5 text-[0.72rem] font-medium text-rose-600" role="alert">{registrationMessage}</p>}
          <SubmitSection isSubmitting={isSubmitting} />
          </div>
        </form>
      </div>

      {isOtpModalOpen && (
        <div className="fixed inset-0 z-[220] grid place-items-center bg-slate-900/58 p-4 backdrop-blur-[3px]">
          <section
            className="relative w-full max-w-[400px] rounded-[22px] bg-white px-5.5 pt-6.5 pb-5.5 text-center shadow-[0_24px_70px_rgba(15,23,42,0.28)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-otp-title"
          >
            <button
              type="button"
              className="absolute top-3 right-3 grid h-[34px] w-[34px] place-items-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
              aria-label="ปิด"
              onClick={() => setIsOtpModalOpen(false)}
            >
              <X size={19} />
            </button>
            <div className="mx-auto mb-3 grid h-[52px] w-[52px] place-items-center rounded-2xl bg-spu-pink-light text-spu-pink">
              <ShieldCheck size={23} />
            </div>
            <h2 id="seller-otp-title" className="mb-3 text-base font-bold text-slate-900">ยืนยันรหัส OTP 6 หลัก</h2>
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
              <OtpVerificationInput
                email={formData.email.trim().toLowerCase()}
                noticeTitle={
                  isExpiredLink
                    ? 'รหัสก่อนหน้าหมดอายุ กรุณาส่งใหม่'
                    : registrationMessage.startsWith('ส่งรหัส OTP ใหม่')
                      ? 'ส่งรหัส OTP ใหม่แล้ว'
                      : 'ส่งรหัส OTP แล้ว'
                }
                value={otpCode}
                onChange={(nextOtp) => {
                  setOtpCode(nextOtp);
                  setRegistrationMessage('');
                }}
                onComplete={verifyOtpCode}
                onResend={handleResendOtp}
                countdownSeconds={resendCountdown}
                isInvalid={Boolean(registrationMessage && !registrationMessage.startsWith('ส่งรหัส OTP ใหม่'))}
                isVerifying={isVerifyingOtp}
                isResending={isSubmitting}
              />
              {registrationMessage && !registrationMessage.startsWith('ส่งรหัส OTP ใหม่') && (
                <p className="text-center text-[0.72rem] font-medium text-rose-700" role="alert">
                  {registrationMessage}
                </p>
              )}
            </form>
          </section>
        </div>
      )}

    </div>
  );
}

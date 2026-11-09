import React, { useState } from 'react';
import { ArrowLeft, Mail, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { getSupabaseConfigError, supabase } from '../lib/supabase';

export default function LoginPage({ onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAppendDomain = () => {
    if (!email) setEmail('65012345@spumail.net');
    else if (!email.includes('@')) setEmail(`${email.trim()}@spumail.net`);
    else setEmail(`${email.split('@')[0]}@spumail.net`);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return setError('กรุณากรอกอีเมลนักศึกษา');
    if (!trimmedEmail.endsWith('@spumail.net')) return setError('กรุณาใช้อีเมลนักศึกษา @spumail.net');
    if (!supabase) return setError(getSupabaseConfigError());

    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
      });
      if (authError) throw authError;
      setNotice('ส่งลิงก์ยืนยันการเข้าสู่ระบบไปที่อีเมลแล้ว กรุณากดยืนยันจากอีเมลก่อนเข้าใช้งาน');
    } catch (authError) {
      setError(authError.message || 'ส่งอีเมลยืนยันไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSso = async () => {
    setError('');
    if (!supabase) return setError(getSupabaseConfigError());
    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (authError) throw authError;
    } catch (authError) {
      setError(authError.message || 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <header className="page-header">
        <button type="button" className="back-button" onClick={onBack} title="ย้อนกลับ" aria-label="ย้อนกลับ">
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
      </header>

      <div className="login-hero-header">
        <div className="login-logo-icon-box">
          <ShieldCheck size={36} className="login-logo-icon" strokeWidth={2.3} />
        </div>
        <h1 className="login-main-heading">ยินดีต้อนรับสู่ SPU Market</h1>
        <p className="login-sub-heading">ตลาดนัดซื้อขายปลอดภัยสำหรับชาวศรีปทุม</p>
        <div className="domain-restriction-pill">
          <span className="dot-green" />
          <span>กรุณาเข้าสู่ระบบด้วย · <strong>@spumail.net เท่านั้น</strong></span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="login-form">
        <div className={`form-field-group ${error && !email.endsWith('@spumail.net') ? 'has-error' : ''}`}>
          <div className="field-header">
            <label htmlFor="login-email" className="field-label">
              อีเมลนักศึกษา (@spumail.net) <span className="required-star">*</span>
            </label>
            <button type="button" className="append-domain-chip" onClick={handleAppendDomain} title="เติม @spumail.net อัตโนมัติ">
              <Sparkles size={12} />
              <span>เติม @spumail.net</span>
            </button>
          </div>
          <div className="input-wrapper">
            <div className="input-icon-left" aria-hidden="true"><Mail size={18} strokeWidth={2} /></div>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setError(''); setNotice(''); }}
              placeholder="ตัวอย่าง 65012345@spumail.net"
              autoComplete="email"
              className="form-input with-icon"
              required
            />
          </div>
          <p className="field-helper-text">ใช้อีเมลประจำตัวนักศึกษาที่ได้รับจากมหาวิทยาลัยศรีปทุม</p>
        </div>

        {error && <div className="login-error-alert" role="alert"><span>{error}</span></div>}
        {notice && <p className="login-otp-note" role="status">{notice}</p>}

        <button type="submit" disabled={isLoading} className="login-submit-btn">
          {isLoading ? <><Loader2 size={18} className="spin-icon" /><span>กำลังส่งอีเมลยืนยัน...</span></> : <span>เข้าสู่ระบบ</span>}
        </button>

        <div className="login-divider">
          <span className="divider-line" />
          <span className="divider-text">หรือ</span>
          <span className="divider-line" />
        </div>

        <button type="button" disabled={isLoading} onClick={handleGoogleSso} className="google-sso-btn">
          <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>ลงชื่อเข้าใช้ด้วย Google</span>
        </button>

      </form>
    </div>
  );
}

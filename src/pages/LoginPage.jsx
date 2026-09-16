import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';

export default function LoginPage({ onBack, onLoginSuccess, onNavigateToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-fill or append @spumail.net helper
  const handleAppendDomain = () => {
    if (!email) {
      setEmail('65012345@spumail.net');
    } else if (!email.includes('@')) {
      setEmail(`${email.trim()}@spumail.net`);
    } else {
      const username = email.split('@')[0];
      setEmail(`${username}@spumail.net`);
    }
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Validate email presence
    if (!trimmedEmail) {
      setError('กรุณากรอกอีเมลมหาวิทยาลัย');
      return;
    }

    // 2. Strict @spumail.net validation
    if (!trimmedEmail.endsWith('@spumail.net')) {
      setError('⚠️ บังคับใช้อีเมลมหาวิทยาลัย (@spumail.net) เท่านั้น');
      return;
    }

    // 3. Validate password presence
    if (!password) {
      setError('กรุณากรอกรหัสผ่าน');
      return;
    }

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);

    // Simulate authentication API call
    setTimeout(() => {
      setIsLoading(false);
      const studentUsername = trimmedEmail.split('@')[0];
      const user = {
        email: trimmedEmail,
        username: studentUsername,
        displayName: studentUsername.startsWith('6') ? `นักศึกษา SPU (${studentUsername})` : studentUsername,
        verified: true,
      };

      onLoginSuccess(user);
    }, 900);
  };

  const handleGoogleSso = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const user = {
        email: 'student.spu@spumail.net',
        username: 'student.spu',
        displayName: 'นักศึกษา SPU (Verified)',
        verified: true,
      };
      onLoginSuccess(user);
    }, 800);
  };

  return (
    <div className="login-page-container">
      {/* Header */}
      <header className="page-header">
        <button
          type="button"
          className="back-button"
          onClick={onBack}
          title="ย้อนกลับ"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
        <h2 className="header-title">เข้าสู่ระบบ SPU Market</h2>
        <div className="login-badge-tag">
          <ShieldCheck size={13} />
          <span>SPU Secure</span>
        </div>
      </header>

      {/* Hero Icon & Title */}
      <div className="login-hero-header">
        <div className="login-logo-icon-box">
          <ShieldCheck size={36} className="login-logo-icon" strokeWidth={2.3} />
        </div>
        <h1 className="login-main-heading">ยินดีต้อนรับสู่ SPU Market</h1>
        <p className="login-sub-heading">
          ตลาดนัดซื้อขายปลอดภัยสำหรับชาวศรีปทุม
        </p>
        <div className="domain-restriction-pill">
          <span className="dot-green" />
          <span>บังคับเข้าสู่ระบบด้วยอีเมล <strong>@spumail.net</strong></span>
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} noValidate className="login-form">
        {/* Email Field */}
        <div className={`form-field-group ${error && !email.endsWith('@spumail.net') ? 'has-error' : ''}`}>
          <div className="field-header">
            <label htmlFor="login-email" className="field-label">
              อีเมลนักศึกษา (@spumail.net) <span className="required-star">*</span>
            </label>
            <button
              type="button"
              className="append-domain-chip"
              onClick={handleAppendDomain}
              title="เติม @spumail.net อัตโนมัติ"
            >
              <Sparkles size={12} />
              <span>เติม @spumail.net</span>
            </button>
          </div>

          <div className="input-wrapper">
            <div className="input-icon-left" aria-hidden="true">
              <Mail size={18} strokeWidth={2} />
            </div>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="ตัวอย่าง 65012345@spumail.net"
              autoComplete="username"
              className="form-input with-icon"
            />
          </div>
          <p className="field-helper-text">
            ใช้อีเมลประจำตัวนักศึกษาที่ได้รับจากมหาวิทยาลัยศรีปทุม
          </p>
        </div>

        {/* Password Field */}
        <div className="form-field-group">
          <div className="field-header">
            <label htmlFor="login-password" className="field-label">
              รหัสผ่าน (Password) <span className="required-star">*</span>
            </label>
          </div>

          <div className="input-wrapper">
            <div className="input-icon-left" aria-hidden="true">
              <Lock size={18} strokeWidth={2} />
            </div>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="กรอกรหัสผ่านของคุณ"
              autoComplete="current-password"
              className="form-input with-icon with-eye"
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              aria-label="สลับการมองเห็นรหัสผ่าน"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Options Row: Remember Me & Forgot Password */}
        <div className="login-options-row">
          <label className="remember-checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="remember-checkbox"
            />
            <span className="remember-text">จดจำการเข้าสู่ระบบ</span>
          </label>

          <button
            type="button"
            className="forgot-password-link"
            onClick={() => alert('ติดต่อรีเซ็ตรหัสผ่านอีเมล @spumail.net ได้ที่ศูนย์เทคโนโลยีสารสนเทศ (สำนักคอมพิวเตอร์ อาคาร 12 ชั้น 2) หรือโทร 02-579-1111')}
          >
            ลืมรหัสผ่าน?
          </button>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="login-error-alert" role="alert">
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="login-submit-btn"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="spin-icon" />
              <span>กำลังตรวจสอบสิทธิ์...</span>
            </>
          ) : (
            <span>เข้าสู่ระบบด้วย @spumail.net</span>
          )}
        </button>

        {/* Divider */}
        <div className="login-divider">
          <span className="divider-line" />
          <span className="divider-text">หรือ</span>
          <span className="divider-line" />
        </div>

        {/* Google Workspace SSO Button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={handleGoogleSso}
          className="google-sso-btn"
        >
          <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>ลงชื่อเข้าใช้ด้วย Google SPU (@spumail.net)</span>
        </button>

        {/* Security Notice */}
        <div className="login-security-notice">
          <p>
            🔒 ระบบตรวจสอบตัวตนผ่านระบบเมลของมหาวิทยาลัยศรีปทุม เพื่อให้มั่นใจว่าผู้ซื้อและผู้ขายเป็นนักศึกษาจริงในแคมปัส
          </p>
        </div>

        {/* Register Redirection */}
        <div className="login-footer-register">
          <span className="register-prompt-text">ยังไม่ได้ยืนยันตัวตนใช่ไหม?</span>
          <button
            type="button"
            className="register-prompt-link"
            onClick={onNavigateToRegister}
          >
            ลงทะเบียนยืนยันตัวตน SPU ที่นี่
          </button>
        </div>
      </form>
    </div>
  );
}

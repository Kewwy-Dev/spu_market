import React, { useEffect, useState } from 'react';
import { ArrowLeft, Mail, ShieldCheck, Loader2 } from 'lucide-react';
import OtpVerificationInput, { OTP_RESEND_COOLDOWN_SECONDS } from '../components/common/OtpVerificationInput';
import { getSupabaseConfigError, supabase } from '../lib/supabase';
import { isAllowedSpuEmail } from '../utils/validation';
import { isInLiffClient, openExternalUrl } from '../lib/liff';

export default function LoginPage({ onBack, authError = '', onClearAuthError, onLoginSuccess, inLiff = false }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (resendCountdown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  const sendOtp = async (targetEmail) => {
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { shouldCreateUser: true },
    });
    if (authError) throw authError;
  };

  const verifyOtpCode = async (codeToVerify) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = String(codeToVerify || '').trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      setError('กรุณากรอกรหัส OTP ตัวเลข 6 หลักให้ครบถ้วน');
      return;
    }
    if (!supabase) {
      setError(getSupabaseConfigError());
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedOtp,
        type: 'email',
      });
      if (verifyError) throw verifyError;
      if (data?.user) {
        onLoginSuccess?.(data.user);
      }
    } catch (verifyError) {
      setError(verifyError.message || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ กรุณาลองอีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    onClearAuthError?.();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return setError('กรุณากรอกอีเมลมหาวิทยาลัย');
    if (!isAllowedSpuEmail(trimmedEmail)) {
      return setError('กรุณาใช้อีเมล @spumail.net หรือ @spu.ac.th เท่านั้น');
    }
    if (!supabase) return setError(getSupabaseConfigError());

    if (!otpSent) {
      setIsLoading(true);
      try {
        await sendOtp(trimmedEmail);
        setOtp('');
        setOtpSent(true);
        setResendCountdown(OTP_RESEND_COOLDOWN_SECONDS);
        setNotice('ส่งรหัส OTP แล้ว');
      } catch (authError) {
        setError(authError.message || 'ส่งรหัส OTP ไม่สำเร็จ กรุณาลองอีกครั้ง');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    await verifyOtpCode(otp);
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isLoading) return;
    setError('');
    setNotice('');
    onClearAuthError?.();
    const trimmedEmail = email.trim().toLowerCase();
    if (!supabase) return setError(getSupabaseConfigError());
    setIsLoading(true);
    try {
      await sendOtp(trimmedEmail);
      setOtp('');
      setResendCountdown(OTP_RESEND_COOLDOWN_SECONDS);
      setNotice('ส่งรหัส OTP ใหม่แล้ว');
    } catch (authError) {
      setError(authError.message || 'ส่งรหัส OTP ไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSso = async () => {
    setError('');
    setNotice('');
    onClearAuthError?.();
    if (!supabase) return setError(getSupabaseConfigError());
    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (authError) throw authError;
    } catch (authError) {
      setError(authError.message || 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ');
      setIsLoading(false);
    }
  };

  const displayError = error || authError;
  const hasEmailError = Boolean(error && !isAllowedSpuEmail(email));
  const runningInLiff = inLiff || isInLiffClient();

  return (
    <div className="flex min-h-[calc(100dvh-64px)] w-full flex-col bg-white sm:bg-slate-50/70">
      <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-2.5 px-4 sm:px-6">
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-800 transition-all duration-200 hover:-translate-x-0.5 hover:bg-slate-100 hover:text-spu-pink"
            onClick={onBack}
            title="ย้อนกลับ"
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft size={20} strokeWidth={2.2} />
          </button>
          <h1 className="flex-1 text-left text-base sm:text-lg font-bold tracking-[-0.2px] text-slate-900">
            เข้าสู่ระบบ
          </h1>
          <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-spu-teal-border bg-spu-teal-light px-2.5 py-1 text-[0.7rem] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>SPU Auth</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-6 pb-20 sm:px-6">
        <div className="flex w-full max-w-md flex-col gap-4 sm:rounded-2xl sm:border sm:border-slate-200/80 sm:bg-white sm:p-7 sm:shadow-card">
          <div className="flex flex-col items-center pt-1 pb-1 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-pink-100 to-pink-200 text-spu-pink shadow-[0_8px_20px_rgba(230,0,126,0.18)]">
              <ShieldCheck size={36} className="drop-shadow-[0_2px_4px_rgba(230,0,126,0.25)]" strokeWidth={2.3} />
            </div>
            <h2 className="mb-1 text-[1.25rem] font-extrabold tracking-[-0.3px] text-slate-900">
              ยินดีต้อนรับสู่ SPU Market
            </h2>
            <p className="mb-2.5 text-[0.78rem] text-slate-500">ตลาดนัดซื้อขายปลอดภัยสำหรับชาวศรีปทุม</p>
            <div className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-spu-pink-border bg-spu-pink-light px-3 py-1 text-[0.72rem] text-spu-pink-dark shadow-[0_2px_6px_rgba(230,0,126,0.06)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>
                เข้าสู่ระบบด้วย <strong className="text-spu-pink">@spumail.net</strong> หรือ{' '}
                <strong className="text-spu-pink">@spu.ac.th</strong> เท่านั้น
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
            <div className={`flex flex-col gap-[5px] ${hasEmailError ? 'has-error' : ''}`}>
              <label htmlFor="login-email" className="text-[0.82rem] font-semibold text-slate-800">
                อีเมลมหาวิทยาลัย <span className="font-bold text-spu-pink">*</span>
              </label>
              <div
                className={`group relative flex items-center overflow-hidden rounded-xl border-[1.5px] transition-all duration-200 focus-within:border-spu-pink focus-within:bg-white focus-within:ring-[3px] focus-within:ring-spu-pink/12 ${
                  hasEmailError ? 'border-rose-600 bg-rose-50/70' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div
                  className="pointer-events-none absolute left-3 flex items-center text-slate-400 transition-colors duration-200 group-focus-within:text-spu-pink"
                  aria-hidden="true"
                >
                  <Mail size={18} strokeWidth={2} />
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  readOnly={otpSent}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError('');
                    setNotice('');
                    onClearAuthError?.();
                  }}
                  placeholder="กรอกอีเมล"
                  autoComplete="email"
                  className={`h-11 w-full border-0 bg-transparent pr-3 pl-[38px] text-[0.86rem] text-slate-900 outline-none focus:outline-none placeholder:text-[0.84rem] placeholder:text-slate-400 ${otpSent ? 'opacity-70' : ''}`}
                  required
                />
              </div>
            </div>

            {otpSent && (
              <div className="flex flex-col gap-2 animate-[fadeIn_0.2s_ease]">
                <div className="flex items-center justify-between">
                  <span className="text-[0.82rem] font-semibold text-slate-800">
                    รหัส OTP 6 หลัก <span className="font-bold text-spu-pink">*</span>
                  </span>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      setResendCountdown(0);
                      setError('');
                      setNotice('');
                    }}
                    className="text-[0.72rem] font-semibold text-spu-pink hover:underline disabled:opacity-60"
                  >
                    เปลี่ยนอีเมล
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-4">
                  <OtpVerificationInput
                    email={email.trim().toLowerCase()}
                    noticeTitle={notice || 'ส่งรหัส OTP แล้ว'}
                    value={otp}
                    onChange={(nextOtp) => {
                      setOtp(nextOtp);
                      setError('');
                    }}
                    onComplete={verifyOtpCode}
                    onResend={handleResendOtp}
                    countdownSeconds={resendCountdown}
                    isInvalid={Boolean(displayError)}
                    isVerifying={isLoading}
                    isResending={isLoading}
                  />
                </div>
              </div>
            )}

            {displayError && (
              <div className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-center text-[0.74rem] font-semibold text-rose-700 animate-[fadeIn_0.2s_ease]" role="alert">
                <span>{displayError}</span>
              </div>
            )}

            {!otpSent && (
              <button
                type="submit"
                disabled={isLoading}
                className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#e6007e] to-[#d81b60] text-[0.95rem] font-bold text-white shadow-[0_8px_22px_rgba(230,0,126,0.35)] transition-all duration-200 hover:-translate-y-px hover:from-[#ee1188] hover:to-[#e0236a] hover:shadow-[0_10px_26px_rgba(230,0,126,0.45)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>กำลังส่งรหัส OTP...</span>
                  </>
                ) : (
                  <span>ส่งรหัส OTP</span>
                )}
              </button>
            )}

            <div className="my-0.5 flex items-center gap-2.5">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[0.7rem] font-medium text-slate-400">หรือ</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            {runningInLiff ? (
              <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-center">
                <p className="text-[0.74rem] font-medium text-emerald-800">
                  กำลังใช้งานผ่าน LINE: ยืนยันอีเมล SPU ด้วยรหัส OTP ด้านบนเพื่อผูกบัญชีอัตโนมัติ (ครั้งถัดไปจะเข้าสู่ระบบให้อัตโนมัติ)
                </p>
                <button
                  type="button"
                  onClick={() => openExternalUrl(window.location.href)}
                  className="text-[0.74rem] font-bold text-emerald-700 underline hover:text-emerald-900"
                >
                  เปิดในเบราว์เซอร์ภายนอกเพื่อใช้ Google SSO
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGoogleSso}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-slate-200 bg-white text-[0.82rem] font-semibold text-slate-800 transition-all duration-200 hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_4px_10px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-75"
              >
                <svg className="shrink-0" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>ลงชื่อเข้าใช้ด้วย Google</span>
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

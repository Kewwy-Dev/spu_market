import React, { useEffect, useRef } from 'react';
import { InputOTP, REGEXP_ONLY_DIGITS } from '@heroui/react';
import { Loader2 } from 'lucide-react';

export const OTP_RESEND_COOLDOWN_SECONDS = 300;

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function OtpVerificationInput({
  email = '',
  noticeTitle = 'ส่งรหัส OTP แล้ว',
  value,
  onChange,
  onComplete,
  onResend,
  countdownSeconds,
  isInvalid = false,
  isDisabled = false,
  isVerifying = false,
  isResending = false,
  variant = 'primary',
}) {
  const lastAutoSubmittedCode = useRef('');

  useEffect(() => {
    if (value.length < 6) {
      lastAutoSubmittedCode.current = '';
    }
  }, [value]);

  const handleComplete = (completedCode) => {
    const digitsOnly = String(completedCode || '').replace(/\D/g, '').slice(0, 6);
    if (!/^\d{6}$/.test(digitsOnly)) return;
    if (isDisabled || isVerifying || lastAutoSubmittedCode.current === digitsOnly) return;
    lastAutoSubmittedCode.current = digitsOnly;
    onComplete?.(digitsOnly);
  };

  const handleChange = (nextValue) => {
    const digitsOnly = String(nextValue || '').replace(/\D/g, '').slice(0, 6);
    onChange(digitsOnly);
    if (digitsOnly.length === 6) {
      handleComplete(digitsOnly);
    }
  };

  const canResend = countdownSeconds <= 0 && !isDisabled && !isVerifying && !isResending;

  return (
    <div className="flex flex-col items-center gap-3">
      {email && (
        <p className="text-center text-[0.75rem] leading-relaxed text-slate-600" role="status">
          {noticeTitle}ไปที่{' '}
          <span className="font-semibold text-spu-pink break-all">{email}</span>
          <br />
          กรอกครบ 6 หลักเพื่อยืนยันอัตโนมัติ
        </p>
      )}

      <InputOTP
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoFocus
        variant={variant}
        value={value}
        onChange={handleChange}
        onComplete={handleComplete}
        isInvalid={isInvalid}
        isDisabled={isDisabled || isVerifying}
        className="justify-center"
      >
        <InputOTP.Group>
          <InputOTP.Slot index={0} className="h-12 w-10 text-base font-bold sm:w-11" />
          <InputOTP.Slot index={1} className="h-12 w-10 text-base font-bold sm:w-11" />
          <InputOTP.Slot index={2} className="h-12 w-10 text-base font-bold sm:w-11" />
        </InputOTP.Group>
        <InputOTP.Separator />
        <InputOTP.Group>
          <InputOTP.Slot index={3} className="h-12 w-10 text-base font-bold sm:w-11" />
          <InputOTP.Slot index={4} className="h-12 w-10 text-base font-bold sm:w-11" />
          <InputOTP.Slot index={5} className="h-12 w-10 text-base font-bold sm:w-11" />
        </InputOTP.Group>
      </InputOTP>

      {isVerifying ? (
        <div className="inline-flex items-center gap-1.5 text-[0.74rem] font-semibold text-spu-pink" role="status">
          <Loader2 size={14} className="animate-spin" />
          <span>กำลังตรวจสอบรหัส OTP...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1.5 text-[0.74rem]">
          {countdownSeconds > 0 ? (
            <span className="font-medium text-slate-500">
              ส่งรหัสอีกครั้งได้ใน{' '}
              <strong className="font-mono font-bold text-spu-pink tabular-nums">
                {formatCountdown(countdownSeconds)}
              </strong>
            </span>
          ) : (
            <button
              type="button"
              disabled={!canResend}
              onClick={onResend}
              className="inline-flex items-center gap-1.5 font-bold text-spu-pink transition-opacity hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>กำลังส่งรหัสใหม่...</span>
                </>
              ) : (
                <span>ไม่ได้รับรหัส? ส่งรหัสอีกครั้ง</span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

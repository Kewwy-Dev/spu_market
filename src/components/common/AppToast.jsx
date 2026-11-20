import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const TOAST_STYLES = {
  success: {
    container: 'border-pink-200/90 bg-white/95 text-slate-800',
    iconWrap: 'bg-emerald-50 text-emerald-600',
    Icon: CheckCircle2,
  },
  error: {
    container: 'border-rose-200 bg-rose-50/95 text-rose-800',
    iconWrap: 'bg-rose-100 text-rose-600',
    Icon: AlertCircle,
  },
  info: {
    container: 'border-pink-200/80 bg-white/95 text-slate-800',
    iconWrap: 'bg-pink-50 text-spu-pink',
    Icon: Info,
  },
};

export default function AppToast({ toast, onClose }) {
  if (!toast?.message) return null;

  const variant = TOAST_STYLES[toast.type] || TOAST_STYLES.success;
  const { Icon } = variant;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[1000] flex justify-center px-4">
      <aside
        className={`flex max-w-[min(100%,420px)] items-center gap-2 rounded-full border py-1.5 pr-3 pl-2 text-xs font-semibold backdrop-blur-md shadow-[0_10px_28px_-4px_rgba(15,23,42,0.12),0_4px_10px_-2px_rgba(230,0,126,0.08)] animate-[toastFadeInDown_0.25s_cubic-bezier(0.16,1,0.3,1)_forwards] sm:text-[0.8rem] ${
          onClose ? 'pointer-events-auto' : 'pointer-events-none'
        } ${variant.container}`}
        role={toast.type === 'error' ? 'alert' : 'status'}
        aria-live="polite"
      >
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${variant.iconWrap}`} aria-hidden="true">
          <Icon size={14} strokeWidth={2.3} />
        </span>
        <span className="truncate">{toast.message}</span>
        {onClose && (
          <button
            type="button"
            className="ml-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            aria-label="ปิดการแจ้งเตือน"
          >
            <X size={13} />
          </button>
        )}
      </aside>
    </div>
  );
}

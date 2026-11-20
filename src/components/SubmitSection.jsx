import React from 'react';
import { Send, ShieldCheck, Loader2 } from 'lucide-react';

export default function SubmitSection({ isSubmitting = false }) {
  return (
    <div className="mt-1.5 flex flex-col items-center gap-2">
      <button
        type="submit"
        disabled={isSubmitting}
        className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#e6007e] to-[#d81b60] text-[0.95rem] font-bold text-white shadow-[0_8px_20px_rgba(230,0,126,0.32)] transition-all duration-200 hover:-translate-y-px hover:from-[#ee1188] hover:to-[#e0236a] hover:shadow-[0_10px_24px_rgba(230,0,126,0.42)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>กำลังส่งรหัส OTP...</span>
          </>
        ) : (
          <>
            <Send size={18} className="transition-transform duration-200 group-hover:translate-x-[3px]" strokeWidth={2.4} />
            <span>ส่งข้อมูลยืนยันตัวตน</span>
          </>
        )}
      </button>
      <div className="flex items-center gap-1 text-[0.72rem] font-semibold text-spu-teal">
        <ShieldCheck size={14} className="text-emerald-500" />
        <span>ยืนยันตัวตน อีเมลมหาวิทยาลัย (@spumail.net)</span>
      </div>
    </div>
  );
}

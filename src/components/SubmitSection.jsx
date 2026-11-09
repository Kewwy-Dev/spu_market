import React from 'react';
import { Send, ShieldCheck, Loader2 } from 'lucide-react';

export default function SubmitSection({ isSubmitting = false }) {
  return <div className="submit-section">
    <button type="submit" disabled={isSubmitting} className="submit-button">
      {isSubmitting ? <><Loader2 size={18} className="spin-icon" /><span>กำลังส่งรหัส OTP...</span></> : <><Send size={18} className="send-icon" strokeWidth={2.4} /><span>ส่งข้อมูลยืนยันตัวตน</span></>}
    </button>
    <div className="approval-badge"><ShieldCheck size={14} className="zap-icon" /><span>ยืนยันตัวตนด้วย OTP ทางอีเมลมหาวิทยาลัย (@spumail.net)</span></div>
  </div>;
}

import React from 'react';
import { GraduationCap, Building2 } from 'lucide-react';

export default function MemberTypeSelector({ memberType, onSelectType }) {
  const btnBase = 'flex h-[42px] items-center justify-center gap-1.5 rounded-[10px] px-2 text-[0.82rem] font-semibold transition-all duration-200';
  const btnActive = 'border border-spu-pink-border/60 bg-white text-spu-pink shadow-[0_2px_8px_rgba(15,23,42,0.08),0_0_1px_rgba(15,23,42,0.1)]';
  const btnIdle = 'text-slate-500 hover:bg-white/50 hover:text-slate-700';

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[0.85rem] font-semibold text-slate-700">เลือกประเภท</label>
      <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-slate-100 p-1" role="group" aria-label="เลือกประเภทสมาชิก">
        <button
          type="button"
          aria-pressed={memberType === 'student'}
          className={`${btnBase} ${memberType === 'student' ? btnActive : btnIdle}`}
          onClick={() => onSelectType('student')}
        >
          <GraduationCap size={18} className={memberType === 'student' ? 'text-spu-pink' : 'text-slate-400'} strokeWidth={2.2} />
          <span>นักศึกษา</span>
        </button>
        <button
          type="button"
          aria-pressed={memberType === 'staff'}
          className={`${btnBase} ${memberType === 'staff' ? btnActive : btnIdle}`}
          onClick={() => onSelectType('staff')}
        >
          <Building2 size={18} className={memberType === 'staff' ? 'text-spu-pink' : 'text-slate-400'} strokeWidth={2} />
          <span>อาจารย์ / บุคลากร</span>
        </button>
      </div>
    </div>
  );
}

import React from 'react';
import { GraduationCap, Building2 } from 'lucide-react';

export default function MemberTypeSelector({ memberType, onSelectType }) {
  return <div className="member-type-section">
    <label className="section-label">เลือกประเภท</label>
    <div className="segmented-control" role="group" aria-label="เลือกประเภทสมาชิก">
      <button type="button" aria-pressed={memberType === 'student'} className={`segment-button ${memberType === 'student' ? 'active' : ''}`} onClick={() => onSelectType('student')}>
        <GraduationCap size={18} className="segment-icon" strokeWidth={2.2} /><span>นักศึกษา</span>
      </button>
      <button type="button" aria-pressed={memberType === 'staff'} className={`segment-button ${memberType === 'staff' ? 'active' : ''}`} onClick={() => onSelectType('staff')}>
        <Building2 size={18} className="segment-icon" strokeWidth={2} /><span>อาจารย์ / บุคลากร</span>
      </button>
    </div>
  </div>;
}

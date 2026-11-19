import React from 'react';
import { GraduationCap, ChevronDown } from 'lucide-react';
import { getMajorsByFaculty } from '../data/faculties';

export default function MajorSelect({
  id = 'major-select',
  faculty,
  value,
  onChange,
  error,
  required = true,
}) {
  const majors = getMajorsByFaculty(faculty);
  const isDisabled = !faculty || majors.length === 0;
  const hasLegacyValue = Boolean(value && majors.length > 0 && !majors.includes(value));

  return (
    <div className={`form-field-group ${error ? 'has-error' : ''}`}>
      <div className="field-header">
        <label htmlFor={id} className="field-label">
          สาขาวิชา {required && <span className="required-star">*</span>}
        </label>
      </div>
      <div className="input-wrapper select-wrapper">
        <div className="input-icon-left" aria-hidden="true">
          <GraduationCap size={18} strokeWidth={2} />
        </div>
        <select
          id={id}
          value={isDisabled ? '' : value}
          onChange={onChange}
          disabled={isDisabled}
          className="form-select with-icon"
        >
          <option value="">
            {!faculty
              ? 'กรุณาเลือกคณะก่อน'
              : majors.length === 0
                ? 'ไม่พบสาขาวิชาสำหรับคณะนี้'
                : 'เลือกสาขาวิชา'}
          </option>
          {hasLegacyValue && <option value={value}>{value}</option>}
          {majors.map((major) => (
            <option key={major} value={major}>
              {major}
            </option>
          ))}
        </select>
        <div className="select-chevron" aria-hidden="true">
          <ChevronDown size={18} strokeWidth={2.2} />
        </div>
      </div>
      {error && (
        <p className="field-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

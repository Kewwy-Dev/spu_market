import React from 'react';
import { Landmark, ChevronDown } from 'lucide-react';
import { FACULTIES } from '../data/faculties';

export default function FacultySelect({
  id = 'faculty-select',
  value,
  onChange,
  error,
  required = true,
}) {
  return (
    <div className={`form-field-group ${error ? 'has-error' : ''}`}>
      <div className="field-header">
        <label htmlFor={id} className="field-label">
          คณะ / ภาควิชา {required && <span className="required-star">*</span>}
        </label>
      </div>

      <div className="input-wrapper select-wrapper">
        <div className="input-icon-left" aria-hidden="true">
          <Landmark size={18} strokeWidth={2} />
        </div>

        <select
          id={id}
          value={value}
          onChange={onChange}
          className="form-select with-icon"
        >
          <option value="">เลือกคณะของคุณ</option>
          {FACULTIES.map((faculty) => (
            <option key={faculty.id} value={faculty.name}>
              {faculty.name}
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

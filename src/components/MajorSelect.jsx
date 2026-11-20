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
    <div className={`flex flex-col gap-[5px] ${error ? 'has-error' : ''}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[0.82rem] font-semibold text-slate-800">
          สาขาวิชา {required && <span className="font-bold text-spu-pink">*</span>}
        </label>
      </div>
      <div
        className={`group relative flex items-center rounded-xl border-[1.5px] transition-all duration-200 focus-within:border-spu-pink focus-within:bg-white focus-within:ring-[3px] focus-within:ring-spu-pink/12 ${
          error ? 'border-rose-600 bg-rose-50/70' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div
          className="pointer-events-none absolute left-3 flex items-center text-slate-400 transition-colors duration-200 group-focus-within:text-spu-pink"
          aria-hidden="true"
        >
          <GraduationCap size={18} strokeWidth={2} />
        </div>
        <select
          id={id}
          value={isDisabled ? '' : value}
          onChange={onChange}
          disabled={isDisabled}
          className="h-11 w-full cursor-pointer appearance-none border-0 bg-transparent pr-[34px] pl-[38px] text-[0.84rem] text-slate-900 outline-none focus:outline-none disabled:cursor-not-allowed disabled:text-slate-400"
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
        <div className="pointer-events-none absolute right-3 flex items-center text-slate-400" aria-hidden="true">
          <ChevronDown size={18} strokeWidth={2.2} />
        </div>
      </div>
      {error && (
        <p className="mt-0.5 text-[0.72rem] font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

import React from 'react';
import { GraduationCap } from 'lucide-react';
import SpuSelect from './common/SpuSelect';
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
  const options = [
    ...(hasLegacyValue ? [{ value, label: value }] : []),
    ...majors.map((major) => ({ value: major, label: major })),
  ];

  const placeholder = !faculty
    ? 'กรุณาเลือกคณะก่อน'
    : majors.length === 0
      ? 'ไม่พบสาขาวิชาสำหรับคณะนี้'
      : 'เลือกสาขาวิชา';

  return (
    <SpuSelect
      id={id}
      label="สาขาวิชา"
      required={required}
      icon={GraduationCap}
      placeholder={placeholder}
      value={isDisabled ? '' : value}
      onValueChange={(nextValue) => onChange?.({ target: { value: nextValue } })}
      options={options}
      isDisabled={isDisabled}
      error={error}
    />
  );
}

import React from 'react';
import { Landmark } from 'lucide-react';
import SpuSelect from './common/SpuSelect';
import { FACULTIES } from '../data/faculties';

export default function FacultySelect({ id = 'faculty-select', value, onChange, error, required = true }) {
  const hasLegacyValue = Boolean(value && !FACULTIES.some((faculty) => faculty.name === value));
  const options = [
    ...(hasLegacyValue ? [{ value, label: value }] : []),
    ...FACULTIES.map((faculty) => ({ value: faculty.name, label: faculty.name })),
  ];

  return (
    <SpuSelect
      id={id}
      label="คณะ"
      required={required}
      icon={Landmark}
      placeholder="เลือกคณะที่เรียน"
      value={value}
      onValueChange={(nextValue) => onChange?.({ target: { value: nextValue } })}
      options={options}
      error={error}
    />
  );
}

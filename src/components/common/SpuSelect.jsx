import React from 'react';
import { Label, ListBox, Select } from '@heroui/react';

export default function SpuSelect({
  id,
  label,
  required = false,
  icon: Icon,
  placeholder = 'เลือกรายการ',
  value = '',
  onValueChange,
  options = [],
  isDisabled = false,
  error = '',
  labelClassName = 'text-[0.82rem] font-semibold text-slate-800',
  triggerClassName = 'bg-slate-50 border-[1.5px] border-slate-200 text-[0.84rem]',
}) {
  const selectedKey = value ? String(value) : null;

  return (
    <div className={`flex flex-col gap-[5px] ${error ? 'has-error' : ''}`}>
      <Select
        id={id}
        fullWidth
        placeholder={placeholder}
        value={selectedKey}
        onChange={(nextKey) => onValueChange?.(nextKey ? String(nextKey) : '')}
        isDisabled={isDisabled}
        isInvalid={Boolean(error)}
      >
        {label && (
          <Label className={labelClassName}>
            {label} {required && <span className="font-bold text-spu-pink">*</span>}
          </Label>
        )}
        <Select.Trigger
          className={`flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left transition-all duration-200 focus-visible:border-spu-pink focus-visible:bg-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-spu-pink/12 data-[open=true]:border-spu-pink data-[open=true]:bg-white data-[open=true]:ring-[3px] data-[open=true]:ring-spu-pink/12 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
            error ? 'border-rose-600 bg-rose-50/70' : triggerClassName
          }`}
        >
          {Icon && (
            <Icon
              size={17}
              strokeWidth={2}
              className="shrink-0 text-slate-400"
              aria-hidden="true"
            />
          )}
          <Select.Value className="min-w-0 flex-1 truncate text-left text-slate-900 data-[placeholder=true]:text-slate-400" />
          <Select.Indicator className="shrink-0 text-slate-400" />
        </Select.Trigger>
        <Select.Popover className="z-[1100] w-[var(--trigger-width)] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
          <ListBox className="max-h-64 overflow-y-auto outline-none">
            {options.map((option) => (
              <ListBox.Item
                key={option.value}
                id={option.value}
                textValue={option.label}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[0.82rem] font-medium text-slate-700 outline-none transition-colors hover:bg-spu-pink-light/70 hover:text-spu-pink focus:bg-spu-pink-light/70 focus:text-spu-pink data-[selected=true]:bg-spu-pink-light data-[selected=true]:font-semibold data-[selected=true]:text-spu-pink"
              >
                <span className="min-w-0 flex-1 leading-snug">{option.label}</span>
                <ListBox.ItemIndicator className="shrink-0 text-spu-pink" />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {error && (
        <p className="mt-0.5 text-[0.72rem] font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

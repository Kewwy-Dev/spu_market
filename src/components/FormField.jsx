import React from 'react';

export default function FormField({
  id,
  label,
  required = false,
  exampleHint,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  helperText,
  error,
  maxLength,
  inputMode,
  autoComplete,
  readOnly = false,
}) {
  return (
    <div className={`flex flex-col gap-[5px] ${error ? 'has-error' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[0.82rem] font-semibold text-slate-800">
          {label} {required && <span className="font-bold text-spu-pink">*</span>}
        </label>
        {exampleHint && <span className="text-[0.74rem] font-medium text-slate-500">{exampleHint}</span>}
      </div>

      <div
        className={`group relative flex items-center overflow-hidden rounded-xl border-[1.5px] transition-all duration-200 focus-within:border-spu-pink focus-within:bg-white focus-within:ring-[3px] focus-within:ring-spu-pink/12 ${
          error ? 'border-rose-600 bg-rose-50/70' : 'border-slate-200 bg-slate-50'
        }`}
      >
        {Icon && (
          <div
            className="pointer-events-none absolute left-3 flex items-center text-slate-400 transition-colors duration-200 group-focus-within:text-spu-pink"
            aria-hidden="true"
          >
            <Icon size={18} strokeWidth={2} />
          </div>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          readOnly={readOnly}
          className={`h-11 w-full border-0 bg-transparent pr-3 text-[0.86rem] text-slate-900 outline-none focus:outline-none placeholder:text-[0.84rem] placeholder:text-slate-400 read-only:cursor-not-allowed read-only:bg-slate-50 read-only:text-slate-500 ${
            Icon ? 'pl-[38px]' : 'pl-3'
          }`}
        />
      </div>

      {helperText && !error && (
        <p className="mt-0.5 text-[0.72rem] leading-[1.35] text-slate-500">
          {helperText}
        </p>
      )}

      {error && (
        <p className="mt-0.5 text-[0.72rem] font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

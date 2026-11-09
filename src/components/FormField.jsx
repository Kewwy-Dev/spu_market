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
    <div className={`form-field-group ${error ? 'has-error' : ''}`}>
      <div className="field-header">
        <label htmlFor={id} className="field-label">
          {label} {required && <span className="required-star">*</span>}
        </label>
        {exampleHint && <span className="field-example-hint">{exampleHint}</span>}
      </div>

      <div className="input-wrapper">
        {Icon && (
          <div className="input-icon-left" aria-hidden="true">
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
          className={`form-input ${Icon ? 'with-icon' : ''}`}
        />
      </div>

      {helperText && !error && (
        <p className="field-helper-text">
          {helperText}
        </p>
      )}

      {error && (
        <p className="field-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

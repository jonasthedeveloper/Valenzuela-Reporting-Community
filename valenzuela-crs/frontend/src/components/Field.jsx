import { useState } from 'react';
import Icon from './Icon';

export function Field({ label, htmlFor, error, hint, required, children }) {
  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label} {required && <span className="required" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function TextInput({ label, name, error, hint, required, icon, ...rest }) {
  return (
    <Field label={label} htmlFor={name} error={error} hint={hint} required={required}>
      {icon ? (
        <div className="input-icon">
          <Icon name={icon} size={18} />
          <input id={name} name={name} className={`input${error ? ' has-error' : ''}`} {...rest} />
        </div>
      ) : (
        <input id={name} name={name} className={`input${error ? ' has-error' : ''}`} {...rest} />
      )}
    </Field>
  );
}

export function PasswordInput({ label, name, error, hint, required, ...rest }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} htmlFor={name} error={error} hint={hint} required={required}>
      <div className="input-icon">
        <Icon name="lock" size={18} />
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          className={`input${error ? ' has-error' : ''}`}
          style={{ paddingRight: 44 }}
          {...rest}
        />
        <button
          type="button"
          className="input-affix"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={17} />
        </button>
      </div>
    </Field>
  );
}

export function SelectInput({ label, name, error, hint, required, options = [], placeholder, ...rest }) {
  return (
    <Field label={label} htmlFor={name} error={error} hint={hint} required={required}>
      <select id={name} name={name} className={`select${error ? ' has-error' : ''}`} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </Field>
  );
}

export function TextArea({ label, name, error, hint, required, ...rest }) {
  return (
    <Field label={label} htmlFor={name} error={error} hint={hint} required={required}>
      <textarea id={name} name={name} className={`textarea${error ? ' has-error' : ''}`} {...rest} />
    </Field>
  );
}

export function FormMessage({ type = 'error', children }) {
  if (!children) return null;
  return (
    <div className={type === 'error' ? 'form-error-summary' : 'form-success-summary'} role="alert">
      <Icon name={type === 'error' ? 'alert-circle' : 'check-circle'} size={17} style={{ marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}

import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';

export default function SensorInput({
  id,
  name,
  label,
  value,
  onChange,
  unit,
  placeholder,
  min,
  max,
  step = 'any',
  error,
  hint,
  trainingRange,
  disabled = false
}) {
  const isOutOfTraining =
    trainingRange &&
    value !== '' &&
    !isNaN(Number(value)) &&
    (Number(value) < trainingRange.min || Number(value) > trainingRange.max);

  return (
    <div className="form-group">
      <div className="form-label">
        <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>{label}</span>
          {min !== undefined && max !== undefined && (
            <span className="form-hint" style={{ fontSize: '0.74rem' }}>
              ({min} – {max})
            </span>
          )}
        </label>
        {hint && <span className="form-hint">{hint}</span>}
      </div>

      <div className="input-with-unit">
        <input
          type="number"
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          style={{
            borderColor: error ? 'var(--color-danger)' : undefined
          }}
        />
        {unit && <span className="unit-tag">{unit}</span>}
      </div>

      {error && (
        <div id={`${id}-error`} className="form-error" role="alert">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {isOutOfTraining && !error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--color-warning)',
            fontSize: '0.78rem',
            marginTop: '0.2rem'
          }}
        >
          <AlertTriangle size={13} />
          <span>
            Outside model training range ({trainingRange.min}–{trainingRange.max} {unit}). Predictions may have lower confidence.
          </span>
        </div>
      )}
    </div>
  );
}

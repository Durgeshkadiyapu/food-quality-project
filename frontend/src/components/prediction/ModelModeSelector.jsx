import React from 'react';
import { Info, Sparkles, Layers, FlaskConical } from 'lucide-react';

export default function ModelModeSelector({
  modes = ['proxy_real', 'synthetic_demo', 'combined_demo'],
  selectedMode,
  onChange,
  disabled = false
}) {
  const modeMetadata = {
    proxy_real: {
      label: 'Proxy Real (Lab Rows)',
      icon: FlaskConical,
      tag: 'Real Sensors',
      tagClass: 'badge-fresh',
      description: 'Trained on empirical sensor readings from chamber specimens with storage-day proxy labels.'
    },
    synthetic_demo: {
      label: 'Synthetic Demo',
      icon: Sparkles,
      tag: 'Simulation / Demo',
      tagClass: 'badge-info',
      description: 'Generates responses using physics-approximated synthetic data across wide produce categories.'
    },
    combined_demo: {
      label: 'Combined Demo',
      icon: Layers,
      tag: 'Experimental',
      tagClass: 'badge-warning',
      description: 'Blends empirical laboratory rows with synthetic boundary extensions for exploratory trials.'
    }
  };

  const currentMeta = modeMetadata[selectedMode] || {
    label: selectedMode,
    icon: Info,
    tag: 'Mode',
    tagClass: 'badge-neutral',
    description: 'Select an inference pipeline model mode.'
  };

  return (
    <div className="form-group">
      <div className="form-label">
        <label htmlFor="model_mode">Model Mode</label>
        <span className={`badge ${currentMeta.tagClass}`}>
          {currentMeta.tag}
        </span>
      </div>

      <select
        id="model_mode"
        name="model_mode"
        value={selectedMode}
        onChange={(e) => onChange(e.target.value)}
        className="form-select"
        disabled={disabled}
      >
        {modes.map((mode) => {
          const meta = modeMetadata[mode];
          return (
            <option key={mode} value={mode}>
              {meta ? `${meta.label} — [${meta.tag}]` : mode}
            </option>
          );
        })}
      </select>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.35rem' }}>
        {currentMeta.description}
      </p>
    </div>
  );
}

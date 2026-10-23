import React from 'react';
import {
  FlaskConical,
  Sparkles,
  Layers,
  ShieldAlert,
  Thermometer,
  Droplets,
  Wind,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useCapabilities } from '../hooks/useCapabilities';
import LoadingState from '../components/common/LoadingState';

export default function AboutModel() {
  const { capabilities, loading } = useCapabilities();

  const supportedModes = capabilities?.supported_modes || ['proxy_real', 'synthetic_demo', 'combined_demo'];
  const trainingRanges = capabilities?.training_ranges || {
    temperature_C: { min: 28.5, max: 33.6 },
    humidity_pct: { min: 66.0, max: 100.0 }
  };
  const modeFoodSupport = capabilities?.mode_food_support || {};

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      {/* Page Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            backgroundColor: 'var(--color-mint-light)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--color-primary)',
            marginBottom: '1rem'
          }}
        >
          <Info size={14} />
          <span>Scientific Context & Model Architecture</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>About the Prediction Models</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto' }}>
          Detailed breakdown of inference modes, proxy-derived labeling methodology, sensor calibration limits, and safety disclaimers.
        </p>
      </div>

      {loading && <LoadingState message="Loading live model configuration..." />}

      {/* Model Modes Explanation Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          Supported Inference Modes
        </h2>

        {/* Mode 1: proxy_real */}
        {supportedModes.includes('proxy_real') && (
          <div className="card">
            <div className="card-header" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-mint-light)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)' }}>
                  <FlaskConical size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0 }}>proxy_real (Empirical Laboratory Mode)</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Default Production Pipeline</span>
                </div>
              </div>
              <span className="badge badge-fresh">Empirical Lab Data</span>
            </div>
            <div className="card-body">
              <p style={{ marginBottom: '1rem' }}>
                The <strong>proxy_real</strong> mode operates on empirical sensor rows collected inside closed chamber environments from physical fruit specimens (such as Apple, Banana, and Tomato).
              </p>

              <div style={{ backgroundColor: 'var(--color-background-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                <strong style={{ display: 'block', fontSize: '0.88rem', marginBottom: '0.35rem', color: 'var(--color-text)' }}>
                  Proxy Labeling Methodology
                </strong>
                <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--color-text-secondary)' }}>
                  Target freshness classes were assigned based on storage duration intervals:
                  <br />• <strong>Days 1–2:</strong> Designated as <em>Fresh</em>
                  <br />• <strong>Days 3–4:</strong> Designated as <em>Semi-Fresh</em>
                  <br />• <strong>Day 5+:</strong> Designated as <em>Spoiled</em>
                  <br />
                  <em style={{ fontSize: '0.8rem', color: 'var(--color-muted)', display: 'block', marginTop: '0.5rem' }}>
                    Critical Notice: Storage-day proxy labels are duration markers rather than independently verified biochemical or microbiological assays.
                  </em>
                </p>
              </div>

              {modeFoodSupport.proxy_real && (
                <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                  Supported Produce: <strong>{modeFoodSupport.proxy_real.join(', ')}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode 2: synthetic_demo */}
        {supportedModes.includes('synthetic_demo') && (
          <div className="card">
            <div className="card-header" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-info-bg)', borderRadius: 'var(--radius-md)', color: '#0284c7' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0 }}>synthetic_demo (Demonstration Mode)</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Extended Catalog Simulation</span>
                </div>
              </div>
              <span className="badge badge-info">Demonstration Mode</span>
            </div>
            <div className="card-body">
              <p style={{ marginBottom: '1rem' }}>
                The <strong>synthetic_demo</strong> mode allows exploratory demonstration across 18+ agricultural items (citrus, berries, melons, root vegetables) using mathematically simulated degradation trajectories.
              </p>
              <div style={{ backgroundColor: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: '#075985' }}>
                This mode must be interpreted strictly as a software and pipeline demonstration. Readings and scores do not represent empirical physical chamber tests.
              </div>
            </div>
          </div>
        )}

        {/* Mode 3: combined_demo */}
        {supportedModes.includes('combined_demo') && (
          <div className="card">
            <div className="card-header" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-warning-bg)', borderRadius: 'var(--radius-md)', color: 'var(--color-warning)' }}>
                  <Layers size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0 }}>combined_demo (Experimental Hybrid Mode)</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Blended Empirical & Synthetic Matrix</span>
                </div>
              </div>
              <span className="badge badge-warning">Experimental</span>
            </div>
            <div className="card-body">
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                The <strong>combined_demo</strong> mode blends available laboratory rows with boundary synthetic permutations to assess classifier robustness when operating near sensor saturation limits.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Verified Training Ranges Section */}
      <div className="card" style={{ marginBottom: '3rem' }}>
        <div className="card-header">
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Verified Model Reference Ranges</h2>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            The machine learning model was trained with produce samples monitored under specific ambient chamber conditions:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-background-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706', marginBottom: '0.5rem' }}>
                <Thermometer size={18} />
                <strong style={{ fontSize: '0.92rem' }}>Chamber Temperature Range</strong>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {trainingRanges.temperature_C?.min ?? 28.5} – {trainingRanges.temperature_C?.max ?? 33.6} °C
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                Input outside this span triggers an out-of-training advisory.
              </div>
            </div>

            <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-background-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2563eb', marginBottom: '0.5rem' }}>
                <Droplets size={18} />
                <strong style={{ fontSize: '0.92rem' }}>Chamber Humidity Range</strong>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {trainingRanges.humidity_pct?.min ?? 66.0} – {trainingRanges.humidity_pct?.max ?? 100.0} %
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                Input outside this span triggers an out-of-training advisory.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scientific Disclaimers & Safety Caveats */}
      <div
        style={{
          padding: '2rem',
          backgroundColor: 'var(--color-warning-bg)',
          border: '1px solid var(--color-warning-border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '2rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <ShieldAlert size={24} style={{ color: 'var(--color-warning)' }} />
          <h2 style={{ fontSize: '1.25rem', color: '#92400e', margin: 0 }}>
            Scientific Limitations & Safety Guarantees
          </h2>
        </div>

        <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#78350f', fontSize: '0.9rem', lineHeight: 1.5 }}>
          <li>
            <strong>No Food-Safety Guarantee:</strong> The classification is an exploratory prototype estimate and has not been evaluated by food safety regulators (FDA, EFSA, FSSAI). It cannot be used to declare produce safe for human consumption.
          </li>
          <li>
            <strong>Environmental Sensitivity:</strong> MOX gas sensors (MQ-3, MQ-135) exhibit cross-sensitivity to environmental humidity fluctuations, ambient airflow velocity, heater temperature variation, and alcohol-based cleaning agents.
          </li>
          <li>
            <strong>Extrapolation Outside Training Range:</strong> Readings outside the verified training span (e.g. cold storage below 28°C or dry air below 66% RH) represent extrapolation and will trigger reliability warnings.
          </li>
          <li>
            <strong>Demonstration Spoilage Tendency Score:</strong> The continuous spoilage score is a composite gas index designed for demonstration telemetry, not an actuarial food safety hazard ratio.
          </li>
          <li>
            <strong>No Scientifically Defensible Shelf Life:</strong> The model does not calculate or guarantee a remaining shelf life in days or hours.
          </li>
        </ul>
      </div>
    </div>
  );
}

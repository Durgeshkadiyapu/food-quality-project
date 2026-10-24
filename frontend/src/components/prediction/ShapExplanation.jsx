import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, BrainCircuit, LoaderCircle } from 'lucide-react';
import { getPredictionExplanation } from '../../services/api';

const FEATURE_LABELS = {
  fruit_type: 'Fruit type',
  MQ3_raw: 'MQ-3 reading',
  MQ135_raw: 'MQ-135 reading',
  temperature_C: 'Temperature',
  humidity_pct: 'Humidity'
};

export default function ShapExplanation({ result }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const readings = result?.sensor_readings || {};
  const modelMode = result?.requested_model_mode || result?.reported_training_mode || 'proxy_real';

  useEffect(() => {
    let active = true;
    async function load() {
      const required = ['MQ3_raw', 'MQ135_raw', 'temperature_C', 'humidity_pct'];
      if (!result?.fruit_type || required.some((key) => readings[key] === undefined || readings[key] === null)) {
        setState({ status: 'unavailable', data: null, error: 'Sensor inputs are not available for this saved result.' });
        return;
      }
      setState({ status: 'loading', data: null, error: '' });
      try {
        const response = await getPredictionExplanation({
          fruit_type: result.fruit_type,
          model_mode: modelMode,
          sensor_readings: {
            MQ3_raw: Number(readings.MQ3_raw),
            MQ135_raw: Number(readings.MQ135_raw),
            temperature_C: Number(readings.temperature_C),
            humidity_pct: Number(readings.humidity_pct)
          }
        });
        const data = response?.data || response;
        if (active) setState({ status: data?.available ? 'ready' : 'unavailable', data, error: data?.available ? '' : 'The ML service did not provide SHAP values.' });
      } catch (error) {
        if (active) setState({ status: 'unavailable', data: null, error: error.message || 'SHAP explanation is unavailable.' });
      }
    }
    load();
    return () => { active = false; };
  }, [result?.prediction_id, result?.fruit_type, modelMode, readings.MQ3_raw, readings.MQ135_raw, readings.temperature_C, readings.humidity_pct]);

  const data = state.data;
  const contributions = data?.class_contributions?.[data?.predicted_class] || [];
  const maxAbs = Math.max(0.000001, ...contributions.map((item) => Math.abs(Number(item.shap_value) || 0)));

  return (
    <section className="card" style={{ border: '1px solid var(--color-border)' }} aria-live="polite">
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <BrainCircuit size={20} />
        <div><h3 style={{ margin: 0 }}>SHAP Prediction Explanation</h3><span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Feature contributions for this model prediction</span></div>
      </div>
      <div className="card-body">
        {state.status === 'loading' && <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LoaderCircle size={17} /> Calculating SHAP contributions…</p>}
        {state.status === 'unavailable' && <div className="banner banner-warning"><AlertTriangle size={18} /><div><strong>Explanation unavailable</strong><p style={{ margin: '0.25rem 0 0' }}>{state.error} The prediction itself is separate and has not been changed.</p></div></div>}
        {state.status === 'ready' && contributions.length > 0 && <>
          <p style={{ marginTop: 0 }}>Actual SHAP contributions for <strong>{data.predicted_class}</strong>. Positive values push the model output toward this class; negative values push away from it.</p>
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            {contributions.map((item) => {
              const value = Number(item.shap_value) || 0;
              const positive = value >= 0;
              const width = Math.min(100, Math.abs(value) / maxAbs * 100);
              return <div key={item.feature}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
                  <strong>{FEATURE_LABELS[item.feature] || item.feature}</strong>
                  <span style={{ color: positive ? '#15803d' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{positive ? '+' : ''}{value.toFixed(4)}</span>
                </div>
                <div style={{ height: '8px', background: 'var(--color-background-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: width + '%', background: positive ? '#16a34a' : '#dc2626', borderRadius: '99px' }} />
                </div>
              </div>;
            })}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: 0 }}><Activity size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> Method: {data.method}. SHAP explains model behaviour; it does not prove causation, freshness or food safety. Labels are proxy/synthetic.</p>
        </>}
        {state.status === 'ready' && contributions.length === 0 && <div className="banner banner-warning"><AlertTriangle size={18} /> No class-specific SHAP contributions were returned.</div>}
      </div>
    </section>
  );
}

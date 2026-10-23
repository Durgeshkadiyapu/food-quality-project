import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FlaskConical,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Layers,
  Thermometer,
  Droplets,
  Wind,
  CheckCircle2
} from 'lucide-react';
import SensorInput from './SensorInput';
import ModelModeSelector from './ModelModeSelector';
import ErrorBanner from '../common/ErrorBanner';
import LoadingState from '../common/LoadingState';
import { useCapabilities } from '../../hooks/useCapabilities';
import { createPrediction } from '../../services/api';
import { validateForm, SENSOR_BOUNDS, TRAINING_RANGES } from '../../utils/validators';

const VERIFIED_SAMPLE = {
  fruit_type: 'Apple',
  model_mode: 'proxy_real',
  MQ3_raw: '2124',
  MQ135_raw: '2303',
  temperature_C: '30.8',
  humidity_pct: '88.85'
};

export default function PredictionForm({ onPredictionSuccess }) {
  const { capabilities, loading: capsLoading, error: capsError, refetch: refetchCaps } = useCapabilities();

  const [formData, setFormData] = useState({
    fruit_type: 'Apple',
    model_mode: 'proxy_real',
    MQ3_raw: '',
    MQ135_raw: '',
    temperature_C: '',
    humidity_pct: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);

  // Sync mode and available foods when capabilities load
  const supportedModes = capabilities?.supported_modes || ['proxy_real', 'synthetic_demo', 'combined_demo'];
  const modeFoodMap = capabilities?.mode_food_support || {
    proxy_real: ['Apple', 'Banana', 'Tomato'],
    synthetic_demo: ['Apple', 'Banana', 'Tomato', 'Orange', 'Mango', 'Cucumber', 'Carrot'],
    combined_demo: ['Apple', 'Banana', 'Tomato', 'Orange', 'Mango', 'Cucumber', 'Carrot']
  };

  const availableFoods = modeFoodMap[formData.model_mode] || modeFoodMap.proxy_real || ['Apple', 'Banana', 'Tomato'];

  // Ensure selected food is valid for the selected mode
  useEffect(() => {
    if (availableFoods && availableFoods.length > 0) {
      if (!availableFoods.includes(formData.fruit_type)) {
        setFormData(prev => ({ ...prev, fruit_type: availableFoods[0] }));
      }
    }
  }, [formData.model_mode, availableFoods, formData.fruit_type]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsSampleLoaded(false);

    // Clear field error on edit
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleModeChange = (mode) => {
    setFormData(prev => {
      const foodsForNewMode = modeFoodMap[mode] || [];
      const newFruit = foodsForNewMode.includes(prev.fruit_type) ? prev.fruit_type : foodsForNewMode[0] || 'Apple';
      return {
        ...prev,
        model_mode: mode,
        fruit_type: newFruit
      };
    });
    setIsSampleLoaded(false);
  };

  const handleLoadSample = () => {
    setFormData({
      fruit_type: VERIFIED_SAMPLE.fruit_type,
      model_mode: VERIFIED_SAMPLE.model_mode,
      MQ3_raw: VERIFIED_SAMPLE.MQ3_raw,
      MQ135_raw: VERIFIED_SAMPLE.MQ135_raw,
      temperature_C: VERIFIED_SAMPLE.temperature_C,
      humidity_pct: VERIFIED_SAMPLE.humidity_pct
    });
    setErrors({});
    setIsSampleLoaded(true);
  };

  const handleReset = () => {
    setFormData({
      fruit_type: availableFoods[0] || 'Apple',
      model_mode: supportedModes[0] || 'proxy_real',
      MQ3_raw: '',
      MQ135_raw: '',
      temperature_C: '',
      humidity_pct: ''
    });
    setErrors({});
    setSubmissionError(null);
    setIsSampleLoaded(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Validate
    const validation = validateForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmissionError(null);
    setSubmitting(true);

    const payload = {
      fruit_type: formData.fruit_type,
      model_mode: formData.model_mode,
      sensor_readings: {
        MQ3_raw: Number(formData.MQ3_raw),
        MQ135_raw: Number(formData.MQ135_raw),
        temperature_C: Number(formData.temperature_C),
        humidity_pct: Number(formData.humidity_pct)
      }
    };

    try {
      const response = await createPrediction(payload);
      if (response.success && response.data) {
        if (onPredictionSuccess) {
          onPredictionSuccess(response.data);
        }
      } else {
        throw new Error('Prediction request returned unsuccessful response.');
      }
    } catch (err) {
      setSubmissionError({
        message: err.message || 'Failed to generate prediction. The inference service may be busy or unreachable.',
        details: err.details || []
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (capsLoading) {
    return (
      <div className="card" style={{ padding: '2rem' }}>
        <LoadingState message="Loading backend capabilities & model configuration..." />
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 'var(--max-width-form)', margin: '0 auto' }}>
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <FlaskConical size={20} style={{ color: 'var(--color-primary)' }} />
            Sensor Reading Input Form
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: 0 }}>
            Enter calibrated gas readings and chamber temperature/humidity to obtain ML quality inference.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          className="btn btn-outline btn-sm"
          title="Populate verified sample chamber readings for testing"
        >
          <Sparkles size={14} />
          Load Sample Readings
        </button>
      </div>

      <div className="card-body">
        {capsError && (
          <ErrorBanner
            type="warning"
            title="Model Capabilities Notice"
            message={`Could not refresh live model capabilities (${capsError}). Displaying authoritative fallback configuration.`}
            onRetry={refetchCaps}
          />
        )}

        {submissionError && (
          <ErrorBanner
            type="danger"
            title="Prediction Failed"
            message={submissionError.message}
            details={submissionError.details}
          />
        )}

        {isSampleLoaded && (
          <div className="banner banner-info" style={{ marginBottom: '1.5rem' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.85rem' }}>
              <strong>Verified Sample Loaded:</strong> Apple (proxy_real), MQ-3: 2124, MQ-135: 2303, Temp: 30.8°C, Humidity: 88.85%.
              <br />
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem' }}>
                Note: This sample is for demonstration only and does not guarantee a Fresh classification.
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Section 1 & 2: Food & Model Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1rem' }}>
            {/* Section 1: Food Selection */}
            <div className="form-group">
              <div className="form-label">
                <label htmlFor="fruit_type">Produce / Food Type</label>
                <span className="form-hint">{availableFoods.length} supported</span>
              </div>
              <select
                id="fruit_type"
                name="fruit_type"
                value={formData.fruit_type}
                onChange={handleInputChange}
                className="form-select"
                disabled={submitting}
              >
                {availableFoods.map(food => (
                  <option key={food} value={food}>
                    {food}
                  </option>
                ))}
              </select>
              {errors.fruit_type && <span className="form-error">{errors.fruit_type}</span>}
            </div>

            {/* Section 2: Model Mode Selection */}
            <ModelModeSelector
              modes={supportedModes}
              selectedMode={formData.model_mode}
              onChange={handleModeChange}
              disabled={submitting}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1.5rem 0' }} />

          {/* Section 3: Sensor Measurements */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
              Sensor Chamber Readings
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
              All fields are required. Enter raw ADC channel readings and ambient sensor metrics.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <SensorInput
                id="MQ3_raw"
                name="MQ3_raw"
                label="MQ-3 Alcohol / Ethanol"
                unit="raw ADC"
                placeholder="e.g. 2124"
                min={SENSOR_BOUNDS.MQ3_raw.min}
                max={SENSOR_BOUNDS.MQ3_raw.max}
                value={formData.MQ3_raw}
                onChange={handleInputChange}
                error={errors.MQ3_raw}
                disabled={submitting}
                hint="0 - 4095"
              />

              <SensorInput
                id="MQ135_raw"
                name="MQ135_raw"
                label="MQ-135 Air Quality / Spoilage"
                unit="raw ADC"
                placeholder="e.g. 2303"
                min={SENSOR_BOUNDS.MQ135_raw.min}
                max={SENSOR_BOUNDS.MQ135_raw.max}
                value={formData.MQ135_raw}
                onChange={handleInputChange}
                error={errors.MQ135_raw}
                disabled={submitting}
                hint="0 - 4095"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <SensorInput
                id="temperature_C"
                name="temperature_C"
                label="Temperature"
                unit="°C"
                placeholder="e.g. 30.8"
                min={SENSOR_BOUNDS.temperature_C.min}
                max={SENSOR_BOUNDS.temperature_C.max}
                value={formData.temperature_C}
                onChange={handleInputChange}
                error={errors.temperature_C}
                disabled={submitting}
                hint="-40 to 80 °C"
                trainingRange={TRAINING_RANGES.temperature_C}
              />

              <SensorInput
                id="humidity_pct"
                name="humidity_pct"
                label="Relative Humidity"
                unit="%"
                placeholder="e.g. 88.85"
                min={SENSOR_BOUNDS.humidity_pct.min}
                max={SENSOR_BOUNDS.humidity_pct.max}
                value={formData.humidity_pct}
                onChange={handleInputChange}
                error={errors.humidity_pct}
                disabled={submitting}
                hint="0 to 100%"
                trainingRange={TRAINING_RANGES.humidity_pct}
              />
            </div>
          </div>

          {/* Section 5: Submission & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary"
              disabled={submitting}
            >
              <RotateCcw size={16} />
              Reset
            </button>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{ display: 'inline-block' }}>⭮</span>
                  Analyzing Sensor Intelligence...
                </>
              ) : (
                <>
                  <FlaskConical size={18} />
                  Analyze Food Quality
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

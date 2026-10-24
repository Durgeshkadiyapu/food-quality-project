import React, { useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle, CheckCircle2, BookOpen, Activity } from 'lucide-react';
import { getFoodAdvice } from '../../services/api';

export default function FoodAdvisor({ result }) {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestAdvice = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        fruit_type: result?.fruit_type,
        predicted_class: result?.predicted_class,
        model_mode: result?.requested_model_mode || result?.reported_training_mode,
        model_version: result?.model_version,
        label_method: result?.label_method,
        sensor_readings: result?.sensor_readings || {},
        warnings: result?.warnings || [],
        shap_contributions: result?.shap_explanation?.contributions || result?.shap_contributions || []
      };
      const response = await getFoodAdvice(payload);
      if (!response?.success || !response?.data) throw new Error('The advisor returned an unexpected response.');
      setAdvice(response.data);
    } catch (err) {
      setError(err?.message || 'Could not generate advice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card food-advisor" aria-labelledby="food-advisor-title">
      <div className="card-header">
        <div>
          <h3 id="food-advisor-title" className="card-title"><Sparkles size={19} /> AI Food Storage Advisor</h3>
          <p style={{ marginTop: '0.35rem', fontSize: '0.86rem' }}>Turn the experimental prediction into practical next steps.</p>
        </div>
        <button className="btn btn-primary btn-sm" type="button" onClick={requestAdvice} disabled={loading}>
          {loading ? <RefreshCw size={15} className="advisor-spin" /> : <Sparkles size={15} />}
          {loading ? 'Generating…' : advice ? 'Refresh advice' : 'Get recommendations'}
        </button>
      </div>
      <div className="card-body">
        {!advice && !loading && !error && (
          <div className="advisor-empty"><BookOpen size={22} /><p>Get food-specific storage guidance, suggested actions, and what to monitor next.</p></div>
        )}
        {loading && <p role="status">Asking the AI advisor for recommendations…</p>}
        {error && <div className="banner banner-warning" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
        {advice && (
          <div className="advisor-content">
            <div className="advisor-summary"><Sparkles size={18} /><p>{advice.summary}</p></div>
            {[
              ['What the model saw', advice.what_model_saw, Activity],
              ['Recommended actions', advice.recommended_actions, CheckCircle2],
              ['Storage guidance', advice.storage_guidance, BookOpen],
              ['What to monitor next', advice.monitor_next, Activity],
              ['Limitations', advice.limitations, AlertCircle]
            ].map(([title, items, Icon]) => (
              <div className="advisor-section" key={title}>
                <h4><Icon size={16} />{title}</h4>
                <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>
              </div>
            ))}
            {Array.isArray(advice.evidence) && advice.evidence.map((item, index) => (
              <p className="advisor-evidence" key={index}><strong>{item.title}:</strong> {item.detail}</p>
            ))}
            <p className="advisor-disclaimer">{advice.disclaimer}</p>
          </div>
        )}
      </div>
    </section>
  );
}

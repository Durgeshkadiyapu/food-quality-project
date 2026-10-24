import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Calendar,
  Clock,
  Layers,
  Thermometer,
  Droplets,
  Wind,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  FileSpreadsheet,
  TrendingUp,
  Table,
  CheckCircle2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend
} from 'recharts';
import StatusBadge from '../common/StatusBadge';
import { formatDate, formatPercent, getModeBadgeLabel, computeShelfLifeEstimate } from '../../utils/formatters';

export default function PredictionResult({ result, onReset }) {
  const [showTable, setShowTable] = useState(false);

  if (!result) return null;

  const {
    prediction_id,
    item_id,
    readings_count = 1,
    fruit_type,
    predicted_class,
    class_probabilities = {},
    requested_model_mode,
    reported_training_mode,
    model_version,
    label_method,
    warnings = [],
    out_of_training_range = [],
    spoilage_tendency_score,
    sensor_readings = {},
    batch_summary,
    created_at
  } = result;

  // Prepare chart data dynamically from class_probabilities object
  const chartData = Object.entries(class_probabilities || {}).map(([className, score]) => {
    const rawVal = Number(score) || 0;
    const pct = rawVal <= 1 ? rawVal * 100 : rawVal;
    return {
      name: className,
      score: Math.round(pct * 10) / 10,
      raw: rawVal
    };
  });

  const getBarColor = (name) => {
    switch (name.toLowerCase()) {
      case 'fresh':
        return '#166534';
      case 'semi-fresh':
      case 'semifresh':
        return '#d97706';
      case 'spoiled':
        return '#dc2626';
      default:
        return '#0284c7';
    }
  };

  const isBatch = !!batch_summary || readings_count > 1;
  const totalRows = batch_summary?.total_readings || readings_count;
  const averages = batch_summary?.averages || sensor_readings;
  const ranges = batch_summary?.ranges || null;
  const breakdown = batch_summary?.class_breakdown || null;
  const timeline = batch_summary?.timeline || [];

  return (
    <div className="card" style={{ borderColor: 'var(--color-primary-light)', boxShadow: 'var(--shadow-lg)' }}>
      {/* Result Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
          color: '#ffffff',
          padding: '1.75rem var(--space-6)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}
      >
        <div>
          <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {isBatch && <FileSpreadsheet size={15} />}
            Classification Result {isBatch ? `(Evaluated Across All ${totalRows} Readings)` : ''}
          </span>
          <h2 style={{ color: '#ffffff', margin: '0.25rem 0', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>{fruit_type}</span>
            <span style={{ fontSize: '1.25rem', opacity: 0.85 }}>—</span>
            <span style={{ fontWeight: 800 }}>{predicted_class}</span>
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', opacity: 0.9, marginTop: '0.35rem' }}>
            <span>Mode: {getModeBadgeLabel(requested_model_mode)}</span>
            <span>•</span>
            <span>Version: {model_version || '1.0.0'}</span>
            {item_id && (
              <>
                <span>•</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>Item: {item_id}</span>
              </>
            )}
            {isBatch && (
              <>
                <span>•</span>
                <span className="badge badge-fresh" style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }}>
                  {totalRows} Time-Series Readings Processed
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <StatusBadge status={predicted_class} size="lg" />
          {prediction_id && (
            <span style={{ fontSize: '0.75rem', opacity: 0.85, fontFamily: 'var(--font-mono)' }}>
              ID: {prediction_id}
            </span>
          )}
        </div>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Model Warnings */}
        {warnings && warnings.length > 0 && (
          <div className="banner banner-warning" style={{ margin: 0 }}>
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Model Advisory Warning</strong>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Out of Training Range Alert */}
        {out_of_training_range && out_of_training_range.length > 0 && (
          <div className="banner banner-warning" style={{ margin: 0 }}>
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Out-of-Training-Range Feature Detected</strong>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                The following reading(s) fall outside the verified model training range:{' '}
                <strong>{out_of_training_range.join(', ')}</strong>. Prediction reliability may be affected by environmental extrapolation.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Class Scores Chart */}
        {chartData.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Model Confidence Scores
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: 0 }}>
                  Relative output distribution of the classification algorithm (not a verified food-safety probability).
                </p>
              </div>
            </div>

            <div style={{ height: '180px', width: '100%', marginTop: '0.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text)', fontWeight: 600 }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Score']}
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem'
                    }}
                  />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* If Batch Readings: All Readings Summary Statistics */}
        {isBatch && (
          <div style={{ border: '1px solid var(--color-mint-border)', backgroundColor: 'var(--color-mint-light)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ margin: 0, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} />
                  Summary of All Readings Present in Spreadsheet ({totalRows} Rows)
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  Aggregated telemetry across all timestamped chamber measurements in the uploaded file.
                </p>
              </div>
              <span className="badge badge-fresh" style={{ fontSize: '0.82rem' }}>
                {totalRows} Total Rows
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ backgroundColor: 'var(--color-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Wind size={13} /> MQ-3 (Alcohol)
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.2rem' }}>
                  {averages.MQ3_raw ?? '—'} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>avg</span>
                </div>
                {ranges?.MQ3_raw && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                    Span: {ranges.MQ3_raw.min} – {ranges.MQ3_raw.max}
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: 'var(--color-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Wind size={13} /> MQ-135 (Air Quality)
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.2rem' }}>
                  {averages.MQ135_raw ?? '—'} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>avg</span>
                </div>
                {ranges?.MQ135_raw && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                    Span: {ranges.MQ135_raw.min} – {ranges.MQ135_raw.max}
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: 'var(--color-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Thermometer size={13} /> Temperature
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.2rem' }}>
                  {averages.temperature_C !== undefined ? `${averages.temperature_C}°C` : '—'} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>avg</span>
                </div>
                {ranges?.temperature_C && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                    Span: {ranges.temperature_C.min}°C – {ranges.temperature_C.max}°C
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: 'var(--color-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Droplets size={13} /> Humidity
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.2rem' }}>
                  {averages.humidity_pct !== undefined ? `${averages.humidity_pct}%` : '—'} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>avg</span>
                </div>
                {ranges?.humidity_pct && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                    Span: {ranges.humidity_pct.min}% – {ranges.humidity_pct.max}%
                  </div>
                )}
              </div>
            </div>

            {/* Quality Distribution Across All Rows */}
            {breakdown && (
              <div style={{ backgroundColor: 'var(--color-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Classification Across All Readings:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.82rem' }}>
                  <span>
                    Fresh: <strong>{breakdown.Fresh || 0}</strong> ({Math.round(((breakdown.Fresh || 0) / totalRows) * 100)}%)
                  </span>
                  <span>•</span>
                  <span>
                    Semi-Fresh: <strong>{breakdown['Semi-Fresh'] || 0}</strong> ({Math.round(((breakdown['Semi-Fresh'] || 0) / totalRows) * 100)}%)
                  </span>
                  <span>•</span>
                  <span>
                    Spoiled: <strong>{breakdown.Spoiled || 0}</strong> ({Math.round(((breakdown.Spoiled || 0) / totalRows) * 100)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Time-Series Readings Evolution Chart */}
        {isBatch && timeline.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
                  Sensor Readings Time-Series Progression
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                  Continuous MQ-3 and MQ-135 degradation curves plotted across all samples in the uploaded sheet.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTable(prev => !prev)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem' }}
              >
                <Table size={13} />
                <span>{showTable ? 'Hide Table Rows' : 'View Sample Rows'}</span>
              </button>
            </div>

            <div style={{ height: '240px', width: '100%', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e3" />
                  <XAxis dataKey="sample" label={{ value: 'Sample #', position: 'insideBottomRight', offset: -5, fontSize: 11 }} tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.82rem'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.82rem' }} />
                  <Line type="monotone" dataKey="MQ3_raw" stroke="#166534" strokeWidth={2} dot={false} name="MQ-3 (Alcohol)" />
                  <Line type="monotone" dataKey="MQ135_raw" stroke="#0284c7" strokeWidth={2} dot={false} name="MQ-135 (Air Quality)" />
                  <Line type="monotone" dataKey="spoilage_score" stroke="#d97706" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Tendency Index (/100)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Optional Sample Rows Table */}
            {showTable && (
              <div style={{ marginTop: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', maxHeight: '240px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sample #</th>
                      <th>MQ-3</th>
                      <th>MQ-135</th>
                      <th>Temp (°C)</th>
                      <th>Humidity (%)</th>
                      <th>Class</th>
                      <th>Tendency Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>#{row.sample}</td>
                        <td style={{ fontWeight: 600 }}>{row.MQ3_raw}</td>
                        <td style={{ fontWeight: 600 }}>{row.MQ135_raw}</td>
                        <td>{row.temperature_C}°C</td>
                        <td>{row.humidity_pct}%</td>
                        <td>
                          <StatusBadge status={row.predicted_class} size="sm" />
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{row.spoilage_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Latest Chamber Reading Grid (if single reading or final reading) */}
        {!isBatch && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '1rem',
              padding: '1.25rem',
              backgroundColor: 'var(--color-background-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)'
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Wind size={13} /> MQ-3 Gas
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.25rem' }}>
                {sensor_readings.MQ3_raw ?? '—'} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>raw</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Wind size={13} /> MQ-135 Gas
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.25rem' }}>
                {sensor_readings.MQ135_raw ?? '—'} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>raw</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Thermometer size={13} /> Temperature
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.25rem' }}>
                {sensor_readings.temperature_C !== undefined ? `${sensor_readings.temperature_C} °C` : '—'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Droplets size={13} /> Humidity
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.25rem' }}>
                {sensor_readings.humidity_pct !== undefined ? `${sensor_readings.humidity_pct}%` : '—'}
              </div>
            </div>

            {spoilage_tendency_score !== null && spoilage_tendency_score !== undefined && (
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Layers size={13} /> Spoilage Tendency
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                  {spoilage_tendency_score} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>/ 100</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shelf-Life Heuristic Estimate */}
        {(() => {
          const shelf = computeShelfLifeEstimate(predicted_class, spoilage_tendency_score);
          const urgencyColors = {
            safe:    { bg: '#f0fdf4', border: '#166534', text: '#166534', badge: '#dcfce7', badgeText: '#15803d' },
            caution: { bg: '#fffbeb', border: '#d97706', text: '#92400e', badge: '#fef3c7', badgeText: '#b45309' },
            urgent:  { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d', badge: '#fee2e2', badgeText: '#b91c1c' },
          };
          const c = urgencyColors[shelf.urgency];
          return (
            <div style={{
              backgroundColor: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 'var(--radius-lg)',
              padding: '1.1rem 1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              gap: '1rem',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Clock size={22} style={{ color: c.border, flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: c.text, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Estimated Shelf Life
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '9999px',
                      backgroundColor: c.badge,
                      color: c.badgeText,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>Heuristic</span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: c.text }}>
                    {shelf.estimate}
                  </div>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--color-muted)', maxWidth: '480px' }}>
                    ⚠️ <em>This is a rule-based estimate derived from freshness classification and spoilage tendency index — not a validated food-safety prediction. Do not rely on this for health decisions.</em>
                  </p>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', textAlign: 'right', alignSelf: 'center' }}>
                <div>Based on: <strong>{predicted_class}</strong></div>
                {spoilage_tendency_score != null && (
                  <div>Tendency score: <strong>{spoilage_tendency_score}/100</strong></div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Metadata Details */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
          {created_at && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} />
              <span>Timestamp: {formatDate(created_at)}</span>
            </div>
          )}
          {label_method && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Info size={14} />
              <span>Labeling: {label_method}</span>
            </div>
          )}
          {reported_training_mode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Layers size={14} />
              <span>Reported Mode: {reported_training_mode}</span>
            </div>
          )}
        </div>

        {/* Scientific Disclaimer Note */}
        <div
          style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--color-background-subtle)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid var(--color-warning)',
            fontSize: '0.82rem',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem'
          }}
        >
          <ShieldAlert size={16} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Scientific & Safety Notice:</strong> This prediction is an experimental estimate produced by an ML algorithm.
            A <em>Fresh</em> result does not guarantee food safety for consumption, and a <em>Spoiled</em> result is not a certified laboratory finding. Always inspect food visually and olfactorily.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          {onReset && (
            <button onClick={onReset} className="btn btn-secondary">
              <RotateCcw size={16} />
              New Prediction
            </button>
          )}

          <Link to="/history" className="btn btn-secondary">
            View History
          </Link>

          {prediction_id && (
            <Link to={`/history/${prediction_id}`} className="btn btn-primary">
              View Prediction Details
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

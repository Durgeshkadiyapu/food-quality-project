import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Thermometer,
  Droplets,
  Wind,
  ShieldAlert,
  AlertTriangle,
  Info,
  Clock,
  Database,
  FileSpreadsheet,
  TrendingUp,
  Table
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
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import ErrorBanner from '../components/common/ErrorBanner';
import { getPredictionById } from '../services/api';
import { formatDate, formatPercent, getModeBadgeLabel } from '../utils/formatters';

export default function PredictionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchRecord() {
      setLoading(true);
      setError(null);
      try {
        const res = await getPredictionById(id);
        if (isMounted) {
          if (res.success && res.data) {
            setRecord(res.data);
          } else {
            throw new Error('Record not found.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || `Unable to locate prediction record '${id}'.`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (id) {
      fetchRecord();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: '820px' }}>
        <LoadingState message={`Fetching prediction record ${id} from MongoDB...`} />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="container" style={{ maxWidth: '820px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to="/history" className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} />
            Back to History
          </Link>
        </div>

        <ErrorBanner
          type="danger"
          title="Prediction Record Not Found"
          message={error || `Could not find any saved inference matching ID '${id}'.`}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const {
    prediction_id,
    item_id,
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
    created_at,
    last_updated_at,
    readings_count = 1,
    batch_summary
  } = record;

  const isBatch = !!batch_summary || readings_count > 1;
  const totalRows = batch_summary?.total_readings || readings_count;
  const averages = batch_summary?.averages || sensor_readings;
  const ranges = batch_summary?.ranges || null;
  const breakdown = batch_summary?.class_breakdown || null;
  const timeline = batch_summary?.timeline || [];

  const chartData = Object.entries(class_probabilities || {}).map(([name, score]) => {
    const rawVal = Number(score) || 0;
    const pct = rawVal <= 1 ? rawVal * 100 : rawVal;
    return {
      name,
      score: Math.round(pct * 10) / 10,
      raw: rawVal
    };
  });

  const getBarColor = (name) => {
    switch (name.toLowerCase()) {
      case 'fresh': return '#166534';
      case 'semi-fresh':
      case 'semifresh': return '#d97706';
      case 'spoiled': return '#dc2626';
      default: return '#0284c7';
    }
  };

  return (
    <div className="container" style={{ maxWidth: '840px' }}>
      {/* Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <Link to="/history" className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} />
          Back to History
        </Link>

        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
          ID: {prediction_id || id}
        </span>
      </div>

      <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
        {/* Banner Header */}
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
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
              Detailed Record Inspection
            </span>
            <h1 style={{ color: '#ffffff', fontSize: '2rem', margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span>{fruit_type}</span>
              <span style={{ fontSize: '1.25rem', opacity: 0.85 }}>—</span>
              <span>{predicted_class}</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', opacity: 0.9 }}>
              <span>Mode: {getModeBadgeLabel(requested_model_mode)}</span>
              <span>•</span>
              <span>Version: {model_version || '1.0.0'}</span>
              {readings_count > 1 && (
                <>
                  <span>•</span>
                  <span>Batch Readings: {readings_count}</span>
                </>
              )}
            </div>
          </div>

          <StatusBadge status={predicted_class} size="lg" />
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Warnings & Out-of-Range */}
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

          {out_of_training_range && out_of_training_range.length > 0 && (
            <div className="banner banner-warning" style={{ margin: 0 }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Out-of-Training Range Alert</strong>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Input fields outside model training baseline: <strong>{out_of_training_range.join(', ')}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Model Scores Chart */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Model Class Distribution</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
              Dynamic class output probability distribution formulated by the Python inference model.
            </p>

            <div style={{ height: '170px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text)', fontWeight: 600 }} />
                  <Tooltip
                    formatter={(val) => [`${val}%`, 'Score']}
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--radius-md)'
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
                    <span>Fresh: <strong>{breakdown.Fresh || 0}</strong> ({Math.round(((breakdown.Fresh || 0) / totalRows) * 100)}%)</span>
                    <span>•</span>
                    <span>Semi-Fresh: <strong>{breakdown['Semi-Fresh'] || 0}</strong> ({Math.round(((breakdown['Semi-Fresh'] || 0) / totalRows) * 100)}%)</span>
                    <span>•</span>
                    <span>Spoiled: <strong>{breakdown.Spoiled || 0}</strong> ({Math.round(((breakdown.Spoiled || 0) / totalRows) * 100)}%)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Time-Series Line Chart for Batch Telemetry */}
          {isBatch && timeline.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
                    Sensor Readings Progression
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

          {/* Sensor Readings Grid (Single Reading) */}
          {!isBatch && (
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Recorded Sensor Telemetry</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', backgroundColor: 'var(--color-background-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Wind size={13} /> MQ-3 Gas
                  </span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.25rem' }}>
                    {sensor_readings.MQ3_raw ?? '—'} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>raw</span>
                  </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'var(--color-background-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Wind size={13} /> MQ-135 Gas
                  </span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.25rem' }}>
                    {sensor_readings.MQ135_raw ?? '—'} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>raw</span>
                  </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'var(--color-background-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Thermometer size={13} /> Temperature
                  </span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.25rem' }}>
                    {sensor_readings.temperature_C !== undefined ? `${sensor_readings.temperature_C} °C` : '—'}
                  </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'var(--color-background-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Droplets size={13} /> Humidity
                  </span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.25rem' }}>
                    {sensor_readings.humidity_pct !== undefined ? `${sensor_readings.humidity_pct}%` : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Spoilage Tendency Score if available */}
          {spoilage_tendency_score !== null && spoilage_tendency_score !== undefined && (
            <div style={{ padding: '1rem', backgroundColor: 'var(--color-mint-light)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                  Demonstration Spoilage Tendency Score
                </span>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  Continuous composite index reflecting gas elevation (demonstration metric only).
                </p>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                {spoilage_tendency_score} <span style={{ fontSize: '0.85rem' }}>/ 100</span>
              </div>
            </div>
          )}

          {/* Metadata Table */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Persistence & Model Metadata</h3>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <table className="data-table">
                <tbody>
                  {item_id && (
                    <tr>
                      <td style={{ fontWeight: 600, width: '35%' }}>Chamber Item ID</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{item_id}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ fontWeight: 600 }}>Requested Mode</td>
                    <td>{requested_model_mode}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Reported Training Mode</td>
                    <td>{reported_training_mode}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Model Version</td>
                    <td>{model_version}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Label Method</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{label_method || 'storage_day_proxy'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Created Timestamp</td>
                    <td>{formatDate(created_at)}</td>
                  </tr>
                  {last_updated_at && (
                    <tr>
                      <td style={{ fontWeight: 600 }}>Last Updated</td>
                      <td>{formatDate(last_updated_at)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Safety Disclaimer */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--color-warning-bg)',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '3px solid var(--color-warning)',
              fontSize: '0.82rem',
              color: '#78350f',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}
          >
            <ShieldAlert size={16} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Safety Limitation Notice:</strong> Food safety cannot be scientifically established from gas-proxy sensor rows alone.
              This classification serves as research telemetry rather than certified consumer advice.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

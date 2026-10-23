import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Layers,
  Thermometer,
  Droplets,
  Server,
  Cpu,
  RefreshCw,
  PlusCircle,
  AlertCircle,
  PieChart as PieIcon,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import StatCard from '../components/dashboard/StatCard';
import RecentPredictions from '../components/dashboard/RecentPredictions';
import SensorOverview from '../components/dashboard/SensorOverview';
import SpreadsheetUploader from '../components/dashboard/SpreadsheetUploader';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import ErrorBanner from '../components/common/ErrorBanner';
import EmptyState from '../components/common/EmptyState';
import { getPredictions, getHealth, getMLStatus } from '../services/api';
import { formatDecimal } from '../utils/formatters';

export default function Dashboard() {
  const [predictions, setPredictions] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [backendHealth, setBackendHealth] = useState(null);
  const [mlHealth, setMlHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Parallel fetch: predictions, backend health, ML service status
      const [predRes, healthRes, mlRes] = await Promise.allSettled([
        getPredictions({ page: 1, limit: 10 }),
        getHealth(),
        getMLStatus()
      ]);

      // Process predictions
      if (predRes.status === 'fulfilled' && predRes.value.success) {
        setPredictions(predRes.value.data || []);
        setTotalRecords(predRes.value.pagination?.total || predRes.value.data?.length || 0);
      } else if (predRes.status === 'rejected') {
        throw predRes.reason;
      }

      // Process backend health
      if (healthRes.status === 'fulfilled') {
        setBackendHealth(healthRes.value.data);
      } else {
        setBackendHealth({ status: 'unreachable', error: healthRes.reason?.message });
      }

      // Process ML status
      if (mlRes.status === 'fulfilled') {
        setMlHealth(mlRes.value.data);
      } else {
        setMlHealth({ reachable: false, ready: false, error: mlRes.reason?.message });
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const latestRecord = predictions.length > 0 ? predictions[0] : null;

  // Compute distribution of predicted classes from actual fetched records
  const classCounts = predictions.reduce((acc, curr) => {
    const cls = curr.predicted_class || 'Unknown';
    acc[cls] = (acc[cls] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(classCounts).map(([name, value]) => ({
    name,
    value
  }));

  const getPieColor = (name) => {
    switch (name.toLowerCase()) {
      case 'fresh': return '#166534';
      case 'semi-fresh':
      case 'semifresh': return '#d97706';
      case 'spoiled': return '#dc2626';
      default: return '#647067';
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <div className="skeleton" style={{ height: '2.5rem', width: '30%', marginBottom: '0.5rem' }} />
          <div className="skeleton" style={{ height: '1.25rem', width: '50%' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div className="skeleton" style={{ height: '7rem' }} />
          <div className="skeleton" style={{ height: '7rem' }} />
          <div className="skeleton" style={{ height: '7rem' }} />
          <div className="skeleton" style={{ height: '7rem' }} />
        </div>
        <div className="skeleton" style={{ height: '18rem', width: '100%' }} />
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header & Quick Action */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>System Dashboard</h1>
          <p style={{ margin: 0, fontSize: '0.92rem' }}>
            Live sensor intelligence, model inference statistics, and chamber health.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => fetchDashboardData(true)}
            className="btn btn-secondary btn-sm"
            disabled={refreshing}
            title="Refresh dashboard metrics"
          >
            <RefreshCw size={14} className={refreshing ? 'spinner' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link to="/predict" className="btn btn-primary btn-sm">
            <PlusCircle size={15} />
            <span>New Prediction</span>
          </Link>
        </div>
      </div>

      {error && (
        <ErrorBanner
          type="danger"
          title="Dashboard Telemetry Error"
          message={error}
          onRetry={() => fetchDashboardData(false)}
        />
      )}

      {/* Top 4 Summary Metrics (Only actual values from backend) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard
          label="Total Predictions"
          value={totalRecords}
          icon={Layers}
          meta={totalRecords > 0 ? 'Saved records in MongoDB' : 'No records yet'}
        />

        <StatCard
          label="Latest Predicted Class"
          value={latestRecord ? latestRecord.predicted_class : 'None'}
          badgeComponent={latestRecord ? <StatusBadge status={latestRecord.predicted_class} size="sm" /> : null}
          icon={Activity}
          variant={
            latestRecord?.predicted_class === 'Fresh' ? 'default' :
            latestRecord?.predicted_class === 'Semi-Fresh' ? 'warning' :
            latestRecord?.predicted_class === 'Spoiled' ? 'danger' : 'default'
          }
          meta={latestRecord ? `Food: ${latestRecord.fruit_type}` : 'Awaiting input'}
        />

        <StatCard
          label="Latest Temperature"
          value={
            latestRecord?.sensor_readings?.temperature_C !== undefined
              ? `${formatDecimal(latestRecord.sensor_readings.temperature_C, 1)} °C`
              : '—'
          }
          icon={Thermometer}
          variant="warning"
          meta={latestRecord ? 'Ambient chamber probe' : 'No reading'}
        />

        <StatCard
          label="Latest Humidity"
          value={
            latestRecord?.sensor_readings?.humidity_pct !== undefined
              ? `${formatDecimal(latestRecord.sensor_readings.humidity_pct, 1)} %`
              : '—'
          }
          icon={Droplets}
          variant="info"
          meta={latestRecord ? 'Chamber relative humidity' : 'No reading'}
        />
      </div>

      {/* Services Health Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Backend & MongoDB Status */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Server size={18} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Node.js / Express API</h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                  Database: {backendHealth?.dependencies?.database?.type || 'MongoDB'} (
                  {backendHealth?.dependencies?.database?.status || 'Unknown'})
                </span>
              </div>
            </div>

            <span
              className={`badge ${
                backendHealth?.status === 'healthy' ? 'badge-fresh' : 'badge-warning'
              }`}
            >
              {backendHealth?.status === 'healthy' ? (
                <>
                  <CheckCircle2 size={12} />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle size={12} />
                  {backendHealth?.status || 'Unavailable'}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Python ML Service Status */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Cpu size={18} style={{ color: '#0284c7' }} />
              <div>
                <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Python / FastAPI ML Service</h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                  Inference gateway: {mlHealth?.ready ? 'Operational' : 'Unavailable or Standby'}
                </span>
              </div>
            </div>

            <span
              className={`badge ${
                mlHealth?.ready ? 'badge-fresh' : mlHealth?.reachable ? 'badge-warning' : 'badge-neutral'
              }`}
            >
              {mlHealth?.ready ? (
                <>
                  <CheckCircle2 size={12} />
                  Ready
                </>
              ) : mlHealth?.reachable ? (
                <>
                  <AlertCircle size={12} />
                  Degraded
                </>
              ) : (
                <>
                  <HelpCircle size={12} />
                  Offline
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Latest Sensor Telemetry & Prediction Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: pieData.length > 0 ? '1.5fr 1fr' : '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <SensorOverview latestRecord={latestRecord} />

        {pieData.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <PieIcon size={18} style={{ color: 'var(--color-primary)' }} />
                Quality Class Distribution
              </h3>
            </div>
            <div className="card-body" style={{ height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getPieColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Recent Predictions Table & Batch Spreadsheet Uploader */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <RecentPredictions records={predictions} loading={loading} />
        <SpreadsheetUploader onUploadSuccess={() => fetchDashboardData(true)} />
      </div>
    </div>
  );
}

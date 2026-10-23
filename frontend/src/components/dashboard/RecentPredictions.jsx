import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, Calendar, Sparkles } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import EmptyState from '../common/EmptyState';
import { formatShortDate, truncateId, getModeBadgeLabel } from '../../utils/formatters';

export default function RecentPredictions({ records = [], loading }) {
  if (!loading && (!records || records.length === 0)) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Predictions</h3>
        </div>
        <div className="card-body">
          <EmptyState
            title="No Predictions Found"
            description="Run your first sensor evaluation to start tracking food quality trends."
            actionLabel="Start First Prediction"
            actionTo="/predict"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Recent Predictions</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            Showing latest {records.length} saved inference results
          </span>
        </div>

        <Link to="/history" className="btn btn-outline btn-sm">
          <span>View All History</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Food</th>
              <th>Classification</th>
              <th>Model Mode</th>
              <th>Temp / Humidity</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map((row) => {
              const id = row.prediction_id || row._id;
              const readings = row.sensor_readings || {};
              return (
                <tr key={id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    <Link to={`/history/${id}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                      {truncateId(id, 8)}
                    </Link>
                  </td>
                  <td style={{ fontWeight: 600 }}>{row.fruit_type}</td>
                  <td>
                    <StatusBadge status={row.predicted_class} size="sm" />
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      {getModeBadgeLabel(row.requested_model_mode)}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                    {readings.temperature_C !== undefined ? `${readings.temperature_C}°C` : '—'} /{' '}
                    {readings.humidity_pct !== undefined ? `${readings.humidity_pct}%` : '—'}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                    {formatShortDate(row.created_at)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      to={`/history/${id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.3rem 0.6rem' }}
                      title="Inspect record"
                    >
                      <Eye size={13} />
                      <span>Inspect</span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

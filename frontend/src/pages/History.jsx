import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import ErrorBanner from '../components/common/ErrorBanner';
import EmptyState from '../components/common/EmptyState';
import { usePredictions } from '../hooks/usePredictions';
import { useCapabilities } from '../hooks/useCapabilities';
import { formatDate, truncateId, getModeBadgeLabel } from '../utils/formatters';

export default function History() {
  const { capabilities } = useCapabilities();
  const {
    predictions,
    pagination,
    loading,
    error,
    filters,
    setPage,
    updateFilters,
    clearFilters,
    refetch
  } = usePredictions({}, 1, 15);

  const [localFilters, setLocalFilters] = useState({
    fruit_type: '',
    predicted_class: '',
    model_mode: '',
    start_date: '',
    end_date: ''
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    const active = {};
    for (const [k, v] of Object.entries(localFilters)) {
      if (v && v.trim() !== '') active[k] = v.trim();
    }
    updateFilters(active);
  };

  const handleClearFilters = () => {
    setLocalFilters({
      fruit_type: '',
      predicted_class: '',
      model_mode: '',
      start_date: '',
      end_date: ''
    });
    clearFilters();
  };

  const hasActiveFilters = Object.values(filters).some(val => !!val);

  // Derive unique produce choices from capabilities or fallback
  const foodOptions = capabilities?.mode_food_support?.proxy_real || ['Apple', 'Banana', 'Tomato'];

  return (
    <div className="container">
      {/* Page Title */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>Prediction History</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.92rem', margin: 0 }}>
            Audit log of all machine learning inferences stored in the database.
          </p>
        </div>

        <button
          onClick={refetch}
          className="btn btn-secondary btn-sm"
          disabled={loading}
          title="Refresh prediction records"
        >
          <RefreshCw size={14} className={loading ? 'spinner' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-header" style={{ padding: '0.85rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
            <Filter size={16} style={{ color: 'var(--color-primary)' }} />
            <span>Search & Filter History</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem' }}
            >
              <X size={13} />
              Clear Filters
            </button>
          )}
        </div>

        <div className="card-body" style={{ padding: '1.25rem' }}>
          <form onSubmit={handleApplyFilters}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {/* Food Filter */}
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="filter_fruit_type" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                  Food / Fruit
                </label>
                <input
                  type="text"
                  id="filter_fruit_type"
                  name="fruit_type"
                  placeholder="e.g. Apple, Banana"
                  value={localFilters.fruit_type}
                  onChange={handleFilterChange}
                  style={{ padding: '0.55rem 0.75rem' }}
                />
              </div>

              {/* Class Filter */}
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="filter_class" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                  Predicted Class
                </label>
                <select
                  id="filter_class"
                  name="predicted_class"
                  value={localFilters.predicted_class}
                  onChange={handleFilterChange}
                  className="form-select"
                  style={{ padding: '0.55rem 0.75rem' }}
                >
                  <option value="">All Classes</option>
                  <option value="Fresh">Fresh</option>
                  <option value="Semi-Fresh">Semi-Fresh</option>
                  <option value="Spoiled">Spoiled</option>
                </select>
              </div>

              {/* Mode Filter */}
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="filter_mode" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                  Model Mode
                </label>
                <select
                  id="filter_mode"
                  name="model_mode"
                  value={localFilters.model_mode}
                  onChange={handleFilterChange}
                  className="form-select"
                  style={{ padding: '0.55rem 0.75rem' }}
                >
                  <option value="">All Modes</option>
                  <option value="proxy_real">Proxy Real (Lab)</option>
                  <option value="synthetic_demo">Synthetic Demo</option>
                  <option value="combined_demo">Combined Demo</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="filter_start_date" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                  From Date
                </label>
                <input
                  type="date"
                  id="filter_start_date"
                  name="start_date"
                  value={localFilters.start_date}
                  onChange={handleFilterChange}
                  style={{ padding: '0.55rem 0.75rem' }}
                />
              </div>

              {/* End Date */}
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="filter_end_date" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                  To Date
                </label>
                <input
                  type="date"
                  id="filter_end_date"
                  name="end_date"
                  value={localFilters.end_date}
                  onChange={handleFilterChange}
                  style={{ padding: '0.55rem 0.75rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary btn-sm">
                Apply Filters
              </button>
            </div>
          </form>
        </div>
      </div>

      {error && (
        <ErrorBanner
          type="danger"
          title="History Query Failed"
          message={error}
          onRetry={refetch}
        />
      )}

      {/* Main Records Table Card */}
      <div className="card">
        <div className="card-header" style={{ padding: '1rem 1.25rem' }}>
          <div>
            <h3 className="card-title" style={{ fontSize: '1.05rem' }}>
              Database Records
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
              Showing {predictions.length} of {pagination.total} records (Page {pagination.page} of {pagination.total_pages})
            </span>
          </div>

          <Link to="/predict" className="btn btn-primary btn-sm">
            <Sparkles size={14} />
            <span>New Prediction</span>
          </Link>
        </div>

        {loading ? (
          <LoadingState type="table" rows={6} message="Querying paginated history from MongoDB..." />
        ) : predictions.length === 0 ? (
          <div className="card-body">
            <EmptyState
              title={hasActiveFilters ? 'No Matching Records' : 'No Predictions Recorded'}
              description={
                hasActiveFilters
                  ? 'No saved predictions match your current filter parameters. Try clearing or relaxing the filters.'
                  : 'Your database has not stored any prediction inferences yet. Run an analysis to start building history.'
              }
              actionLabel={hasActiveFilters ? 'Clear Filters' : 'Create First Prediction'}
              actionTo={hasActiveFilters ? null : '/predict'}
              onAction={hasActiveFilters ? handleClearFilters : null}
            />
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Prediction ID</th>
                    <th>Produce</th>
                    <th>Classification</th>
                    <th>Model Mode</th>
                    <th>MQ-3 / MQ-135</th>
                    <th>Temp / Humidity</th>
                    <th>Recorded Timestamp</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((row) => {
                    const id = row.prediction_id || row._id;
                    const readings = row.sensor_readings || {};
                    return (
                      <tr key={id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                          <Link to={`/history/${id}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                            {truncateId(id, 10)}
                          </Link>
                        </td>
                        <td style={{ fontWeight: 600 }}>{row.fruit_type}</td>
                        <td>
                          <StatusBadge status={row.predicted_class} size="sm" />
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                            {getModeBadgeLabel(row.requested_model_mode)}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                          {readings.MQ3_raw ?? '—'} / {readings.MQ135_raw ?? '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                          {readings.temperature_C !== undefined ? `${readings.temperature_C}°C` : '—'} /{' '}
                          {readings.humidity_pct !== undefined ? `${readings.humidity_pct}%` : '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                          {formatDate(row.created_at)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            to={`/history/${id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.65rem' }}
                            title="Inspect complete prediction record"
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

            {/* Server-Side Pagination Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                borderTop: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background-subtle)'
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                Page <strong>{pagination.page}</strong> of <strong>{pagination.total_pages}</strong> ({pagination.total} total)
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => setPage(pagination.page - 1)}
                  disabled={!pagination.has_prev || loading}
                  className="btn btn-secondary btn-sm"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => setPage(pagination.page + 1)}
                  disabled={!pagination.has_next || loading}
                  className="btn btn-secondary btn-sm"
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

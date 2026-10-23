import React from 'react';

export default function StatCard({ label, value, icon: Icon, meta, variant = 'default', badgeComponent }) {
  return (
    <div className="stat-card">
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span className="stat-value tabular-nums">{value ?? '—'}</span>
          {badgeComponent}
        </div>
        {meta && <span className="stat-meta">{meta}</span>}
      </div>

      {Icon && (
        <div className="stat-icon" style={{
          backgroundColor: variant === 'warning' ? 'var(--color-warning-bg)' :
                           variant === 'danger' ? 'var(--color-danger-bg)' :
                           variant === 'info' ? 'var(--color-info-bg)' : 'var(--color-mint-light)',
          color: variant === 'warning' ? 'var(--color-warning)' :
                 variant === 'danger' ? 'var(--color-danger)' :
                 variant === 'info' ? 'var(--color-info)' : 'var(--color-primary)'
        }}>
          <Icon size={22} />
        </div>
      )}
    </div>
  );
}

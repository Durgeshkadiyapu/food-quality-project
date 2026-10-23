import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorBanner({
  title = 'An error occurred',
  message,
  details = [],
  onRetry,
  type = 'danger'
}) {
  const bannerClass = type === 'warning' ? 'banner-warning' : 'banner-danger';

  return (
    <div className={`banner ${bannerClass}`} role="alert">
      <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
          {title}
        </strong>
        {message && <p style={{ fontSize: '0.88rem', margin: 0, color: 'inherit' }}>{message}</p>}

        {details && details.length > 0 && (
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.82rem' }}>
            {details.map((item, idx) => (
              <li key={idx}>
                {item.field ? <strong>{item.field}: </strong> : null}
                {item.problem || (typeof item === 'string' ? item : JSON.stringify(item))}
              </li>
            ))}
          </ul>
        )}
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-secondary btn-sm"
          style={{ alignSelf: 'flex-start', flexShrink: 0 }}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}

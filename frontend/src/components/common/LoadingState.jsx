import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading data...', rows = 3, type = 'card' }) {
  if (type === 'table') {
    return (
      <div style={{ padding: '2rem 1rem' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              height: '2.5rem',
              marginBottom: '0.75rem',
              width: '100%'
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'skeleton') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        <div className="skeleton" style={{ height: '3rem', width: '60%' }} />
        <div className="skeleton" style={{ height: '8rem', width: '100%' }} />
        <div className="skeleton" style={{ height: '4rem', width: '100%' }} />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3.5rem 1.5rem',
        gap: '0.85rem'
      }}
    >
      <Loader2 className="spinner" size={32} style={{ color: 'var(--color-primary)' }} />
      <p style={{ color: 'var(--color-muted)', fontSize: '0.92rem' }}>{message}</p>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home, Activity } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
      <div
        style={{
          width: '4.5rem',
          height: '4.5rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--color-background-subtle)',
          color: 'var(--color-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}
      >
        <FileQuestion size={36} />
      </div>

      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>404</h1>
      <h2 style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--color-muted)', maxWidth: '420px', margin: '0 auto 2rem' }}>
        The page you are looking for does not exist or has been moved to a different URL route.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <Link to="/" className="btn btn-secondary">
          <Home size={16} />
          Go to Home
        </Link>
        <Link to="/dashboard" className="btn btn-primary">
          <Activity size={16} />
          View Dashboard
        </Link>
      </div>
    </div>
  );
}

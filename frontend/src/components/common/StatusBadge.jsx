import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

export default function StatusBadge({ status, size = 'md', className = '' }) {
  if (!status) {
    return (
      <span className={`badge badge-neutral ${className}`}>
        <HelpCircle size={size === 'sm' ? 12 : 14} />
        Unknown
      </span>
    );
  }

  const normalized = status.toLowerCase();

  if (normalized === 'fresh') {
    return (
      <span className={`badge badge-fresh ${className}`}>
        <CheckCircle2 size={size === 'sm' ? 12 : 14} />
        Fresh
      </span>
    );
  }

  if (normalized === 'semi-fresh' || normalized === 'semifresh') {
    return (
      <span className={`badge badge-semi-fresh ${className}`}>
        <AlertTriangle size={size === 'sm' ? 12 : 14} />
        Semi-Fresh
      </span>
    );
  }

  if (normalized === 'spoiled') {
    return (
      <span className={`badge badge-spoiled ${className}`}>
        <XCircle size={size === 'sm' ? 12 : 14} />
        Spoiled
      </span>
    );
  }

  return (
    <span className={`badge badge-neutral ${className}`}>
      {status}
    </span>
  );
}

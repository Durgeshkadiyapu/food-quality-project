/**
 * Formatting helpers for UI presentation
 */

export function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatShortDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatPercent(value) {
  if (value === undefined || value === null || isNaN(value)) return '0.0%';
  const num = Number(value);
  // If the backend returns decimals between 0 and 1, multiply by 100
  const pct = num <= 1 && num > 0 ? num * 100 : num;
  return `${pct.toFixed(1)}%`;
}

export function formatDecimal(value, decimals = 1) {
  if (value === undefined || value === null || isNaN(value)) return '—';
  return Number(value).toFixed(decimals);
}

export function truncateId(id, len = 8) {
  if (!id || typeof id !== 'string') return '—';
  if (id.length <= len) return id;
  return `${id.substring(0, len)}…`;
}

export function getModeBadgeLabel(mode) {
  switch (mode) {
    case 'proxy_real':
      return 'Proxy Real (Lab)';
    case 'synthetic_demo':
      return 'Synthetic Demo';
    case 'combined_demo':
      return 'Combined Demo';
    default:
      return mode || 'Standard';
  }
}

/**
 * Formatting helpers for UI presentation
 */

/**
 * Computes a heuristic shelf-life estimate from classification + spoilage tendency score.
 *
 * ⚠️ IMPORTANT: This is a RULE-BASED heuristic derived from freshness classification.
 * It is NOT a validated food-safety prediction. The ML model does not have a shelf-life
 * regression target — see MODEL_CARD.md for full limitations.
 *
 * @param {string} predictedClass - 'Fresh' | 'Semi-Fresh' | 'Spoiled'
 * @param {number|null} spoilageTendencyScore - 0–100 index from ML service
 * @returns {{ estimate: string, daysLow: number, daysHigh: number, urgency: 'safe'|'caution'|'urgent' }}
 */
export function computeShelfLifeEstimate(predictedClass, spoilageTendencyScore) {
  const score = spoilageTendencyScore != null ? Number(spoilageTendencyScore) : 50;

  if (predictedClass === 'Spoiled') {
    return { estimate: 'Consume immediately or discard', daysLow: 0, daysHigh: 0, urgency: 'urgent' };
  }

  if (predictedClass === 'Semi-Fresh') {
    if (score >= 60) {
      return { estimate: 'Less than 1 day', daysLow: 0, daysHigh: 1, urgency: 'urgent' };
    }
    return { estimate: '1 – 2 days', daysLow: 1, daysHigh: 2, urgency: 'caution' };
  }

  // Fresh
  if (score < 20) return { estimate: '4 – 5 days', daysLow: 4, daysHigh: 5, urgency: 'safe' };
  if (score < 35) return { estimate: '3 – 4 days', daysLow: 3, daysHigh: 4, urgency: 'safe' };
  if (score < 55) return { estimate: '2 – 3 days', daysLow: 2, daysHigh: 3, urgency: 'caution' };
  return { estimate: '1 – 2 days', daysLow: 1, daysHigh: 2, urgency: 'caution' };
}

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

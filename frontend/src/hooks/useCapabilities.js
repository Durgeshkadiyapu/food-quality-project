import { useState, useEffect, useCallback } from 'react';
import { getCapabilities } from '../services/api';

export function useCapabilities() {
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCapabilities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCapabilities();
      if (res.success && res.data) {
        setCapabilities(res.data);
      } else {
        throw new Error('Capabilities response was incomplete.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load model capabilities.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchCapabilities();
    return () => {
      isMounted = false;
    };
  }, [fetchCapabilities]);

  return {
    capabilities,
    loading,
    error,
    refetch: fetchCapabilities
  };
}

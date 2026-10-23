import { useState, useEffect, useCallback } from 'react';
import { getPredictions } from '../services/api';

export function usePredictions(initialFilters = {}, initialPage = 1, limit = 10) {
  const [predictions, setPredictions] = useState([]);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false
  });
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async (pageToFetch = pagination.page, activeFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPredictions({
        page: pageToFetch,
        limit,
        ...activeFilters
      });

      if (res.success) {
        setPredictions(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        throw new Error('Failed to retrieve predictions.');
      }
    } catch (err) {
      setError(err.message || 'Unable to load prediction history.');
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, [filters, limit, pagination.page]);

  useEffect(() => {
    fetchList(pagination.page, filters);
  }, [pagination.page, filters]);

  const setPage = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const updateFilters = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // reset to page 1
  };

  const clearFilters = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return {
    predictions,
    pagination,
    loading,
    error,
    filters,
    setPage,
    updateFilters,
    clearFilters,
    refetch: () => fetchList(pagination.page, filters)
  };
}

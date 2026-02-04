import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook for auto-refreshing data at a set interval.
 * Only refreshes when the browser tab is visible.
 *
 * @param {Function} fetchCallback - async function to call on each refresh
 * @param {number} intervalMs - refresh interval in milliseconds (default 30s)
 * @param {boolean} enabled - whether auto-refresh starts enabled (default true)
 * @returns {{ lastRefreshed, autoRefreshEnabled, toggleAutoRefresh, manualRefresh, refreshing }}
 */
export default function useAutoRefresh(fetchCallback, intervalMs = 30000, enabled = true) {
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef(null);
  const fetchRef = useRef(fetchCallback);

  // Keep fetch callback ref updated without re-triggering the effect
  useEffect(() => {
    fetchRef.current = fetchCallback;
  }, [fetchCallback]);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(async () => {
      // Only refresh when the page tab is visible
      if (document.visibilityState === 'visible' && fetchRef.current) {
        try {
          setRefreshing(true);
          await fetchRef.current();
          setLastRefreshed(new Date());
        } catch (e) {
          // Silently fail - don't break the UI on auto-refresh errors
          console.error('Auto-refresh failed:', e);
        } finally {
          setRefreshing(false);
        }
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefreshEnabled, intervalMs]);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled(prev => !prev);
  }, []);

  const manualRefresh = useCallback(async () => {
    if (fetchRef.current) {
      try {
        setRefreshing(true);
        await fetchRef.current();
        setLastRefreshed(new Date());
      } catch (e) {
        console.error('Manual refresh failed:', e);
      } finally {
        setRefreshing(false);
      }
    }
  }, []);

  return { lastRefreshed, autoRefreshEnabled, toggleAutoRefresh, manualRefresh, refreshing };
}

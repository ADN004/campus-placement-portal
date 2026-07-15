import { useState, useEffect } from 'react';
import { commonAPI } from '../services/api';

/**
 * Portal mode hook — adapts the UI to single-college deployments.
 *
 * Mode is derived server-side from the data (exactly one active college /
 * one region), never configured. On any fetch failure the hook reports the
 * multi-college defaults, so every adaptive simplification simply stays off
 * and the full UI renders — the safe fallback.
 */
export default function usePortalMode() {
  const [mode, setMode] = useState({
    loading: true,
    activeColleges: null,
    regions: null,
    singleCollege: false,
    singleRegion: false,
    requireJobApproval: false,
    googleClientId: null,
  });

  useEffect(() => {
    let cancelled = false;

    commonAPI
      .getPortalInfo()
      .then((response) => {
        if (cancelled) return;
        const data = response.data.data;
        setMode({
          loading: false,
          activeColleges: data.active_colleges,
          regions: data.regions,
          singleCollege: data.single_college,
          singleRegion: data.single_region,
          requireJobApproval: data.single_college_require_job_approval,
          googleClientId: data.google_client_id || null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setMode((prev) => ({ ...prev, loading: false }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return mode;
}

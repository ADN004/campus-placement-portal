import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI, commonAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import CountsBody from './counts/CountsBody';
import CountsSkeleton from './counts/CountsSkeleton';

/**
 * Consolidated student registration counts — container.
 *
 * "How many students does each college have, and how many in each branch"
 * previously meant opening sixty colleges one at a time. This asks it once.
 *
 * The totals are shown on screen before anything is downloaded, from the same
 * endpoint that builds the files. That is deliberate: a number you can check
 * against what you already know, before you send a file to somebody, is worth
 * more than a download that might be scoped wrong.
 */
export default function ConsolidatedExport() {
  const deviceType = useDeviceType();
  const [detail, setDetail] = useState('branch');
  const [scope, setScope] = useState('all');
  const [collegeId, setCollegeId] = useState('');
  const [regionIds, setRegionIds] = useState([]);

  const [regions, setRegions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState('');

  /*
   * The first load, which is separate from `loading`.
   *
   * `loading` belongs to the count query and runs again on every change of
   * scope; it must not blank the controls that caused it. This one is true only
   * until the regions and colleges are in, and it is what the skeleton waits on.
   */
  const [booting, setBooting] = useState(true);
  const { showSkeleton } = useSkeleton(booting);

  useEffect(() => {
    (async () => {
      try {
        const [r, c] = await Promise.all([commonAPI.getRegions(), commonAPI.getColleges()]);
        setRegions(r.data.data || []);
        setColleges(c.data.data || []);
      } catch {
        toast.error('Failed to load regions and colleges');
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  /** The scope as query parameters, or null when the choice is incomplete. */
  const scopeParams = useCallback(() => {
    if (scope === 'college') return collegeId ? { scope, college_id: collegeId } : null;
    if (scope === 'region') return regionIds.length ? { scope, region_ids: regionIds.join(',') } : null;
    return { scope: 'all' };
  }, [scope, collegeId, regionIds]);

  // Re-count whenever the selection changes, so the figures on screen always
  // describe the selection that would be downloaded rather than a previous one.
  useEffect(() => {
    const params = scopeParams();
    if (!params) { setPreview(null); return; }
    let cancelled = false;
    setLoading(true);
    superAdminAPI
      .getStudentCounts({ ...params, detail, format: 'json' })
      .then((res) => { if (!cancelled) setPreview(res.data.data); })
      .catch(() => { if (!cancelled) setPreview(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [detail, scopeParams]);

  const download = async (format) => {
    const params = scopeParams();
    if (!params) {
      toast.error(scope === 'college' ? 'Select a college first' : 'Select at least one region');
      return;
    }
    setDownloading(format);
    try {
      const res = await superAdminAPI.getStudentCountsFile({ ...params, detail, format });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `student-counts-${detail}-${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} downloaded`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Export failed');
    } finally {
      setDownloading('');
    }
  };

  const toggleRegion = (id) => {
    setRegionIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  if (showSkeleton) return <CountsSkeleton />;

  return (
    <CountsBody
      layout={deviceType}
      detail={detail}
      onDetail={setDetail}
      scope={scope}
      onScope={setScope}
      collegeId={collegeId}
      onCollegeId={setCollegeId}
      regionIds={regionIds}
      onToggleRegion={toggleRegion}
      regions={regions}
      colleges={colleges}
      preview={preview}
      loading={loading}
      downloading={downloading}
      onDownload={download}
    />
  );
}

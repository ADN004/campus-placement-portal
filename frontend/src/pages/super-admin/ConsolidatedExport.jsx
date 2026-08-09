import { useState, useEffect, useCallback } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminAPI, commonAPI } from '../../services/api';

/**
 * Consolidated student registration counts.
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
  const [detail, setDetail] = useState('branch');
  const [scope, setScope] = useState('all');
  const [collegeId, setCollegeId] = useState('');
  const [regionIds, setRegionIds] = useState([]);

  const [regions, setRegions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [r, c] = await Promise.all([commonAPI.getRegions(), commonAPI.getColleges()]);
        setRegions(r.data.data || []);
        setColleges(c.data.data || []);
      } catch {
        toast.error('Failed to load regions and colleges');
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

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900">Student Count Export</h1>
      <p className="text-sm text-gray-600 mt-1">
        Registered students per college, and per branch within each college.
      </p>

      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 space-y-6">
        {/* ------------------------------------------------------- detail */}
        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
            Level of detail
          </legend>
          <div className="flex flex-wrap gap-4">
            {[
              ['branch', 'College and branch breakdown', 'Each college, split by branch'],
              ['college', 'College totals only', 'One line per college'],
            ].map(([value, label, hint]) => (
              <label key={value} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio" name="detail" value={value} className="mt-1"
                  checked={detail === value} onChange={() => setDetail(value)}
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">{label}</span>
                  <span className="block text-xs text-gray-500">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* -------------------------------------------------------- scope */}
        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
            Which colleges
          </legend>
          <div className="flex flex-wrap gap-4">
            {[
              ['all', 'All colleges'],
              ['college', 'One college'],
              ['region', 'By region'],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio" name="scope" value={value}
                  checked={scope === value} onChange={() => setScope(value)}
                />
                <span className="text-sm font-semibold text-gray-900">{label}</span>
              </label>
            ))}
          </div>

          {scope === 'college' && (
            <select
              className="input mt-3 max-w-md"
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              aria-label="College"
            >
              <option value="">Select a college…</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>{c.college_name}</option>
              ))}
            </select>
          )}

          {scope === 'region' && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
              {regions.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={regionIds.includes(r.id)}
                    onChange={() => toggleRegion(r.id)}
                  />
                  <span>{r.region_name}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {/* ------------------------------------------------------ preview */}
        <div className="border-t border-gray-200 pt-4">
          {loading ? (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Counting…
            </p>
          ) : preview ? (
            <div>
              <div className="flex flex-wrap gap-6">
                <Figure label="Colleges" value={preview.meta.collegeCount} />
                <Figure label="Approved" value={preview.meta.grand.approved} />
                <Figure label="Pending" value={preview.meta.grand.pending} />
                <Figure label="Total" value={preview.meta.grand.total} strong />
              </div>
              <p className="text-xs text-gray-500 mt-3">{preview.meta.basis}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {scope === 'college'
                ? 'Select a college to see the counts.'
                : 'Select at least one region to see the counts.'}
            </p>
          )}
        </div>

        {/* ------------------------------------------------------ download */}
        <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            disabled={!preview || Boolean(downloading)}
            onClick={() => download('pdf')}
          >
            {downloading === 'pdf'
              ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              : <FileText size={16} aria-hidden="true" />}
            Download PDF
          </button>
          <button
            type="button"
            className="btn-secondary flex items-center gap-2"
            disabled={!preview || Boolean(downloading)}
            onClick={() => download('excel')}
          >
            {downloading === 'excel'
              ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              : <FileSpreadsheet size={16} aria-hidden="true" />}
            Download Excel
          </button>
          {detail === 'branch' && (
            <p className="text-xs text-gray-500 self-center">
              Excel gets one sheet per college, plus a summary.
            </p>
          )}
        </div>
      </div>

      {/* The colleges themselves, so the file can be sanity-checked first. */}
      {preview && preview.colleges.length > 0 && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Registered student counts per college, with approved, pending and total.
            </caption>
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th scope="col" className="px-4 py-2">College</th>
                <th scope="col" className="px-4 py-2">Region</th>
                <th scope="col" className="px-4 py-2 text-right">Approved</th>
                <th scope="col" className="px-4 py-2 text-right">Pending</th>
                <th scope="col" className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {preview.colleges.map((c) => (
                <tr key={c.college_id} className="border-t border-gray-100">
                  <th scope="row" className="px-4 py-2 text-left font-medium text-gray-900">
                    {c.college_name}
                  </th>
                  <td className="px-4 py-2 text-gray-600">{c.region_name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{c.approved}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{c.pending}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold">{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Figure({ label, value, strong }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`tabular-nums ${strong ? 'text-2xl font-bold' : 'text-xl font-semibold'} text-gray-900`}>
        {value}
      </p>
    </div>
  );
}

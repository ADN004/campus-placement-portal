import { useState, useRef } from 'react';
import { superAdminAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  X,
  Download,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  ArrowLeft,
  PartyPopper,
} from 'lucide-react';

/**
 * Bulk Import Modal — upload the Excel template to create colleges and
 * placement officers in one go.
 *
 * Flow: upload (drag & drop) → server-side validation preview → confirm.
 * Nothing is written to the database until the admin confirms a clean file.
 */
export default function BulkImportModal({ onClose, onImported }) {
  const [step, setStep] = useState('upload'); // upload | preview | done
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [officerConflict, setOfficerConflict] = useState('skip');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // { summary, results }
  const [committed, setCommitted] = useState(null); // { summary, message }
  const inputRef = useRef(null);

  const pickFile = (candidate) => {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Only .xlsx files are accepted — use the downloadable template');
      return;
    }
    setFile(candidate);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await superAdminAPI.downloadImportTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bulk-import-template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const runImport = async (mode) => {
    if (!file) {
      toast.error('Choose a filled template file first');
      return;
    }

    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      formData.append('officer_conflict', officerConflict);

      const response = await superAdminAPI.importData(formData);
      const payload = response.data.data;

      if (mode === 'validate') {
        setPreview(payload);
        setStep('preview');
      } else {
        setCommitted({ summary: payload.summary, message: response.data.message });
        setStep('done');
        onImported?.();
      }
    } catch (error) {
      const payload = error.response?.data?.data;
      if (mode === 'commit' && payload) {
        // Data changed between validate and commit — show the fresh validation
        setPreview(payload);
        setStep('preview');
      }
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const statusBadge = (status) => {
    if (status === 'ok')
      return (
        <span className="inline-flex items-center text-xs font-medium text-green-700">
          <CheckCircle2 className="h-4 w-4 mr-1" /> OK
        </span>
      );
    if (status === 'skip')
      return (
        <span className="inline-flex items-center text-xs font-medium text-gray-500">
          <MinusCircle className="h-4 w-4 mr-1" /> Skipped
        </span>
      );
    return (
      <span className="inline-flex items-center text-xs font-medium text-red-600">
        <AlertTriangle className="h-4 w-4 mr-1" /> Error
      </span>
    );
  };

  const renderResultsTable = (title, entries, label) => {
    if (!entries || entries.length === 0) return null;
    return (
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          {title} ({entries.length} rows)
        </h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-14">Row</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{label}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {entries.map((entry) => (
                  <tr key={`${title}-${entry.row}`} className={entry.status === 'error' ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 text-gray-500">{entry.row}</td>
                    <td className="px-3 py-2 text-gray-900">
                      {entry.data.college_name || entry.data.officer_name}
                      <span className="text-gray-400 ml-1">({entry.data.college_code})</span>
                    </td>
                    <td className="px-3 py-2">{statusBadge(entry.status)}</td>
                    <td className="px-3 py-2 text-gray-600">{entry.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const summaryPill = (label, summary) => (
    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-500 mt-1">
        <span className="text-green-700 font-semibold">{summary.ok} to create</span>
        {' · '}
        <span className="text-gray-500">{summary.skipped} skipped</span>
        {' · '}
        <span className={summary.errors > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
          {summary.errors} errors
        </span>
      </p>
    </div>
  );

  const totalErrors = preview ? preview.summary.colleges.errors + preview.summary.officers.errors : 0;
  const totalOk = preview ? preview.summary.colleges.ok + preview.summary.officers.ok : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Import</h2>
            <p className="text-sm text-gray-600">Create colleges and placement officers from an Excel file</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={busy}>
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* STEP 1 — UPLOAD */}
        {step === 'upload' && (
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="text-sm text-blue-900">
                <p className="font-medium">Step 1 — Download the template</p>
                <p className="text-blue-700 mt-1">
                  It contains a Colleges sheet, an Officers sheet, instructions, and a reference list
                  of your regions and existing colleges. Either data sheet may be left empty.
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="shrink-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <Download className="h-4 w-4 mr-2" />
                Template
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Step 2 — Upload the filled template</p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
                {file ? (
                  <div className="flex items-center justify-center text-gray-700">
                    <FileSpreadsheet className="h-8 w-8 text-green-600 mr-3" />
                    <div className="text-left">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB — click to choose a different file</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <UploadCloud className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                    <p className="font-medium">Drag & drop the filled template here</p>
                    <p className="text-sm mt-1">or click to browse (.xlsx only)</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                If a college already has an active officer:
              </p>
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="officer_conflict"
                    checked={officerConflict === 'skip'}
                    onChange={() => setOfficerConflict('skip')}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">Skip the row</span> — keep the current officer (safe default)
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="officer_conflict"
                    checked={officerConflict === 'replace'}
                    onChange={() => setOfficerConflict('replace')}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">Replace the officer</span> — current officer moves to history,
                    their login is deactivated
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => runImport('validate')}
                disabled={!file || busy}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              >
                {busy ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Checking file...
                  </>
                ) : (
                  'Check File'
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — PREVIEW */}
        {step === 'preview' && preview && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              {summaryPill('Colleges sheet', preview.summary.colleges)}
              {summaryPill('Officers sheet', preview.summary.officers)}
            </div>

            {totalErrors > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 flex items-start">
                <AlertTriangle className="h-5 w-5 mr-2 shrink-0" />
                <span>
                  {totalErrors} row(s) have errors. Nothing has been imported — fix the rows in your
                  file and upload it again.
                </span>
              </div>
            )}
            {totalErrors === 0 && totalOk === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                Nothing to import — every row already exists or was skipped.
              </div>
            )}
            {totalErrors === 0 && totalOk > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 flex items-start">
                <CheckCircle2 className="h-5 w-5 mr-2 shrink-0" />
                <span>
                  File looks good. Confirming will create {preview.summary.colleges.ok} college(s) and{' '}
                  {preview.summary.officers.ok} officer(s). New officers log in with their phone number
                  and the default password <span className="font-mono font-semibold">123</span>.
                </span>
              </div>
            )}

            {renderResultsTable('Colleges', preview.results.colleges, 'College')}
            {renderResultsTable('Officers', preview.results.officers, 'Officer')}

            <div className="flex justify-between">
              <button
                onClick={() => {
                  setStep('upload');
                  setPreview(null);
                }}
                disabled={busy}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>
              <button
                onClick={() => runImport('commit')}
                disabled={busy || totalErrors > 0 || totalOk === 0}
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              >
                {busy ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  'Confirm Import'
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — DONE */}
        {step === 'done' && committed && (
          <div className="p-6 space-y-6 text-center">
            <PartyPopper className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">{committed.message}</h3>
              <p className="text-sm text-gray-600 mt-2">
                New officers log in with their <span className="font-medium">phone number</span> and the
                default password <span className="font-mono font-semibold">123</span> — ask them to change
                it right after their first login.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

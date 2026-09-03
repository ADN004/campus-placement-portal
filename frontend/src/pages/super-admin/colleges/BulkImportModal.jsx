import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Download, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle,
  MinusCircle, ArrowLeft, PartyPopper,
} from 'lucide-react';
import Modal from '../../../components/Modal';
import { superAdminAPI } from '../../../services/api';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';
import {
  SectionLabel, CHECKBOX_CLASS, PrimaryButton, SecondaryButton,
} from '../../../components/admin/AdminUI';

/**
 * Bulk import — create colleges and placement officers from one Excel file.
 *
 * Three steps: upload, a server-side validation preview, then confirm. Nothing
 * is written until a clean file is confirmed, and the preview is the whole point
 * of the feature — it is the only chance to see what sixty rows are about to do.
 *
 * It used to live in `components/`, which suggested it was shared. It never was:
 * every call it makes is `superAdminAPI`, and one page opens it. It sits with
 * that page now.
 */

const STEPS = [
  ['upload', 'Choose a file'],
  ['preview', 'Check it'],
  ['done', 'Imported'],
];

/** Where you are in the three steps, and what is behind you. */
function StepTrail({ step }) {
  const at = STEPS.findIndex(([key]) => key === step);
  return (
    <ol className="flex items-center gap-2 flex-wrap mb-1">
      {STEPS.map(([key, label], i) => (
        <li key={key} className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-spc-xs font-bold ${i === at
            ? 'text-spc-ink' : i < at ? 'text-spc-ok' : 'text-spc-body'}`}>
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full
              text-[10px] tabular-nums ${i === at
                ? 'bg-spc-accent text-spc-on-accent'
                : i < at ? 'bg-spc-ok-bg text-spc-ok' : 'bg-spc-surface-2 text-spc-body'}`}>
              {i + 1}
            </span>
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <span aria-hidden="true" className="w-4 h-px bg-spc-line-strong" />
          )}
        </li>
      ))}
    </ol>
  );
}

function StatusMark({ status }) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 text-spc-xs font-semibold text-spc-ok">
        <CheckCircle2 size={14} aria-hidden="true" /> OK
      </span>
    );
  }
  if (status === 'skip') {
    return (
      <span className="inline-flex items-center gap-1 text-spc-xs font-semibold text-spc-body">
        <MinusCircle size={14} aria-hidden="true" /> Skipped
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-spc-xs font-bold text-spc-bad">
      <AlertTriangle size={14} aria-hidden="true" /> Error
    </span>
  );
}

/** What one sheet would do, in three numbers. */
function SummaryTile({ label, summary }) {
  return (
    <div className="flex-1 min-w-[180px] p-3 rounded-spc-admin bg-spc-surface-2
      border border-spc-line-strong">
      <p className="text-spc-sm font-bold text-spc-ink">{label}</p>
      <p className="text-spc-xs mt-1 tabular-nums">
        <span className="text-spc-ok font-bold">{summary.ok} to create</span>
        <span className="text-spc-body">{' · '}{summary.skipped} skipped{' · '}</span>
        <span className={summary.errors > 0 ? 'text-spc-bad font-bold' : 'text-spc-body'}>
          {summary.errors} errors
        </span>
      </p>
    </div>
  );
}

function nameOf(entry) {
  return entry.data.college_name || entry.data.officer_name;
}

/**
 * The validated rows.
 *
 * A table on a laptop; on a phone the same four values stacked, because a
 * four-column table inside a dialog on a 360px screen is a scroll inside a
 * scroll and nobody reads it — which defeats the point of a preview.
 */
function Results({ layout, title, entries, label }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div>
      <SectionLabel>{title} — {entries.length} rows</SectionLabel>
      <div className="border border-spc-line-strong rounded-spc-admin-sm overflow-hidden">
        <div className="max-h-60 overflow-y-auto">
          {layout === 'desktop' ? (
            <table className="min-w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-spc-surface-2 border-b border-spc-line-strong">
                  {['Row', label, 'Status', 'Details'].map((heading) => (
                    <th key={heading} scope="col"
                      className="font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                        text-spc-body text-left px-3 py-2 whitespace-nowrap">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={`${title}-${entry.row}`}
                    className={`border-b border-spc-line last:border-b-0
                      ${entry.status === 'error' ? 'bg-spc-bad-bg' : ''}`}>
                    <td className="px-3 py-2 text-spc-xs text-spc-body tabular-nums">{entry.row}</td>
                    <td className="px-3 py-2 text-spc-xs text-spc-ink">
                      {nameOf(entry)}
                      <span className="text-spc-body"> ({entry.data.college_code})</span>
                    </td>
                    <td className="px-3 py-2"><StatusMark status={entry.status} /></td>
                    <td className="px-3 py-2 text-spc-xs text-spc-body break-words">{entry.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ul className="divide-y divide-spc-line">
              {entries.map((entry) => (
                <li key={`${title}-${entry.row}`}
                  className={`p-3 ${entry.status === 'error' ? 'bg-spc-bad-bg' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-spc-xs text-spc-ink min-w-0 break-words">
                      <span className="text-spc-body tabular-nums">Row {entry.row} · </span>
                      {nameOf(entry)}
                      <span className="text-spc-body"> ({entry.data.college_code})</span>
                    </p>
                    <StatusMark status={entry.status} />
                  </div>
                  {entry.message && (
                    <p className="text-spc-xs text-spc-body mt-1 break-words">{entry.message}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BulkImportModal({ layout = 'desktop', onClose, onImported }) {
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

  const totalErrors = preview ? preview.summary.colleges.errors + preview.summary.officers.errors : 0;
  const totalOk = preview ? preview.summary.colleges.ok + preview.summary.officers.ok : 0;

  return (
    <Modal
      onClose={onClose}
      labelledBy="bulk-import-title"
      panelClassName={adminPanel('xl', { scroll: true })}
      overlayClassName={ADMIN_OVERLAY}
    >
      <AdminDialogHeader
        id="bulk-import-title"
        title="Bulk import"
        subtitle="Colleges and placement officers, from one Excel file"
        onClose={onClose}
      />

      <AdminDialogBody className="space-y-5">
        <StepTrail step={step} />

        {/* ------------------------------------------------------ 1. upload */}
        {step === 'upload' && (
          <>
            <div className="flex items-start justify-between gap-3 p-3 rounded-spc-admin
              bg-spc-surface-2 border border-spc-line-strong">
              <div className="min-w-0">
                <p className="text-spc-sm font-bold text-spc-ink">Start from the template</p>
                <p className="text-spc-xs text-spc-body mt-0.5">
                  It carries a Colleges sheet, an Officers sheet, the instructions, and a reference
                  list of your regions and existing colleges. Either data sheet may be left empty.
                </p>
              </div>
              <SecondaryButton onClick={handleDownloadTemplate} className="flex-shrink-0">
                <Download size={15} aria-hidden="true" />
                Template
              </SecondaryButton>
            </div>

            <div>
              <SectionLabel>The filled file</SectionLabel>
              {/*
                A real <button>, not a clickable <div>. The file input is hidden,
                so it is not focusable, and the drop zone was the only way in —
                which left the whole feature unreachable from a keyboard.
              */}
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`w-full p-8 rounded-spc-admin border-2 border-dashed transition-colors
                  ${dragActive
                    ? 'border-spc-accent bg-spc-selected'
                    : 'border-spc-control hover:bg-spc-surface-2'}`}
              >
                {file ? (
                  <span className="flex items-center justify-center gap-3">
                    <FileSpreadsheet size={28} aria-hidden="true" className="text-spc-ok flex-shrink-0" />
                    <span className="text-left min-w-0">
                      <span className="block text-spc-sm font-bold text-spc-ink break-words">
                        {file.name}
                      </span>
                      <span className="block text-spc-xs text-spc-body tabular-nums">
                        {(file.size / 1024).toFixed(1)} KB — click to choose a different file
                      </span>
                    </span>
                  </span>
                ) : (
                  <span className="block">
                    <UploadCloud size={32} aria-hidden="true" className="mx-auto mb-2 text-spc-body" />
                    <span className="block text-spc-sm font-bold text-spc-ink">
                      Drop the filled template here
                    </span>
                    <span className="block text-spc-xs text-spc-body mt-0.5">
                      or click to browse — .xlsx only
                    </span>
                  </span>
                )}
              </button>
            </div>

            <fieldset>
              <legend className="font-khand text-spc-label font-medium uppercase tracking-[0.14em]
                text-spc-body mb-2">
                If a college already has an active officer
              </legend>
              <div className="space-y-1">
                {[
                  ['skip', 'Skip the row', 'The current officer stays. The safe default.'],
                  ['replace', 'Replace the officer',
                    'The current one moves to history and their login is deactivated.'],
                ].map(([value, label, hint]) => (
                  <label key={value}
                    className={`flex items-start gap-3 p-2.5 rounded-spc-admin-sm cursor-pointer
                      ${officerConflict === value ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}>
                    <input
                      type="radio"
                      name="officer_conflict"
                      checked={officerConflict === value}
                      onChange={() => setOfficerConflict(value)}
                      className={`${CHECKBOX_CLASS} mt-0.5 flex-shrink-0`}
                    />
                    <span className="min-w-0">
                      <span className="block text-spc-sm font-semibold text-spc-ink">{label}</span>
                      <span className="block text-spc-xs text-spc-body">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {/* ----------------------------------------------------- 2. preview */}
        {step === 'preview' && preview && (
          <>
            <div className="flex gap-3 flex-wrap">
              <SummaryTile label="Colleges sheet" summary={preview.summary.colleges} />
              <SummaryTile label="Officers sheet" summary={preview.summary.officers} />
            </div>

            {totalErrors > 0 && (
              <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-bad-bg border border-spc-bad/30">
                <AlertTriangle size={17} aria-hidden="true"
                  className="text-spc-bad flex-shrink-0 mt-0.5" />
                <p className="text-spc-xs text-spc-ink font-semibold">
                  {totalErrors} {totalErrors === 1 ? 'row has' : 'rows have'} errors, so nothing has
                  been imported. Fix them in your file and upload it again.
                </p>
              </div>
            )}

            {totalErrors === 0 && totalOk === 0 && (
              <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-warn-bg border border-spc-warn/40">
                <AlertTriangle size={17} aria-hidden="true"
                  className="text-spc-warn flex-shrink-0 mt-0.5" />
                <p className="text-spc-xs text-spc-ink font-semibold">
                  Nothing to import — every row already exists or was skipped.
                </p>
              </div>
            )}

            {totalErrors === 0 && totalOk > 0 && (
              <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-ok-bg border border-spc-ok/30">
                <CheckCircle2 size={17} aria-hidden="true"
                  className="text-spc-ok flex-shrink-0 mt-0.5" />
                <p className="text-spc-xs text-spc-ink font-semibold">
                  The file is good. Confirming creates {preview.summary.colleges.ok}{' '}
                  {preview.summary.colleges.ok === 1 ? 'college' : 'colleges'} and{' '}
                  {preview.summary.officers.ok}{' '}
                  {preview.summary.officers.ok === 1 ? 'officer' : 'officers'}. New officers sign in
                  with their phone number and the password{' '}
                  <span className="font-mono font-bold">123</span>.
                </p>
              </div>
            )}

            <Results layout={layout} title="Colleges"
              entries={preview.results.colleges} label="College" />
            <Results layout={layout} title="Officers"
              entries={preview.results.officers} label="Officer" />
          </>
        )}

        {/* -------------------------------------------------------- 3. done */}
        {step === 'done' && committed && (
          <div className="text-center py-6">
            <PartyPopper size={40} aria-hidden="true" className="mx-auto mb-3 text-spc-ok" />
            <p className="text-spc-h2 font-bold text-spc-ink break-words">{committed.message}</p>
            <p className="text-spc-sm text-spc-body mt-2 max-w-md mx-auto">
              New officers sign in with their <span className="font-bold text-spc-ink">phone
              number</span> and the password <span className="font-mono font-bold">123</span>. Ask
              them to change it on their first sign-in.
            </p>
          </div>
        )}
      </AdminDialogBody>

      <AdminDialogFooter>
        {step === 'upload' && (
          <>
            <SecondaryButton onClick={onClose} disabled={busy}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => runImport('validate')} disabled={!file || busy}>
              {busy ? 'Checking the file…' : 'Check the file'}
            </PrimaryButton>
          </>
        )}

        {step === 'preview' && (
          <>
            <SecondaryButton
              onClick={() => { setStep('upload'); setPreview(null); }}
              disabled={busy}
              className="mr-auto"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back
            </SecondaryButton>
            <SecondaryButton onClick={onClose} disabled={busy}>Cancel</SecondaryButton>
            <PrimaryButton
              onClick={() => runImport('commit')}
              disabled={busy || totalErrors > 0 || totalOk === 0}
            >
              {busy ? 'Importing…' : 'Confirm import'}
            </PrimaryButton>
          </>
        )}

        {step === 'done' && <PrimaryButton onClick={onClose}>Done</PrimaryButton>}
      </AdminDialogFooter>
    </Modal>
  );
}

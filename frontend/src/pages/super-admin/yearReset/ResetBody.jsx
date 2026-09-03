import {
  AlertTriangle, CheckCircle, ArrowLeft, Lock, Trash2, Briefcase, Bell, Users,
  FileText, Camera, ClipboardList, Activity, Shield, Eye, EyeOff,
} from 'lucide-react';
import {
  Panel, PanelHeading, PageHeading, SectionLabel, FieldLabel, FIELD_CLASS,
  PrimaryButton, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';
import { passoutYearFromAcademicYear } from '../../../utils/passoutYears';

/**
 * Close an academic year.
 *
 * The single most destructive thing on the portal: it deletes every job,
 * application, notification and log, disables every student login, and removes
 * every student photograph. Student *records* survive, which is the whole design
 * — a passed-out batch stays readable and exportable.
 *
 * Three gates, unchanged: read what will go, type `RESET <year>`, then your own
 * password. None of them is a formality and none has been softened here.
 */

const WIPED = [
  [Briefcase, 'Jobs', 'jobs'],
  [FileText, 'Job applications', 'job_applications'],
  [Briefcase, 'Job drives', 'job_drives'],
  [FileText, 'Job requests', 'job_requests'],
  [Bell, 'Notifications', 'notifications'],
  [Bell, 'Admin notifications', 'admin_notifications'],
  [Activity, 'Activity logs', 'activity_logs'],
  [Shield, 'Whitelist requests', 'whitelist_requests'],
  [FileText, 'Deleted-jobs history', 'deleted_jobs_history'],
];

const CLEARED = [
  [ClipboardList, 'Active PRN ranges', 'active_prn_ranges', 'Disabled, not deleted'],
  [Users, 'Active students', 'active_students', 'Logins disabled'],
  [Camera, 'Student photographs', 'student_photos', 'Removed from Cloudinary'],
];

/** One count. `?? 0` so a field missing from the response cannot throw here. */
function DataCard({ icon: Icon, label, count, tone, subtitle }) {
  const box = tone === 'bad'
    ? 'bg-spc-bad-bg border-spc-bad/30'
    : 'bg-spc-warn-bg border-spc-warn/40';
  return (
    <div className={`flex items-start gap-3 p-3 rounded-spc-admin border ${box}`}>
      <Icon size={18} aria-hidden="true" className="text-spc-body flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-spc-h2 font-bold text-spc-ink tabular-nums">
          {(count ?? 0).toLocaleString()}
        </p>
        <p className="text-spc-xs text-spc-ink font-semibold break-words">{label}</p>
        {subtitle && <p className="text-spc-xs text-spc-body">{subtitle}</p>}
      </div>
    </div>
  );
}

function ResultRow({ label, value }) {
  return (
    <div className="flex justify-between items-center gap-3 px-3 py-2 rounded-spc-admin-sm
      bg-spc-surface-2 border border-spc-line-strong">
      <span className="text-spc-xs text-spc-body min-w-0 break-words">{label}</span>
      <span className="text-spc-sm font-bold text-spc-ink tabular-nums flex-shrink-0">
        {value ?? 0}
      </span>
    </div>
  );
}

/** Which of the three gates you are at. */
function StepTrail({ step }) {
  const labels = ['Read it', 'Type it', 'Sign it'];
  return (
    <ol className="flex items-center gap-2 flex-wrap mb-5">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const here = step === n;
        return (
          <li key={label} className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-spc-xs font-bold ${here
              ? 'text-spc-ink' : done ? 'text-spc-ok' : 'text-spc-body'}`}>
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full
                text-[10px] tabular-nums ${here
                  ? 'bg-spc-accent text-spc-on-accent'
                  : done ? 'bg-spc-ok-bg text-spc-ok' : 'bg-spc-surface-2 text-spc-body'}`}>
                {done ? <CheckCircle size={12} aria-hidden="true" /> : n}
              </span>
              {label}
            </span>
            {n < 3 && <span aria-hidden="true" className="w-4 h-px bg-spc-line-strong" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function ResetBody(p) {
  const { layout, preview, result } = p;
  const grid = layout === 'desktop' ? 'lg:grid-cols-3 sm:grid-cols-2' : 'sm:grid-cols-2';
  const passout = passoutYearFromAcademicYear(p.academicYear);

  return (
    <div>
      <PageHeading
        eyebrow="Portal"
        title="Academic Year Reset"
        subline="Close a year: clear the transactional data, keep the student records"
        size={layout === 'mobile' ? 'sm' : 'md'}
      />

      {p.step !== 'complete' && <StepTrail step={p.step} />}

      {/* ------------------------------------------------------- 1. read it */}
      {p.step === 1 && preview && (
        <>
          <div className="flex gap-2.5 p-4 mb-4 rounded-spc-admin bg-spc-bad-bg
            border border-spc-bad/30">
            <AlertTriangle size={20} aria-hidden="true" className="text-spc-bad flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-spc-sm font-bold text-spc-ink">This cannot be undone.</p>
              <p className="text-spc-xs text-spc-body mt-1">
                Every job, application, notification and log is deleted, and every student login is
                disabled. Student records and PRN ranges survive so the batch stays readable and
                exportable.
              </p>
            </div>
          </div>

          {p.isNothingToReset && (
            <div className="flex gap-2.5 p-3 mb-4 rounded-spc-admin bg-spc-ok-bg
              border border-spc-ok/30">
              <CheckCircle size={17} aria-hidden="true" className="text-spc-ok flex-shrink-0 mt-0.5" />
              <p className="text-spc-xs text-spc-ink font-semibold">
                There is nothing to reset — the portal is already clean.
              </p>
            </div>
          )}

          <Panel className="mb-4">
            <PanelHeading>
              <span className="flex items-center gap-2">
                <Trash2 size={16} aria-hidden="true" className="text-spc-bad" />
                Deleted permanently
              </span>
            </PanelHeading>
            <div className={`p-4 grid grid-cols-1 ${grid} gap-3`}>
              {WIPED.map(([icon, label, key]) => (
                <DataCard key={key} icon={icon} label={label} count={preview[key]} tone="bad" />
              ))}
            </div>
          </Panel>

          <Panel className="mb-4">
            <PanelHeading>
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} aria-hidden="true" className="text-spc-warn" />
                Disabled or cleared
              </span>
            </PanelHeading>
            <div className={`p-4 grid grid-cols-1 ${grid} gap-3`}>
              {CLEARED.map(([icon, label, key, subtitle]) => (
                <DataCard key={key} icon={icon} label={label} count={preview[key]}
                  tone="warn" subtitle={subtitle} />
              ))}
            </div>
          </Panel>

          <Panel className="mb-4">
            <PanelHeading>
              <span className="flex items-center gap-2">
                <CheckCircle size={16} aria-hidden="true" className="text-spc-ok" />
                Kept
              </span>
            </PanelHeading>
            <div className="p-4">
              <p className="text-spc-sm text-spc-body">
                Colleges, regions, branches, placement officers, super admins, PRN ranges (disabled
                rather than removed), every student record — name, CGPA, profile, resume data — and
                the company requirement templates. All of it stays readable and exportable.
              </p>
            </div>
          </Panel>

          <Panel className="p-4 mb-4">
            <SectionLabel>The year being closed</SectionLabel>
            <div className="max-w-xs">
              <FieldLabel htmlFor="academic-year">Academic year</FieldLabel>
              <input
                id="academic-year"
                type="text"
                className={`${FIELD_CLASS} font-mono`}
                value={p.academicYear}
                onChange={(e) => p.onAcademicYear(e.target.value)}
                placeholder="e.g. 2025-26"
              />
            </div>
            <p className="text-spc-xs text-spc-body mt-2">
              Recorded as the reason the PRN ranges were disabled.
            </p>
            <p className="text-spc-xs text-spc-body mt-1">
              Graduates the <span className="font-bold text-spc-ink">passout year {passout || '—'}</span>{' '}
              batch — the same one set on their PRN ranges.
            </p>
          </Panel>

          <div className="flex justify-end">
            <DangerButton onClick={p.onProceed} disabled={p.isNothingToReset}>
              <AlertTriangle size={15} aria-hidden="true" />
              Continue
            </DangerButton>
          </div>
        </>
      )}

      {/* ------------------------------------------------------- 2. type it */}
      {p.step === 2 && (
        <Panel className="max-w-lg mx-auto">
          <PanelHeading>Confirm the year</PanelHeading>
          <div className="p-5">
            <p className="text-spc-sm text-spc-body mb-3">
              Type <span className="font-mono font-bold text-spc-ink">RESET {p.academicYear}</span>{' '}
              to continue. This is deliberately awkward.
            </p>
            <FieldLabel htmlFor="reset-confirm">Confirmation</FieldLabel>
            <input
              id="reset-confirm"
              type="text"
              className={`${FIELD_CLASS} font-mono`}
              value={p.confirmText}
              onChange={(e) => p.onConfirmText(e.target.value)}
              placeholder={`RESET ${p.academicYear}`}
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-5 py-4
            border-t border-spc-line-strong">
            <SecondaryButton onClick={p.onBackToOne}>
              <ArrowLeft size={15} aria-hidden="true" />
              Back
            </SecondaryButton>
            <DangerButton
              onClick={p.onProceedToPassword}
              disabled={p.confirmText !== `RESET ${p.academicYear}`}
            >
              Continue
            </DangerButton>
          </div>
        </Panel>
      )}

      {/* ------------------------------------------------------- 3. sign it */}
      {p.step === 3 && (
        <Panel className="max-w-lg mx-auto">
          <PanelHeading>
            <span className="flex items-center gap-2">
              <Lock size={16} aria-hidden="true" className="text-spc-body" />
              Your password
            </span>
          </PanelHeading>
          <div className="p-5 space-y-4">
            <div>
              <FieldLabel htmlFor="reset-password">Password</FieldLabel>
              <div className="relative">
                <input
                  id="reset-password"
                  type={p.showPassword ? 'text' : 'password'}
                  className={`${FIELD_CLASS} pr-12`}
                  value={p.password}
                  onChange={(e) => p.onPassword(e.target.value)}
                  placeholder="Your own admin password"
                  autoComplete="current-password"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && p.password && !p.executing) p.onExecute();
                  }}
                />
                <button
                  type="button"
                  onClick={p.onToggleShowPassword}
                  aria-label={p.showPassword ? 'Hide the password' : 'Show the password'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center
                    justify-center w-10 h-10 rounded-spc-admin-sm text-spc-body
                    hover:bg-spc-surface-2 hover:text-spc-ink transition-colors"
                >
                  {p.showPassword
                    ? <EyeOff size={18} aria-hidden="true" />
                    : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2.5 p-3 rounded-spc-admin bg-spc-bad-bg border border-spc-bad/30">
              <AlertTriangle size={17} aria-hidden="true" className="text-spc-bad flex-shrink-0 mt-0.5" />
              <p className="text-spc-xs text-spc-ink font-semibold">
                Pressing this deletes every job, application, notification and log for{' '}
                <span className="font-mono">{p.academicYear}</span>, and disables every student
                login. Student data is kept.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 px-5 py-4
            border-t border-spc-line-strong">
            <SecondaryButton onClick={p.onBackToTwo} disabled={p.executing}>
              <ArrowLeft size={15} aria-hidden="true" />
              Back
            </SecondaryButton>
            <DangerButton onClick={p.onExecute} disabled={!p.password || p.executing}>
              <AlertTriangle size={15} aria-hidden="true" />
              {p.executing ? 'Resetting…' : 'Reset the year'}
            </DangerButton>
          </div>
        </Panel>
      )}

      {/* --------------------------------------------------------- the report */}
      {p.step === 'complete' && result && (
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2.5 p-4 mb-4 rounded-spc-admin bg-spc-ok-bg
            border border-spc-ok/30">
            <CheckCircle size={20} aria-hidden="true" className="text-spc-ok flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-spc-sm font-bold text-spc-ink">Done.</p>
              <p className="text-spc-xs text-spc-body mt-1">
                <span className="font-mono">{p.academicYear}</span> is closed. The portal is ready
                for the next year.
              </p>
            </div>
          </div>

          <Panel className="mb-4">
            <PanelHeading>What changed in the database</PanelHeading>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ResultRow label="PRN ranges disabled" value={result.db_reset.prn_ranges_disabled} />
              <ResultRow label="Students deactivated" value={result.db_reset.students_deactivated} />
              <ResultRow label="Jobs deleted" value={result.db_reset.jobs_deleted} />
              <ResultRow label="Job requests deleted" value={result.db_reset.job_requests_deleted} />
              <ResultRow label="Notifications deleted" value={result.db_reset.notifications_deleted} />
              <ResultRow label="Whitelist requests" value={result.db_reset.whitelist_requests_deleted} />
              <ResultRow label="Job history cleared" value={result.db_reset.deleted_jobs_history_cleared} />
              <ResultRow label="Photographs cleared" value={result.db_reset.student_photos_cleared} />
            </div>
          </Panel>

          <Panel className="mb-4">
            <PanelHeading>What changed in Cloudinary</PanelHeading>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ResultRow label="Photographs deleted" value={result.cloudinary_cleanup.deleted} />
              <ResultRow label="Folders cleaned" value={result.cloudinary_cleanup.folders_deleted} />
              {result.cloudinary_cleanup.failed > 0 && (
                <div className="sm:col-span-2 flex gap-2.5 p-3 rounded-spc-admin
                  bg-spc-warn-bg border border-spc-warn/40">
                  <AlertTriangle size={17} aria-hidden="true"
                    className="text-spc-warn flex-shrink-0 mt-0.5" />
                  <p className="text-spc-xs text-spc-ink font-semibold">
                    {result.cloudinary_cleanup.failed} photographs could not be deleted from
                    Cloudinary. They are orphaned now — clear them from the Cloudinary dashboard.
                  </p>
                </div>
              )}
            </div>
          </Panel>

          <div className="flex justify-center">
            <PrimaryButton onClick={p.onReturnToDashboard}>Back to the dashboard</PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

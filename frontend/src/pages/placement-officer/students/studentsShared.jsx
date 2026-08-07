import {
  Lock, Unlock, Search, Filter, ChevronDown, ChevronUp, Download, Settings,
  Eye, Check, X, Ban, Shield, MailWarning, FileEdit,
} from 'lucide-react';

/**
 * Pieces shared by the three ManageStudents presenters.
 *
 * Presentation only. Every value rendered here is passed down from the
 * container, and every handler is the container's — the three devices call the
 * same functions, so a fix here fixes all three.
 *
 * Officer direction is "Register": hierarchy from surfaces, rules and type
 * weight, never shadows or colour blocks. No `shadow-*` appears in this file.
 * Colour is reserved for meaning, which on this page means exactly one thing:
 * a student's status.
 */

/* ------------------------------------------------------------------ format */

/** DD-MM-YYYY, matching what the old table and modal both printed. */
export function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
}

/**
 * Total backlogs across the six semesters.
 *
 * The old code inlined this arithmetic twice — once per table row and again in
 * the details modal — which is exactly how the two drift apart. One function,
 * both callers.
 */
export function totalBacklogs(student) {
  return (
    (parseInt(student.backlogs_sem1, 10) || 0) +
    (parseInt(student.backlogs_sem2, 10) || 0) +
    (parseInt(student.backlogs_sem3, 10) || 0) +
    (parseInt(student.backlogs_sem4, 10) || 0) +
    (parseInt(student.backlogs_sem5, 10) || 0) +
    (parseInt(student.backlogs_sem6, 10) || 0)
  );
}

/* ------------------------------------------------------------------ status */

/**
 * Status as a coloured dot plus the word, not a filled pill.
 *
 * A filled pill is a colour block, and colour blocks are what this direction
 * removed. The dot carries the colour; the word carries the meaning, in ink, so
 * it stays legible on any surface in the ladder.
 */
const STATUS_DOT = {
  pending: 'bg-spc-warn',
  approved: 'bg-spc-ok',
  rejected: 'bg-spc-bad',
};

export function StatusMark({ status }) {
  if (!status) return <span className="text-spc-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status] || 'bg-spc-muted'}`}
      />
      <span className="text-spc-xs font-semibold text-spc-ink">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </span>
  );
}

export function BlacklistMark({ isBlacklisted }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isBlacklisted ? 'bg-spc-bad' : 'bg-spc-ok'
        }`}
      />
      <span className="text-spc-xs font-semibold text-spc-ink">
        {isBlacklisted ? 'Blacklisted' : 'Active'}
      </span>
    </span>
  );
}

/**
 * A backlog count. Zero is not a problem, so it stays ink; anything above zero
 * is the one number on this page worth colouring.
 */
export function BacklogCount({ total }) {
  return (
    <span className={`tabular-nums font-bold ${total > 0 ? 'text-spc-bad' : 'text-spc-ink'}`}>
      {total}
    </span>
  );
}

/* ------------------------------------------------------------------ panels */

export function Panel({ children, className = '' }) {
  return (
    <div
      className={`bg-spc-surface border border-spc-line-strong rounded-spc-panel
        overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

/** Page heading with the structural rule under it. */
export function PageHeading({ title, subline, size = 'md', children }) {
  const titleSize = size === 'sm' ? 'text-spc-display' : 'text-spc-display-lg';
  return (
    <header className="mb-5 pb-4 border-b-[1.5px] border-spc-rule-structural">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className={`${titleSize} font-bold text-spc-ink`}>{title}</h1>
          {subline && <p className="text-spc-sm text-spc-muted mt-1">{subline}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- buttons */

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-spc-control ' +
  'text-spc-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`${BUTTON_BASE} bg-spc-accent text-spc-on-accent hover:opacity-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`${BUTTON_BASE} bg-spc-surface border border-spc-control text-spc-ink
        hover:bg-spc-surface-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Destructive confirm. The only place `bad` is used as a fill. */
export function DangerButton({ children, className = '', ...props }) {
  return (
    <button
      className={`${BUTTON_BASE} bg-spc-bad text-white hover:opacity-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ fields */

export function FieldLabel({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-1.5"
    >
      {children}
    </label>
  );
}

/**
 * Inputs and selects: surface fill, a `control` border (3.71:1, which is what
 * WCAG 1.4.11 wants for the boundary of something you type into), 3px radius,
 * accent focus ring.
 */
export const FIELD_CLASS =
  'w-full min-h-[44px] px-3 rounded-spc-control bg-spc-surface border border-spc-control ' +
  'text-spc-sm text-spc-ink outline-none transition-colors ' +
  'focus:border-spc-accent focus:ring-2 focus:ring-spc-accent/30';

export function TextField({ label, id, ...props }) {
  return (
    <div className="min-w-0">
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <input id={id} className={FIELD_CLASS} {...props} />
    </div>
  );
}

export function SelectField({ label, id, children, ...props }) {
  return (
    <div className="min-w-0">
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <select id={id} className={FIELD_CLASS} {...props}>
        {children}
      </select>
    </div>
  );
}

/* -------------------------------------------------------------------- tabs */

export const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'blacklisted', label: 'Blacklisted' },
];

/**
 * Segmented tab strip. The active tab is a step up the surface ladder, not a
 * gradient fill — same move as the active item in the officer sidebar.
 *
 * `scroll` puts them on one horizontally scrollable line, which is how five
 * tabs fit a phone without wrapping into a ragged block.
 */
export function StatusTabs({ activeTab, counts, onChange, scroll = false }) {
  return (
    <div
      className={`flex gap-px bg-spc-line border border-spc-line-strong rounded-spc-panel
        ${scroll ? 'overflow-x-auto' : 'overflow-hidden'}`}
    >
      {STATUS_TABS.map(({ key, label }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex-1 min-w-[92px] min-h-[52px] px-3 flex flex-col items-center justify-center
              gap-0.5 transition-colors
              ${isActive
                ? 'bg-spc-surface-3 text-spc-ink'
                : 'bg-spc-surface text-spc-muted hover:bg-spc-surface-2 hover:text-spc-ink'}`}
          >
            <span className="text-spc-xs font-bold whitespace-nowrap">{label}</span>
            <span className="text-xs font-semibold tabular-nums">{counts[key]}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ search */

export function SearchField({ value, onChange, id = 'student-search' }) {
  return (
    <div className="relative min-w-0">
      <Search
        size={17}
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-spc-muted pointer-events-none"
      />
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder="Search by PRN, name, or email…"
        aria-label="Search students"
        className={`${FIELD_CLASS} pl-10`}
      />
    </div>
  );
}

/* ------------------------------------------------------------- lock panels */

/**
 * The CGPA and backlog edit windows. Identical shape, so one component with the
 * labels passed in rather than two near-copies that drift.
 *
 * Locked is the safe, normal state, so it is deliberately NOT coloured red —
 * red here would read as an error. Only the unlocked state is marked, because
 * that is the one an officer needs to notice and close.
 */
export function LockPanel({ title, locked, unlockWindow, onUnlock, onLock, processing, compact = false }) {
  return (
    <Panel>
      <div className={`flex items-center justify-between gap-3 flex-wrap ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {locked ? (
            <Lock size={17} className="text-spc-muted flex-shrink-0" aria-hidden="true" />
          ) : (
            <Unlock size={17} className="text-spc-warn flex-shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="text-spc-xs font-bold text-spc-ink">
              {title}
              <span className="ml-2 text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">
                {locked ? 'Locked' : 'Open'}
              </span>
            </p>
            {!locked && unlockWindow && (
              <p className="text-xs text-spc-muted mt-0.5">
                Closes {formatDate(unlockWindow.unlock_end)}
              </p>
            )}
          </div>
        </div>

        {locked ? (
          <SecondaryButton onClick={onUnlock} disabled={processing}>
            <Unlock size={14} aria-hidden="true" />
            <span>Open for editing</span>
          </SecondaryButton>
        ) : (
          <SecondaryButton onClick={onLock} disabled={processing}>
            <Lock size={14} aria-hidden="true" />
            <span>Lock now</span>
          </SecondaryButton>
        )}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ export */

export const EXPORT_OPTIONS = [
  { key: 'excel', icon: Download, title: 'Export to Excel', hint: 'Standard fields' },
  { key: 'pdf', icon: Download, title: 'Export to PDF', hint: 'Print-ready document' },
  { key: 'custom', icon: Settings, title: 'Custom export', hint: 'Choose fields & format' },
];

/**
 * Export menu. `onPick` receives 'excel' | 'pdf' | 'custom' and the container
 * opens the matching config modal — the same three destinations as before.
 */
export function ExportMenu({ open, onToggle, onPick, disabled, align = 'right' }) {
  return (
    <div className="relative">
      <SecondaryButton onClick={onToggle} disabled={disabled} aria-expanded={open} aria-haspopup="menu">
        <Download size={15} aria-hidden="true" />
        <span>Export</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </SecondaryButton>

      {open && (
        <>
          {/* Click-away layer, below the menu but above the page. */}
          <div className="fixed inset-0 z-10" onClick={onToggle} />
          <div
            role="menu"
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-64 z-20
              bg-spc-surface border border-spc-line-strong rounded-spc-panel overflow-hidden`}
          >
            {EXPORT_OPTIONS.map((option, i) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.key}
                  role="menuitem"
                  onClick={() => onPick(option.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left
                    hover:bg-spc-surface-2 transition-colors
                    ${i > 0 ? 'border-t border-spc-line' : ''}`}
                >
                  <Icon size={17} className="text-spc-body flex-shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-spc-xs font-bold text-spc-ink">{option.title}</span>
                    <span className="block text-xs text-spc-muted">{option.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ filter toggle */

export function FilterToggle({ open, onToggle, active }) {
  return (
    <SecondaryButton onClick={onToggle} aria-expanded={open}>
      <Filter size={15} aria-hidden="true" />
      <span>Filters</span>
      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-spc-accent flex-shrink-0" aria-hidden="true" />
      )}
      {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
    </SecondaryButton>
  );
}

/* ------------------------------------------------------------- bulk actions */

/**
 * Bulk bar.
 *
 * Shown whenever there are pending students in view, exactly as before — with
 * nothing selected it states what the checkboxes are for and the buttons are
 * disabled. Hiding it until a selection existed would remove the only hint that
 * bulk actions exist at all.
 */
export function BulkBar({ pendingInView, count, onApprove, onReject, onClear }) {
  if (!pendingInView) return null;
  const none = count === 0;

  return (
    <Panel className={none ? '' : 'border-spc-accent'}>
      <div className="flex items-center justify-between gap-3 flex-wrap p-3">
        <p className="text-spc-xs font-bold text-spc-ink">
          {none ? (
            <span className="text-spc-muted">Select pending students for bulk actions</span>
          ) : (
            <>
              <span className="tabular-nums">{count}</span> pending student
              {count === 1 ? '' : 's'} selected
            </>
          )}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <PrimaryButton onClick={onApprove} disabled={none}>
            Approve selected
          </PrimaryButton>
          <SecondaryButton onClick={onReject} disabled={none}>
            Reject selected
          </SecondaryButton>
          {!none && <SecondaryButton onClick={onClear}>Clear</SecondaryButton>}
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------ row actions */

/**
 * The per-student actions, in an always-visible trailing cell.
 *
 * Which buttons appear is unchanged — Review for every student, approve/reject
 * for pending, email-fix/correction/blacklist for approved, whitelist for
 * blacklisted — and each calls the container's handler directly.
 *
 * Two fixes over the old version. Every button now carries an `aria-label`:
 * they were icon-only with a `title` alone, which a screen reader announces
 * inconsistently and a keyboard user never sees. And the tap area is a real
 * 44px box rather than a bare 24px icon that grew on hover.
 */
function ActionButton({ label, onClick, children, tone = 'default' }) {
  const toneClass =
    tone === 'danger'
      ? 'text-spc-bad hover:bg-spc-bad-bg'
      : tone === 'warn'
      ? 'text-spc-warn hover:bg-spc-warn-bg'
      : 'text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center w-11 h-11 rounded-spc-control
        flex-shrink-0 transition-colors ${toneClass}`}
    >
      {children}
    </button>
  );
}

export function StudentActions({
  student,
  onReview,
  onApprove,
  onReject,
  onEmailFix,
  onCorrection,
  onBlacklist,
  onWhitelist,
}) {
  const isPending = student.registration_status === 'pending' && !student.is_blacklisted;
  const isApproved = student.registration_status === 'approved' && !student.is_blacklisted;
  const name = student.name || student.student_name || student.prn;

  return (
    <div className="flex items-center gap-0.5">
      {/* Review is available for EVERY status — approving or rejecting without
          seeing the details makes no sense. */}
      <ActionButton label={`Review details for ${name}`} onClick={() => onReview(student)}>
        <Eye size={18} aria-hidden="true" />
      </ActionButton>

      {isPending && (
        <>
          <ActionButton label={`Approve ${name}`} onClick={() => onApprove(student.id)}>
            <Check size={18} aria-hidden="true" />
          </ActionButton>
          <ActionButton label={`Reject ${name}`} onClick={() => onReject(student.id)} tone="danger">
            <X size={18} aria-hidden="true" />
          </ActionButton>
        </>
      )}

      {isApproved && (
        <>
          <ActionButton
            label={
              student.email_verified
                ? `Update email for ${name}`
                : `Email not verified for ${name} — fix and resend the link`
            }
            onClick={() => onEmailFix(student)}
            tone={student.email_verified ? 'default' : 'warn'}
          >
            <MailWarning size={18} aria-hidden="true" />
          </ActionButton>
          <ActionButton
            label={`Send ${name} back for correction`}
            onClick={() => onCorrection(student)}
          >
            <FileEdit size={18} aria-hidden="true" />
          </ActionButton>
          <ActionButton
            label={`Blacklist ${name}`}
            onClick={() => onBlacklist(student)}
            tone="danger"
          >
            <Ban size={18} aria-hidden="true" />
          </ActionButton>
        </>
      )}

      {student.is_blacklisted && (
        <ActionButton label={`Request whitelist for ${name}`} onClick={() => onWhitelist(student)}>
          <Shield size={18} aria-hidden="true" />
        </ActionButton>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- pagination */

export function Pagination({ currentPage, totalPages, pageSize, totalStudents, onPageChange, onPageSizeChange }) {
  if (totalPages <= 1) return null;
  const first = (currentPage - 1) * pageSize + 1;
  const last = Math.min(currentPage * pageSize, totalStudents);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-spc-line">
      <p className="text-spc-xs text-spc-muted">
        Showing <span className="font-bold text-spc-ink tabular-nums">{first}</span>–
        <span className="font-bold text-spc-ink tabular-nums">{last}</span> of{' '}
        <span className="font-bold text-spc-ink tabular-nums">{totalStudents}</span>
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {/* 25/50/100/200 and the first/last jumps are exactly what the old
            pagination offered — same options, same destinations. */}
        <select
          value={pageSize}
          onChange={onPageSizeChange}
          aria-label="Rows per page"
          className={`${FIELD_CLASS} w-auto`}
        >
          {[25, 50, 100, 200].map((size) => (
            <option key={size} value={size}>{size} per page</option>
          ))}
        </select>
        <SecondaryButton onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          First
        </SecondaryButton>
        <SecondaryButton
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </SecondaryButton>
        <span className="text-spc-xs font-bold text-spc-ink tabular-nums px-1">
          {currentPage} / {totalPages}
        </span>
        <SecondaryButton
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </SecondaryButton>
        <SecondaryButton
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          Last
        </SecondaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- empty */

export function EmptyState({ filtered, activeTab }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-spc-sm text-spc-muted font-medium">
        {filtered
          ? 'No students match your filters.'
          : `No ${activeTab === 'all' ? '' : activeTab} students found.`}
      </p>
    </div>
  );
}

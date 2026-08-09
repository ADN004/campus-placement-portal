import { useState } from 'react';
import { Eye, Edit2, Trash2, Ban, CheckCircle, Lock, ChevronDown } from 'lucide-react';
import {
  Panel, EmptyState, formatDate,
} from '../../../components/officer/OfficerUI';
import RowActions from '../../../components/officer/RowActions';

/**
 * Pieces shared by the three ManagePRNRanges presenters.
 *
 * A PRN range decides who is allowed to register, so the two states that matter
 * are whether a range is enabled and whether the Super Admin has frozen the
 * whole page. Both are said in words here rather than left to a badge colour.
 */

/* ----------------------------------------------------------------- status */

/**
 * Enabled/disabled as a dot plus the word.
 *
 * The old markup checked `is_enabled` and fell back to `is_active`, showing
 * "Active/Inactive" for one and "Enabled/Disabled" for the other — two
 * vocabularies for the same column depending on which field the API happened to
 * send. One vocabulary now, with `is_enabled` preferred and `is_active` as the
 * fallback, exactly as before.
 */
export function RangeStatus({ range }) {
  const enabled = range.is_enabled !== undefined ? range.is_enabled : range.is_active;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${enabled ? 'bg-spc-ok' : 'bg-spc-warn'}`}
      />
      <span className="text-spc-xs font-semibold text-spc-ink">
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
    </span>
  );
}

/** The PRNs deliberately excluded from a range. */
export function ExceptedPrns({ prns }) {
  if (!prns || (Array.isArray(prns) && prns.length === 0)) return null;
  const list = Array.isArray(prns) ? prns : String(prns).split(',').map((p) => p.trim()).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <span className="block text-xs text-spc-muted mt-0.5">
      except <span className="tabular-nums">{list.join(', ')}</span>
    </span>
  );
}

/** How a range identifies itself: a single PRN, or a span. */
export function RangeIdentity({ range }) {
  if (range.single_prn) {
    return (
      <span className="min-w-0">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-spc-muted">Single</span>
          <span className="text-spc-xs font-bold text-spc-ink tabular-nums">{range.single_prn}</span>
        </span>
        <ExceptedPrns prns={range.excepted_prns} />
      </span>
    );
  }
  return (
    <span className="min-w-0">
      <span className="text-spc-xs font-bold text-spc-ink tabular-nums">
        {range.start_prn} – {range.end_prn}
      </span>
      <ExceptedPrns prns={range.excepted_prns} />
    </span>
  );
}

/* ---------------------------------------------------------------- actions */

/**
 * Row actions. When the Super Admin has locked PRN management, editing and
 * deleting disappear and a plain "Locked" marker takes their place — the same
 * rule as before, said in words.
 */
export function RangeActions({ range, locked, onViewStudents, onToggle, onEdit, onDelete }) {
  const label = range.single_prn || `${range.start_prn}–${range.end_prn}`;
  const enabled = range.is_enabled !== undefined ? range.is_enabled : range.is_active;

  // Two reasons a row is read-only: the Super Admin has frozen PRN management
  // for this college, or the range is one the Super Admin created and is not
  // the officer's to change. The second cannot currently reach an officer —
  // the endpoint is scoped to their college and a super_admin row is always
  // college-less — but it is the correct rule for the row and costs nothing,
  // so it stays rather than being an assumption about the query.
  const bySuperAdmin = range.created_by === 'super_admin';
  const readOnly = locked || bySuperAdmin;

  /*
   * A range the year-end reset closed is a third state, between the two.
   *
   * It cannot be reopened or edited — its intake has passed out — but it can
   * still be looked at and cleared away, because otherwise closed ranges pile
   * up one intake at a time and there is no way to tidy them. Deleting one
   * removes only the range record; the graduates keep everything.
   */
  const closed = Boolean(range.closed_for_year);

  /*
   * All of it behind the one trigger. Nothing here is repeated across rows in a
   * sitting the way approving an intake is, so nothing earns a permanent seat.
   *
   * The read-only case is not a menu at all — a row an officer cannot act on
   * should say why, not offer a trigger that opens an empty list.
   */
  if (readOnly) {
    return (
      <div className="flex items-center justify-end gap-0.5 flex-nowrap">
        <span
          title={bySuperAdmin && !locked ? 'Added by the Super Admin — ask them to change it' : undefined}
          className="inline-flex items-center gap-1.5 px-2.5 min-h-[44px] text-spc-xs
            font-bold text-spc-muted whitespace-nowrap"
        >
          <Lock size={15} aria-hidden="true" />
          <span>{bySuperAdmin && !locked ? 'Super Admin' : 'Locked'}</span>
        </span>
      </div>
    );
  }

  const actions = closed ? [
    {
      key: 'students',
      label: 'View students',
      description: `View students in range ${label}`,
      icon: Eye,
      onSelect: () => onViewStudents(range),
    },
    {
      key: 'delete',
      label: 'Remove from the list',
      description: `Remove the closed range ${label} from the list`,
      icon: Trash2,
      tone: 'danger',
      onSelect: () => onDelete(range.id, range.created_by),
    },
  ] : [
    {
      key: 'students',
      label: 'View students',
      description: `View students in range ${label}`,
      icon: Eye,
      onSelect: () => onViewStudents(range),
    },
    {
      /*
       * An action, so it carries an action's icon. This was a toggle switch
       * glyph, which is a *state* control: drawn "on" it repeated what the
       * Status column already says, while sitting on a button whose job is to
       * turn that off. A slashed circle for "stop this", a tick for "turn it
       * back on".
       */
      key: 'toggle',
      label: enabled ? 'Disable range' : 'Enable range',
      description: enabled ? `Disable range ${label}` : `Enable range ${label}`,
      icon: enabled ? Ban : CheckCircle,
      tone: enabled ? 'danger' : 'positive',
      onSelect: () => onToggle(range),
    },
    {
      key: 'edit',
      label: 'Edit range',
      description: `Edit range ${label}`,
      icon: Edit2,
      onSelect: () => onEdit(range),
    },
    {
      key: 'delete',
      label: 'Delete range',
      description: `Delete range ${label}`,
      icon: Trash2,
      tone: 'danger',
      onSelect: () => onDelete(range.id, range.created_by),
    },
  ];

  return <RowActions actions={actions} subject={label} />;
}

/* ------------------------------------------------------------------ table */

/*
 * Eight columns, fixed proportions, full width.
 *
 * This took four goes because the first three all assumed the leftover width
 * had to be given to a column. Under `table-layout: auto` a browser hands it to
 * whichever column holds the widest content, and wherever it lands it reads as
 * a hole — the actions stranded 265px from the status, or 300px between a
 * description and the count beside it.
 *
 * Two things fix it together. The table had less to say than an officer wanted
 * to know, so it now says more: how many students a range covers, when it was
 * added, and by whom. "How many does this cover?" is the first question anyone
 * has about a range and the page could not answer it without opening each one.
 * And `table-fixed` with a declared share per column spreads the remaining
 * slack thinly across all eight instead of pooling it in one.
 *
 * The shares are measured, not guessed. Minimum content widths at this type
 * size are PRN 192px, Added by 86, Added 80, Status 61, Year 35, Students 18,
 * plus a 44px trigger and 24px of padding each — 807px in total, which is why
 * the table carries min-w-[52rem] and stops shrinking there. The percentages
 * give every column its minimum at that width and share what is left over.
 *
 * Alignment is two groups rather than a zig-zag: what the range *is* on the
 * left, what it currently amounts to on the right. Status used to sit left
 * between two right-aligned columns, which is what made the row look ragged.
 */
const PRN_COLUMNS = [
  { label: 'PRN range', align: 'text-left', width: 'w-[23%]' },
  { label: 'Year', align: 'text-left', width: 'w-[8%]' },
  { label: 'Description', align: 'text-left', width: 'w-[13%]' },
  { label: 'Students', align: 'text-right', width: 'w-[9%]' },
  { label: 'Added', align: 'text-right', width: 'w-[12%]' },
  { label: 'Added by', align: 'text-left', width: 'w-[14%]' },
  { label: 'Status', align: 'text-right', width: 'w-[14%]' },
  { label: 'Actions', align: 'text-right', width: 'w-[7%]' },
];

export function RangeTable({ ranges, locked, actionHandlers, emptyTitle, emptyHint }) {
  if (ranges.length === 0) {
    return (
      <EmptyState>
        {emptyTitle}
        {emptyHint && <span className="block text-xs mt-1">{emptyHint}</span>}
      </EmptyState>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse min-w-[52rem]">
        <caption className="sr-only">
          PRN ranges for your college. Columns: the PRN range, the year it covers, its
          description, how many students it currently covers, when it was added and by whom,
          whether it is enabled, and actions.
        </caption>
        <thead>
          <tr className="bg-spc-surface-2 border-b-[1.5px] border-spc-rule-structural">
            {/* Actions sits right, because its trigger does. A left-aligned
                header over a right-aligned button reads as two columns. */}
            {PRN_COLUMNS.map(({ label, align, width }) => (
              <th key={label} scope="col"
                className={`px-3 py-2 font-khand font-medium uppercase tracking-[0.06em]
                  text-spc-xs text-spc-muted whitespace-nowrap ${align} ${width}`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranges.map((range) => (
            <tr key={range.id} className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2 transition-colors">
              <th scope="row" className="px-3 py-2 text-left font-normal whitespace-nowrap">
                <RangeIdentity range={range} />
              </th>
              <td className="px-3 py-2 text-spc-xs text-spc-ink tabular-nums whitespace-nowrap">
                {range.year || '–'}
              </td>
              {/* Truncated, with the full text on hover. Free text is the one
                  thing here with no natural limit, and under a fixed layout an
                  overlong note would run into the column beside it. */}
              <td className="px-3 py-2 text-spc-xs text-spc-body">
                <span className="block truncate" title={range.description || undefined}>
                  {range.description || '–'}
                </span>
              </td>
              {/* Right-aligned and tabular, like every other figure in the
                  role. Zero is said as a zero rather than a dash: "no student
                  has registered under this range yet" is information, and a
                  dash reads as "not known". */}
              <td className="px-3 py-2 text-spc-xs text-spc-ink font-bold text-right tabular-nums whitespace-nowrap">
                {typeof range.student_count === 'number' ? range.student_count : '–'}
              </td>
              <td className="px-3 py-2 text-spc-xs text-spc-body text-right tabular-nums whitespace-nowrap">
                {formatDate(range.created_at)}
              </td>
              {/* Already in the response and never shown. Officers change
                  between intakes, and "who set this range up" is the question
                  behind half the ones that look wrong. */}
              <td className="px-3 py-2 text-spc-xs text-spc-body">
                <span className="block truncate" title={range.added_by_email || undefined}>
                  {range.added_by_email || '–'}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-right"><RangeStatus range={range} /></td>
              <td className="px-3 py-2 whitespace-nowrap">
                <RangeActions range={range} locked={locked} {...actionHandlers} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RangeList({ ranges, locked, actionHandlers, emptyTitle, emptyHint }) {
  if (ranges.length === 0) {
    return (
      <EmptyState>
        {emptyTitle}
        {emptyHint && <span className="block text-xs mt-1">{emptyHint}</span>}
      </EmptyState>
    );
  }

  return (
    <ul>
      {ranges.map((range) => (
        <li key={range.id} className="px-4 py-3 border-b border-spc-line last:border-b-0">
          <div className="flex items-start justify-between gap-3">
            <RangeIdentity range={range} />
            <RangeStatus range={range} />
          </div>
          {/* Same facts as the desktop row, in the phone's idiom. The count
              leads, because it is the one an officer is actually looking for
              and a phone gives it nowhere else to hide. */}
          <p className="text-xs text-spc-muted mt-1 break-words">
            {typeof range.student_count === 'number'
              ? `${range.student_count} student${range.student_count === 1 ? '' : 's'}`
              : 'Students not counted'}
            {range.year ? ` · Year ${range.year}` : ''}
            {range.description ? ` · ${range.description}` : ''}
            {range.created_at ? ` · Added ${formatDate(range.created_at)}` : ''}
          </p>
          <div className="flex justify-end mt-1">
            <RangeActions range={range} locked={locked} {...actionHandlers} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------- explainer */

export const PRN_POINTS = [
  'A PRN range decides which students are allowed to register for your college.',
  'Disabling a range deactivates the accounts of students whose PRN falls inside it.',
  'Excepted PRNs stay out of a range even when they fall between its start and end.',
  // Was "Ranges added by the Super Admin are shown separately and cannot be
  // edited here", which stopped being true when the endpoint was scoped to the
  // officer's own college: they are not shown separately, they are not shown at
  // all. The page still needs to say so, because such a range can admit a
  // student to this college without ever appearing on this list.
  'The Super Admin can add ranges for your college that do not appear here. They still decide who may register.',
];

const EXPLAINER_KEY = 'spc-officer-prn-explainer';

/**
 * The four rules, as a disclosure that remembers whether it was closed.
 *
 * It used to be a plain panel: 216px of tutorial above the table, on every
 * visit, for the whole life of the account. It is worth reading once — the
 * consequence of disabling a range is not guessable — and worth nothing on the
 * fiftieth visit, when it is just pushing the ranges below the fold.
 *
 * Open on first arrival, so it still teaches. Closed from then on once the
 * officer closes it, because the choice is kept. Reading the preference during
 * the initialiser rather than in an effect avoids the panel expanding and then
 * snapping shut on every load.
 */
export function HowPrnRangesWork({ points = PRN_POINTS }) {
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(EXPLAINER_KEY) !== 'closed';
    } catch {
      // Private mode, or storage disabled. Showing it is the safe default.
      return true;
    }
  });

  const toggle = () => {
    setOpen((wasOpen) => {
      try {
        window.localStorage.setItem(EXPLAINER_KEY, wasOpen ? 'closed' : 'open');
      } catch {
        /* not being able to remember the choice must not break the toggle */
      }
      return !wasOpen;
    });
  };

  return (
    <Panel>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="prn-explainer"
        className="w-full flex items-center justify-between gap-3 px-4 min-h-[44px] text-left
          border-b border-spc-line transition-colors hover:bg-spc-surface-2"
      >
        <span className="font-khand font-medium uppercase tracking-[0.06em] text-spc-xs text-spc-muted">
          How PRN ranges work
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`flex-shrink-0 text-spc-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul id="prn-explainer">
          {points.map((point) => (
            <li key={point}
              className="px-4 py-3 text-spc-xs text-spc-body leading-snug border-b border-spc-line last:border-b-0">
              {point}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

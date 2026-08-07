import { Eye, Edit2, Trash2, Ban, CheckCircle, Lock } from 'lucide-react';
import {
  Panel, PanelHeading, ActionButton, EmptyState,
} from '../../../components/officer/OfficerUI';

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
export function RangeActions({ range, locked, showLabels, onViewStudents, onToggle, onEdit, onDelete }) {
  const label = range.single_prn || `${range.start_prn}–${range.end_prn}`;
  const enabled = range.is_enabled !== undefined ? range.is_enabled : range.is_active;

  return (
    <div className="flex items-center gap-0.5 flex-nowrap">
      <ActionButton
        label="Students"
        description={`View students in range ${label}`}
        showLabel={showLabels}
        onClick={() => onViewStudents(range)}
      >
        <Eye size={18} aria-hidden="true" />
      </ActionButton>

      {locked ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 min-h-[44px] text-spc-xs
          font-bold text-spc-muted whitespace-nowrap">
          <Lock size={15} aria-hidden="true" />
          <span>Locked</span>
        </span>
      ) : (
        <>
          {/*
            An action, so it carries an action's icon.
            This was a toggle switch glyph — ToggleRight when the range was
            enabled, ToggleLeft when it was not. A switch is a *state* control:
            drawn in the "on" position it says "this is currently on", which is
            what the Status column two cells to the left already says, and it
            sat on a button whose entire job is to turn that off, in red. It did
            not behave like a switch either — clicking it opens a confirmation
            dialog rather than flipping anything.

            State belongs in the Status column and nowhere else. Here: a slashed
            circle for "stop this", a tick for "turn this back on".
          */}
          <ActionButton
            label={enabled ? 'Disable' : 'Enable'}
            description={enabled ? `Disable range ${label}` : `Enable range ${label}`}
            tone={enabled ? 'danger' : 'positive'}
            showLabel={showLabels}
            onClick={() => onToggle(range)}
          >
            {enabled
              ? <Ban size={18} aria-hidden="true" />
              : <CheckCircle size={18} aria-hidden="true" />}
          </ActionButton>
          <ActionButton
            label="Edit"
            description={`Edit range ${label}`}
            showLabel={false}
            onClick={() => onEdit(range)}
          >
            <Edit2 size={18} aria-hidden="true" />
          </ActionButton>
          <ActionButton
            label="Delete"
            description={`Delete range ${label}`}
            tone="danger"
            showLabel={showLabels}
            onClick={() => onDelete(range.id, range.created_by)}
          >
            <Trash2 size={18} aria-hidden="true" />
          </ActionButton>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ table */

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
      <table className="w-full border-collapse">
        <caption className="sr-only">
          PRN ranges for your college, with the years they cover and whether each is enabled.
        </caption>
        <thead>
          <tr className="bg-spc-surface-2 border-b-[1.5px] border-spc-rule-structural">
            {['PRN range', 'Year', 'Description', 'Status', 'Actions'].map((h) => (
              <th key={h} scope="col"
                className="px-3 py-2 font-khand font-medium uppercase tracking-[0.06em]
                  text-spc-xs text-spc-muted whitespace-nowrap text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranges.map((range) => (
            <tr key={range.id} className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2 transition-colors">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                <RangeIdentity range={range} />
              </th>
              <td className="px-3 py-2 text-spc-xs text-spc-ink tabular-nums">{range.year || '–'}</td>
              <td className="px-3 py-2 text-spc-xs text-spc-body">{range.description || '–'}</td>
              <td className="px-3 py-2"><RangeStatus range={range} /></td>
              <td className="px-3 py-2 whitespace-nowrap">
                <RangeActions range={range} locked={locked} showLabels {...actionHandlers} />
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
          <p className="text-xs text-spc-muted mt-1 break-words">
            {range.year ? `Year ${range.year}` : 'No year'}
            {range.description ? ` · ${range.description}` : ''}
          </p>
          <div className="flex justify-end mt-1">
            <RangeActions range={range} locked={locked} showLabels={false} {...actionHandlers} />
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
  'Ranges added by the Super Admin are shown separately and cannot be edited here.',
];

export function HowPrnRangesWork({ points = PRN_POINTS }) {
  return (
    <Panel>
      <PanelHeading>How PRN ranges work</PanelHeading>
      <ul>
        {points.map((point) => (
          <li key={point}
            className="px-4 py-3 text-spc-xs text-spc-body leading-snug border-b border-spc-line last:border-b-0">
            {point}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

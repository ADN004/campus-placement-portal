import { useState } from 'react';
import { AlertTriangle, Clock, Undo2 } from 'lucide-react';
import Modal from './Modal';
import {
  OFFICER_OVERLAY, officerPanel, OfficerDialogHeader, OfficerDialogFooter,
} from './officer/OfficerDialog';
import { PrimaryButton, SecondaryButton } from './officer/OfficerUI';
import {
  ADMIN_OVERLAY, adminPanel, AdminDialogHeader, AdminDialogFooter,
} from './admin/AdminDialog';
import {
  PrimaryButton as AdminPrimary, SecondaryButton as AdminSecondary,
} from './admin/AdminUI';

/**
 * Closing a round, explained before it happens and visible until it does.
 *
 * Shortlisting eight people out of three hundred says something about the other
 * two hundred and ninety-two, and the portal used to say nothing: they sat at
 * "Under review" forever, which was simply untrue. Now the round closes on its
 * own after a few quiet days — but an automatic rejection that nobody saw
 * coming is worse than the silence it replaces, so it is announced twice.
 *
 * Once here, at the moment of marking, because that is when the officer can
 * still do something about it: the dialog names the number of people the
 * countdown will catch and asks them to finish the list rather than come back
 * to it. And once on the page, as a countdown that stays there for the whole
 * grace period and can be extended or cancelled.
 *
 * The two role branches are one branch. Officer and Console expose the same
 * dialog primitives under the same names, so the markup is written once and a
 * change to the warning cannot land in one role and miss the other.
 */

const OFFICER_UI = {
  overlay: OFFICER_OVERLAY,
  panel: officerPanel,
  Header: OfficerDialogHeader,
  Footer: OfficerDialogFooter,
  Primary: PrimaryButton,
  Secondary: SecondaryButton,
};

const ADMIN_UI = {
  overlay: ADMIN_OVERLAY,
  panel: adminPanel,
  Header: AdminDialogHeader,
  Footer: AdminDialogFooter,
  Primary: AdminPrimary,
  Secondary: AdminSecondary,
};

const uiFor = (variant) => (variant === 'admin' ? ADMIN_UI : OFFICER_UI);

/** A due date as "22 Sep 2026", matching the dates elsewhere in both roles. */
export function formatDueDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "in 5 days", "tomorrow", "today" — the part an officer actually plans around. */
export function daysUntil(value) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round(
    (midnight(due) - midnight(new Date())) / (24 * 60 * 60 * 1000)
  );
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

const STAGE_COPY = {
  shortlist: {
    verb: 'shortlist',
    marking: 'Shortlist',
    leftBehind: 'still under review',
    outcome: 'not be taken to the next round',
  },
  select: {
    verb: 'mark as selected',
    marking: 'Mark selected',
    leftBehind: 'still shortlisted',
    outcome: 'not be selected',
  },
};

/* ------------------------------------------------------- the warning dialog */

/**
 * Shown before a marking that starts a countdown.
 *
 * `remaining` is counted by the caller from the list already on screen rather
 * than fetched, which makes it exactly the set of people that officer can see —
 * and therefore exactly the set their marking is allowed to close. An officer
 * of a joint college sees only their own students here, and only their own
 * students are ever caught.
 */
export function RoundClosureWarning({
  stage,
  count,
  remaining,
  dueAt,
  graceDays,
  variant = 'officer',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const ui = uiFor(variant);
  const copy = STAGE_COPY[stage] || STAGE_COPY.shortlist;
  const { Primary, Secondary } = ui;

  return (
    <Modal
      onClose={onCancel}
      labelledBy="round-closure-title"
      overlayClassName={ui.overlay}
      panelClassName={ui.panel('md')}
    >
      <ui.Header
        id="round-closure-title"
        title={`${copy.marking} ${count} ${count === 1 ? 'student' : 'students'}?`}
        onClose={onCancel}
      />

      <div className="px-5 sm:px-6 py-5 space-y-4">
        <p className="text-spc-sm text-spc-body">
          {count === 1 ? 'This student' : `These ${count} students`} will be moved to{' '}
          <span className="font-bold text-spc-ink">
            {stage === 'shortlist' ? 'Shortlisted' : 'Selected'}
          </span>
          .
        </p>

        {remaining > 0 ? (
          <div className="rounded-spc bg-spc-warn-bg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-spc-warn flex-shrink-0 mt-0.5" size={19} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-spc-sm font-bold text-spc-ink">
                  {remaining} other {remaining === 1 ? 'student is' : 'students are'} {copy.leftBehind}.
                </p>
                <p className="text-spc-sm text-spc-body mt-1.5">
                  They will {copy.outcome}, so after{' '}
                  <span className="font-bold">{graceDays} days</span> with no further
                  marking on this job they are rejected automatically
                  {dueAt ? ` — on ${formatDueDate(dueAt)}` : ''}.
                </p>
                {/* The actual ask. The countdown exists so that nobody has to
                    finish in one sitting, but finishing in one sitting is still
                    the right thing to do and this is the moment to say so. */}
                <p className="text-spc-sm text-spc-body mt-2">
                  If any of them should go forward,{' '}
                  <span className="font-bold text-spc-ink">mark them now</span>. Every
                  further marking pushes the date back, and you can cancel the
                  automatic closure from this page at any time before it runs.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-spc bg-spc-surface-2 p-4">
            <p className="text-spc-sm text-spc-body">
              Nobody is left {copy.leftBehind} on this job, so nothing will be
              closed automatically.
            </p>
          </div>
        )}
      </div>

      <ui.Footer>
        <Secondary onClick={onCancel} disabled={busy}>
          Cancel
        </Secondary>
        <Primary onClick={onConfirm} disabled={busy}>
          {busy ? 'Saving…' : `${copy.marking} ${count}`}
        </Primary>
      </ui.Footer>
    </Modal>
  );
}

/* ------------------------------------------------------------ the countdown */

/**
 * Live countdowns on a job, on the applicants page.
 *
 * Renders nothing when there are none, which is most jobs most of the time.
 * Each row names the number of people it holds and the date it runs, and both
 * roles can push it back or call it off — the difference between a rule people
 * trust and a rule they work around is whether they can see it coming.
 */
export function RoundClosurePanel({
  cascades = [],
  variant = 'officer',
  busy = false,
  onExtend,
  onCancel,
  onRunNow,
  canManage = true,
}) {
  if (!cascades.length) return null;
  const { Secondary } = uiFor(variant);

  return (
    <section className="rounded-spc border border-spc-warn/40 bg-spc-warn-bg p-4 mb-5">
      <h2 className="text-spc-label font-bold uppercase text-spc-warn mb-3 flex items-center gap-2">
        <Clock size={15} aria-hidden="true" />
        {cascades.length === 1 ? 'Round closing' : 'Rounds closing'}
      </h2>

      <ul className="space-y-3">
        {cascades.map((c) => {
          const copy = STAGE_COPY[c.stage] || STAGE_COPY.shortlist;
          const when = daysUntil(c.due_at);
          return (
            <li key={c.id} className="min-w-0">
              <p className="text-spc-sm text-spc-ink">
                <span className="font-bold tabular-nums">{c.pending_count}</span>{' '}
                {c.pending_count === 1 ? 'student' : 'students'} {copy.leftBehind}
                {c.scope_college_name ? ` at ${c.scope_college_name}` : ''} will be
                rejected automatically{' '}
                <span className="font-bold">{when}</span>
                {c.due_at ? ` (${formatDueDate(c.due_at)})` : ''}.
              </p>

              {c.pending_count === 0 && (
                <p className="text-xs text-spc-body mt-1">
                  Nobody is left to close — this will simply expire.
                </p>
              )}

              {/* Per row, not per panel: an officer of a joint college sees
                  their own college's countdown beside the whole-job one, and
                  may act on the first but not the second. The server refuses
                  either way — this is so the buttons are not offered at all. */}
              {canManage && c.can_manage !== false && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Secondary onClick={() => onExtend?.(c)} disabled={busy}>
                    Give it longer
                  </Secondary>
                  <Secondary onClick={() => onCancel?.(c)} disabled={busy}>
                    Don&apos;t close this round
                  </Secondary>
                  {onRunNow && (
                    <Secondary onClick={() => onRunNow(c)} disabled={busy || c.pending_count === 0}>
                      Close it now
                    </Secondary>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* --------------------------------------------------------------- undo notice */

/**
 * Offered straight after a bulk marking, for as long as the page is open.
 *
 * A bulk click can move three hundred applications at once, and the cost of
 * getting the selection wrong used to be unrecoverable — reviewed_by held only
 * the most recent write, so the previous statuses were simply gone. Every bulk
 * write now shares a batch id, and this is the button that spends it.
 */
export function UndoBanner({ batch, variant = 'officer', busy = false, onUndo, onDismiss }) {
  if (!batch) return null;
  const { Secondary } = uiFor(variant);

  return (
    <div className="rounded-spc border border-spc-line-strong bg-spc-surface p-3 mb-4
      flex items-center gap-3 flex-wrap">
      <Undo2 size={16} className="text-spc-muted flex-shrink-0" aria-hidden="true" />
      <p className="text-spc-sm text-spc-body min-w-0 flex-1">
        {batch.count} {batch.count === 1 ? 'application' : 'applications'} moved to{' '}
        <span className="font-bold text-spc-ink">{batch.label}</span>.
      </p>
      <Secondary onClick={onUndo} disabled={busy}>
        {busy ? 'Undoing…' : 'Undo'}
      </Secondary>
      <button
        type="button"
        onClick={onDismiss}
        className="text-spc-xs font-bold text-spc-muted hover:text-spc-ink px-2 py-1"
      >
        Dismiss
      </button>
    </div>
  );
}

/* ------------------------------------------------------------- moving back */

const REVERT_TARGETS = [
  ['under_review', 'Under review', 'Back to waiting, as if nothing had been decided yet.'],
  ['shortlisted', 'Shortlisted', 'Through to the next round, but not selected.'],
];

/**
 * Putting people back to an earlier stage.
 *
 * The Undo banner can only reach a batch this page just wrote. Everything
 * older — a whole drive marked Selected by accident last term, or anything at
 * all from before this feature existed — has no batch, and until this dialog
 * there was no way to correct it from the interface at all.
 *
 * Deliberately not a fourth button in the row of forward actions. It is the
 * only control here that moves people backwards, it is the one most likely to
 * be pressed by mistake, and it names the number and the destination before it
 * does anything.
 */
export function RevertDialog({
  count,
  currentStages = [],
  variant = 'admin',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const ui = uiFor(variant);
  const { Primary, Secondary } = ui;
  const [target, setTarget] = useState('under_review');

  return (
    <Modal
      onClose={onCancel}
      labelledBy="revert-title"
      overlayClassName={ui.overlay}
      panelClassName={ui.panel('md')}
    >
      <ui.Header
        id="revert-title"
        title={`Move ${count} ${count === 1 ? 'student' : 'students'} back`}
        subtitle="Corrects a marking that should not have happened."
        onClose={onCancel}
      />

      <div className="px-5 sm:px-6 py-5 space-y-4">
        {currentStages.length > 0 && (
          <p className="text-spc-sm text-spc-body">
            Currently{' '}
            <span className="font-bold text-spc-ink">{currentStages.join(', ')}</span>.
          </p>
        )}

        <fieldset>
          <legend className="text-spc-label font-bold uppercase text-spc-muted mb-2">
            Move them to
          </legend>
          <div className="space-y-2">
            {REVERT_TARGETS.map(([value, label, hint]) => (
              <label
                key={value}
                className="flex items-start gap-3 p-3 rounded-spc border border-spc-line
                  hover:bg-spc-surface-2 cursor-pointer min-h-[44px]"
              >
                <input
                  type="radio"
                  name="revert-target"
                  value={value}
                  checked={target === value}
                  onChange={() => setTarget(value)}
                  className="mt-1 flex-shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-spc-sm font-bold text-spc-ink">{label}</span>
                  <span className="block text-xs text-spc-muted mt-0.5">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="rounded-spc bg-spc-surface-2 p-4">
          <p className="text-xs text-spc-body">
            Students are not told about this. Their application simply shows the
            earlier stage again, and the change is recorded against whoever made
            it — so a correction is never mistaken later for a fresh decision.
          </p>
        </div>
      </div>

      <ui.Footer>
        <Secondary onClick={onCancel} disabled={busy}>Cancel</Secondary>
        <Primary onClick={() => onConfirm(target)} disabled={busy}>
          {busy ? 'Moving…' : `Move ${count} back`}
        </Primary>
      </ui.Footer>
    </Modal>
  );
}

export default RoundClosureWarning;

import {
  Building2, GraduationCap, Users, UserCog, Send, AlertTriangle, ArrowLeftRight,
} from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  Panel, PanelHeading, SectionLabel, FieldLabel, FIELD_CLASS, CHECKBOX_CLASS,
  SecondaryButton, PrimaryButton, EmptyState,
} from '../../../components/admin/AdminUI';
import {
  adminPanel, ADMIN_OVERLAY, AdminDialogHeader, AdminDialogBody, AdminDialogFooter,
} from '../../../components/admin/AdminDialog';

/**
 * The parts of the Send Notification page.
 *
 * The thing this page has to get right is that the person pressing Send knows
 * who it reaches. Sixty colleges and their branches is a lot of state to hold in
 * your head, so the count is never more than a glance away and it says how it
 * was arrived at.
 */

/* ---------------------------------------------------------------- recipients */

/**
 * Who the message is addressed to.
 *
 * Students first and students by default, in the array and in the form. It is
 * the audience for nearly every message and the one where being wrong is
 * largest, so it is never the thing somebody has to remember to set.
 *
 * Officers are here because they have had an inbox since joint jobs needed
 * announcing, and until now nothing could write to it by hand -- the only
 * sender was the joint-job notice.
 */
export const RECIPIENTS = [
  {
    value: 'students',
    label: 'Students',
    one: 'student',
    many: 'students',
    hint: 'Approved, active students at the colleges chosen',
  },
  {
    value: 'officers',
    label: 'Placement Officers',
    one: 'placement officer',
    many: 'placement officers',
    hint: 'The placement officer accounts at those colleges',
  },
];

export const recipientOf = (value) => (
  RECIPIENTS.find((r) => r.value === value) || RECIPIENTS[0]
);

/** "10450 students" / "1 placement officer". */
export const describeAudience = (count, recipient) => {
  const meta = recipientOf(recipient);
  return `${count} ${count === 1 ? meta.one : meta.many}`;
};

export function RecipientChoice({ value, onChange, disabled, counts }) {
  return (
    <fieldset>
      <legend className="block text-spc-label font-bold uppercase text-spc-body mb-1.5">
        Send to
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {RECIPIENTS.map((option) => {
          const selected = value === option.value;
          const Icon = option.value === 'officers' ? UserCog : Users;
          return (
            <label
              key={option.value}
              className={`flex flex-col gap-0.5 p-3 rounded-spc-admin-sm border cursor-pointer
                transition-colors
                ${selected
                  ? 'bg-spc-selected border-spc-accent'
                  : 'bg-spc-surface border-spc-control hover:bg-spc-surface-2'}`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="recipient_type"
                  value={option.value}
                  checked={selected}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={disabled}
                  className={CHECKBOX_CLASS}
                />
                <Icon size={15} aria-hidden="true" className="text-spc-body flex-shrink-0" />
                <span className="text-spc-sm font-bold text-spc-ink">{option.label}</span>
                <span className="ml-auto text-spc-xs font-bold text-spc-body tabular-nums">
                  {counts?.[option.value] ?? 0}
                </span>
              </span>
              <span className="text-spc-xs text-spc-body pl-7">{option.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ priority */

/**
 * How loudly it arrives.
 *
 * Urgent also sends email, which is the only one of the three with a
 * consequence outside the portal, so it is the only one that says so.
 */
export const PRIORITIES = [
  { value: 'normal', label: 'Normal', hint: 'Appears in their notifications' },
  { value: 'high', label: 'High', hint: 'Shown as a popup on their next visit' },
  { value: 'urgent', label: 'Urgent', hint: 'Popup, and an email as well' },
];

/**
 * The same three levels, described truthfully for an officer.
 *
 * The popup is PriorityNotificationPopup, a student component mounted on the
 * student dashboard and nowhere else. Officers have no equivalent, so High and
 * Urgent reach them in the inbox and not on top of it. Leaving the student
 * wording in place would have promised a popup that cannot happen.
 */
const OFFICER_PRIORITIES = [
  { value: 'normal', label: 'Normal', hint: 'Appears in their inbox' },
  { value: 'high', label: 'High', hint: 'Marked high in their inbox' },
  { value: 'urgent', label: 'Urgent', hint: 'Inbox, and an email as well' },
];

export const prioritiesFor = (recipient) => (
  recipient === 'officers' ? OFFICER_PRIORITIES : PRIORITIES
);

export function PriorityChoice({ value, onChange, disabled, recipient }) {
  return (
    <fieldset>
      <legend className="block text-spc-label font-bold uppercase text-spc-body mb-1.5">
        Priority
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {prioritiesFor(recipient).map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex flex-col gap-0.5 p-3 rounded-spc-admin-sm border cursor-pointer
                transition-colors
                ${selected
                  ? 'bg-spc-selected border-spc-accent'
                  : 'bg-spc-surface border-spc-control hover:bg-spc-surface-2'}`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="priority"
                  value={option.value}
                  checked={selected}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={disabled}
                  className={CHECKBOX_CLASS}
                />
                <span className="text-spc-sm font-bold text-spc-ink">{option.label}</span>
              </span>
              <span className="text-spc-xs text-spc-body pl-7">{option.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------- compose */

export function ComposeFields({ formData, onChange, disabled }) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel htmlFor="notify-title">Title *</FieldLabel>
        <input
          id="notify-title"
          type="text"
          className={FIELD_CLASS}
          value={formData.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g., Important Placement Drive Announcement"
          disabled={disabled}
        />
      </div>
      <div>
        <FieldLabel htmlFor="notify-message">Message *</FieldLabel>
        <textarea
          id="notify-message"
          rows="5"
          className={FIELD_CLASS}
          value={formData.message}
          onChange={(e) => onChange({ message: e.target.value })}
          placeholder="Enter your notification message here..."
          disabled={disabled}
        />
      </div>
      <PriorityChoice
        value={formData.priority}
        onChange={(priority) => onChange({ priority })}
        disabled={disabled}
        recipient={formData.recipient_type}
      />
    </div>
  );
}

/* ------------------------------------------------------------------- confirm */

/**
 * The last look before it goes.
 *
 * It is here for one failure in particular: switch the audience to placement
 * officers, send, and do not switch back. The next message -- written for ten
 * thousand students -- goes to sixty officers instead, and nothing on the way
 * out says so. The audience is the one thing on this page that is invisible
 * once it is set, so the dialog leads with it rather than with "are you sure".
 *
 * And it offers the other audience as a button, because somebody who spots the
 * mistake here should not have to close the dialog, find the toggle and hope
 * that what they typed survived. It does survive: switching changes the
 * audience and nothing else, and the dialog stays open with the new numbers.
 */
export function ConfirmSend({
  recipient, count, otherCount, colleges, branches, priority, sending,
  onConfirm, onSwitch, onClose,
}) {
  const meta = recipientOf(recipient);
  const other = RECIPIENTS.find((r) => r.value !== recipient);
  const Icon = recipient === 'officers' ? UserCog : Users;
  const scope = colleges === 0
    ? 'every college'
    : `${colleges} ${colleges === 1 ? 'college' : 'colleges'}`;
  const narrowed = recipient !== 'officers' && branches > 0
    ? `, narrowed to ${branches} ${branches === 1 ? 'branch' : 'branches'}`
    : '';

  return (
    <Modal
      onClose={sending ? () => {} : onClose}
      labelledBy="notify-confirm-title"
      panelClassName={adminPanel('md')}
      overlayClassName={ADMIN_OVERLAY}
      closeOnEscape={!sending}
    >
      <AdminDialogHeader
        id="notify-confirm-title"
        title="Check who this reaches"
        subtitle="Nothing has been sent yet"
        onClose={sending ? () => {} : onClose}
      />

      <AdminDialogBody className="space-y-4">
        <div className="p-4 rounded-spc-admin bg-spc-selected border border-spc-accent">
          <p className="text-spc-label font-bold uppercase tracking-[0.1em] text-spc-body">
            This will be delivered to
          </p>
          <p className="flex items-baseline gap-2 flex-wrap mt-1">
            <Icon size={18} aria-hidden="true" className="text-spc-accent self-center" />
            <span className="text-spc-metric font-bold text-spc-ink tabular-nums">{count}</span>
            <span className="text-spc-sm font-bold text-spc-ink">
              {count === 1 ? meta.one : meta.many}
            </span>
          </p>
          <p className="text-spc-xs text-spc-body mt-1">
            {scope}
            {narrowed}
          </p>
        </div>

        {priority === 'urgent' && (
          <p className="flex items-start gap-2 text-spc-xs text-spc-body">
            <AlertTriangle
              size={15}
              aria-hidden="true"
              className="text-spc-accent flex-shrink-0 mt-0.5"
            />
            <span>
              Urgent also emails every one of them. That part leaves the portal
              and cannot be called back.
            </span>
          </p>
        )}

        <div className="pt-4 border-t border-spc-line">
          <p className="text-spc-sm font-semibold text-spc-ink">Not who you meant?</p>
          <SecondaryButton
            type="button"
            onClick={onSwitch}
            disabled={sending}
            className="w-full justify-center mt-2"
          >
            <ArrowLeftRight size={15} aria-hidden="true" />
            Switch to {other.label} ({otherCount})
          </SecondaryButton>
          <p className="text-spc-xs text-spc-body mt-2">
            Your title, message, priority and colleges are all kept.
          </p>
        </div>
      </AdminDialogBody>

      <AdminDialogFooter>
        <SecondaryButton type="button" onClick={onClose} disabled={sending}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="button" onClick={onConfirm} disabled={sending}>
          <Send size={15} aria-hidden="true" />
          {sending ? 'Sending…' : `Send to ${describeAudience(count, recipient)}`}
        </PrimaryButton>
      </AdminDialogFooter>
    </Modal>
  );
}

/* ------------------------------------------------------------------ audience */

/** Who it reaches, and how that number was arrived at. */
export function AudienceSummary({ count, colleges, branches, recipient }) {
  const meta = recipientOf(recipient);
  const Icon = recipient === 'officers' ? UserCog : Users;
  const scope = colleges === 0
    ? 'every college'
    : `${colleges} ${colleges === 1 ? 'college' : 'colleges'}`;
  // Branches narrow students and mean nothing to an officer, so the line only
  // claims a narrowing that was actually applied.
  const narrowed = recipient !== 'officers' && branches > 0
    ? `, narrowed to ${branches} ${branches === 1 ? 'branch' : 'branches'}`
    : '';
  return (
    <div className="p-4 rounded-spc-admin bg-spc-surface border border-spc-line-strong">
      <p className="flex items-baseline gap-2 flex-wrap">
        <Icon size={17} aria-hidden="true" className="text-spc-accent self-center" />
        <span className="text-spc-metric font-bold text-spc-ink tabular-nums">{count}</span>
        <span className="text-spc-sm text-spc-body">
          {count === 1 ? meta.one : meta.many}
        </span>
      </p>
      <p className="text-spc-xs text-spc-body mt-1">
        {scope}
        {narrowed}
      </p>
    </div>
  );
}

/** One college, with a tick and the count of whoever is being written to. */
function CollegeRow({ college, checked, onToggle, disabled, recipient }) {
  return (
    <label className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors
      ${checked ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(college.id)}
        disabled={disabled}
        className={CHECKBOX_CLASS}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-spc-sm text-spc-ink break-words">{college.college_name}</span>
      </span>
      <span className="text-spc-xs text-spc-body tabular-nums flex-shrink-0">
        {(recipient === 'officers' ? college.total_officers : college.total_students) || 0}
      </span>
    </label>
  );
}

export function CollegePicker({ colleges, selected, onToggle, onSelectAll, disabled, recipient }) {
  const allSelected = colleges.length > 0 && selected.length === colleges.length;
  return (
    <Panel className="overflow-hidden">
      <PanelHeading
        action={(
          <SecondaryButton onClick={onSelectAll} disabled={disabled}>
            {allSelected ? 'Clear all' : 'Select all'}
          </SecondaryButton>
        )}
      >
        <span className="inline-flex items-center gap-2">
          <Building2 size={15} aria-hidden="true" />
          Colleges
          <span className="text-spc-xs font-normal text-spc-body">
            {selected.length === 0 ? '(all)' : `(${selected.length} chosen)`}
          </span>
        </span>
      </PanelHeading>
      <div className="max-h-80 overflow-y-auto divide-y divide-spc-line">
        {colleges.map((college) => (
          <CollegeRow
            key={college.id}
            college={college}
            checked={selected.includes(college.id)}
            onToggle={onToggle}
            disabled={disabled}
            recipient={recipient}
          />
        ))}
      </div>
    </Panel>
  );
}

/**
 * Branches, grouped by the college they belong to.
 *
 * Only appears once colleges are chosen, because a branch list across sixty
 * colleges is not a choice anyone can make.
 */
export function BranchPicker({ branches, selected, onToggle, onSelectAll, disabled }) {
  const byCollege = new Map();
  for (const branch of branches) {
    if (!byCollege.has(branch.college_id)) {
      byCollege.set(branch.college_id, { name: branch.college_name, items: [] });
    }
    byCollege.get(branch.college_id).items.push(branch);
  }
  const anySelected = Object.keys(selected).length > 0;

  return (
    <Panel className="overflow-hidden">
      <PanelHeading
        action={(
          <SecondaryButton onClick={onSelectAll} disabled={disabled}>
            {anySelected ? 'Clear all' : 'Select all'}
          </SecondaryButton>
        )}
      >
        <span className="inline-flex items-center gap-2">
          <GraduationCap size={15} aria-hidden="true" />
          Branches
          <span className="text-spc-xs font-normal text-spc-body">
            {anySelected ? '(narrowed)' : '(every branch)'}
          </span>
        </span>
      </PanelHeading>

      {branches.length === 0 ? (
        <EmptyState>Choose a college first, and its branches appear here.</EmptyState>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {[...byCollege.entries()].map(([collegeId, group]) => (
            <div key={collegeId} className="border-b border-spc-line last:border-b-0">
              <p className="px-4 pt-3 pb-1 font-khand text-spc-label font-medium uppercase
                tracking-[0.12em] text-spc-body">
                {group.name}
              </p>
              <div className="pb-2">
                {group.items.map((branch) => (
                  <label
                    key={`${collegeId}-${branch.branch}`}
                    className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-spc-surface-2"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(selected[collegeId]?.includes(branch.branch))}
                      onChange={() => onToggle(collegeId, branch.branch)}
                      disabled={disabled}
                      className={CHECKBOX_CLASS}
                    />
                    <span className="text-spc-sm text-spc-ink flex-1 min-w-0 break-words">
                      {branch.branch}
                    </span>
                    <span className="text-spc-xs text-spc-body tabular-nums flex-shrink-0">
                      {branch.student_count || 0}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------- what was sent */

/**
 * What has been sent since this page was opened.
 *
 * Named for exactly that. It is not a history — nothing is fetched, and a
 * refresh empties it — and calling it "Recent notifications" made it look like
 * one. The officer role has a real sent-history endpoint; super admin has none.
 */
export function SentThisSession({ items }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-6">
      <SectionLabel>Sent in this session</SectionLabel>
      <Panel className="overflow-hidden">
        <ul className="divide-y divide-spc-line">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-spc-sm font-bold text-spc-ink break-words min-w-0">{item.title}</p>
                <span className="text-spc-xs text-spc-body tabular-nums flex-shrink-0">
                  {item.recipient_count} sent
                </span>
              </div>
              <p className="text-spc-xs text-spc-body mt-0.5 break-words">{item.message}</p>
              <p className="text-spc-xs text-spc-body mt-1">
                {/* Audience first: with two of them, which one a message went
                    to is the fact you come back to this list to check. */}
                {item.audience ? `${item.audience} · ` : ''}
                {item.target_colleges} · {item.priority}
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </section>
  );
}

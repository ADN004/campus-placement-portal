import { Bell, AlertCircle, Mail, Check } from 'lucide-react';
import {
  Panel, PanelHeading, EmptyState, CHECKBOX_CLASS, formatDate,
} from '../../../components/officer/OfficerUI';

/**
 * Pieces shared by the three SendNotification presenters.
 *
 * The priority levels used to describe themselves in terms the app did not
 * honour — High promised a popup that did not exist anywhere in the student
 * app, and Urgent promised one alongside its (real) email. The popup exists now,
 * so the descriptions here are what actually happens, and they are stated on the
 * option itself rather than in a banner that appeared after the send button.
 */

/* --------------------------------------------------------------- priority */

export const PRIORITIES = [
  {
    value: 'normal',
    label: 'Normal',
    effect: 'Appears in the student’s notifications list.',
    icon: Bell,
  },
  {
    value: 'high',
    label: 'High',
    effect: 'Also opens as a popup the next time they open the portal.',
    icon: Bell,
  },
  {
    value: 'urgent',
    label: 'Urgent',
    effect: 'Opens as a popup and is emailed to every recipient.',
    icon: Mail,
  },
];

/**
 * The priority choice.
 *
 * A real radio group — the input is visually hidden but present, so arrow keys
 * move between options and a screen reader announces the group. The consequence
 * is part of the option, because it is what the choice means.
 */
export function PriorityChoice({ value, onChange, stacked = false }) {
  return (
    <fieldset>
      <legend className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2">
        How it reaches them
      </legend>
      <div className={stacked ? 'space-y-2' : 'grid grid-cols-3 gap-2'}>
        {PRIORITIES.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`block cursor-pointer rounded-spc-control border p-3 transition-colors
                ${
                  selected
                    ? 'border-spc-accent bg-spc-selected'
                    : 'border-spc-control bg-spc-surface hover:bg-spc-surface-2'
                }`}
            >
              <input
                type="radio"
                name="priority"
                value={option.value}
                checked={selected}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
              />
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0
                    ${selected ? 'border-spc-accent bg-spc-accent' : 'border-spc-control'}`}
                />
                <span className="text-spc-sm font-bold text-spc-ink">{option.label}</span>
              </span>
              <span className="block text-xs text-spc-body mt-1.5 leading-snug">
                {option.effect}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** The mark a sent notification carries in the history list. */
export function PriorityMark({ priority }) {
  if (priority === 'urgent') {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-spc-bad">
        <AlertCircle size={13} aria-hidden="true" />
        <span className="text-xs font-bold uppercase tracking-[0.08em]">Urgent</span>
      </span>
    );
  }
  if (priority === 'high') {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-spc-warn">
        <Bell size={13} aria-hidden="true" />
        <span className="text-xs font-bold uppercase tracking-[0.08em]">High</span>
      </span>
    );
  }
  return (
    <span className="text-xs font-bold uppercase tracking-[0.08em] text-spc-muted whitespace-nowrap">
      Normal
    </span>
  );
}

/* ----------------------------------------------------------------- branches */

/**
 * Branch picker.
 *
 * The old version drew a CheckSquare/Square icon and hung the onClick on the
 * icon, inside a label with no control — so only the 20px glyph responded, the
 * rest of the row did nothing, and the whole thing was unreachable by keyboard.
 * This is a real checkbox inside its own label: the entire row toggles, Tab
 * reaches it, Space flips it.
 */
export function BranchPicker({ branches, selected, onToggle, onToggleAll, columns = 2 }) {
  if (branches.length === 0) {
    return (
      <div className="rounded-spc-control border border-spc-line-strong bg-spc-surface-2 px-4 py-6 text-center">
        <p className="text-spc-xs text-spc-muted">
          No branches to choose from. Branches appear here once your college has approved
          students in them.
        </p>
      </div>
    );
  }

  const allSelected = selected.length === branches.length;

  return (
    <div className="rounded-spc-control border border-spc-line-strong overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2 bg-spc-surface-2 border-b border-spc-line">
        <span className="text-xs text-spc-body">
          {selected.length === 0
            ? 'Everyone in your college'
            : `${selected.length} of ${branches.length} branches`}
        </span>
        <button
          type="button"
          onClick={onToggleAll}
          className="text-xs font-bold text-spc-ink underline underline-offset-2
            min-h-[44px] px-1 hover:text-spc-accent transition-colors"
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>

      <ul
        className={`max-h-[260px] overflow-y-auto spc-scroll-contain ${
          columns === 2 ? 'sm:grid sm:grid-cols-2' : ''
        }`}
      >
        {branches.map((branch) => {
          const count = parseInt(branch.student_count, 10) || 0;
          return (
            <li key={branch.branch} className="border-b border-spc-line">
              <label className="flex items-center gap-3 px-3 py-2.5 min-h-[48px] cursor-pointer
                hover:bg-spc-surface-2 transition-colors">
                <input
                  type="checkbox"
                  checked={selected.includes(branch.branch)}
                  onChange={() => onToggle(branch.branch)}
                  className={CHECKBOX_CLASS}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-spc-xs font-bold text-spc-ink break-words">
                    {branch.branch}
                  </span>
                </span>
                <span className="text-xs text-spc-muted tabular-nums flex-shrink-0 whitespace-nowrap">
                  {count}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ history */

/**
 * What this officer has already sent.
 *
 * This panel used to be a `useState([])` with a comment saying "mock data for
 * now" — it only ever held what you sent in the current session and emptied on
 * refresh. It reads /placement-officer/sent-notifications now, so it survives a
 * reload, and it carries the two numbers that matter afterwards: how many
 * students received it and how many have opened it.
 */
export function SentHistory({ items, loading }) {
  return (
    <Panel>
      <PanelHeading>Already sent</PanelHeading>
      {loading ? (
        <EmptyState>Loading&hellip;</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState>
          Nothing sent yet.
          <span className="block text-xs mt-1">
            Notifications you send will be listed here with how many students opened them.
          </span>
        </EmptyState>
      ) : (
        <ul>
          {items.map((item) => {
            const recipients = Number(item.recipient_count) || 0;
            const read = Number(item.read_count) || 0;
            return (
              <li key={item.id} className="px-4 py-3 border-b border-spc-line last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-spc-xs font-bold text-spc-ink min-w-0 break-words">
                    {item.title}
                  </h3>
                  <PriorityMark priority={item.priority} />
                </div>

                <p className="text-xs text-spc-muted mt-1 line-clamp-2 break-words">
                  {item.message}
                </p>

                <div className="flex items-baseline justify-between gap-3 mt-2">
                  <span className="text-xs text-spc-muted">{formatDate(item.created_at)}</span>
                  <span className="text-xs text-spc-body tabular-nums whitespace-nowrap">
                    <Check size={12} className="inline -mt-0.5 mr-1" aria-hidden="true" />
                    {read} of {recipients} opened
                  </span>
                </div>

                {item.branches && item.branches.length > 0 && (
                  <p className="text-xs text-spc-muted mt-1 break-words">
                    {item.branches.length === 1
                      ? item.branches[0]
                      : `${item.branches.length} branches`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

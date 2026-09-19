import { useState } from 'react';
import { Building2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import {
  Panel, SecondaryButton, PrimaryButton, CHECKBOX_CLASS,
} from './OfficerUI';

/**
 * Which colleges' applicants the host officer is looking at.
 *
 * A job posted for the whole state draws two thousand applicants, and the host
 * used to be given all of them the moment they opened the page -- with their
 * own twenty scattered somewhere in the middle. The people who should be
 * working the other fifty-nine colleges are the officers at those colleges, who
 * each see their own on their own screen.
 *
 * So the page opens on the host's own college and this is how they reach
 * further: collapsed by default, because most of the time they are marking
 * their own students and the rest is somebody else's job. They can open it and
 * take over a college that has gone quiet, which is the whole point -- a joint
 * college whose officer never engages would otherwise leave its students in
 * limbo with nobody able to act.
 *
 * Only rendered for the host. A non-host officer has no second college to see
 * and the server would refuse them anyway.
 */
export default function CollegeScopePicker({
  options = [],
  ownCollegeId,
  viewing = 'own',
  selected = [],
  outstanding = [],
  busy = false,
  onApply,
  onShowAll,
  onShowOwn,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(selected);

  // Nothing to reach: a job that only ever drew this officer's own students.
  const others = options.filter((o) => o.college_id !== ownCollegeId);
  if (others.length === 0) return null;

  const label = viewing === 'all'
    ? `All colleges (${options.length})`
    : viewing === 'selected'
      ? `${selected.length + 1} colleges`
      : 'Your college only';

  const toggle = (id) => {
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Panel className="mb-4">
      <button
        type="button"
        onClick={() => { setDraft(selected); setOpen(!open); }}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[48px]
          text-left hover:bg-spc-surface-2 transition-colors"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Building2 size={16} className="text-spc-muted flex-shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-spc-xs font-bold text-spc-ink">Showing: {label}</span>
            <span className="block text-xs text-spc-muted">
              {others.length} other {others.length === 1 ? 'college' : 'colleges'} on this job
            </span>
          </span>
        </span>
        {open
          ? <ChevronUp size={18} className="text-spc-muted flex-shrink-0" aria-hidden="true" />
          : <ChevronDown size={18} className="text-spc-muted flex-shrink-0" aria-hidden="true" />}
      </button>

      {/*
        Colleges nobody has worked on. Shown whether the picker is open or not,
        because it is the one thing here that will not resolve itself: a round
        only closes where somebody has marked somebody, so these students sit
        under review with nothing coming for them.
      */}
      {outstanding.length > 0 && (
        <div className="px-4 py-3 border-t border-spc-line bg-spc-warn-bg">
          <p className="flex items-start gap-2 text-xs text-spc-body">
            <AlertCircle size={15} className="text-spc-warn flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <span className="font-bold text-spc-ink">Nobody has marked anyone at{' '}
                {outstanding.map((o) => o.college_name).filter(Boolean).join(', ')}.</span>{' '}
              Those {outstanding.reduce((n, o) => n + o.waiting, 0)} students stay under review
              until someone does — no round closes on its own where no decision was made.
            </span>
          </p>
        </div>
      )}

      {open && (
        <div className="border-t border-spc-line">
          <div className="max-h-72 overflow-y-auto spc-scroll-contain px-4 py-3 space-y-1">
            {options.map((o) => {
              const isOwn = o.college_id === ownCollegeId;
              return (
                <label
                  key={o.college_id}
                  className={`flex items-center gap-3 min-h-[44px] px-1 rounded-spc-control
                    ${isOwn ? 'opacity-60' : 'cursor-pointer hover:bg-spc-surface-2'}`}
                >
                  <input
                    type="checkbox"
                    className={CHECKBOX_CLASS}
                    // The host's own college is always shown and cannot be
                    // switched off -- the picker is for reaching further, not
                    // for losing sight of the students that are actually theirs.
                    checked={isOwn || draft.includes(o.college_id)}
                    disabled={isOwn || busy}
                    onChange={() => toggle(o.college_id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-spc-xs font-semibold text-spc-ink break-words">
                      {o.college_name || `College ${o.college_id}`}
                      {isOwn && <span className="text-spc-muted font-normal"> — yours</span>}
                    </span>
                  </span>
                  <span className="text-xs text-spc-muted tabular-nums flex-shrink-0">
                    {o.applicants} applicant{o.applicants === 1 ? '' : 's'}
                    {o.waiting > 0 && `, ${o.waiting} waiting`}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-t border-spc-line">
            <PrimaryButton
              onClick={() => { onApply(draft); setOpen(false); }}
              disabled={busy}
            >
              Show selected
            </PrimaryButton>
            <SecondaryButton onClick={() => { onShowAll(); setOpen(false); }} disabled={busy}>
              Show every college
            </SecondaryButton>
            <SecondaryButton onClick={() => { onShowOwn(); setOpen(false); }} disabled={busy}>
              Back to my college
            </SecondaryButton>
          </div>
        </div>
      )}
    </Panel>
  );
}

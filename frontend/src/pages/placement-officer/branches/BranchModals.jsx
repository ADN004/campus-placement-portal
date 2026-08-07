import { useMemo, useState } from 'react';
import { Plus, X, Save, Search, Check } from 'lucide-react';
import Modal from '../../../components/Modal';
import {
  PrimaryButton, SecondaryButton, DangerButton, FieldLabel, FIELD_CLASS,
} from '../../../components/officer/OfficerUI';
import { branchKey, findSameBranch, Notice } from './branchesShared';

const PANEL =
  'bg-spc-surface border border-spc-line-strong rounded-spc-panel w-full max-w-3xl spc-dialog-h flex flex-col';
const OVERLAY = 'fixed inset-0 z-50 flex items-center justify-center bg-spc-ink/40 p-4';

/**
 * Edit the branches the college offers.
 *
 * Three ways in — remove a chip, type a name, pick from the standard list — and
 * one save. The dialog states the two consequences it can cause before it lets
 * them happen: saving an empty list stops registration outright, and removing a
 * branch that already has students cuts that branch off from new registrations.
 */
export default function EditBranchesModal({
  collegeName,
  original,
  selected,
  templates,
  countsByBranch,
  customBranch,
  addError,
  submitting,
  onCustomChange,
  onAddCustom,
  onAddTemplate,
  onRemove,
  onSave,
  onClose,
}) {
  const [templateFilter, setTemplateFilter] = useState('');

  const visibleTemplates = useMemo(() => {
    const needle = branchKey(templateFilter);
    if (!needle) return templates;
    return templates.filter((name) => branchKey(name).includes(needle));
  }, [templates, templateFilter]);

  // Branches present before the edit that are no longer selected, and that
  // students are actually registered under. This is the removal worth naming.
  const removedWithStudents = useMemo(
    () =>
      original
        .filter((name) => !findSameBranch(selected, name))
        .map((name) => ({ name, students: countsByBranch.get(name) || 0 }))
        .filter((row) => row.students > 0),
    [original, selected, countsByBranch]
  );

  const emptying = selected.length === 0;

  return (
    <Modal
      onClose={onClose}
      labelledBy="po-branches-title"
      panelClassName={PANEL}
      overlayClassName={OVERLAY}
    >
      <div className="px-5 py-4 border-b-[1.5px] border-spc-rule-structural flex-shrink-0">
        <h2 id="po-branches-title" className="text-spc-h2 font-bold text-spc-ink">
          Edit branches
        </h2>
        <p className="text-xs text-spc-muted mt-0.5 break-words">{collegeName}</p>
      </div>

      <div className="flex-1 overflow-y-auto spc-scroll-contain px-5 py-4 space-y-5">
        {/* ------------------------------------------------ selected */}
        <section>
          <FieldLabel>Branches your college offers ({selected.length})</FieldLabel>
          <div className="rounded-spc-control border border-spc-line-strong bg-spc-surface-2 p-3 min-h-[84px]">
            {selected.length === 0 ? (
              <p className="text-spc-xs text-spc-muted text-center py-4">
                No branches selected.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {selected.map((branch) => {
                  const students = countsByBranch.get(branch) || 0;
                  return (
                    <li key={branch}>
                      <span
                        className="inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-spc-control
                          bg-spc-surface border border-spc-control"
                      >
                        <span className="text-spc-xs font-bold text-spc-ink">{branch}</span>
                        {students > 0 && (
                          <span className="text-xs text-spc-muted tabular-nums whitespace-nowrap">
                            {students}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemove(branch)}
                          disabled={submitting}
                          aria-label={`Remove ${branch}`}
                          title={`Remove ${branch}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-spc-control
                            text-spc-body hover:bg-spc-bad-bg hover:text-spc-bad transition-colors
                            disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X size={15} aria-hidden="true" />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="text-xs text-spc-muted mt-1.5">
            The number beside a branch is how many approved students with an active account are
            registered under it.
          </p>
        </section>

        {/* ------------------------------------------------ consequences */}
        {emptying && (
          <Notice tone="bad" title="Saving this will stop registration">
            With no branches configured, nobody from {collegeName || 'your college'} can finish
            registering. Add at least one branch before saving.
          </Notice>
        )}

        {removedWithStudents.length > 0 && (
          <Notice tone="warn" title="You are removing a branch that has students">
            <p>
              {removedWithStudents
                .map((row) => `${row.name} (${row.students})`)
                .join(', ')}
            </p>
            <p className="mt-1">
              Those students keep their accounts and stay in Manage Students. What changes is that
              no new student can register under these branches, and a job limited to your
              configured branches will not reach them. The counts cover approved students with an
              active account — anyone still waiting for approval, or whose account is deactivated,
              is not included, so a branch showing nothing here may still have people in it.
            </p>
          </Notice>
        )}

        {/* ------------------------------------------------ custom */}
        <section>
          <FieldLabel htmlFor="branch-custom">Add a branch not in the standard list</FieldLabel>
          <div className="flex gap-2">
            <input
              id="branch-custom"
              type="text"
              value={customBranch}
              onChange={(e) => onCustomChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddCustom();
                }
              }}
              placeholder="Type the full branch name"
              disabled={submitting}
              className={`${FIELD_CLASS} flex-1 min-w-0`}
              aria-describedby={addError ? 'branch-custom-error' : undefined}
              aria-invalid={addError ? 'true' : undefined}
            />
            <SecondaryButton
              type="button"
              onClick={onAddCustom}
              disabled={!customBranch.trim() || submitting}
            >
              <Plus size={15} aria-hidden="true" />
              <span>Add</span>
            </SecondaryButton>
          </div>
          {addError ? (
            <p id="branch-custom-error" className="text-xs text-spc-bad mt-1.5" role="alert">
              {addError}
            </p>
          ) : (
            <p className="text-xs text-spc-muted mt-1.5">
              Write it exactly as it should appear to students — the spelling is what jobs match on.
            </p>
          )}
        </section>

        {/* ------------------------------------------------ templates */}
        <section>
          <div className="flex items-end justify-between gap-3 flex-wrap mb-2">
            <FieldLabel htmlFor="branch-template-filter">Standard Kerala Polytechnic branches</FieldLabel>
          </div>
          <div className="relative mb-2">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-spc-muted pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="branch-template-filter"
              type="text"
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              placeholder="Find a branch"
              disabled={submitting}
              className={`${FIELD_CLASS} pl-9`}
            />
          </div>

          <div className="rounded-spc-control border border-spc-line-strong overflow-hidden">
            {visibleTemplates.length === 0 ? (
              <p className="px-4 py-6 text-center text-spc-xs text-spc-muted">
                No standard branch matches &ldquo;{templateFilter}&rdquo;. Use the box above to add
                it yourself.
              </p>
            ) : (
              <ul className="max-h-[280px] overflow-y-auto spc-scroll-contain">
                {visibleTemplates.map((branch) => {
                  const already = Boolean(findSameBranch(selected, branch));
                  return (
                    <li key={branch} className="border-b border-spc-line last:border-b-0">
                      <button
                        type="button"
                        onClick={() => onAddTemplate(branch)}
                        disabled={already || submitting}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[48px]
                          text-left text-spc-xs transition-colors
                          ${
                            already
                              ? 'text-spc-muted cursor-not-allowed bg-spc-surface-2'
                              : 'text-spc-ink font-bold hover:bg-spc-surface-2'
                          }`}
                      >
                        <span className="min-w-0 break-words">{branch}</span>
                        {already ? (
                          <span className="inline-flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
                            <Check size={14} aria-hidden="true" />
                            <span>Added</span>
                          </span>
                        ) : (
                          <Plus size={15} className="flex-shrink-0 text-spc-muted" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div
        className="flex items-center justify-end gap-2 flex-wrap px-5 py-4
          border-t border-spc-line flex-shrink-0"
      >
        <SecondaryButton type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </SecondaryButton>
        {/* An empty list is destructive, so it is the red button and it says what
            it does. Still allowed — a college genuinely mid-setup may need it. */}
        {emptying ? (
          <DangerButton type="button" onClick={onSave} disabled={submitting}>
            <Save size={15} aria-hidden="true" />
            <span>{submitting ? 'Saving…' : 'Save with no branches'}</span>
          </DangerButton>
        ) : (
          <PrimaryButton type="button" onClick={onSave} disabled={submitting}>
            <Save size={15} aria-hidden="true" />
            <span>{submitting ? 'Saving…' : 'Save changes'}</span>
          </PrimaryButton>
        )}
      </div>
    </Modal>
  );
}

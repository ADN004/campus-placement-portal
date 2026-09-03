import { ChevronDown, ChevronRight } from 'lucide-react';
import { SectionLabel, CHECKBOX_CLASS } from '../../../components/admin/AdminUI';

/**
 * Who the job reaches: every college, or a list built region by region.
 *
 * Sixty colleges is too many to scroll flat, so they sit under their region and
 * a region opens on demand. Each row says how many of its colleges are on the
 * job without being opened, which is the question actually being asked.
 *
 * **Once anyone has applied, this can be widened but not narrowed.** A college
 * already on the job is ticked and disabled — taking it off would strand the
 * students there who have already applied. The server enforces the same rule;
 * showing it here is what stops someone building a save it will refuse.
 */
export default function TargetPicker({
  formData, regions, collegesByRegion, expandedRegions, onToggleRegion,
  onTargetChange, onSelectAllInRegion, onAllCollegesChange,
  targetLocked, lockedAllColleges, eligibilityLocked,
}) {
  return (
    <div>
      <SectionLabel>
        Who it reaches
        {eligibilityLocked && (
          <span className="ml-2 font-normal normal-case tracking-normal text-spc-warn">
            — can only be widened
          </span>
        )}
      </SectionLabel>

      {eligibilityLocked && (
        <p className="text-spc-xs text-spc-ink font-semibold p-3 mb-3 rounded-spc-admin
          bg-spc-warn-bg border border-spc-warn/40">
          You can open this job to more colleges, but not take it away from any already on it —
          students there have applied, and removing their college would strand them.
        </p>
      )}

      <label
        className={`flex items-start gap-3 p-3 mb-3 rounded-spc-admin border cursor-pointer
          transition-colors ${formData.target_type === 'all'
            ? 'bg-spc-selected border-spc-accent'
            : 'bg-spc-surface border-spc-control hover:bg-spc-surface-2'}`}
      >
        <input
          type="checkbox"
          checked={formData.target_type === 'all'}
          disabled={lockedAllColleges}
          onChange={(e) => onAllCollegesChange(e.target.checked)}
          className={`${CHECKBOX_CLASS} mt-0.5 flex-shrink-0
            disabled:opacity-60 disabled:cursor-not-allowed`}
        />
        <span className="min-w-0">
          <span className="block text-spc-sm font-bold text-spc-ink">All colleges</span>
          <span className="block text-spc-xs text-spc-body">
            Including any college added to the portal later.
            {lockedAllColleges && ' Cannot be turned off — students have already applied.'}
          </span>
        </span>
      </label>

      {formData.target_type !== 'all' && (
        <div className="border border-spc-line-strong rounded-spc-admin-sm overflow-hidden">
          {regions.length === 0 ? (
            <p className="px-4 py-6 text-spc-sm text-spc-body text-center">
              No regions available.
            </p>
          ) : (
            regions.map((region) => {
              const regionColleges = collegesByRegion[region.id] || [];
              const selectedHere = regionColleges.filter(
                (c) => formData.target_colleges.includes(c.id) || targetLocked('colleges', c.id)
              );
              const allSelected = regionColleges.length > 0
                && selectedHere.length === regionColleges.length;
              // Locked colleges cannot be unticked, so "Deselect all" is only
              // offered where it would actually do something.
              const canDeselectAll = regionColleges.some((c) => !targetLocked('colleges', c.id));
              const expanded = Boolean(expandedRegions[region.id]);

              return (
                <div key={region.id} className="border-b border-spc-line last:border-b-0">
                  <div className="flex items-center gap-2 px-2">
                    <button
                      type="button"
                      onClick={() => onToggleRegion(region.id)}
                      aria-expanded={expanded}
                      className="flex-1 min-w-0 flex items-center gap-2 py-3 px-2 text-left
                        rounded-spc-admin-sm hover:bg-spc-surface-2 transition-colors"
                    >
                      {expanded
                        ? <ChevronDown size={15} aria-hidden="true" className="text-spc-body flex-shrink-0" />
                        : <ChevronRight size={15} aria-hidden="true" className="text-spc-body flex-shrink-0" />}
                      <span className="text-spc-sm font-bold text-spc-ink truncate">
                        {region.region_name || region.name}
                      </span>
                      <span className="text-spc-xs text-spc-body tabular-nums flex-shrink-0 ml-auto">
                        {selectedHere.length > 0
                          ? `${selectedHere.length} of ${regionColleges.length}`
                          : `${regionColleges.length} colleges`}
                      </span>
                    </button>

                    {expanded && regionColleges.length > 0 && (allSelected ? canDeselectAll : true) && (
                      <button
                        type="button"
                        onClick={() => onSelectAllInRegion(region.id, !allSelected)}
                        className="flex-shrink-0 min-h-[44px] px-2 text-spc-xs font-bold
                          text-spc-accent hover:underline"
                      >
                        {allSelected ? 'Deselect all' : 'Select all'}
                      </button>
                    )}
                  </div>

                  {expanded && (
                    <div className="px-4 py-2 bg-spc-surface-2 border-t border-spc-line">
                      {regionColleges.length === 0 ? (
                        <p className="py-2 text-spc-xs text-spc-body">
                          No colleges in this region.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                          {regionColleges.map((college) => {
                            const locked = targetLocked('colleges', college.id);
                            return (
                              <label key={college.id}
                                className="flex items-start gap-2 py-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.target_colleges.includes(college.id) || locked}
                                  onChange={() => onTargetChange(college.id, 'college')}
                                  disabled={locked}
                                  className={`${CHECKBOX_CLASS} mt-0.5 flex-shrink-0
                                    disabled:opacity-60 disabled:cursor-not-allowed`}
                                />
                                <span className="text-spc-xs text-spc-ink min-w-0 break-words">
                                  {college.college_name || college.name}
                                  {locked && (
                                    <span className="text-spc-body"> (already on the job)</span>
                                  )}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

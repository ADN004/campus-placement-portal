import { UserPlus } from 'lucide-react';
import EnhancedFilterPanel from '../../../components/EnhancedFilterPanel';
import useLongList from '../../../hooks/useLongList';
import { ListCount, ShowMore } from '../../../components/officer/LongList';
import {
  Panel, PanelHeading, SectionLabel, SecondaryButton,
} from '../../../components/officer/OfficerUI';
import {
  StatBlock, DrivePanel, JobSummary, BulkActionBar, FilterToggle,
  ApplicantTable, ApplicantList, barredReason,
} from './jobEligibleShared';
import AdditionalFilters from './AdditionalFilters';

/**
 * Everything below the page heading, shared by the three presenters.
 *
 * The job picker used to sit at the top of this; it is now its own page, so
 * this starts at the chosen job.
 *
 * The three devices differ in how many columns things get and whether the
 * applicant lists render as a table or a ruled list — not in what is on the
 * page or what order it comes in. Expressing that as a `layout` prop keeps the
 * three presenters thin and stops the sections drifting apart, which is what
 * happened to this page's three tables in the first place.
 *
 * `EnhancedFilterPanel` is a shared component and stays in its original styling
 * until the dedicated variant pass.
 */
export default function JobEligibleBody({ layout, ...p }) {
  const isTable = layout === 'desktop';
  const statColumns = layout === 'desktop' ? 7 : layout === 'tablet' ? 4 : 2;
  const filterColumns = layout === 'desktop' ? 3 : layout === 'tablet' ? 2 : 1;

  const ApplicantView = isTable ? ApplicantTable : ApplicantList;
  // Desktop and tablet have width for the words; the phone keeps icons, where
  // the accessible name still carries the meaning.
  const showActionLabels = layout !== 'mobile';

  const currentApplicants = p.filteredStudents.filter((s) => !s.is_already_placed);
  const placedApplicants = p.filteredStudents.filter((s) => s.is_already_placed);
  const selectableApplicants = currentApplicants.filter((s) => !barredReason(s));
  const barredCount = currentApplicants.length - selectableApplicants.length;

  /*
   * The list that actually gets big.
   *
   * A statewide drive draws hundreds to low thousands of applicants and this
   * page rendered every one of them — no window, no pagination, nothing. It is
   * the heaviest screen in the officer role and it was the one with no bound at
   * all.
   *
   * Two things stay deliberately whole-list, because windowing them would be a
   * behaviour change rather than a display one:
   *   - "select all" still selects every applicant the filters match, not the
   *     25 on screen. An officer ticking the header box means all of them, and
   *     silently meaning "the visible ones" is how you shortlist the wrong
   *     cohort.
   *   - the header count and every export keep reading the full filtered set.
   */
  const applicantWindow = useLongList(currentApplicants, { step: 50 });
  const placedWindow = useLongList(placedApplicants, { step: 25 });
  // The selected summary was left whole when the other two were windowed. It is
  // the smallest of the three on a normal job and the largest on a good one —
  // a statewide drive that selects several hundred renders every row twice,
  // once here and once in the applicants table above.
  const selectedWindow = useLongList(p.selectedSummary, { step: 25 });

  return (
    <>
      {p.selectedJob && (
        <>
          {p.placementStats && (
            <section className="mb-5">
              <SectionLabel>Placement statistics</SectionLabel>
              <StatBlock stats={p.placementStats} columns={statColumns} />
            </section>
          )}

          <div className="mb-5">
            <JobSummary
              job={p.selectedJob}
              isHost={p.isHost}
              onEditJob={p.onEditJob}
              onExport={p.onExport}
              exporting={p.exporting}
              exportDisabled={p.filteredStudents.length === 0}
              applicantCount={p.applicantCount}
              onDeleteJob={p.onDeleteJob}
              onUnpublishJob={p.onUnpublishJob}
            />
          </div>

          <div className="mb-5">
            <DrivePanel
              driveData={p.driveData}
              onSchedule={p.onScheduleDrive}
              onNotifyAll={p.onNotifyDrive}
            />
          </div>

          <div className="mb-5">
            <BulkActionBar
              count={p.selectedStudents.length}
              allAlreadySelected={p.allSelectedAreSelected}
              onStatusUpdate={p.onBulkStatusUpdate}
              onClear={p.onClearSelection}
            />
          </div>

          {/* Surfacing an action that already existed — same handler, same
              modal. It sits with the filters rather than floating alone. */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <SecondaryButton onClick={p.onManualAdd}>
              <UserPlus size={15} aria-hidden="true" />
              <span>Manually add student</span>
            </SecondaryButton>
            <FilterToggle
              open={p.showEnhancedFilters}
              onToggle={p.onToggleEnhancedFilters}
              active={p.hasEnhancedFilters}
              label="Status &amp; profile"
            />
            <FilterToggle
              open={p.showAdvancedFilters}
              onToggle={p.onToggleAdvancedFilters}
              active={p.hasAdvancedFilters}
              label="Additional filters"
            />
          </div>
          <p className="text-xs text-spc-muted mb-4">
            Manual add is for students who didn&rsquo;t apply but were selected during the drive.
          </p>

          {p.showEnhancedFilters && (
            <div className="mb-4">
              <EnhancedFilterPanel
                filters={p.enhancedFilters}
                onChange={p.onEnhancedFiltersChange}
                onClear={p.onClearEnhancedFilters}
                variant="officer"
              />
            </div>
          )}

          {p.showAdvancedFilters && (
            <div className="mb-4">
              <AdditionalFilters
                columns={filterColumns}
                filters={p.advancedFilters}
                onChange={p.onAdvancedFilterChange}
                onClear={p.onClearAdvancedFilters}
                hasActiveFilters={p.hasAdvancedFilters}
                shownCount={p.filteredStudents.length}
              />
            </div>
          )}

          <section className="mb-5">
            <Panel>
              <PanelHeading action={p.refreshControl}>
                Applicants ({currentApplicants.length})
              </PanelHeading>
              {/* Says why some rows cannot be ticked, before the officer tries. */}
              {barredCount > 0 && (
                <p className="px-4 pt-3 text-xs text-spc-body">
                  {barredCount} of these applied and{' '}
                  {barredCount === 1 ? 'has' : 'have'} since been blacklisted or lost approval.
                  {barredCount === 1 ? ' It' : ' They'} can be opened but not selected, and
                  {barredCount === 1 ? ' it is' : ' they are'} left out of exports.
                </p>
              )}
              <ApplicantView
                students={applicantWindow.visible}
                isHost={p.isHost}
                caption={`Applicants for ${p.selectedJob.job_title} at ${p.selectedJob.company_name}.`}
                selectable
                selectedIds={p.selectedStudents}
                onSelect={p.onSelectStudent}
                onSelectAll={p.onSelectAll}
                /*
                 * Every applicant, not every visible one — the box means "all".
                 * Barred applicants are excluded on both sides: they cannot be
                 * ticked, so counting them here would leave the header box
                 * permanently unticked no matter what the officer does.
                 */
                allSelected={
                  selectableApplicants.length > 0 &&
                  selectableApplicants.every((s) => p.selectedStudents.includes(s.application_id))
                }
                onView={p.onViewStudent}
                onPlacement={p.onEditPlacement}
                showLabels={showActionLabels}
                loading={p.loadingStudents}
              />
              {applicantWindow.hasMore && (
                <ShowMore
                  onClick={applicantWindow.showMore}
                  remaining={applicantWindow.remaining}
                  noun="applicant"
                />
              )}
              {currentApplicants.length > applicantWindow.shown && (
                <p className="px-4 py-2 border-t border-spc-line">
                  <ListCount
                    shown={applicantWindow.shown}
                    matched={applicantWindow.matched}
                    total={applicantWindow.total}
                    filtering={false}
                    noun="applicant"
                  />
                </p>
              )}
            </Panel>
          </section>

          {placedApplicants.length > 0 && (
            <section className="mb-5">
              <Panel>
                <PanelHeading>
                  Already placed elsewhere ({placedApplicants.length})
                </PanelHeading>
                <ApplicantView
                  students={placedWindow.visible}
                  isHost={p.isHost}
                  caption="Applicants who are already placed at another company."
                  showPlacedAt
                  showLabels={showActionLabels}
                  onView={p.onViewStudent}
                  onPlacement={p.onEditPlacement}
                />
                {placedWindow.hasMore && (
                  <ShowMore
                    onClick={placedWindow.showMore}
                    remaining={placedWindow.remaining}
                    noun="applicant"
                  />
                )}
              </Panel>
            </section>
          )}

          {p.selectedSummary.length > 0 && (
            <section>
              <Panel>
                <PanelHeading>
                  Marked selected ({p.selectedSummary.length})
                </PanelHeading>
                <ApplicantView
                  students={selectedWindow.visible}
                  isHost={p.isHost}
                  caption="Students marked as selected for this job."
                  showLabels={showActionLabels}
                  onView={p.onViewStudent}
                  onPlacement={p.onEditPlacement}
                />
                {selectedWindow.hasMore && (
                  <ShowMore
                    onClick={selectedWindow.showMore}
                    remaining={selectedWindow.remaining}
                    noun="student"
                  />
                )}
              </Panel>
            </section>
          )}
        </>
      )}
    </>
  );
}

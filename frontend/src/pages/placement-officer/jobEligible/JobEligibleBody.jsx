import { UserPlus } from 'lucide-react';
import EnhancedFilterPanel from '../../../components/EnhancedFilterPanel';
import {
  Panel, PanelHeading, SectionLabel, SecondaryButton,
} from '../../../components/officer/OfficerUI';
import {
  JobPicker, StatBlock, DrivePanel, JobSummary, BulkActionBar, FilterToggle,
  ApplicantTable, ApplicantList,
} from './jobEligibleShared';
import AdditionalFilters from './AdditionalFilters';

/**
 * Everything below the page heading, shared by the three presenters.
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
  const jobColumns = layout === 'desktop' ? 3 : layout === 'tablet' ? 2 : 1;
  const filterColumns = layout === 'desktop' ? 3 : layout === 'tablet' ? 2 : 1;

  const ApplicantView = isTable ? ApplicantTable : ApplicantList;
  // Desktop and tablet have width for the words; the phone keeps icons, where
  // the accessible name still carries the meaning.
  const showActionLabels = layout !== 'mobile';

  const currentApplicants = p.filteredStudents.filter((s) => !s.is_already_placed);
  const placedApplicants = p.filteredStudents.filter((s) => s.is_already_placed);

  return (
    <>
      <section className="mb-5">
        <SectionLabel>Select a job</SectionLabel>
        <JobPicker
          jobs={p.jobs}
          selectedJob={p.selectedJob}
          onSelect={p.onSelectJob}
          onDownloadJobPdf={p.onDownloadJobPdf}
          columns={jobColumns}
        />
      </section>

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
              <ApplicantView
                students={currentApplicants}
                isHost={p.isHost}
                caption={`Applicants for ${p.selectedJob.job_title} at ${p.selectedJob.company_name}.`}
                selectable
                selectedIds={p.selectedStudents}
                onSelect={p.onSelectStudent}
                onSelectAll={p.onSelectAll}
                allSelected={
                  currentApplicants.length > 0 &&
                  currentApplicants.every((s) => p.selectedStudents.includes(s.application_id))
                }
                onView={p.onViewStudent}
                onPlacement={p.onEditPlacement}
                showLabels={showActionLabels}
                loading={p.loadingStudents}
              />
            </Panel>
          </section>

          {placedApplicants.length > 0 && (
            <section className="mb-5">
              <Panel>
                <PanelHeading>
                  Already placed elsewhere ({placedApplicants.length})
                </PanelHeading>
                <ApplicantView
                  students={placedApplicants}
                  isHost={p.isHost}
                  caption="Applicants who are already placed at another company."
                  showPlacedAt
                  showLabels={showActionLabels}
                  onView={p.onViewStudent}
                  onPlacement={p.onEditPlacement}
                />
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
                  students={p.selectedSummary}
                  isHost={p.isHost}
                  caption="Students marked as selected for this job."
                  showLabels={showActionLabels}
                  onView={p.onViewStudent}
                  onPlacement={p.onEditPlacement}
                />
              </Panel>
            </section>
          )}
        </>
      )}
    </>
  );
}

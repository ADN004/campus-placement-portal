import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeading } from '../../../components/admin/AdminUI';
import Pagination from '../../../components/officer/Pagination';
import usePagedList from '../../../hooks/usePagedList';
import {
  PlacementStats, DrivePanel, AdvancedFilters, BulkBar, ApplicantSection, ApplicantToolbar,
  ExportScope,
} from './applicantsShared';

/**
 * One drive's applicants, at every width.
 *
 * Three lists, all paged: the applicants, those already placed elsewhere, and a
 * summary of everyone marked selected. Paging rather than showing all of them —
 * a statewide drive draws hundreds and the page used to render every row.
 *
 * Select-all still means every applicant the filters match, not the fifty on
 * screen: the box a super admin ticks means all of them, and quietly meaning
 * "the visible ones" is how you shortlist the wrong cohort.
 */
export default function ApplicantsBody(p) {
  const { layout } = p;

  const filterKey = [
    p.selectedJob?.id,
    JSON.stringify(p.advancedFilters || {}),
    JSON.stringify(p.enhancedFilters || {}),
  ].join('|');

  const applicantPage = usePagedList(p.currentApplicants, { pageSize: 50, resetKey: filterKey });
  const placedPage = usePagedList(p.placedApplicants, { pageSize: 25, resetKey: filterKey });
  const selectedPage = usePagedList(p.selectedSummary, { pageSize: 25, resetKey: filterKey });

  const pager = (page, label) => (page.totalPages > 1 ? (
    <div className="mt-2 bg-spc-surface border border-spc-line-strong rounded-spc-admin overflow-hidden">
      <Pagination
        currentPage={page.page}
        totalPages={page.totalPages}
        pageSize={page.pageSize}
        total={page.total}
        onPageChange={page.setPage}
        onPageSizeChange={(e) => page.setPageSize(Number(e.target.value))}
        label={label}
      />
    </div>
  ) : null);

  const selectableIds = p.currentApplicants.map((s) => s.application_id);
  const allSelected = selectableIds.length > 0
    && selectableIds.every((id) => p.selectedStudents.includes(id));

  return (
    <div>
      <Link
        to="/super-admin/job-eligible-students"
        className="inline-flex items-center gap-2 min-h-[44px] text-spc-xs font-bold
          text-spc-ink hover:text-spc-accent transition-colors mb-2"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to drives
      </Link>

      <PageHeading
        eyebrow={p.selectedJob?.company_name}
        title={p.selectedJob?.job_title || 'Applicants'}
        subline={`${p.filteredStudents.length} of ${p.students.length} applicants shown`}
        size={layout === 'mobile' ? 'sm' : 'md'}
      />

      <PlacementStats layout={layout} stats={p.placementStats} />

      <DrivePanel
        drive={p.driveData}
        onSchedule={p.onScheduleDrive}
        onNotifyAll={p.onNotifyDrive}
        disabled={p.loadingStudents}
      />

      <ApplicantToolbar
        onToggleFilters={p.onToggleAdvancedFilters}
        filtersOpen={p.showAdvancedFilters}
        hasFilters={p.hasAdvancedFilters}
        onToggleEnhanced={p.onToggleEnhancedFilters}
        enhancedOpen={p.showEnhancedFilters}
        hasEnhanced={p.hasEnhancedFilters}
        onManualAdd={p.onManualAdd}
        onExportExcel={p.onExportExcel}
        onExportPdf={p.onExportPdf}
        exporting={p.exporting}
        onToggleScope={p.onToggleExportScope}
        scopeOpen={p.showExportFilters}
        scopeCount={p.exportFilters.selectedColleges.length}
      />

      {p.showExportFilters && (
        <ExportScope
          regions={p.exportRegions}
          colleges={p.colleges}
          filters={p.exportFilters}
          onRegion={p.onRegionSelect}
          onToggleCollege={p.onToggleCollege}
          onClear={p.onClearExportScope}
        />
      )}

      {p.showAdvancedFilters && (
        <AdvancedFilters
          layout={layout}
          filters={p.advancedFilters}
          onChange={p.onAdvancedFilterChange}
          colleges={p.colleges}
          onClear={p.onClearAdvancedFilters}
        />
      )}

      {p.enhancedFilterPanel}

      <ApplicantSection
        layout={layout}
        title={`Applicants (${p.currentApplicants.length})`}
        students={p.currentApplicants}
        page={applicantPage}
        caption={`Applicants for ${p.selectedJob?.job_title} at ${p.selectedJob?.company_name}.`}
        emptyText="Nobody has applied to this drive yet, or the filters exclude everyone."
        selectable
        selectedIds={p.selectedStudents}
        onSelect={p.onSelectStudent}
        onSelectAll={p.onSelectAll}
        allSelected={allSelected}
        onView={p.onViewStudent}
        Pager={pager(applicantPage, 'Applicants')}
      />

      {p.placedApplicants.length > 0 && (
        <ApplicantSection
          layout={layout}
          title={`Already placed elsewhere (${p.placedApplicants.length})`}
          students={p.placedApplicants}
          page={placedPage}
          caption="Applicants who are already placed at another company."
          emptyText="None."
          selectedIds={[]}
          onView={p.onViewStudent}
          Pager={pager(placedPage, 'Applicants')}
        />
      )}

      {p.selectedSummary.length > 0 && (
        <ApplicantSection
          layout={layout}
          title={`Marked selected (${p.selectedSummary.length})`}
          students={p.selectedSummary}
          page={selectedPage}
          caption="Students marked as selected for this drive."
          emptyText="None."
          selectedIds={[]}
          onView={p.onViewStudent}
          Pager={pager(selectedPage, 'Students')}
        />
      )}

      <BulkBar
        count={p.selectedStudents.length}
        onStatus={p.onBulkStatusUpdate}
        onNotify={p.onNotifyStudents}
        onClear={p.onClearSelection}
        disabled={p.loadingStudents}
      />
    </div>
  );
}

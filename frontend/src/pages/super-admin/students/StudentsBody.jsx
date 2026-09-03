import { SlidersHorizontal, ChevronDown, ChevronUp, Download, ImageOff } from 'lucide-react';
import {
  Panel, PageHeading, SectionLabel, SecondaryButton, DangerButton,
} from '../../../components/admin/AdminUI';
import {
  StudentFilters, ArchiveToggle, StudentRegister, StudentPaging,
} from './studentsShared';
import AdvancedFilters from './AdvancedFilters';
import { CgpaPanel } from './CgpaControls';

/**
 * The whole student register, at every width.
 *
 * The page it replaces opened with a 40px icon on a three-colour gradient and a
 * `text-5xl` title, then put the two rarest controls on this page — a bulk photo
 * deletion and a custom export — as the largest buttons on screen. What is
 * actually done here, thousands of times a year, is find one student and act on
 * them; so the search leads, the register fills the page, and the two
 * infrequent, heavy operations sit where they belong.
 *
 * Nothing here holds state. Every value and every handler comes from the
 * container, which is the only place that talks to the API.
 */

/** One number, said plainly. */
function Metric({ label, value }) {
  return (
    <div className="p-4 bg-spc-surface border border-spc-line-strong rounded-spc-admin min-w-[140px]">
      <p className="text-spc-metric font-bold text-spc-ink tabular-nums">{value}</p>
      <p className="text-spc-xs text-spc-body mt-0.5">{label}</p>
    </div>
  );
}

export default function StudentsBody(p) {
  const { layout } = p;
  const filtered = Boolean(
    p.searchQuery || p.filterRegion || p.filterCollege || p.filterStatus
    || p.filterBranch || p.hasActiveFilters
  );

  return (
    <div>
      <PageHeading
        eyebrow="Students"
        title="All Students"
        subline="Every registered student across the sixty colleges"
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <SecondaryButton onClick={p.onOpenExport}>
            <Download size={15} aria-hidden="true" />
            Export
          </SecondaryButton>
          <DangerButton onClick={p.onOpenPhotoPurge}>
            <ImageOff size={15} aria-hidden="true" />
            Delete photos
          </DangerButton>
        </div>
      </PageHeading>

      <div className="flex gap-3 flex-wrap mb-5">
        <Metric label="students match" value={p.totalStudents.toLocaleString()} />
        <Metric label="on this page" value={p.students.length.toLocaleString()} />
        {p.totalPages > 1 && (
          <Metric label={`of ${p.totalPages} pages`} value={`Page ${p.currentPage}`} />
        )}
      </div>

      {/* -------------------------------------------------------- the filters */}
      <Panel className="p-4 mb-4">
        <SectionLabel>Find a student</SectionLabel>
        <StudentFilters
          layout={layout}
          searchQuery={p.searchQuery}
          onSearch={p.onSearch}
          regions={p.regions}
          filterRegion={p.filterRegion}
          onRegion={p.onRegion}
          colleges={p.colleges}
          filterCollege={p.filterCollege}
          onCollege={p.onCollege}
          filterStatus={p.filterStatus}
          onStatus={p.onStatus}
        />

        <div className="mt-3">
          <SecondaryButton onClick={p.onToggleAdvanced} aria-expanded={p.showAdvancedFilters}>
            <SlidersHorizontal size={15} aria-hidden="true" />
            More filters
            {p.hasActiveFilters && (
              <span className="px-1.5 py-0.5 rounded-spc-admin-sm bg-spc-accent text-spc-on-accent
                text-[10px] font-bold uppercase tracking-wide">
                On
              </span>
            )}
            {p.showAdvancedFilters
              ? <ChevronUp size={15} aria-hidden="true" />
              : <ChevronDown size={15} aria-hidden="true" />}
          </SecondaryButton>
        </div>

        <ArchiveToggle
          showArchived={p.showArchived}
          onToggle={p.onToggleArchived}
          years={p.archivedYears}
          archivedYear={p.archivedYear}
          onYear={p.onArchivedYear}
        />
      </Panel>

      {p.showAdvancedFilters && (
        <AdvancedFilters
          layout={layout}
          advancedFilters={p.advancedFilters}
          onAdvancedChange={p.onAdvancedChange}
          branches={p.branches}
          filterBranch={p.filterBranch}
          onBranch={p.onBranch}
          collegeChosen={Boolean(p.filterCollege)}
          dobFrom={p.dobFrom}
          dobTo={p.dobTo}
          onDobFrom={p.onDobFrom}
          onDobTo={p.onDobTo}
          heightMin={p.heightMin}
          heightMax={p.heightMax}
          weightMin={p.weightMin}
          weightMax={p.weightMax}
          onHeightMin={p.onHeightMin}
          onHeightMax={p.onHeightMax}
          onWeightMin={p.onWeightMin}
          onWeightMax={p.onWeightMax}
          filterDocuments={p.filterDocuments}
          onDocumentChange={p.onDocumentChange}
          availableDistricts={p.availableDistricts}
          filterDistricts={p.filterDistricts}
          onDistrictToggle={p.onDistrictToggle}
          onClear={p.onClearAdvanced}
          hasActiveFilters={p.hasActiveFilters}
          shownCount={p.students.length}
          totalCount={p.totalStudents}
        />
      )}

      {/* ---------------------------------------------------------- CGPA lock */}
      <CgpaPanel
        layout={layout}
        colleges={p.colleges}
        selectedCollege={p.cgpaSelectedCollege}
        onSelectCollege={p.onCgpaCollege}
        locked={p.cgpaLocked}
        unlockWindow={p.cgpaUnlockWindow}
        globalUnlocked={p.globalCgpaUnlocked}
        globalWindow={p.globalCgpaWindow}
        onUnlockOne={p.onCgpaUnlockOne}
        onLockOne={p.onCgpaLockOne}
        onUnlockAll={p.onCgpaUnlockAll}
        onLockAll={p.onCgpaLockAll}
        processing={p.cgpaProcessing}
      />

      {/* ----------------------------------------------------------- register */}
      <SectionLabel>{p.showArchived ? 'Passed-out students' : 'Register'}</SectionLabel>
      <StudentRegister
        layout={layout}
        students={p.students}
        actions={p.actions}
        filtered={filtered}
        dimmed={p.refreshing}
      />

      <StudentPaging
        layout={layout}
        currentPage={p.currentPage}
        totalPages={p.totalPages}
        totalStudents={p.totalStudents}
        pageSize={p.pageSize}
        onPage={p.onPage}
        onPageSize={p.onPageSize}
      />
    </div>
  );
}

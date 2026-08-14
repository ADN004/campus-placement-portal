import {
  PageHeading, Panel, StatusTabs, SearchField, FilterToggle, ExportMenu, LockPanel,
  BulkBar, Pagination, EmptyState, StatusMark, BlacklistMark, BacklogCount,
  StudentActions, totalBacklogs, SecondaryButton, SelectField,
} from './studentsShared';
import AdvancedFilters from './AdvancedFilters';

/**
 * Mobile (below `md`) presenter.
 *
 * The 11-column table becomes a ruled list, not cards: dividers only, no boxes.
 * It fits more students per screen and stays visually continuous with the
 * desktop register it came from — a stack of cards would read as a different
 * product.
 *
 * Each row carries the five facts an officer needs to judge an approval without
 * opening anything: PRN, name, CGPA, backlogs and status. Email, mobile and
 * registration date are one tap away in Review, where they already lived.
 */
export default function MobileManageStudents(props) {
  const {
    students, refreshing, activeTab, statusCounts, onChangeTab,
    searchQuery, onSearchChange,
    showAdvancedFilters, onToggleAdvancedFilters, hasActiveFilters,
    showExportDropdown, onToggleExportDropdown, onPickExport, totalStudents,
    cgpaLocked, cgpaUnlockWindow, onCgpaUnlock, onCgpaLock, cgpaProcessing,
    backlogLocked, backlogUnlockWindow, onBacklogUnlock, onBacklogLock, backlogProcessing,
    showArchived, archivedYear, archivedYearOptions, onToggleArchived, onArchivedYearChange,
    selectedStudents, pendingInView, onSelectStudent, onSelectAll,
    onBulkApprove, onBulkReject, onClearSelection,
    currentPage, totalPages, pageSize, onPageChange, onPageSizeChange,
    filtersProps, actionHandlers,
  } = props;

  const allPendingSelected =
    pendingInView.length > 0 && selectedStudents.length === pendingInView.length;

  return (
    <div className="pb-2">
      <PageHeading title="Manage Students" size="sm" />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <ExportMenu
          open={showExportDropdown}
          onToggle={onToggleExportDropdown}
          onPick={onPickExport}
          disabled={totalStudents === 0}
          align="left"
        />
        <FilterToggle
          open={showAdvancedFilters}
          onToggle={onToggleAdvancedFilters}
          active={hasActiveFilters}
        />
      </div>

      <div className="space-y-3 mb-4">
        <LockPanel
          title="CGPA editing"
          locked={cgpaLocked}
          unlockWindow={cgpaUnlockWindow}
          onUnlock={onCgpaUnlock}
          onLock={onCgpaLock}
          processing={cgpaProcessing}
          compact
        />
        <LockPanel
          title="Backlog editing"
          locked={backlogLocked}
          unlockWindow={backlogUnlockWindow}
          onUnlock={onBacklogUnlock}
          onLock={onBacklogLock}
          processing={backlogProcessing}
          compact
        />
      </div>

      {/* Five tabs on one scrollable line — wrapping them makes a ragged block
          that pushes the list below the fold. */}
      <div className="mb-3">
        <StatusTabs activeTab={activeTab} counts={statusCounts} onChange={onChangeTab} scroll />
      </div>

      <div className="mb-3">
        <SearchField value={searchQuery} onChange={onSearchChange} />
      </div>

      <div className="mb-3">
        <SecondaryButton onClick={onToggleArchived} className="w-full">
          {showArchived ? 'Back to current students' : 'Show archived students'}
        </SecondaryButton>
      </div>

      {showArchived && (
        <Panel className="mb-3">
          <div className="p-3 space-y-2">
            <SelectField
              id="archived-year-mobile"
              label="Passed-out batch"
              value={archivedYear}
              onChange={onArchivedYearChange}
            >
              <option value="">All passed-out batches</option>
              {archivedYearOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SelectField>
            <p className="text-xs text-spc-muted">
              Read-only. These students can no longer log in — shown for reference and export.
            </p>
          </div>
        </Panel>
      )}

      {showAdvancedFilters && (
        <div className="mb-3">
          <AdvancedFilters columns={1} {...filtersProps} />
        </div>
      )}

      <div className="mb-3">
        <BulkBar
          pendingInView={pendingInView.length > 0}
          count={selectedStudents.length}
          onApprove={onBulkApprove}
          onReject={onBulkReject}
          onClear={onClearSelection}
        />
      </div>

      <Panel>
        {pendingInView.length > 0 && (
          <label className="flex items-center gap-3 px-4 py-3 min-h-[52px] border-b border-spc-line
            bg-spc-surface-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allPendingSelected}
              onChange={onSelectAll}
              className="w-4 h-4 rounded-spc-badge border-spc-control accent-[rgb(var(--spc-accent))]"
            />
            <span className="text-spc-xs font-bold text-spc-ink">
              Select all pending on this page
            </span>
          </label>
        )}

        {students.length === 0 ? (
          <EmptyState filtered={Boolean(searchQuery) || hasActiveFilters} activeTab={activeTab} />
        ) : (
          <>
            <ul className={refreshing ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
              {students.map((student) => {
                const selected = selectedStudents.includes(student.id);
                const canSelect =
                  student.registration_status === 'pending' && !student.is_blacklisted;
                return (
                  <li
                    key={student.id}
                    className={`px-4 py-3 border-b border-spc-line last:border-b-0
                      ${selected ? 'bg-spc-selected' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {pendingInView.length > 0 && (
                        <span className="pt-1 flex-shrink-0">
                          {canSelect ? (
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => onSelectStudent(student.id)}
                              aria-label={`Select ${student.name || student.prn}`}
                              className="w-4 h-4 rounded-spc-badge border-spc-control accent-[rgb(var(--spc-accent))]"
                            />
                          ) : (
                            <span className="block w-4" aria-hidden="true" />
                          )}
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-spc-xs font-bold text-spc-ink tabular-nums truncate">
                            {student.prn}
                          </span>
                          <StatusMark status={student.registration_status} />
                        </div>

                        <p className="text-spc-sm font-bold text-spc-ink mt-0.5 break-words">
                          {student.name || '–'}
                        </p>

                        <p className="text-xs text-spc-muted mt-1">
                          CGPA{' '}
                          <span className="tabular-nums font-bold text-spc-ink">
                            {student.programme_cgpa || '–'}
                          </span>
                          {' · '}
                          <BacklogCount total={totalBacklogs(student)} />
                          {' backlogs'}
                        </p>

                        {student.is_blacklisted && (
                          <div className="mt-1">
                            <BlacklistMark isBlacklisted />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end mt-1">
                      <StudentActions student={student} {...actionHandlers} />
                    </div>
                  </li>
                );
              })}
            </ul>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalStudents={totalStudents}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </>
        )}
      </Panel>
    </div>
  );
}

import {
  PageHeading, Panel, StatusTabs, SearchField, FilterToggle, ExportMenu, LockPanel,
  BulkBar, Pagination, EmptyState, StatusMark, BlacklistMark, BacklogCount,
  StudentActions, formatDate, totalBacklogs, SecondaryButton, SelectField,
} from './studentsShared';
import AdvancedFilters from './AdvancedFilters';

/**
 * Tablet (`md` up to below `lg`) presenter.
 *
 * Its own layout. Not the phone's single-fact-per-line list, and not the
 * desktop's eleven columns squeezed into ~700px — that squeeze is precisely
 * what this redesign exists to remove.
 *
 * Instead: a two-line ruled row. The first line carries identity and status,
 * the second the facts an officer scans across — CGPA, backlogs, mobile,
 * registration date — laid out in aligned columns so the eye can run down them,
 * with the actions in a fixed trailing cell.
 */
export default function TabletManageStudents(props) {
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
    <div>
      <PageHeading
        title="Manage Students"
        subline="View, approve, reject and blacklist students from your college"
      >
        <ExportMenu
          open={showExportDropdown}
          onToggle={onToggleExportDropdown}
          onPick={onPickExport}
          disabled={totalStudents === 0}
        />
      </PageHeading>

      <div className="grid grid-cols-2 gap-3 mb-4">
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

      <div className="mb-4">
        <StatusTabs activeTab={activeTab} counts={statusCounts} onChange={onChangeTab} />
      </div>

      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <SearchField value={searchQuery} onChange={onSearchChange} />
        </div>
        <FilterToggle
          open={showAdvancedFilters}
          onToggle={onToggleAdvancedFilters}
          active={hasActiveFilters}
        />
      </div>

      <div className="mb-4">
        <SecondaryButton onClick={onToggleArchived}>
          {showArchived ? 'Back to current students' : 'Show archived students'}
        </SecondaryButton>
      </div>

      {showArchived && (
        <Panel className="mb-4">
          <div className="flex items-center gap-3 flex-wrap p-3">
            <div className="w-56">
              <SelectField
                id="archived-year-tablet"
                value={archivedYear}
                onChange={onArchivedYearChange}
              >
                <option value="">All passed-out batches</option>
                {archivedYearOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              </SelectField>
            </div>
            <p className="text-spc-xs text-spc-muted flex-1 min-w-0">
              Read-only — shown for reference and export.
            </p>
          </div>
        </Panel>
      )}

      {showAdvancedFilters && (
        <div className="mb-4">
          <AdvancedFilters columns={2} {...filtersProps} />
        </div>
      )}

      <div className="mb-4">
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
                    className={`flex items-center gap-3 px-4 py-3 border-b border-spc-line
                      last:border-b-0 ${selected ? 'bg-spc-selected' : ''}`}
                  >
                    {pendingInView.length > 0 && (
                      <span className="flex-shrink-0">
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
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="text-spc-xs font-bold text-spc-ink tabular-nums flex-shrink-0">
                          {student.prn}
                        </span>
                        <span className="text-spc-sm font-bold text-spc-ink truncate">
                          {student.name || '–'}
                        </span>
                      </div>
                      <p className="text-xs text-spc-muted mt-0.5 truncate">{student.email}</p>
                    </div>

                    {/* Fixed-width fact columns so they line up down the list —
                        the point of a register. Figures right-aligned. */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="w-14 text-right">
                        <span className="block text-xs text-spc-muted">CGPA</span>
                        <span className="block text-spc-xs font-bold text-spc-ink tabular-nums">
                          {student.programme_cgpa || '–'}
                        </span>
                      </span>
                      <span className="w-12 text-right">
                        <span className="block text-xs text-spc-muted">Backlog</span>
                        <span className="block text-spc-xs">
                          <BacklogCount total={totalBacklogs(student)} />
                        </span>
                      </span>
                      <span className="w-24 text-right">
                        <span className="block text-xs text-spc-muted">Registered</span>
                        <span className="block text-spc-xs text-spc-body tabular-nums">
                          {formatDate(student.created_at)}
                        </span>
                      </span>
                      <span className="w-24">
                        <StatusMark status={student.registration_status} />
                        {student.is_blacklisted && (
                          <span className="block mt-0.5">
                            <BlacklistMark isBlacklisted />
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex-shrink-0">
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
              total={totalStudents}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </>
        )}
      </Panel>
    </div>
  );
}

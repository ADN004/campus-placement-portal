import {
  PageHeading, Panel, StatusTabs, SearchField, FilterToggle, ExportMenu, LockPanel,
  BulkBar, Pagination, EmptyState, StatusMark, BlacklistMark, BacklogCount,
  StudentActions, formatDate, totalBacklogs, SecondaryButton, SelectField,
} from './studentsShared';
import AdvancedFilters from './AdvancedFilters';

/**
 * Desktop (`lg` and up) presenter — the register proper.
 *
 * This is the one device where the table stays a table. The direction is
 * explicit that a register should not be turned into cards on desktop just to
 * match the phone: columns of PRNs, CGPAs and dates are exactly what a table is
 * for, and an officer scanning 100 rows needs them aligned.
 *
 * What changes is how it is drawn — hairlines between rows, one structural rule
 * under the header, no card wrapper, and every figure right-aligned.
 */
export default function DesktopManageStudents(props) {
  const {
    students, activeTab, statusCounts, onChangeTab,
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

      {/* Edit windows, side by side — they are the same kind of control. */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <LockPanel
          title="Student CGPA editing"
          locked={cgpaLocked}
          unlockWindow={cgpaUnlockWindow}
          onUnlock={onCgpaUnlock}
          onLock={onCgpaLock}
          processing={cgpaProcessing}
        />
        <LockPanel
          title="Backlog editing"
          locked={backlogLocked}
          unlockWindow={backlogUnlockWindow}
          onUnlock={onBacklogUnlock}
          onLock={onBacklogLock}
          processing={backlogProcessing}
        />
      </div>

      <div className="mb-5">
        <StatusTabs activeTab={activeTab} counts={statusCounts} onChange={onChangeTab} />
      </div>

      {/* Toolbar: search takes the room, the two toggles sit beside it. */}
      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <SearchField value={searchQuery} onChange={onSearchChange} />
        </div>
        <FilterToggle
          open={showAdvancedFilters}
          onToggle={onToggleAdvancedFilters}
          active={hasActiveFilters}
        />
        <SecondaryButton onClick={onToggleArchived}>
          {showArchived ? 'Back to current students' : 'Archived students'}
        </SecondaryButton>
      </div>

      {showArchived && (
        <Panel className="mb-4">
          <div className="flex items-center gap-4 flex-wrap p-3">
            <div className="w-64">
              <SelectField
                id="archived-year-desktop"
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
              Read-only. These students can no longer log in — shown for reference and export.
            </p>
          </div>
        </Panel>
      )}

      {showAdvancedFilters && (
        <div className="mb-4">
          <AdvancedFilters columns={3} {...filtersProps} />
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
        {students.length === 0 ? (
          <EmptyState filtered={Boolean(searchQuery) || hasActiveFilters} activeTab={activeTab} />
        ) : (
          <>
            {/* The table scrolls sideways on its own rather than pushing the
                page; the first column stays put so a row keeps its identity. */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <caption className="sr-only">
                  Students from your college, {activeTab === 'all' ? 'all statuses' : activeTab}.
                  Columns: selection, PRN, name, email, mobile, CGPA, backlogs, registration
                  status, blacklist status, registration date, and actions.
                </caption>
                <thead>
                  <tr className="bg-spc-surface-2 border-b-[1.5px] border-spc-rule-structural">
                    {pendingInView.length > 0 && (
                      <th scope="col" className="w-12 px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={allPendingSelected}
                          onChange={onSelectAll}
                          aria-label="Select all pending students on this page"
                          className="w-4 h-4 rounded-spc-badge border-spc-control accent-[rgb(var(--spc-accent))]"
                        />
                      </th>
                    )}
                    <Th>PRN</Th>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Mobile</Th>
                    <Th align="right">CGPA</Th>
                    <Th align="right">Backlogs</Th>
                    <Th>Status</Th>
                    <Th>Blacklist</Th>
                    <Th align="right">Registered</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const selected = selectedStudents.includes(student.id);
                    const canSelect =
                      student.registration_status === 'pending' && !student.is_blacklisted;
                    return (
                      <tr
                        key={student.id}
                        className={`border-b border-spc-line last:border-b-0 transition-colors
                          ${selected ? 'bg-spc-selected' : 'hover:bg-spc-surface-2'}`}
                      >
                        {pendingInView.length > 0 && (
                          <td className="px-3 py-2">
                            {canSelect ? (
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => onSelectStudent(student.id)}
                                aria-label={`Select ${student.name || student.prn}`}
                                className="w-4 h-4 rounded-spc-badge border-spc-control accent-[rgb(var(--spc-accent))]"
                              />
                            ) : (
                              <span className="text-spc-muted" aria-hidden="true">–</span>
                            )}
                          </td>
                        )}
                        <th
                          scope="row"
                          className="px-3 py-2 text-left text-spc-xs font-bold text-spc-ink
                            tabular-nums whitespace-nowrap"
                        >
                          {student.prn}
                        </th>
                        <Td bold>{student.name || '–'}</Td>
                        <Td muted>{student.email}</Td>
                        <Td muted nowrap>{student.mobile_number || '–'}</Td>
                        <Td align="right" bold>{student.programme_cgpa || '–'}</Td>
                        <Td align="right">
                          <BacklogCount total={totalBacklogs(student)} />
                        </Td>
                        <Td><StatusMark status={student.registration_status} /></Td>
                        <Td><BlacklistMark isBlacklisted={student.is_blacklisted} /></Td>
                        <Td align="right" muted nowrap>{formatDate(student.created_at)}</Td>
                        <td className="px-3 py-2">
                          <StudentActions student={student} {...actionHandlers} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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

/**
 * Column header. `muted`, not accent — the header band sits on surface-2, where
 * the brass accent measures 4.49:1 and fails AA.
 */
function Th({ children, align = 'left' }) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 font-khand font-medium uppercase tracking-[0.06em]
        text-spc-xs text-spc-muted whitespace-nowrap
        ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left', bold, muted, nowrap }) {
  return (
    <td
      className={`px-3 py-2 text-spc-xs
        ${align === 'right' ? 'text-right tabular-nums' : 'text-left'}
        ${bold ? 'font-bold text-spc-ink' : muted ? 'text-spc-body' : 'text-spc-ink'}
        ${nowrap ? 'whitespace-nowrap' : ''}`}
    >
      {children}
    </td>
  );
}

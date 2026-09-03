import {
  Search, Eye, Ban, ShieldCheck, FileEdit, MailWarning, Trash2, Archive,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  Panel, EmptyState, FIELD_CLASS, FieldLabel, SecondaryButton,
} from '../../../components/admin/AdminUI';
import { passoutYearFromAcademicYear } from '../../../utils/passoutYears';

/**
 * The pieces the All Students register is built from, shared by the table and
 * the list so a student reads the same on a laptop and a phone.
 */

/* ---------------------------------------------------------------- status */

/**
 * Where a student stands, as one mark.
 *
 * Blacklisted outranks everything: a blacklisted student is barred whatever
 * their registration says, and showing "approved" next to a barred account is
 * how someone gets included in a drive they cannot join. Same precedence the
 * page had, said in one word instead of an icon plus a coloured pill.
 */
export function StatusMark({ student }) {
  if (student.is_blacklisted) {
    return <span className="text-spc-xs font-bold text-spc-bad">Blacklisted</span>;
  }
  if (student.registration_status === 'approved') {
    return <span className="text-spc-xs font-semibold text-spc-ok">Approved</span>;
  }
  if (student.registration_status === 'pending') {
    return <span className="text-spc-xs font-semibold text-spc-warn">Pending</span>;
  }
  return <span className="text-spc-xs font-semibold text-spc-bad">Rejected</span>;
}

/* --------------------------------------------------------------- actions */

/**
 * What can be done to one student.
 *
 * Icon-only controls, each 44px and each labelled with the student's name — they
 * had `title` alone before, which a screen reader may never announce and a touch
 * device never shows.
 *
 * The correction control appears only for an approved student who is not
 * blacklisted, exactly as before: there is nothing to send back to someone whose
 * registration was never accepted, and a barred student cannot act on it.
 */
export function StudentActions({
  student, onView, onBlacklist, onWhitelist, onCorrection, onFixEmail, onDelete,
}) {
  const button = 'inline-flex items-center justify-center w-11 h-11 rounded-spc-admin-sm '
    + 'text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink transition-colors';
  const showCorrection = student.registration_status === 'approved' && !student.is_blacklisted;

  return (
    <span className="flex items-center gap-0.5 justify-end">
      <button type="button" onClick={() => onView(student)} className={button}
        aria-label={`View ${student.name}'s details`} title="View details">
        <Eye size={17} aria-hidden="true" />
      </button>

      {student.is_blacklisted ? (
        <button type="button" onClick={() => onWhitelist(student)} className={button}
          aria-label={`Remove the blacklist on ${student.name}`} title="Whitelist student">
          <ShieldCheck size={17} aria-hidden="true" />
        </button>
      ) : (
        <button type="button" onClick={() => onBlacklist(student)} className={button}
          aria-label={`Blacklist ${student.name}`} title="Blacklist student">
          <Ban size={17} aria-hidden="true" />
        </button>
      )}

      {showCorrection && (
        <button type="button" onClick={() => onCorrection(student)} className={button}
          aria-label={`Ask ${student.name} to correct their details`}
          title="Send back for correction (photo / details)">
          <FileEdit size={17} aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        onClick={() => onFixEmail(student)}
        className={`${button} ${student.email_verified ? '' : 'text-spc-warn'}`}
        aria-label={student.email_verified
          ? `Update ${student.name}'s email address`
          : `${student.name}'s email is unverified — fix it and resend the link`}
        title={student.email_verified
          ? 'Update email'
          : 'Email NOT verified — fix email & resend link'}
      >
        <MailWarning size={17} aria-hidden="true" />
      </button>

      <button type="button" onClick={() => onDelete(student)} className={`${button} hover:text-spc-bad`}
        aria-label={`Delete ${student.name}`} title="Delete student">
        <Trash2 size={17} aria-hidden="true" />
      </button>
    </span>
  );
}

/* -------------------------------------------------------------- controls */

/**
 * The four filters that lead.
 *
 * College stays disabled until a region is chosen and only lists that region's
 * colleges — sixty in one dropdown is not a choice, it is a scroll — and picking
 * a different region clears the college, as it did before.
 */
export function StudentFilters({
  layout, searchQuery, onSearch, regions, filterRegion, onRegion,
  colleges, filterCollege, onCollege, filterStatus, onStatus,
}) {
  const columns = layout === 'desktop' ? 'lg:grid-cols-4' : 'sm:grid-cols-2';
  const collegesHere = colleges.filter((c) => !filterRegion || c.region_name === filterRegion);

  return (
    <div className={`grid grid-cols-1 ${columns} gap-3`}>
      <div className="relative min-w-0">
        <Search size={17} aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-spc-body pointer-events-none" />
        <input
          id="student-search"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by PRN, name or email…"
          aria-label="Search students by PRN, name or email"
          className={`${FIELD_CLASS} pl-10`}
        />
      </div>

      <div>
        <select
          id="filter-region"
          value={filterRegion}
          onChange={(e) => onRegion(e.target.value)}
          aria-label="Filter by region"
          className={FIELD_CLASS}
        >
          <option value="">All regions</option>
          {regions.map((r) => <option key={r.id} value={r.region_name}>{r.region_name}</option>)}
        </select>
      </div>

      <div>
        <select
          id="filter-college"
          value={filterCollege}
          onChange={(e) => onCollege(e.target.value)}
          aria-label="Filter by college"
          className={FIELD_CLASS}
          disabled={!filterRegion}
        >
          <option value="">{filterRegion ? 'Every college in the region' : 'Pick a region first'}</option>
          {collegesHere.map((c) => (
            <option key={c.id} value={c.college_name}>{c.college_name}</option>
          ))}
        </select>
      </div>

      <div>
        <select
          id="filter-status"
          value={filterStatus}
          onChange={(e) => onStatus(e.target.value)}
          aria-label="Filter by registration status"
          className={FIELD_CLASS}
        >
          <option value="">Any status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="blacklisted">Blacklisted</option>
        </select>
      </div>
    </div>
  );
}

/**
 * The switch between the current batch and a passed-out one.
 *
 * Archived students were deactivated by the year-end reset and cannot log in;
 * the records stay for reference and export. The switch says which batch is on
 * screen rather than leaving it to be inferred from the rows.
 */
export function ArchiveToggle({ showArchived, onToggle, years, archivedYear, onYear }) {
  return (
    <div className={`mt-3 flex flex-wrap items-center gap-3 p-3 rounded-spc-admin border
      ${showArchived ? 'border-spc-warn/50 bg-spc-warn-bg' : 'border-spc-line-strong bg-spc-surface-2'}`}>
      <SecondaryButton onClick={onToggle}>
        <Archive size={15} aria-hidden="true" />
        {showArchived ? 'Back to current students' : 'Passed-out batches'}
      </SecondaryButton>

      {showArchived && (
        <>
          <select
            id="archived-year"
            value={archivedYear}
            onChange={(e) => onYear(e.target.value)}
            aria-label="Which passed-out batch"
            className={`${FIELD_CLASS} w-auto max-w-[240px]`}
          >
            <option value="">Every passed-out batch</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year} (passout {passoutYearFromAcademicYear(year)})
              </option>
            ))}
          </select>
          <p className="text-spc-xs text-spc-ink font-semibold">
            Read-only. These students can no longer sign in — kept for reference and export.
          </p>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- register */

const COLUMNS = ['PRN', 'Name', 'College', 'Region', 'CGPA', 'Status'];

function StudentTable({ students, actions, dimmed }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className={`min-w-full transition-opacity ${dimmed ? 'opacity-50' : ''}`}>
          <caption className="sr-only">
            Every student matching the filters, with controls to view, blacklist,
            correct, fix the email of, or delete each one.
          </caption>
          <thead>
            <tr className="bg-spc-surface-2 border-b-2 border-spc-rule-structural">
              {COLUMNS.map((heading) => (
                <th key={heading} scope="col"
                  className="font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                    text-spc-body text-left px-4 py-2.5 whitespace-nowrap">
                  {heading}
                </th>
              ))}
              <th scope="col" className="px-4 py-2.5 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}
                className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2">
                <th scope="row"
                  className="px-4 py-3 text-left text-spc-sm font-bold text-spc-ink tabular-nums whitespace-nowrap">
                  {student.prn}
                </th>
                <td className="px-4 py-3 text-spc-sm text-spc-ink">
                  {student.name}
                  {student.email_verified === false && (
                    <span className="block text-spc-xs text-spc-warn font-semibold">
                      Email unverified
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-spc-xs text-spc-body">{student.college_name}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-body">{student.region_name}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-ink tabular-nums">
                  {student.programme_cgpa || '—'}
                </td>
                <td className="px-4 py-3"><StatusMark student={student} /></td>
                <td className="px-4 py-3 text-right">
                  <StudentActions student={student} {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function StudentList({ students, actions, dimmed }) {
  return (
    <Panel className="overflow-hidden">
      <ul className={`divide-y divide-spc-line transition-opacity ${dimmed ? 'opacity-50' : ''}`}>
        {students.map((student) => (
          <li key={student.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-spc-sm font-bold text-spc-ink tabular-nums">{student.prn}</p>
                <p className="text-spc-sm text-spc-ink break-words">{student.name}</p>
                <p className="text-spc-xs text-spc-body mt-0.5 break-words">
                  {student.college_name} · {student.region_name}
                </p>
                <p className="text-spc-xs text-spc-body mt-0.5 tabular-nums">
                  CGPA {student.programme_cgpa || '—'}
                </p>
                {student.email_verified === false && (
                  <p className="text-spc-xs text-spc-warn font-semibold mt-0.5">Email unverified</p>
                )}
              </div>
              <StatusMark student={student} />
            </div>
            <div className="mt-2">
              <StudentActions student={student} {...actions} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function StudentRegister({ layout, students, actions, filtered, dimmed }) {
  if (students.length === 0) {
    return (
      <Panel>
        <EmptyState>
          {filtered
            ? 'No student matches those filters.'
            : 'No students yet.'}
        </EmptyState>
      </Panel>
    );
  }
  const Rows = layout === 'desktop' ? StudentTable : StudentList;
  return <Rows students={students} actions={actions} dimmed={dimmed} />;
}

/* ------------------------------------------------------------ pagination */

/**
 * Which slice of the register is on screen, and how to move.
 *
 * Ten thousand students never come down in one response, so this is real
 * server-side paging: First / Previous / Next / Last, and the page size, exactly
 * as before. The count sentence is spelled out because "1–100 of 9,842" is the
 * only thing that tells you a filter did anything.
 */
export function StudentPaging({
  layout, currentPage, totalPages, totalStudents, pageSize, onPage, onPageSize,
}) {
  if (totalStudents === 0) return null;

  const from = ((currentPage - 1) * pageSize) + 1;
  const to = Math.min(currentPage * pageSize, totalStudents);
  const step = 'inline-flex items-center justify-center gap-1 min-h-[44px] px-3 rounded-spc-admin-sm '
    + 'text-spc-xs font-bold bg-spc-surface text-spc-ink border border-spc-control '
    + 'hover:bg-spc-surface-2 transition-colors disabled:opacity-45 disabled:cursor-not-allowed';

  return (
    <Panel className={`mt-4 p-4 flex gap-3 ${layout === 'desktop'
      ? 'items-center justify-between flex-wrap' : 'flex-col'}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-spc-xs text-spc-body">
          Showing <span className="font-bold text-spc-ink tabular-nums">{from.toLocaleString()}</span>
          {' to '}
          <span className="font-bold text-spc-ink tabular-nums">{to.toLocaleString()}</span>
          {' of '}
          <span className="font-bold text-spc-ink tabular-nums">{totalStudents.toLocaleString()}</span>
        </p>
        <div className="flex items-center gap-2">
          <FieldLabel htmlFor="page-size">Per page</FieldLabel>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className={`${FIELD_CLASS} w-auto -mt-1.5`}
          >
            {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" className={step}
            onClick={() => onPage(1)} disabled={currentPage === 1}>
            First
          </button>
          <button type="button" className={step}
            onClick={() => onPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
            <ChevronLeft size={15} aria-hidden="true" />
            Previous
          </button>
          <p className="text-spc-xs text-spc-body px-1 tabular-nums" aria-live="polite">
            Page <span className="font-bold text-spc-ink">{currentPage}</span> of{' '}
            <span className="font-bold text-spc-ink">{totalPages}</span>
          </p>
          <button type="button" className={step}
            onClick={() => onPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}>
            Next
            <ChevronRight size={15} aria-hidden="true" />
          </button>
          <button type="button" className={step}
            onClick={() => onPage(totalPages)} disabled={currentPage === totalPages}>
            Last
          </button>
        </div>
      )}
    </Panel>
  );
}

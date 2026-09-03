import { Link } from 'react-router-dom';
import {
  ArrowLeft, FileSpreadsheet, FileText, Lock, Unlock,
} from 'lucide-react';
import {
  Panel, PageHeading, SectionLabel, EmptyState, SecondaryButton, formatDate,
} from '../../../components/admin/AdminUI';

/**
 * The students covered by one PRN range, at every width.
 *
 * This is where "view students in range" actually lives — the modal that used
 * to duplicate it on the ranges page was unreachable and has gone.
 *
 * Desktop keeps a table because it is a register of names; below `lg` the same
 * rows read down the page rather than scrolling nine columns sideways.
 */

/** Registered, waiting, or barred. The only three states a student is in here. */
function StudentStatus({ student }) {
  if (student.is_blacklisted) {
    return <span className="text-spc-xs font-bold text-spc-bad">Blacklisted</span>;
  }
  if (student.registration_status === 'approved') {
    return <span className="text-spc-xs font-semibold text-spc-ok">Approved</span>;
  }
  return <span className="text-spc-xs font-semibold text-spc-warn">Pending</span>;
}

/** The four counts. Only "blacklisted" is a problem, so only it takes a colour. */
function Counts({ layout, total, approved, pending, blacklisted }) {
  const columns = layout === 'desktop' ? 'lg:grid-cols-4' : 'sm:grid-cols-2';
  const items = [
    { label: 'In this range', value: total },
    { label: 'Approved', value: approved },
    { label: 'Pending', value: pending },
    { label: 'Blacklisted', value: blacklisted, bad: blacklisted > 0 },
  ];
  return (
    <div className={`grid grid-cols-2 ${columns} gap-3 mb-5`}>
      {items.map((item) => (
        <div key={item.label} className="p-3 bg-spc-surface border border-spc-line-strong rounded-spc-admin">
          <p className={`text-spc-metric font-bold tabular-nums ${item.bad ? 'text-spc-bad' : 'text-spc-ink'}`}>
            {item.value}
          </p>
          <p className="text-spc-xs text-spc-body mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

const HEADINGS = ['PRN', 'Name', 'Email', 'College', 'Region', 'Branch', 'CGPA', 'Status', 'Registered'];

function StudentTable({ students }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <caption className="sr-only">Students whose PRN falls inside this range.</caption>
          <thead>
            <tr className="bg-spc-surface-2 border-b-2 border-spc-rule-structural">
              {HEADINGS.map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="font-khand text-spc-label font-medium uppercase tracking-[0.12em]
                    text-spc-body text-left px-4 py-2.5 whitespace-nowrap"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.prn} className="border-b border-spc-line last:border-b-0 hover:bg-spc-surface-2">
                <th scope="row" className="px-4 py-3 text-left font-bold text-spc-sm text-spc-ink tabular-nums">
                  {student.prn}
                </th>
                <td className="px-4 py-3 text-spc-sm text-spc-ink">{student.student_name}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-body break-all">{student.email}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-body">{student.college_name}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-body">{student.region_name}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-body">{student.branch}</td>
                <td className="px-4 py-3 text-spc-xs text-spc-ink tabular-nums">
                  {student.programme_cgpa ?? '—'}
                </td>
                <td className="px-4 py-3"><StudentStatus student={student} /></td>
                <td className="px-4 py-3 text-spc-xs text-spc-body tabular-nums whitespace-nowrap">
                  {formatDate(student.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function StudentList({ students }) {
  return (
    <Panel className="overflow-hidden">
      <ul className="divide-y divide-spc-line">
        {students.map((student) => (
          <li key={student.prn} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-spc-sm font-bold text-spc-ink tabular-nums">{student.prn}</p>
                <p className="text-spc-sm text-spc-ink break-words">{student.student_name}</p>
              </div>
              <StudentStatus student={student} />
            </div>
            <p className="text-spc-xs text-spc-body mt-1 break-all">{student.email}</p>
            <p className="text-spc-xs text-spc-body mt-0.5">
              {student.college_name} · {student.branch}
            </p>
            <p className="text-spc-xs text-spc-body mt-0.5 tabular-nums">
              CGPA {student.programme_cgpa ?? '—'} · registered {formatDate(student.created_at)}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function RangeStudentsBody(p) {
  const { layout, rangeInfo } = p;
  const Register = layout === 'desktop' ? StudentTable : StudentList;

  return (
    <div>
      <Link
        to="/super-admin/prn-ranges"
        className="inline-flex items-center gap-2 min-h-[44px] text-spc-xs font-bold
          text-spc-ink hover:text-spc-accent transition-colors mb-2"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to PRN Ranges
      </Link>

      <PageHeading
        eyebrow={rangeInfo?.type || 'PRN range'}
        title="Students in this range"
        subline={rangeInfo?.value}
        size={layout === 'mobile' ? 'sm' : 'md'}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {rangeInfo && (
            <span className={`inline-flex items-center gap-1.5 text-spc-xs font-semibold
              ${rangeInfo.is_enabled ? 'text-spc-ink' : 'text-spc-bad'}`}>
              {rangeInfo.is_enabled
                ? <Unlock size={14} aria-hidden="true" />
                : <Lock size={14} aria-hidden="true" />}
              {rangeInfo.is_enabled ? 'Enabled' : 'Disabled'}
            </span>
          )}
          {/* Two buttons rather than a dropdown: there are exactly two formats,
              and a menu to choose between two things is a click that buys
              nothing. */}
          <SecondaryButton onClick={() => p.onExport('excel')} disabled={p.exporting}>
            <FileSpreadsheet size={15} aria-hidden="true" />
            Excel
          </SecondaryButton>
          <SecondaryButton onClick={() => p.onExport('pdf')} disabled={p.exporting}>
            <FileText size={15} aria-hidden="true" />
            PDF
          </SecondaryButton>
        </div>
      </PageHeading>

      <Counts
        layout={layout}
        total={p.students.length}
        approved={p.approvedCount}
        pending={p.pendingCount}
        blacklisted={p.blacklistedCount}
      />

      <SectionLabel>
        {p.exporting ? 'Preparing the export…' : `${p.students.length} students`}
      </SectionLabel>

      {p.students.length === 0 ? (
        <Panel>
          <EmptyState>No student has registered with a PRN inside this range yet.</EmptyState>
        </Panel>
      ) : (
        <Register students={p.students} />
      )}
    </div>
  );
}
